// components/workbench/VisualizationPane.js
//
// #229: the picture pane. #279 (board F): now the Workspace's Visualization section (the
// section draws the card and heading; Gadgets follow this, see Workbench.js). #279 stage 3, from
// top to bottom:
//   - the Showing lines. Solve mode: "Problem:" and "Algorithm:" (the solver that drew the
//     picture, or "Not run yet (default picture)"). Reduce mode: one line, "Reduction:", and each
//     picture says its own Problem and Algorithm under its caption;
//   - the pictures, each in a picture frame (./PictureFrame.js) with its Visualization Type
//     dropdown, the zoom buttons and Full screen in its caption. In Reduce mode the source and
//     target sit side by side, the same height, and stack, source first, when the Workspace is
//     960px or narrower. Before a build the target is a placeholder frame, "Not built yet";
//   - a line saying what the picture is, when there is something to say;
//   - the Legend, open by default;
//   - Algorithm Steps: the step controls, closed until a run gives them steps (then they open
//     by themselves, unless the viewer closed them; hooks/useWorkbenchLayout.js remembers that
//     until Reset layout). In Reduce mode its timeline reads Build ── Solve ── Map back.
//
// #215: in Reduce mode, once Redux has sent a Reduction View, the two pictures are that view
// (components/pictures/ReductionView.js) instead. Each of its pictures keeps its Visualization
// Type dropdown in its caption (#912).
//
// The pictures themselves come from the renderers: a format=frames picture through
// components/pictures/PictureCanvas.js (#199), every other one through the older
// VisualizationCanvas. This file only lays them out.

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import StepScrubber from "../detail/StepScrubber";
import VisualizationCanvas from "../detail/visualizations/VisualizationCanvas";
import PictureCanvas from "../pictures/PictureCanvas";
import ReductionView, { ReductionPhaseBar } from "../pictures/ReductionView";
import Legend from "./Legend";
import { COMPACT_MEDIA, SHARED_CONTROL_WIDTH, secondaryButtonSx } from "./layout";
import PictureFrame, { pictureGridSx } from "./PictureFrame";
import TaggedSelect from "./TaggedSelect";

/**
 * The Visualization Type label and dropdown in a picture's caption, after the picture's name
 * (#279 stage 3), so its list opens aligned to its left edge. With a single choice it still
 * shows (so every picture says what type it is, with its tags and info card) but cannot be
 * opened.
 */
function VisualizationTypeControl({ id, options, value, onChange }) {
  return (
    <TaggedSelect
      id={id}
      label="Visualization Type"
      hue="cyan"
      align="left"
      options={options}
      value={value}
      onChange={options.length > 1 ? onChange : undefined}
      boxSx={{ width: SHARED_CONTROL_WIDTH, flex: "none", [COMPACT_MEDIA]: { width: "100%" } }}
    />
  );
}

/**
 * What goes inside one picture frame.
 * @typedef {{kind: "frame", frame: Object, backendType: string, name: string, edit?: Object,
 *     highlightIds?: string[]}
 *   | {kind: "picture", type: string, payload: Object|null, layoutKey?: string, frame: Object,
 *      frameIndex: number|null, frameCount: number, frames?: Object[], name: string,
 *      showCaption: boolean, highlightIds?: string[], runs?: {options: Array<{id: string, label: string, accepted?: boolean}>,
 *        value: string|null, onChange: Function}|null}
 *   | {kind: "loading", text: string}
 *   | {kind: "placeholder", text: string}
 *   | {kind: "message", text: string, tone?: "error"|"muted",
 *      action?: {id: string, label: string, onClick: Function}}} PictureContent
 *   `highlightIds` are the pieces the hovered or focused gadget row names (#229 stage 4).
 *   `frames` are the run's frames the steps walk (#217: a picture whose layout spans the run),
 *   none before Run.
 *   "picture" is a format=frames picture (#199), drawn by the renderer for its `type`;
 *   `frameIndex` is null for the default picture before Run (the plain frame). `runs` are the
 *   other runs the steps can follow instead of the solver's (#204: an NFA's paths), with the
 *   one chosen (null: the solver's own). "placeholder" is the target before a build (#279
 *   stage 3): a dashed frame with no picture tools.
 */
