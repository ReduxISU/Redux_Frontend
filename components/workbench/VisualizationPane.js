// components/workbench/VisualizationPane.js
//
// #229: the picture pane. From top to bottom:
//   - a Showing line naming what drew the picture ("3SAT Backtracking", "3SAT -> CLIQUE
//     (...)", or "Not run yet. Showing the default picture of the instance.");
//   - the picture, with its Visualization Type label and dropdown at its top right. In Reduce
//     mode the source and target pictures sit side by side, and stack when a panel is open
//     (or when the screen is too narrow for both);
//   - step controls under the picture (components/detail/StepScrubber.js) when the run
//     recorded steps, otherwise one line saying what the picture is;
//   - the Legend, open by default.
//
// #215: in Reduce mode, once Redux has sent a Reduction View, the two pictures are that view
// (components/pictures/ReductionView.js) instead, and its phase bar sits above the step controls.
//
// The pictures themselves come from the renderers: a format=frames picture through
// components/pictures/PictureCanvas.js (#199), every other one through the older
// VisualizationCanvas. This file only lays them out.

import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import StepScrubber from "../detail/StepScrubber";
import VisualizationCanvas from "../detail/visualizations/VisualizationCanvas";
import PictureCanvas from "../pictures/PictureCanvas";
import ReductionView, { ReductionPhaseBar } from "../pictures/ReductionView";
import Legend from "./Legend";
import { COMPACT_MEDIA, cardSx, SHARED_CONTROL_WIDTH, secondaryButtonSx } from "./layout";
import TaggedSelect from "./TaggedSelect";

const PICTURE_MIN_HEIGHT = 440;

/**
 * The Visualization Type label and dropdown at a picture's top right, its list opening
 * aligned to the right edge. With a single choice it still shows (so every picture says what
 * type it is, with its tags and info card) but cannot be opened.
 */
function VisualizationTypeControl({ id, options, value, onChange }) {
  return (
    <TaggedSelect
      id={id}
      label="Visualization Type"
      hue="cyan"
      align="right"
      options={options}
      value={value}
      onChange={options.length > 1 ? onChange : undefined}
      boxSx={{ width: SHARED_CONTROL_WIDTH, flex: "none", [COMPACT_MEDIA]: { width: "100%" } }}
    />
  );
}

/**
 * What goes inside one picture box.
 * @typedef {{kind: "frame", frame: Object, backendType: string, name: string, edit?: Object,
 *     highlightIds?: string[]}
 *   | {kind: "picture", type: string, payload: Object|null, layoutKey?: string, frame: Object,
 *      frameIndex: number|null, frameCount: number, frames?: Object[], name: string,
 *      showCaption: boolean, runs?: {options: Array<{id: string, label: string, accepted?: boolean}>,
 *        value: string|null, onChange: Function}|null}
 *   | {kind: "loading", text: string}
 *   | {kind: "message", text: string, tone?: "error"|"muted", compact?: boolean,
 *      action?: {id: string, label: string, onClick: Function}}} PictureContent
 *   `compact` draws a short box (no picture is coming, so no room is held for one).
 *   `highlightIds` are the pieces the hovered or focused gadget row names (#229 stage 4).
 *   `frames` are the run's frames the steps walk (#217: a picture whose layout spans the run),
 *   none before Run.
 *   "picture" is a format=frames picture (#199), drawn by the renderer for its `type`;
 *   `frameIndex` is null for the default picture before Run (the plain frame). `runs` are the
 *   other runs the steps can follow instead of the solver's (#204: an NFA's paths), with the
 *   one chosen (null: the solver's own).
 */
