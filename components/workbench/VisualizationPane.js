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
// Each of its pictures keeps its Visualization Type dropdown at its top right (#912).
//
// #303 (Board G): one picture (Solve and Verify) gets a header row: the Showing line on the
// left, and on the right the Picture menu (the Visualization Type dropdown, renamed as the
// mockup has it), the picture's zoom buttons (DiagramZoom.js renders them into this row through
// ../pictures/zoomControlsSlot.js) and Full screen, all on one line where the width allows. In
// Reduce the Showing line stays above the two pictures, with Full screen at its right, and each
// picture keeps its own zoom buttons. Full screen (Workbench.js) keeps the header row, the
// picture(s) and the steps, and hides the rest: the note and the Legend.
//
// #303 (Board G polish): the order under the picture(s) is the mockup's: the note, the Legend,
// then the steps, with the step's caption on the step bar's "Step N of M:" line (the pictures
// render it into that place through ../pictures/secondarySlots.js StepTextSlot). Every picture sits in a card
// with a hairline border (./layout.js pictureCardSx), the mockup's well, so the picture's edges
// show on the white workspace. The Reduction View's phase buttons sit right above the step
// controls, always shown, the phase holding the step on screen marked, so the reader sees which
// stage the algorithm is in as it walks through its steps. Verify's verdict is a row in the results, so the picture shows
// no verdict of its own; only the "Show where it fails" button would show here, once Redux can
// draw a certificate.
//
// #303 stage 2: Reduce's two pictures are ./PaneGrid.js's panes, before a Reduction View and in
// it: each pane has its label row, its own Picture menu, zoom buttons and Full screen (that
// pane alone, with the steps), the header rows lined up across both, and an arrow between them.
// The Showing line is a line of its own above them, with Full screen for both pictures at its
// right.
//
// The pictures themselves come from the renderers: a format=frames picture through
// components/pictures/PictureCanvas.js (#199), every other one through the older
// VisualizationCanvas. This file only lays them out.

import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import { useContext, useState } from "react";
import StepScrubber from "../detail/StepScrubber";
import VisualizationCanvas from "../detail/visualizations/VisualizationCanvas";
import PictureCanvas from "../pictures/PictureCanvas";
import ReductionView, { ReductionChainHeader, ReductionPhaseBar } from "../pictures/ReductionView";
import { StepTextSlot } from "../pictures/secondarySlots";
import { PictureFullScreen, ZoomControlsSlot } from "../pictures/zoomControlsSlot";
import Legend from "./Legend";
import {
  COMPACT_MEDIA,
  PHONE_MEDIA,
  pictureCardSx,
  SHARED_CONTROL_WIDTH,
  secondaryButtonSx,
} from "./layout";
import { FullScreenButton, PaneGrid, PaneSection } from "./PaneGrid";
import TaggedSelect from "./TaggedSelect";

const PICTURE_MIN_HEIGHT = 440;

/** The shortest the picture's card gets on full screen; a shorter window scrolls instead. */
const FULL_PICTURE_MIN_HEIGHT = 280;

/**
 * The step's caption on full screen: a fixed height that scrolls, so a longer caption neither
 * pushes the controls off the window nor resizes the picture from one step to the next.
 */
const FULL_STEP_TEXT_HEIGHT = "4.5rem";

/**
 * The Visualization Type label and dropdown at a picture's top right, its list opening
 * aligned to the right edge. With a single choice it still shows (so every picture says what
 * type it is, with its tags and info card) but cannot be opened. #303: labelled "Picture", as
 * Board G has it; `inline` puts the label beside the box, on the header row, with the (i) after
 * the box, so a long label or picture name never crowds them. `menu` (Reduce's
 * panes) keeps it a dropdown that opens even with one choice; picking the picture already
 * drawn changes nothing.
 */
function VisualizationTypeControl({ id, options, value, onChange, inline = false, menu = false }) {
  let pick;
  if (menu)
    pick = (next) => {
      if (next !== value) onChange?.(next);
    };
  else if (options.length > 1) pick = onChange;
  return (
    <TaggedSelect
      id={id}
      label="Picture"
      hue="cyan"
      align="right"
      options={options}
      value={value}
      onChange={pick}
      labelPlacement={inline ? "row" : "stack"}
      infoPlacement={inline ? "box" : "label"}
      boxSx={
        // These widths count the (i), which is 48px with its gap. Reduce's panes are narrower:
        // the menu shrinks first, so Full screen stays on its row.
        menu
          ? { flex: "1 1 228px", maxWidth: 348, minWidth: 198 }
          : inline
            ? { flex: "0 1 348px", minWidth: 248, [PHONE_MEDIA]: { flex: "1 1 248px" } }
            : { width: SHARED_CONTROL_WIDTH, flex: "none", [COMPACT_MEDIA]: { width: "100%" } }
      }
    />
  );
}

