// pages/quantum-demo.js
//
// T60 (#135): a standalone showcase of the quantum circuit visualizer
// (components/detail/visualizations/QuantumCircuitRenderer.js) that Problem Detail
// pages already use for `quantumCircuit`-type visualizations, outside the context
// of any one problem's detail page.
//
// #135's decision: render a real backend-fetched Deutsch-Jozsa circuit rather than
// port Redux_GUI's hardcoded OPENQASM sample -- this frontend has no OPENQASM
// parser, so doing that would mean writing a second, duplicate circuit-rendering
// path, which is exactly what the issue's done-when rules out. See the decision
// comment on #135 for the full reasoning and the rejected alternatives.
//
// The fetch (problem lookup, then visualize) happens client-side only, inside
// useEffect, so `next build`'s static analysis never needs a reachable backend.

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import Typography from "@mui/material/Typography";
import { useCallback, useEffect, useRef } from "react";
import ComputeStatus from "../components/detail/ComputeStatus";
import QuantumCircuitRenderer from "../components/detail/visualizations/QuantumCircuitRenderer";
import ErrorBanner from "../components/ErrorBanner";
import NavBar from "../components/NavBar";
import {
  COMPUTE_CANCELLED,
  COMPUTE_DONE,
  COMPUTE_FAILED,
  COMPUTE_RUNNING,
  useComputeRequest,
} from "../hooks/useComputeRequest";
import { useProblemDetail } from "../hooks/useProblemDetail";
import { REDUX_API_BASE_URL, requestVisualizedInstance } from "../lib/redux";

// The one real catalogued problem/visualization this page showcases. Of the three
// problems whose visualization renders through the `quantumCircuit` universal type
// (Bernstein-Vazirani, Deutsch, Deutsch-Jozsa -- data/supplementalTags.js's
// VISUALIZATION_TYPE_MAP), Deutsch-Jozsa was picked as the namesake algorithm and a
// visually richer circuit than the single-qubit Deutsch case (decision on #135).
// Verified directly against the live Redux backend (2026-09-15): `DEUTSCHJOZSA`'s
// `defaultInstance` is "(1, 1, 1, 1)" and `DeutschJozsaD3Visualization` answers with
// a `format: 1` frame carrying a `d3` payload this renderer already knows how to draw.
const DEMO_PROBLEM_NAME = "Deutsch Jozsa";
const DEMO_VISUALIZATION_CLASS_NAME = "DeutschJozsaD3Visualization";

const CIRCUIT_ID_PREFIX = "quantum-demo-circuit";
const RUN_ID_PREFIX = "quantum-demo-run";

function formatSeconds(milliseconds) {
  return `${(milliseconds / 1000).toFixed(2)}s`;
}

export default function QuantumDemoPage() {
  const {
    problem,
    loading: problemLoading,
    error: problemError,
  } = useProblemDetail(REDUX_API_BASE_URL, DEMO_PROBLEM_NAME);

  const visualize = useComputeRequest({ subject: "instance" });
  const { start: startVisualize, status: visualizeStatus } = visualize;

  // Same shape as components/detail/VisualizationsSection.js's own handleRun: one
  // request that asks the backend to render this page's one fixed visualization
  // against the demo problem's default instance.
  const runDemo = useCallback(() => {
    if (!problem?.defaultInstance) return;
    const instance = problem.defaultInstance;
    startVisualize(async (signal) => {
      const frames = await requestVisualizedInstance(
        REDUX_API_BASE_URL,
        DEMO_VISUALIZATION_CLASS_NAME,
        instance,
        signal,
      );
      return Array.isArray(frames) ? frames : [];
    });
  }, [problem, startVisualize]);

  // Fires once, as soon as the demo problem's default instance is known. A ref (not
  // a status check) guards this, so React 18 strict mode's dev-only double effect
  // invocation can't fire the backend call twice.
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current || !problem?.defaultInstance) return;
    startedRef.current = true;
    runDemo();
  }, [problem, runDemo]);

  let announcement = "";
  if (visualizeStatus === COMPUTE_RUNNING) {
    announcement = "Rendering the demo circuit. This can take up to a minute.";
  } else if (visualizeStatus === COMPUTE_DONE) {
    announcement = `Demo circuit rendered in ${formatSeconds(visualize.elapsedMs)}.`;
  } else if (visualizeStatus === COMPUTE_FAILED) {
    announcement = `The demo circuit did not render. ${visualize.failure?.headline ?? ""}`;
  } else if (visualizeStatus === COMPUTE_CANCELLED) {
    announcement = "Loading the demo circuit was cancelled.";
  }

  const frame = visualizeStatus === COMPUTE_DONE ? (visualize.result?.[0] ?? null) : null;
  const canRetry = visualizeStatus === COMPUTE_FAILED || visualizeStatus === COMPUTE_CANCELLED;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <NavBar />
      {problemLoading && <LinearProgress aria-label="Loading the demo problem" />}
      <Box
        component="main"
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 2,
          px: { xs: 3, sm: 5 },
          py: 4,
          maxWidth: 980,
          width: "100%",
          mx: "auto",
        }}
      >
        <Typography variant="h1" component="h1">
          Quantum Circuit Demo
        </Typography>
        <Typography variant="body1" sx={{ color: "text.secondary" }}>
          A live Deutsch-Jozsa circuit, rendered through Redux&rsquo;s quantum circuit visualizer
          &mdash; the same renderer Problem Detail pages use for every quantum circuit visualization
          in the catalog.
        </Typography>

        {problemError ? (
          <ErrorBanner message="Couldn't reach the Redux backend. The demo circuit can't load right now." />
        ) : !problemLoading && !problem ? (
          <ErrorBanner message="The demo problem isn't in the catalog right now. The demo circuit can't load." />
        ) : (
          <>
            <ComputeStatus
              idPrefix={RUN_ID_PREFIX}
              status={visualizeStatus}
              announcement={announcement}
              failure={visualize.failure}
              onCancel={visualize.cancel}
              busyLabel="Rendering the demo circuit"
            />

            {canRetry && (
              <Box>
                <Button
                  id="quantum-demo-retry-button"
                  variant="outlined"
                  size="small"
                  onClick={runDemo}
                >
                  Try again
                </Button>
              </Box>
            )}

            {frame ? (
              <Box
                sx={{
                  minHeight: 260,
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <QuantumCircuitRenderer
                  idPrefix={CIRCUIT_ID_PREFIX}
                  instanceName="Deutsch-Jozsa"
                  frame={frame}
                  editable={false}
                />
              </Box>
            ) : (
              visualizeStatus !== COMPUTE_RUNNING &&
              visualizeStatus !== COMPUTE_FAILED && (
                <Box
                  sx={{
                    minHeight: 260,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: "divider",
                    color: "text.secondary",
                  }}
                >
                  <Typography variant="body2" sx={{ fontStyle: "italic" }}>
                    Not yet rendered.
                  </Typography>
                </Box>
              )
            )}
          </>
        )}
      </Box>
    </Box>
  );
}
