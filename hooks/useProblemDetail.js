// hooks/useProblemDetail.js
//
// T26 (issue #35). Fetches one problem's full detail-page data from the real
// Redux backend and assembles it into the same shape data/fixtures.js's
// FixtureProblem uses, so pages/[problem].js and every components/detail/*
// section can consume it unchanged.
//
// -----------------------------------------------------------------------
// Why this can't just reuse useCatalogIndex (T23/#32)
// -----------------------------------------------------------------------
// useCatalogIndex only builds the 8-facet `tags` object every card needs.
// It deliberately does not build overview/solvers/visualizations/verifier/
// reductions -- data/fixtures.js's own header says that convenience shape
// is this task's job, not T23's. So this hook fetches the same five batch
// endpoints independently and assembles the detail-page shape from them.
//
// -----------------------------------------------------------------------
// Problem name -> problem code
// -----------------------------------------------------------------------
// The route gives this hook a problem's human-readable display name (e.g.
// "Clique"), matching how a card would link to it. But every batch endpoint
// except allInfo's own problemName field is keyed by the class/reflection
// code (e.g. "CLIQUE") -- allProblems returns codes, and allSolvers/
// allVerifiers/allVisualizations/the reduction graph are all keyed by code
// too (confirmed directly against Redux's Nav_Solvers.cs/Nav_Verifiers.cs/
// Nav_Reductions.cs: their `problemName` entry field is actually
// `problemType.Name`, the code, despite the field's name). So this hook
// resolves the given display name to its code via allInfo[code].problemName
// before it can look anything else up -- same code/name distinction
// useCatalogIndex.js's own header documents.
//
// -----------------------------------------------------------------------
// Overview's Input/Output mapping (this task's most interpretive call)
// -----------------------------------------------------------------------
// The ratified UI wants explicit `Input:`/`Output:` fields, not the formal
// set-notation definition (ARCHITECTURE.md, issue #6 conflict C3). The real
// backend has no field that is literally "Input" or "Output" -- IProblem's
// closest fields are `instanceFormat` ("a short descriptive sentence with
// an embedded concrete example" of a valid instance) and `certificateFormat`
// (the same, for a valid certificate). Both default to "" and are populated
// on only 12 of ~49 problems today (confirmed against Redux/Problems/**).
// `problemDefinition` (free-text, always populated -- it's a required
// interface member, not a defaulted one) is the fallback for Input so the
// field isn't blank for the other 37. Output has no such fallback: rather
// than fabricate a generic "True or False"-style answer that isn't true for
// every problem in the catalog, Output stays undefined (renders "Not yet
// documented"-style blank via OverviewSection) when certificateFormat is
// unset. See this task's handback summary for the alternative considered
// and rejected (a generic decision-problem answer sentence).

import { useEffect, useState } from "react";
import { mergeSupplementalTags, mergeVisualStyle } from "../data/mergeSupplementalTags";
import {
  REDUCTION_COST_MAP,
  REDUCTION_TYPE_MAP,
  SOLVER_COMPLEXITY_MAP,
  SOLVER_TYPE_MAP,
} from "../data/taxonomy";
import {
  requestAllInfo,
  requestAllProblems,
  requestAllSolvers,
  requestAllVerifiers,
  requestAllVisualizations,
  requestAllVisualizationTypes,
  requestReductionGraph,
} from "../lib/redux";

// Detail-page-only identifier, used solely to keep element ids unique
// (VerifierSection's certificate input/button ids) -- unrelated to routing,
// which matches on the real problem name (see pages/[problem].js).
function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

// `className` is carried alongside the display name because live Run
// (T37/#95) needs it: ProblemProvider/solve is keyed by the solver's class
// name ("CliqueBruteForce"), which is what allSolvers lists, not by the
// human-readable solverName ("Clique Brute Force Solver") the UI shows.
function buildSolvers(solverClassNames, info) {
  return (solverClassNames ?? []).map((className) => {
    const solverInfo = info[className] ?? {};
    return {
      className,
      name: solverInfo.solverName ?? className,
      type: SOLVER_TYPE_MAP[solverInfo.solverType],
      complexityBucket: SOLVER_COMPLEXITY_MAP[solverInfo.complexityBucket],
      bigO: solverInfo.complexity || undefined,
    };
  });
}