function PictureBox({ idPrefix, content }) {
  let inner;
  if (content.kind === "frame") {
    const edit = content.edit;
    inner = (
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
  } else if (content.kind === "picture") {
    inner = (
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
        runs={content.runs ?? null}
      />
    );
  } else if (content.kind === "loading") {
    inner = (
      <Box
        sx={{ display: "flex", alignItems: "center", gap: 1.5, color: "text.secondary" }}
        role="status"
      >
        <CircularProgress size={18} aria-hidden="true" />
        {content.text}
      </Box>
    );
  } else {
    inner = (
      <Box
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

  return (
    <Box
      id={`${idPrefix}-picture`}
      data-picture-kind={content.kind}
      data-picture-type={content.kind === "picture" ? content.type : undefined}
      data-gadget-highlight-count={
        content.kind === "frame" && content.highlightIds ? content.highlightIds.length : undefined
      }
      sx={{
        minHeight: content.compact ? 160 : PICTURE_MIN_HEIGHT,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflowX: "auto",
        backgroundColor: "surface.input",
        borderRadius: "10px",
        p: 2,
        boxSizing: "border-box",
        [COMPACT_MEDIA]: { minHeight: content.compact ? 160 : 320 },
      }}
    >
      {inner}
    </Box>
  );
}

function PictureColumn({ idPrefix, title, typeControl, content, basis }) {
  return (
    <Box
      sx={{
        flex: `1 1 ${basis}`,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        gap: 1,
        [COMPACT_MEDIA]: { flexBasis: "380px" },
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: 1,
        }}
      >
        <Box sx={{ fontWeight: 600, pb: 1.25 }}>{title}</Box>
        {typeControl}
      </Box>
      <PictureBox idPrefix={idPrefix} content={content} />
    </Box>
  );
}

/**
 * @param {Object} props
 * @param {string} props.idPrefix Prefixes every id rendered here.
 * @param {string} props.showing The Showing line's text.
 * @param {boolean} [props.showingIsError] Draws the Showing text in the error color.
 * @param {{id: string, text: string, valid: boolean|null, button: {id: string, label: string,
 *   pressed: boolean, disabled: boolean, reason: string, onClick: Function}|null}|null}
 *   [props.verdict] Verify's verdict, at the right of the Showing line (#229 stage 3), with
 *   the "Show where it fails" / "Back to ..." button when it has one.
 * @param {boolean} props.stack Stack the source and target pictures (a panel is open).
 * @param {{title: string, type: {options: Array, value: string, onChange?: Function}|null,
 *   content: PictureContent}} props.source The (only, in Solve mode) picture.
 * @param {{title: string, type: {options: Array, value: string}|null,
 *   content: PictureContent}|null} props.target The reduction's target picture, Reduce mode only.
 * @param {{frameCount: number, currentStep: number, onStepChange: Function}|null} props.steps
 * @param {{text: string, tone: "muted"|"warning"|"error"}|null} props.note The line shown in
 *   place of the step controls.
 * @param {Object[]} props.legendFrames Every frame on screen, for the Legend.
 * @param {Set<string>|null} [props.legendStates] The picture states a format=frames picture
 *   uses (#199), for the Legend.
 * @param {Array<{key: string, text: string, swatch: Object}>|null} [props.legendAnnotations]
 *   What a format=frames picture draws besides states (#201), for the Legend.
 * @param {{view: Object, activeGadget: Object|null, runId: number}|null} [props.reduction] A
 *   Reduction View to draw in place of `source` and `target` (#215); `steps` walk its frames.
 */
export default function VisualizationPane({
  idPrefix,
  showing,
  showingIsError,
  verdict,
  stack,
  source,
  target,
  steps,
  note,
  legendFrames,
  legendStates,
  legendAnnotations,
  reduction = null,
}) {
  const basis = target && stack ? "100%" : "380px";
  const noteColor =
    note?.tone === "error"
      ? "error.light"
      : note?.tone === "warning"
        ? "viz.orange"
        : "text.secondary";

  return (
    <Box
      component="section"
      aria-label="Visualization"
      id={`${idPrefix}-pane`}
      sx={{ ...cardSx, p: 1.5, display: "flex", flexDirection: "column", gap: 1.5 }}
    >
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "baseline",
          gap: "4px 10px",
          fontSize: "0.875rem",
        }}
      >
        <Box
          component="span"
          sx={{
            fontSize: "0.75rem",
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "text.secondary",
          }}
        >
          Showing
        </Box>
        <Box
          component="span"
          id={`${idPrefix}-showing`}
          aria-live="polite"
          sx={{ fontWeight: 600, color: showingIsError ? "error.light" : "text.primary" }}
        >
          {showing}
        </Box>
        {verdict && (
          <Box
            component="span"
            sx={{
              ml: "auto",
              display: "inline-flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "6px 10px",
            }}
          >
            <Box
              component="span"
              id={verdict.id}
              role="status"
              data-valid={String(verdict.valid)}
              sx={{
                fontWeight: 600,
                color:
                  verdict.valid === true
                    ? "success.light"
                    : verdict.valid === false
                      ? "error.light"
                      : "text.primary",
              }}
            >
              {verdict.text}
            </Box>
            {verdict.button && (
              <>
                <Box
                  id={verdict.button.id}
                  component="button"
                  type="button"
                  aria-pressed={verdict.button.pressed}
                  disabled={verdict.button.disabled}
                  aria-describedby={
                    verdict.button.reason ? `${verdict.button.id}-reason` : undefined
                  }
                  onClick={verdict.button.onClick}
                  sx={{ ...secondaryButtonSx, px: 1.5 }}
                >
                  {verdict.button.label}
                </Box>
                {verdict.button.reason && (
                  <Box
                    component="span"
                    id={`${verdict.button.id}-reason`}
                    sx={{ fontSize: "0.8125rem", color: "text.secondary" }}
                  >
                    {verdict.button.reason}
                  </Box>
                )}
              </>
            )}
          </Box>
        )}
      </Box>

      {reduction ? (
        <ReductionView
          key={reduction.runId}
          idPrefix={`${idPrefix}-reduction`}
          view={reduction.view}
          frameIndex={steps?.currentStep ?? 0}
          stack={stack}
          activeGadget={reduction.activeGadget}
        />
      ) : (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: "14px" }}>
          <PictureColumn
            idPrefix={`${idPrefix}-source`}
            title={source.title}
            basis={basis}
            content={source.content}
            typeControl={
              source.type && (
                <VisualizationTypeControl id={`${idPrefix}-source-type`} {...source.type} />
              )
            }
          />
          {target && (
            <PictureColumn
              idPrefix={`${idPrefix}-target`}
              title={target.title}
              basis={basis}
              content={target.content}
              typeControl={
                target.type && (
                  <VisualizationTypeControl id={`${idPrefix}-target-type`} {...target.type} />
                )
              }
            />
          )}
        </Box>
      )}

      {reduction && steps && (
        <ReductionPhaseBar
          idPrefix={`${idPrefix}-phases`}
          frames={reduction.view.frames}
          frameIndex={steps.currentStep}
          onStepChange={steps.onStepChange}
        />
      )}
      {steps && steps.frameCount > 1 && (
        <StepScrubber
          idPrefix={`${idPrefix}-steps`}
          frameCount={steps.frameCount}
          currentStep={steps.currentStep}
          onStepChange={steps.onStepChange}
        />
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
    </Box>
  );
}