/** The Showing line: what drew the picture. */
function ShowingLine({ id, text, isError }) {
  return (
    <Box
      component="p"
      sx={{
        m: 0,
        display: "flex",
        flexWrap: "wrap",
        alignItems: "baseline",
        gap: "4px 10px",
        fontSize: "0.875rem",
        minWidth: 0,
      }}
    >
      <Box component="span" sx={{ fontWeight: 600, color: "text.secondary" }}>
        Showing
      </Box>
      <Box
        component="span"
        id={id}
        aria-live="polite"
        sx={{ fontWeight: 700, color: isError ? "error.light" : "text.primary" }}
      >
        {text}
      </Box>
    </Box>
  );
}

/**
 * The verdict of the last check (#229 stage 3), under the header row. #303: shown only with its
 * "Show where it fails" button (the verdict itself is a result row).
 */
function VerdictLine({ verdict }) {
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px 10px" }}>
      <Box
        component="span"
        id={verdict.id}
        role="status"
        data-valid={String(verdict.valid)}
        sx={{
          fontSize: "0.875rem",
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
        <Box
          id={verdict.button.id}
          component="button"
          type="button"
          aria-pressed={verdict.button.pressed}
          onClick={verdict.button.onClick}
          sx={{ ...secondaryButtonSx, px: 1.5, ml: "auto" }}
        >
          {verdict.button.label}
        </Box>
      )}
    </Box>
  );
}

/**
 * What goes inside one picture box.
 * @typedef {{kind: "frame", frame: Object, backendType: string, name: string, edit?: Object,
 *     highlightIds?: string[]}
 *   | {kind: "picture", type: string, payload: Object|null, layoutKey?: string, frame: Object,
 *      frameIndex: number|null, frameCount: number, frames?: Object[], name: string,
 *      showCaption: boolean, highlightIds?: string[], runs?: {options: Array<{id: string, label: string, accepted?: boolean}>,
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
  const full = useContext(PictureFullScreen);
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
        highlightIds={content.highlightIds}
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
        (content.kind === "frame" || content.kind === "picture") && content.highlightIds
          ? content.highlightIds.length
          : undefined
      }
      sx={{
        // #303: the picture's card (./layout.js pictureCardSx), in Solve, Verify and Reduce.
        ...pictureCardSx,
        minHeight: content.compact ? 160 : full ? FULL_PICTURE_MIN_HEIGHT : PICTURE_MIN_HEIGHT,
        alignItems: "center",
        overflowX: "auto",
        [COMPACT_MEDIA]: {
          minHeight: content.compact ? 160 : full ? FULL_PICTURE_MIN_HEIGHT : 320,
        },
      }}
    >
      {inner}
    </Box>
  );
}

/**
 * @param {Object} props
 * @param {string} props.idPrefix Prefixes every id rendered here.
 * @param {string} props.showing The Showing line's text.
 * @param {boolean} [props.showingIsError] Draws the Showing text in the error color.
 * @param {{id: string, text: string, valid: boolean|null, button: {id: string, label: string,
 *   pressed: boolean, onClick: Function}|null}|null} [props.verdict] Verify's verdict (#229
 *   stage 3), under the header row, with the "Show where it fails" / "Back to ..." button when
 *   it has one (none until Redux can draw a certificate).
 * @param {{parts?: Array<{k: string, v: string}>, type: {options: Array, value: string,
 *   onChange?: Function}|null, content: PictureContent}} props.source The (only, in Solve and
 *   Verify) picture. `parts` is its pane's label row in Reduce (./PaneGrid.js).
 * @param {{parts: Array<{k: string, v: string}>, type: {options: Array, value: string}|null,
 *   content: PictureContent}|null} props.target The reduction's target picture, Reduce only.
 * @param {{frameCount: number, currentStep: number, onStepChange: Function}|null} props.steps
 * @param {{text: string, tone: "muted"|"warning"|"error"}|null} props.note The line shown
 *   under the pictures when there are no steps to explain them.
 * @param {Object[]} props.legendFrames Every frame on screen, for the Legend.
 * @param {Set<string>|null} [props.legendStates] The picture states a format=frames picture
 *   uses (#199), for the Legend.
 * @param {Array<{key: string, text: string, swatch: Object}>|null} [props.legendAnnotations]
 *   What a format=frames picture draws besides states (#201), for the Legend.
 * @param {{view: Object, activeGadget: Object|null, runId: number, loading?: string|null,
 *   types?: {source: Object|null, target: Object|null}}|null} [props.reduction] A Reduction
 *   View to draw in place of `source` and `target` (#215); `steps` walk its frames. `types` are
 *   its sides' Picture dropdowns (ReduxISU/Redux#912), shaped as `source.type`; `loading` is
 *   said in place of the pictures while another picture is drawn. `chain`, for a chain of
 *   reductions (lib/reductionChain.js): `view` is the hop drawn now and `steps` walk the whole
 *   chain, so `chain.frameIndex` is the hop's own frame, `chain.onLocalStep` moves to one of the
 *   hop's frames, `chain.phases` are the hop's phases, and the header (title, hops, current,
 *   onHop, end) sits above the pictures.
 * @param {{on: "all"|"source"|"target"|null, onToggle: (which: "all"|"source"|"target") =>
 *   void}} props.fullScreen #303: what is on full screen (the workspace then shows only the
 *   picture(s) and the steps): everything, or one of Reduce's two panes alone (stage 2), and the
 *   buttons that switch it.
 */