// `className` and `backendType` are carried alongside the display name because T48
// (#111) needs both: live rendering calls `ProblemProvider/visualize?visualization=
// <className>` (keyed the same way solve/verify are, by class name rather than the
// human-readable `visualizationName`), and resolving which universal render type a
// frame is (data/visualizationTypes.js) needs the raw backend `visualizationType` wire
// value. `visualizationTypesByInstance` is `Navigation/Batch/allVisualizationTypes`'s
// answer when that endpoint exists; T40 found some deployments don't have it yet, so
// this falls back to the same field read off `allInfo`, matching what Redux_GUI's own
// hook already does for the same gap.
function buildVisualizations(visualizationClassNames, info, visualizationTypesByInstance) {
  return (visualizationClassNames ?? []).map((className) => {
    const visualizationInfo = info[className] ?? {};
    return {
      className,
      name: visualizationInfo.visualizationName ?? className,
      type: mergeVisualStyle(className, undefined),
      backendType:
        visualizationTypesByInstance[className] ?? visualizationInfo.visualizationType ?? "",
      caption: visualizationInfo.visualizationDefinition ?? "",
    };
  });
}

// Generic "Default Verifier" naming convention (ARCHITECTURE.md's Naming
// convention section) -- a problem can declare more than one verifier class,
// but the detail page shows exactly one, so this always takes the first.
function buildVerifier(verifierClassNames, info, problemInfo) {
  const [firstVerifierClassName] = verifierClassNames ?? [];
  if (!firstVerifierClassName) return null;

  const verifierInfo = info[firstVerifierClassName] ?? {};
  return {
    // Same reason as buildSolvers' className: ProblemProvider/verify is
    // keyed by the verifier class name (T37/#95).
    className: firstVerifierClassName,
    certificateDescription: verifierInfo.verifierDefinition ?? "",
    certificateFormat: problemInfo.certificateFormat || "",
    exampleCertificate: verifierInfo.certificate || undefined,
  };
}

// T53 (#116): `to` entries carry two things T18-era `buildReductions` never needed --
// `className` (the reduction's own class name, e.g. "KarpVertexCoverToSetCover", what
// `ProblemProvider/visualizeReduction?reduction=` takes -- confirmed directly against a
// local Redux backend) and `targetVisualization` (the reduced problem's own default
// visualization, resolved through the exact same `buildVisualizations` this file already
// uses for the current problem). The reduced pane needs a `backendType` to pick a renderer
// the same way the current problem's own visualizations do (VisualizationCanvas ->
// resolveVisualizationType), and `Navigation/Reductions` itself carries no type field for
// either side of a reduction -- VISUALIZATION_TYPE_CONTRACTS.md §5 already rejected
// resolving a universal type by inspecting a frame's own shape ("duck-typing... this
// project would rather have one static, readable map than six inline heuristics"), so this
// resolves the target's type the same static-map way, not by sniffing the fetched frame.
// `from` entries get neither: they're informational only, never selectable
// (ReductionsSection.js), so nothing ever renders a diagram for one.
function buildReductions(
  problemCode,
  reductionGraph,
  codeToName,
  visualizationsByProblem,
  info,
  visualizationTypesByInstance,
) {
  const to = [];
  const from = [];

  for (const [fromCode, toMap] of Object.entries(reductionGraph)) {
    for (const [toCode, edges] of Object.entries(toMap)) {
      for (const edge of edges) {
        if (fromCode === problemCode) {
          const [targetVisualization] = buildVisualizations(
            visualizationsByProblem[toCode],
            info,
            visualizationTypesByInstance,
          );
          to.push({
            target: codeToName.get(toCode) ?? toCode,
            cost: REDUCTION_COST_MAP[edge.cost],
            type: REDUCTION_TYPE_MAP[edge.reductionType],
            className: edge.className,
            targetVisualization: targetVisualization ?? null,
          });
        }
        if (toCode === problemCode) {
          from.push({
            source: codeToName.get(fromCode) ?? fromCode,
            cost: REDUCTION_COST_MAP[edge.cost],
            type: REDUCTION_TYPE_MAP[edge.reductionType],
          });
        }
      }
    }
  }

  return { to, from };
}