function PictureContentView({ idPrefix, content }) {
  if (content.kind === "frame") {
    const edit = content.edit;
    return (
      <Box sx={{ width: "100%", minWidth: 0 }}>
        <VisualizationCanvas
          idPrefix={`${idPrefix}-canvas`}
          instanceName={content.name}
          backendType={content.backendType}
          frame={content.frame}
          editable={Boolean(edit?.editable)}
          maxLiteralsPerClause={edit?.maxLiteralsPerClause}
          highlightIds={content.highlightIds}
          {...(edit?.handlers ?? {})}
        />
      </Box>
    );
  }
  if (content.kind === "picture") {
    return (
      <PictureCanvas
        idPrefix={`${idPrefix}-frames`}
        name={content.name}
        type={content.type}
        payload={content.payload}
        layoutKey={content.layoutKey}
        frame={content.frame}
        frameIndex={content.frameIndex}
        frameCount={content.frameCount}
        frames={content.frames ?? null}
        showCaption={content.showCaption}
        highlightIds={content.highlightIds}
        runs={content.runs ?? null}
      />
    );
  }
  if (content.kind === "loading") {
    return (
      <Box
        sx={{ display: "flex", alignItems: "center", gap: 1.5, color: "text.secondary" }}
        role="status"
      >
        <CircularProgress size={18} aria-hidden="true" />
        {content.text}
      </Box>
    );
  }
  return (
    <Box
      role={content.kind === "placeholder" ? "note" : undefined}
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 1.5,
        maxWidth: 360,
        textAlign: "center",
        color: content.tone === "error" ? "error.light" : "text.secondary",
      }}
    >
      <Box component="p" sx={{ m: 0 }}>
        {content.text}
      </Box>
      {content.action && (
        <Box
          id={content.action.id}
          component="button"
          type="button"
          onClick={content.action.onClick}
          sx={secondaryButtonSx}
        >
          {content.action.label}
        </Box>
      )}
    </Box>
  );
}

/** One picture in its frame: `side` is `source` or `target` as VisualizationPane takes them. */
function SidePicture({ idPrefix, side, typeId, inGrid, timeline }) {
  const { content } = side;
  const drawn = content.kind === "frame" || content.kind === "picture";
  const placeholder = content.kind === "placeholder";
  return (
    <PictureFrame
      id={`${idPrefix}-frame`}
      title={side.title}
      typeControl={side.type && <VisualizationTypeControl id={typeId} {...side.type} />}
      showing={side.showing ?? null}
      fullScreenTitle={side.fullScreenTitle ?? null}
      inGrid={inGrid}
      tools={!placeholder}
      timeline={timeline}
      align={drawn ? "stretch" : "center"}
    >
      <Box
        id={`${idPrefix}-picture`}
        data-picture-kind={content.kind}
        data-picture-type={content.kind === "picture" ? content.type : undefined}
        data-gadget-highlight-count={
          drawn && content.highlightIds ? content.highlightIds.length : undefined
        }
        sx={{
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: drawn ? "stretch" : "center",
          justifyContent: "center",
        }}
      >
        <PictureContentView idPrefix={idPrefix} content={content} />
      </Box>
    </PictureFrame>
  );
}

/**
 * Algorithm Steps (#279 stage 3): a box that opens and closes like the Legend, holding the
 * reduction's phase timeline (Reduce mode) and the step controls.
 */