export default function VisualizationPane({
  idPrefix,
  showing,
  showingIsError,
  verdict,
  source,
  target,
  steps,
  note,
  legendFrames,
  legendStates,
  legendAnnotations,
  reduction = null,
  fullScreen,
}) {
  // #303: the row DiagramZoom.js puts a single picture's zoom buttons on.
  const [zoomSlot, setZoomSlot] = useState(null);
  // #303: where the step's caption goes, under the step controls.
  const [stepTextSlot, setStepTextSlot] = useState(null);
  const single = !reduction && !target;
  const full = fullScreen.on;
  const only = full === "source" || full === "target" ? full : null;
  const noteColor =
    note?.tone === "error"
      ? "error.light"
      : note?.tone === "warning"
        ? "viz.orange"
        : "text.secondary";
  // Solve's one button, or Reduce's both-pictures button beside the Showing line (stage 2).
  const fullButton = (
    <FullScreenButton
      id={`${idPrefix}-full-screen`}
      on={full === "all"}
      onToggle={() => fullScreen.onToggle("all")}
      label={single ? "Full screen" : "Full screen: both pictures side by side"}
      text={!single}
    />
  );
  // Each Reduce pane's own button (stage 2).
  const paneFull = (which) => ({
    id: `${idPrefix}-${which}-full-screen`,
    on: full === which,
    onToggle: () => fullScreen.onToggle(which),
  });
  const showingLine = (
    <ShowingLine id={`${idPrefix}-showing`} text={showing} isError={showingIsError} />
  );
  // Reduce's panes (`menu`) keep their Picture menus dropdowns even with one picture.
  const typeControl = (which, type, menu = false) =>
    type && (
      <VisualizationTypeControl id={`${idPrefix}-${which}-type`} inline menu={menu} {...type} />
    );

  return (
    <StepTextSlot.Provider value={stepTextSlot}>
      <Box
        component="section"
        aria-label="Visualization"
        id={`${idPrefix}-pane`}
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: "14px",
          minWidth: 0,
          // On full screen the pane takes the window's height and the picture what the title and
          // controls leave: every box around a picture's area grows, whichever renderer drew it.
          ...(full
            ? {
                flex: "1 1 auto",
                "& :has([data-zoom-area]):not([data-pane-side]):not([data-pane-grid])": {
                  display: "flex",
                  flexDirection: "column",
                  flex: "1 1 auto",
                  width: "100%",
                  minWidth: 0,
                },
                [`& #${idPrefix}-step-text:not(:empty)`]: {
                  flex: "none",
                  height: FULL_STEP_TEXT_HEIGHT,
                  overflowY: "auto",
                },
              }
            : {}),
        }}
      >
        {single ? (
          <Box
            component="figure"
            id={`${idPrefix}-figure`}
            sx={{
              m: 0,
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
              minWidth: 0,
              ...(full ? { flex: "1 1 auto" } : {}),
            }}
          >
            <Box
              id={`${idPrefix}-picture-header`}
              sx={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px 12px",
              }}
            >
              <Box sx={{ flex: "1 1 240px", minWidth: 0 }}>{showingLine}</Box>
              <Box
                id={`${idPrefix}-picture-controls`}
                sx={{
                  flex: "0 1 auto",
                  minWidth: 0,
                  display: "flex",
                  flexWrap: "nowrap",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: "6px 8px",
                  [COMPACT_MEDIA]: { flexWrap: "wrap", justifyContent: "flex-start" },
                }}
              >
                {typeControl("source", source.type)}
                <Box
                  ref={setZoomSlot}
                  id={`${idPrefix}-zoom-slot`}
                  sx={{
                    display: "flex",
                    flex: "none",
                    alignItems: "center",
                    whiteSpace: "nowrap",
                    "&:empty": { display: "none" },
                  }}
                />
                {fullButton}
              </Box>
            </Box>
            {!full && verdict?.button && <VerdictLine verdict={verdict} />}
            <ZoomControlsSlot.Provider value={zoomSlot}>
              <PictureBox idPrefix={`${idPrefix}-source`} content={source.content} />
            </ZoomControlsSlot.Provider>
          </Box>
        ) : (
          <>
            {/* #303 stage 2: in Reduce the Showing line is a line of its own above the two panes,
              with the both-pictures Full screen at its right. */}
            <Box
              id={`${idPrefix}-showing-row`}
              sx={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px 16px",
              }}
            >
              {showingLine}
              {fullButton}
            </Box>
            {!full && verdict?.button && <VerdictLine verdict={verdict} />}
            {reduction?.chain && (
              <ReductionChainHeader
                idPrefix={`${idPrefix}-chain`}
                title={reduction.chain.title}
                hops={reduction.chain.hops}
                current={reduction.chain.current}
                onHop={reduction.chain.onHop}
                end={reduction.chain.end}
              />
            )}
            {reduction ? (
              <ReductionView
                // A new run, or another picture on either side, starts with nothing pointed at.
                key={`${reduction.runId}:${reduction.view.source.visualization}:${reduction.view.target.visualization}`}
                idPrefix={`${idPrefix}-reduction`}
                view={reduction.view}
                frameIndex={
                  reduction.chain ? reduction.chain.frameIndex : (steps?.currentStep ?? 0)
                }
                activeGadget={reduction.activeGadget}
                loading={reduction.loading ?? null}
                colorMode={reduction.colorMode ?? "plain"}
                onColorMode={reduction.onColorMode ?? null}
                labels={{ source: source.parts, target: target?.parts }}
                full={{ source: paneFull("source"), target: paneFull("target") }}
                only={only}
                typeControls={{
                  source: typeControl("source", reduction.types?.source, true),
                  target: typeControl("target", reduction.types?.target, true),
                }}
              />
            ) : (
              <PaneGrid
                id={`${idPrefix}-panes`}
                only={only}
                source={
                  <PaneSection
                    id={`${idPrefix}-source`}
                    which="source"
                    parts={source.parts}
                    full={paneFull("source")}
                    hidden={only === "target"}
                    typeControl={typeControl("source", source.type, true)}
                  >
                    <PictureBox idPrefix={`${idPrefix}-source`} content={source.content} />
                  </PaneSection>
                }
                target={
                  <PaneSection
                    id={`${idPrefix}-target`}
                    which="target"
                    parts={target.parts}
                    full={paneFull("target")}
                    hidden={only === "source"}
                    typeControl={typeControl("target", target.type, true)}
                  >
                    <PictureBox idPrefix={`${idPrefix}-target`} content={target.content} />
                  </PaneSection>
                }
              />
            )}
          </>
        )}

        {note && !full && (
          <Box id={`${idPrefix}-note`} sx={{ fontSize: "0.875rem", color: noteColor }}>
            {note.text}
          </Box>
        )}

        {(legendFrames.some(Boolean) || legendStates) && !full && (
          <Legend
            idPrefix={`${idPrefix}-legend`}
            frames={legendFrames}
            states={legendStates}
            annotations={legendAnnotations}
          />
        )}

        {/* #303: the phases, right above the step controls, the step's phase marked. */}
        {reduction && steps && (
          <ReductionPhaseBar
            idPrefix={`${idPrefix}-phases`}
            frames={reduction.view.frames}
            frameIndex={reduction.chain ? reduction.chain.frameIndex : steps.currentStep}
            onStepChange={reduction.chain ? reduction.chain.onLocalStep : steps.onStepChange}
            phases={reduction.chain?.phases}
          />
        )}
        {/* #303: the step bar, the step's description on its "Step N of M:" line. */}
        {steps && steps.frameCount > 1 ? (
          <StepScrubber
            idPrefix={`${idPrefix}-steps`}
            frameCount={steps.frameCount}
            currentStep={steps.currentStep}
            onStepChange={steps.onStepChange}
            textRef={setStepTextSlot}
            textId={`${idPrefix}-step-text`}
          />
        ) : (
          <Box
            ref={setStepTextSlot}
            id={`${idPrefix}-step-text`}
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 1,
              "&:empty": { display: "none" },
            }}
          />
        )}
      </Box>
    </StepTextSlot.Provider>
  );
}