function buildProblem(problemCode, info, batches, codeToName) {
  const problemInfo = info[problemCode] ?? {};
  const {
    solversByProblem,
    verifiersByProblem,
    visualizationsByProblem,
    reductionGraph,
    visualizationTypesByInstance,
  } = batches;

  const contributors = Array.isArray(problemInfo.contributors) ? problemInfo.contributors : [];

  // Only the badge row (pages/[problem].js's H1 complexity/problem-type
  // chips) reads `tags`, and only these two facets -- same real-value-then-
  // overlay-then-Unclassified precedence useCatalogIndex.js uses for the
  // whole catalog, called here with just this one problem's own
  // complexityClass so the detail page's badges can never disagree with the
  // card grid's for the same problem.
  const tags = mergeSupplementalTags(problemInfo.problemName ?? problemCode, {
    complexityClass: problemInfo.complexityClass,
  });

  return {
    name: problemInfo.problemName ?? problemCode,
    slug: slugify(problemInfo.problemName ?? problemCode),
    oneLiner: problemInfo.problemDefinition ?? "",
    tags,
    overview: {
      input: problemInfo.instanceFormat || problemInfo.problemDefinition || undefined,
      output: problemInfo.certificateFormat || undefined,
      source: problemInfo.source || undefined,
      contributedBy: contributors.length > 0 ? contributors.join(", ") : undefined,
    },
    // T35 (#93): the instance the Solvers and Verifier sections show, and
    // the prose format describing it, both straight off allInfo. Kept as
    // their own top-level fields rather than folded into `overview`: the
    // Overview mapping has its own instanceFormat-then-problemDefinition
    // fallback chain for a different purpose (see this file's header), and
    // the Solvers format block needs to be able to change without
    // disturbing it. `defaultInstance` is a required IProblem member and
    // all 50 problems supply one (verified against the live API
    // 2026-09-02), but a missing one is still normalized to "" here rather
    // than assumed away, so the input below it is always a string.
    defaultInstance: problemInfo.defaultInstance || "",
    instanceFormat: problemInfo.instanceFormat || "",
    solvers: buildSolvers(solversByProblem[problemCode], info),
    visualizations: buildVisualizations(
      visualizationsByProblem[problemCode],
      info,
      visualizationTypesByInstance,
    ),
    verifier: buildVerifier(verifiersByProblem[problemCode], info, problemInfo),
    reductions: buildReductions(
      problemCode,
      reductionGraph,
      codeToName,
      visualizationsByProblem,
      info,
      visualizationTypesByInstance,
    ),
  };
}

/**
 * Fetches and assembles one problem's full detail-page data -- see file
 * header for the shape contract (matches data/fixtures.js's FixtureProblem)
 * and the name/code resolution and Overview-mapping notes.
 *
 * No backend reachable, or `problemName` matches no real problem -> `error`
 * is set or `problem` stays null, never a crash (#5) -- pages/[problem].js
 * renders its existing "not found" state either way.
 *
 * @param {string} url Base API URL, e.g. `/api/redux/`.
 * @param {string|null} problemName Exact real problem display name (e.g.
 *   "Clique"), or null/undefined while the route param isn't known yet.
 * @returns {{problem: Object|null, loading: boolean, error: Error|null}}
 */
export function useProblemDetail(url, problemName) {
  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!problemName) {
        if (!cancelled) {
          setProblem(null);
          setLoading(false);
          setError(null);
        }
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [
          problemCodes,
          info,
          solversByProblem,
          verifiersByProblem,
          visualizationsByProblem,
          reductionGraph,
          visualizationTypesByInstance,
        ] = await Promise.all([
          requestAllProblems(url),
          requestAllInfo(url),
          requestAllSolvers(url),
          requestAllVerifiers(url),
          requestAllVisualizations(url),
          requestReductionGraph(url),
          // Falls back to allInfo per-instance (buildVisualizations) rather than
          // failing the whole page load -- T40 found some deployments don't have this
          // endpoint yet, which is exactly the case requestAllVisualizationTypes's own
          // doc comment says a caller needs to handle.
          requestAllVisualizationTypes(url).catch(() => null),
        ]);

        if (cancelled) return;

        const safeInfo = info ?? {};
        const codeToName = new Map();
        for (const code of problemCodes ?? []) {
          codeToName.set(code, safeInfo[code]?.problemName ?? code);
        }

        const problemCode = (problemCodes ?? []).find(
          (code) => codeToName.get(code) === problemName,
        );

        if (!problemCode) {
          setProblem(null);
          return;
        }

        setProblem(
          buildProblem(
            problemCode,
            safeInfo,
            {
              solversByProblem: solversByProblem ?? {},
              verifiersByProblem: verifiersByProblem ?? {},
              visualizationsByProblem: visualizationsByProblem ?? {},
              reductionGraph: reductionGraph ?? {},
              visualizationTypesByInstance: visualizationTypesByInstance ?? {},
            },
            codeToName,
          ),
        );
      } catch (caughtError) {
        if (!cancelled) setError(caughtError);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url, problemName]);

  return { problem, loading, error };
}