function AlgorithmSteps({ idPrefix, open, onToggle, children }) {
  const bodyId = `${idPrefix}-body`;
  return (
    <Box
      id={idPrefix}
      data-open={open ? "true" : "false"}
      sx={{
        borderTop: "1px solid",
        borderColor: "border.soft",
        pt: 0.5,
        display: "flex",
        flexDirection: "column",
        gap: 1,
      }}
    >
      <Box
        id={`${idPrefix}-toggle`}
        component="button"
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={onToggle}
        sx={{
          alignSelf: "flex-start",
          minHeight: 44,
          display: "flex",
          alignItems: "center",
          gap: 1.25,
          background: "none",
          border: "none",
          color: "text.primary",
          p: 0,
          fontFamily: "inherit",
          fontSize: "0.9375rem",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        <ExpandMoreIcon
          aria-hidden="true"
          sx={{ fontSize: 18, transform: open ? "none" : "rotate(-90deg)" }}
        />
        Algorithm Steps
      </Box>
      <Box
        id={bodyId}
        hidden={!open}
        sx={{ display: open ? "flex" : "none", flexDirection: "column", gap: 1, pb: 0.5 }}
      >
        {children}
      </Box>
    </Box>
  );
}

/**
 * The step controls: the reduction's timeline (Reduce mode) and the scrubber, or a line saying
 * there are no steps yet. `prefix` keeps the full-screen copy's ids apart from the section's.
 */
function StepControls({ prefix, steps, reduction, phaseHints, emptyText }) {
  if (!steps) {
    return (
      <Box
        component="p"
        id={`${prefix}-steps-empty`}
        sx={{ m: 0, fontSize: "0.875rem", color: "text.secondary" }}
      >
        {emptyText}
      </Box>
    );
  }
  return (
    <>
      {reduction && (
        <ReductionPhaseBar
          idPrefix={`${prefix}-phases`}
          frames={reduction.view.frames}
          frameIndex={steps.currentStep}
          onStepChange={steps.onStepChange}
          hints={phaseHints}
        />
      )}
      {steps.frameCount > 1 && (
        <StepScrubber
          idPrefix={`${prefix}-steps`}
          frameCount={steps.frameCount}
          currentStep={steps.currentStep}
          onStepChange={steps.onStepChange}
        />
      )}
    </>
  );
}

function ShowingLine({ id, label, value, error = false }) {
  return (
    <>
      <Box component="dt" sx={{ color: "text.secondary" }}>
        {label}
      </Box>
      <Box
        component="dd"
        id={id}
        sx={{
          m: 0,
          fontWeight: 600,
          color: error ? "error.light" : "text.primary",
          overflowWrap: "anywhere",
        }}
      >
        {value}
      </Box>
    </>
  );
}

/**
 * @param {Object} props
 * @param {string} props.idPrefix Prefixes every id rendered here.
 * @param {{problem: string, algorithm: string}|{reduction: string}} props.showing The Showing
 *   lines: Problem and Algorithm in Solve mode, Reduction in Reduce mode.
 * @param {boolean} [props.showingIsError] Draws the Algorithm in the error color.
 * @param {{title: string, type: {options: Array, value: string, onChange?: Function}|null,
 *   content: PictureContent, showing?: {problem: string, algorithm: string}|null,
 *   fullScreenTitle?: string}} props.source The (only, in Solve mode) picture.
 * @param {{title: string, type: {options: Array, value: string}|null, content: PictureContent,
 *   showing?: {problem: string, algorithm: string}|null, fullScreenTitle?: string}|null}
 *   props.target The reduction's target picture, Reduce mode only.
 * @param {{frameCount: number, currentStep: number, onStepChange: Function}|null} props.steps
 * @param {{open: boolean, onToggle: Function, emptyText: string,
 *   phaseHints?: {[phase: string]: string}}} props.algorithmSteps Algorithm Steps' state.
 * @param {{text: string, tone: "muted"|"warning"|"error"}|null} props.note The line under the
 *   pictures.
 * @param {Object[]} props.legendFrames Every frame on screen, for the Legend.
 * @param {Set<string>|null} [props.legendStates] The picture states a format=frames picture
 *   uses (#199), for the Legend.
 * @param {Array<{key: string, text: string, swatch: Object}>|null} [props.legendAnnotations]
 *   What a format=frames picture draws besides states (#201), for the Legend.
 * @param {{view: Object, activeGadget: Object|null, runId: number, loading?: string|null,
 *   types?: {source: Object|null, target: Object|null}}|null} [props.reduction] A Reduction
 *   View to draw in place of `source` and `target` (#215); `steps` walk its frames. `types` are
 *   its sides' Visualization Type dropdowns (ReduxISU/Redux#912), shaped as `source.type`;
 *   `loading` is said in place of the pictures while another picture is drawn.
 */
export default function VisualizationPane({
  idPrefix,
  showing,
  showingIsError,
  source,
  target,
  steps,
  algorithmSteps,
  note,
  legendFrames,
  legendStates,
  legendAnnotations,
  reduction = null,
}) {
  const noteColor =
    note?.tone === "error"
      ? "error.light"
      : note?.tone === "warning"
        ? "viz.orange"
        : "text.secondary";

  // The step controls again at the bottom of a picture in full screen.
  const timeline = (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <StepControls
        prefix={`${idPrefix}-full-screen`}
        steps={steps}
        reduction={reduction}
        phaseHints={algorithmSteps.phaseHints}
        emptyText={algorithmSteps.emptyText}
      />
    </Box>
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, minWidth: 0 }}>
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          gap: "4px 16px",
          fontSize: "0.875rem",
        }}
      >
        <Box id={`${idPrefix}-showing`} aria-live="polite" sx={{ minWidth: 0 }}>
          <Box
            sx={{
              fontSize: "0.75rem",
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "text.secondary",
            }}
          >
            Showing
          </Box>
          <Box
            component="dl"
            sx={{
              m: 0,
              display: "grid",
              gridTemplateColumns: "auto minmax(0, 1fr)",
              columnGap: 3,
              rowGap: 0.25,
            }}
          >
            {"reduction" in showing ? (
              <ShowingLine
                id={`${idPrefix}-showing-reduction`}
                label="Reduction:"
                value={showing.reduction}
              />
            ) : (
              <>
                <ShowingLine
                  id={`${idPrefix}-showing-problem`}
                  label="Problem:"
                  value={showing.problem}
                />
                <ShowingLine
                  id={`${idPrefix}-showing-algorithm`}
                  label="Algorithm:"
                  value={showing.algorithm}
                  error={showingIsError}
                />
              </>
            )}
          </Box>
        </Box>
      </Box>

      {reduction ? (
        <ReductionView
          // A new run, or another picture on either side, starts with nothing pointed at.
          key={`${reduction.runId}:${reduction.view.source.visualization}:${reduction.view.target.visualization}`}
          idPrefix={`${idPrefix}-reduction`}
          view={reduction.view}
          frameIndex={steps?.currentStep ?? 0}
          activeGadget={reduction.activeGadget}
          loading={reduction.loading ?? null}
          colorMode={reduction.colorMode ?? "plain"}
          onColorMode={reduction.onColorMode ?? null}
          timeline={timeline}
          sides={{
            source: {
              title: source.title,
              showing: source.showing ?? null,
              fullScreenTitle: source.fullScreenTitle ?? null,
            },
            target: target
              ? {
                  title: target.title,
                  showing: target.showing ?? null,
                  fullScreenTitle: target.fullScreenTitle ?? null,
                }
              : undefined,
          }}
          typeControls={{
            source: reduction.types?.source && (
              <VisualizationTypeControl
                id={`${idPrefix}-source-type`}
                {...reduction.types.source}
              />
            ),
            target: reduction.types?.target && (
              <VisualizationTypeControl
                id={`${idPrefix}-target-type`}
                {...reduction.types.target}
              />
            ),
          }}
        />
      ) : (
        <Box sx={target ? pictureGridSx : { display: "flex", flexDirection: "column" }}>
          <SidePicture
            idPrefix={`${idPrefix}-source`}
            typeId={`${idPrefix}-source-type`}
            side={source}
            inGrid={Boolean(target)}
            timeline={timeline}
          />
          {target && (
            <SidePicture
              idPrefix={`${idPrefix}-target`}
              typeId={`${idPrefix}-target-type`}
              side={target}
              inGrid
              timeline={timeline}
            />
          )}
        </Box>
      )}

      {note && (
        <Box id={`${idPrefix}-note`} sx={{ fontSize: "0.875rem", color: noteColor }}>
          {note.text}
        </Box>
      )}

      {(legendFrames.some(Boolean) || legendStates) && (
        <Legend
          idPrefix={`${idPrefix}-legend`}
          frames={legendFrames}
          states={legendStates}
          annotations={legendAnnotations}
        />
      )}

      <AlgorithmSteps
        idPrefix={`${idPrefix}-algorithm-steps`}
        open={algorithmSteps.open}
        onToggle={algorithmSteps.onToggle}
      >
        <StepControls
          prefix={idPrefix}
          steps={steps}
          reduction={reduction}
          phaseHints={algorithmSteps.phaseHints}
          emptyText={algorithmSteps.emptyText}
        />
      </AlgorithmSteps>
    </Box>
  );
}
