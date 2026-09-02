// components/StartupSplash.js
//
// T43 (#65): the one-time startup animation on the Home page. Original
// idea from Corbin Hay.
//
// Seven steps: a blank screen, a horizontal line draws itself in, the REDUX
// wordmark slides right out of that line a letter at a time, the line
// travels left into the place the arrow occupies, it folds down into a ">"
// prompt, a thick underline grows from the left of the ">" rightward to the
// right edge of the title, and then the whole screen fades out to the Home
// page underneath.
//
// The line and the arrow are the same object throughout. The two arms of
// the ">" start life lying on top of each other pointing left (LINE_ANGLE),
// which is what the "line" in steps 2 to 4 actually is, and the fold is
// them opening symmetrically to +/-45 degrees off that. Nothing appears,
// disappears or is duplicated: one shape moves and changes pose, which is
// what lets the sequence read as a single continuous idea rather than a
// series of separate tricks.
//
// -----------------------------------------------------------------------
// Why this is all CSS and no requestAnimationFrame
// -----------------------------------------------------------------------
// Per the issue: the browser already interpolates at the display's refresh
// rate, so a JS frame loop buys nothing here except jank and battery. Every
// moving part below is a CSS keyframe animation with its own delay,
// duration and easing curve. React only decides which of the five phases
// the overlay is in (see PHASES below); it never drives a frame.
//
// The issue also names the three specific things that make motion read as
// robotic, so, explicitly, for each:
//   - Linear easing: nothing here uses `linear`. The named curves below
//     accelerate and decelerate, and the two that should feel physical
//     (the bar shooting up out of the ground, the tilt landing) overshoot
//     slightly and settle rather than arriving exactly on target.
//   - Strictly sequential steps: every step starts before the previous one
//     has finished. The wordmark starts sliding out at 560ms while the line
//     is still drawing to 680ms; the fold starts at 1560ms while the line is
//     still travelling to 1720ms. The overlap is what makes it read as one
//     movement instead of a seven-slide slideshow.
//   - Uniform durations: they range from 420ms (the shift, which wants to be
//     quick) to 900ms (the title and the underline, which want to be
//     deliberate).
//
// The finished logo then sits still for SETTLE_MS before anything fades.
// Without that beat the last step's easing runs straight into the fade and
// the animation reads as if it were cut off at the end rather than arriving
// somewhere.
//
// Timing is a first pass and a judgment call, not something that can be
// verified mechanically. Expect to tune the numbers in STEPS with the
// project owner.
//
// -----------------------------------------------------------------------
// The loading gate
// -----------------------------------------------------------------------
// The animation doubles as cover for the catalog's first load, so it holds
// after finishing until Home's data has arrived. The `ready` prop is the
// whole backend signal: pages/index.js passes `!loading` straight off the
// catalog fetch hooks/useCatalogIndex.js already makes. Deliberately NOT a
// probe of /api/health, per the issue and per that route's own comment: it
// answers {status:"ok"} unconditionally so `rbs integration-test` can poll
// it for container readiness, so it reports that Next is serving, not that
// the Redux backend is reachable.
//
// `ready` goes true when the catalog fetch settles either way, success or
// failure, which is what makes the three backend states in the issue's
// table fall out of one rule:
//   - Reachable:   the fetch resolves, usually while the animation is still
//                  playing, so the overlay fades the moment the animation
//                  reaches its preset end.
//   - Unreachable: the fetch rejects (or the proxy 502s) just as promptly,
//                  so this behaves the same way and lands on the existing
//                  backend-unreachable banner from T29 (#38).
//   - Slow:        the fetch hasn't settled by the time the animation ends,
//                  so the overlay holds, but only up to MAX_HOLD_MS, then
//                  fades into T29's normal loading presentation regardless.
// There is no path that waits on the backend forever (ground rule 6).
//
// -----------------------------------------------------------------------
// Accessibility
// -----------------------------------------------------------------------
// This is a decorative overlay, not a dialog. It is `aria-hidden`, it holds
// nothing focusable, and it never moves or traps focus: the real Home page
// is mounted underneath the whole time, so a screen reader user reads the
// site normally while this plays purely visually. It is skippable by click,
// spacebar or Escape, it honours `prefers-reduced-motion` by never showing
// at all, and it plays once per server start rather than on every
// navigation back to Home or every reload (see SPLASH_BOOT_KEY below).
//
// If scripting fails outright, the <noscript> rule below removes the
// overlay so the page underneath is still there. (Without JavaScript this
// app has no catalog data either, but a permanently-covered page would be
// strictly worse than an empty one.)

import { keyframes } from "@emotion/react";
import Box from "@mui/material/Box";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";

// localStorage key holding the server boot id (lib/serverBootId.js) this
// browser last played the splash for.
//
// localStorage rather than sessionStorage, and a boot id rather than a bare
// "seen" flag, because the question being answered changed: not "has this
// tab seen it" but "has this browser seen it since the server last
// started". sessionStorage would replay on every new tab and forget on
// every browser restart, neither of which has anything to do with the
// server starting up.
//
// The practical consequence is worth being clear about: on a server that
// stays up for weeks, nobody who has already visited sees the animation
// again for weeks, and that is the intent rather than a side effect.
const SPLASH_BOOT_KEY = "redux-startup-splash-boot";

// --- Timing -------------------------------------------------------------
//
// Every step's start offset and length, in milliseconds from the moment the
// overlay starts playing. Overlaps between them are deliberate (see the
// header). Recorded as a decision on #65.
const STEPS = {
  // Step 2: the horizontal line draws itself in, leftward from the point the
  // wordmark will come out of.
  draw: { delay: 160, duration: 520 },
  // Step 3: REDUX slides right out of the line, a letter at a time.
  title: { delay: 560, duration: 900 },
  // Step 4: the line travels left into the place the arrow occupies. The
  // quickest step by some way.
  shift: { delay: 1300, duration: 420 },
  // Step 5: the line folds into the ">".
  fold: { delay: 1560, duration: 560 },
  // Step 6: the underline grows left to right.
  underline: { delay: 1980, duration: 900 },
};

// Step 6 finishes last, so the animation's own length is its end.
const ANIMATION_MS = STEPS.underline.delay + STEPS.underline.duration;

// The beat after the last step lands, before anything starts fading. The
// logo is finished and completely still for this long. Short enough that it
// reads as the end of a movement rather than as the page having stopped
// doing anything, which is roughly where a still frame starts to worry
// people. Runs whether or not the catalog has arrived, so the ending looks
// the same on a fast backend as on a slow one.
const SETTLE_MS = 650;

// How long the overlay will hold past the end of the animation waiting for
// the catalog, before giving up and fading into T29's loading state anyway.
// 2500ms is roughly the cold-start cost of the six batch endpoints
// hooks/useCatalogIndex.js requests through the proxy on a slow connection.
// Past that a splash stops reading as a splash and starts reading as a hung
// page. Recorded as a decision on #65, along with the step timings above,
// the settle beat and the fade below.
//
// Two totals worth knowing, both longer than the first pass at this:
//   - Ordinary case, backend answers during the animation:
//     2880 + 650 + 900 = about 4.4 seconds.
//   - Worst case, backend never answers and the hold runs out:
//     2880 + 650 + 2500 + 900 = about 6.9 seconds.
const MAX_HOLD_MS = 2500;

// Step 7: the fade out to the Home page. Deliberately unhurried, so the
// overlay dissolves into the page rather than being switched off. A skip
// still pays this in full, which is the one argument against a fade this
// long, but Escape at least starts it immediately rather than waiting for
// the animation to finish first.
const FADE_MS = 900;

// --- Easing -------------------------------------------------------------
// Named rather than inlined so the same intent is reused, and so the
// "nothing here is linear" claim above is checkable at a glance.
const EASE_LAUNCH = "cubic-bezier(0.16, 1.22, 0.32, 1.04)"; // shoots out, overshoots, settles
const EASE_SNAP = "cubic-bezier(0.34, 1.3, 0.5, 1)"; // quick, small overshoot on arrival
const EASE_EMERGE = "cubic-bezier(0.16, 1, 0.3, 1)"; // fast out of the gate, long soft landing
const EASE_SWEEP = "cubic-bezier(0.6, 0.02, 0.24, 1.03)"; // accelerates into the sweep, eases out
const EASE_DELIBERATE = "cubic-bezier(0.22, 0.85, 0.18, 1)"; // unhurried, no overshoot

// --- Geometry -----------------------------------------------------------
//
// Each arm of the ">" is a vertical bar rotated about its own bottom end,
// so both arms pivot around the single point that becomes the vertex of the
// ">" on the right. From vertical, the upper arm swings to -45deg (top end
// up and to the left, a "\") and the lower arm continues round to -135deg
// (down and to the left, a "/"), giving a 90 degree chevron.
//
// Everything here is in `em` against TYPE_SIZE below, not pixels. The ">"
// is sized to the REDUX letters beside it, and that type size is a clamp on
// the viewport, so a fixed-pixel glyph would only match the text at one
// screen width and drift at every other. In em the whole lockup scales as
// one thing.

// Keeps the em values below to three decimals. They are derived from each
// other, and CSS lengths carrying fifteen significant figures are unreadable
// in devtools for no gain at these sizes (a thousandth of an em is well
// under a tenth of a pixel here).
function round3(value) {
  return Math.round(value * 1000) / 1000;
}

// The single type size the lockup is built from. Set on the wrapper so the
// wordmark takes it directly and every em below resolves against it.
const TYPE_SIZE = "clamp(2rem, 11vw, 3.75rem)";

// Cap height as a fraction of the font size. REDUX is all caps, so this,
// not the font size, is how tall the text actually looks, and matching it
// is what makes the ">" read as the same height as the letters.
//
// Measured from the rendered ink rather than taken from a font's metrics
// table, because the font in components/theme.js's stack that actually
// renders is not necessarily the first one named: Inter is not installed on
// the project machine, so "Segoe UI" is what draws this today, at 0.703.
// (Note that `document.fonts.check("Inter")` answers true regardless, so it
// is no help in telling which one won.) The stack's other members sit
// between 0.70 and 0.73, so any of them lands within a few percent of this
// and the glyph stays visually matched wherever it renders.
//
// How the glyph is then lined up with the letters is a separate matter, and
// is done by baseline alignment rather than by this number: see the row's
// own comment below.
const CAP_HEIGHT_EM = 0.703;

// Thickness of an arm, matched to the stem width of REDUX at weight 700
// (measured the same way, 0.172em), so the arrow looks drawn with the same
// pen as the text.
//
// Deliberately NOT scaled down alongside the height. The glyph used to be
// 90px tall with a 10px stroke, and shrinking it to the cap height while
// keeping that 9:1 proportion would have halved the stroke to about 5px,
// leaving a spindly arrow next to bold letters. The old 10px was matched to
// the text, not to the glyph, and the text has not changed size: only the
// height needed to come down.
const ARM_THICKNESS = 0.172;
const UPPER_ARM_ANGLE = -45;
const LOWER_ARM_ANGLE = -135;
// Half the thickness, which is also the radius of the rounded cap on each
// end of an arm. Named because the joint below is built out of it.
const ARM_CAP_RADIUS = round3(ARM_THICKNESS / 2);
// Where each arm rotates, measured from the bottom of its box.
//
// This is what stops the ">" looking like two bars laid on top of each
// other. Pivoting on the bottom *edge* leaves each arm's rounded cap
// hanging past the joint at a different angle, so the outline of the vertex
// has a step in it where one cap emerges from behind the other. Pivoting on
// the *centre of the cap* instead puts both caps on the same circle: their
// union is a single disc of this radius centred exactly on the vertex,
// which is precisely the shape a round line join draws. The two arms then
// have one continuous outline and read as one piece.
//
// Worked backwards from the target height rather than forwards from an arm
// length, because the height is the thing being matched to the text. A 45
// degree arm reaches ARM_LENGTH / sqrt(2) in each direction from the vertex,
// so the glyph stands (2 * reach + thickness) tall; setting that equal to
// the cap height and solving gives the reach, and the arm length follows.
const GLYPH_HEIGHT = CAP_HEIGHT_EM;
const ARM_REACH = round3((GLYPH_HEIGHT - ARM_THICKNESS) / 2);
const ARM_LENGTH = round3(ARM_REACH * Math.SQRT2);
const GLYPH_WIDTH = round3(ARM_REACH + ARM_THICKNESS);
// The arms are ARM_CAP_RADIUS taller than ARM_LENGTH to pay for the joint
// above, so the pivot still sits ARM_LENGTH from the far end and the glyph
// keeps the outside dimensions worked out here.
const ARM_BOX_HEIGHT = round3(ARM_LENGTH + ARM_CAP_RADIUS);
const ARM_PIVOT = `50% calc(100% - ${ARM_CAP_RADIUS}em)`;
// Same thickness as an arm, so the underline reads as the same stroke.
const UNDERLINE_THICKNESS = ARM_THICKNESS;
// The gap between the wordmark's line box and the top of the underline.
// Small, because the row above already carries Inter's descender space
// (the baseline sits at 0.864em, so there is 0.136em of empty line box
// under the letters before this gap even starts).
const UNDERLINE_GAP = 0.09;
// The space between the ">" and the R. In em for the same reason as
// everything else here: a fixed pixel gap that suited a 90px-tall glyph
// swamps one sized to the text.
const GLYPH_TEXT_GAP = 0.18;

// The pose both arms hold for steps 2 to 4: lying flat, pointing left from
// the vertex. Superimposed at this angle the two of them are visually one
// horizontal line, and the fold is simply each one leaving it in a different
// direction, 45 degrees either side. -90 rather than +90 because an arm is
// drawn as an upright bar rotating about its bottom end, so negative swings
// its far end to the left.
const LINE_ANGLE = -90;

// How far right the line sits during steps 2 and 3, before it travels left
// into place, measured from where it finally rests.
//
// It is exactly the distance from the vertex to the wordmark's left edge, so
// during those steps the vertex sits precisely on the edge the letters come
// out of. That is what makes the wordmark look like it is being pushed out
// of the line rather than merely appearing next to it, and it is why this is
// derived rather than dialled in by eye: the two have to agree exactly or
// the letters emerge from thin air a few pixels off the end of the line.
const LINE_START_OFFSET = round3(GLYPH_TEXT_GAP + ARM_CAP_RADIUS);

// --- Keyframes ----------------------------------------------------------

// Step 2. Scaled along the bar's own length from the vertex end, so with the
// arms lying flat the line draws itself outward from the point the wordmark
// will come out of, rather than expanding from its middle or fading in.
const drawLine = keyframes({
  from: { transform: "scaleY(0)" },
  to: { transform: "scaleY(1)" },
});

// Step 4. The line's journey left into the place the arrow occupies.
const shiftIntoPlace = keyframes({
  from: { transform: `translateX(${LINE_START_OFFSET}em)` },
  to: { transform: "translateX(0)" },
});

// Step 5, one arm each. Both leave the same flat pose in opposite
// directions, which is the fold.
const foldUpper = keyframes({
  from: { transform: `rotate(${LINE_ANGLE}deg)` },
  to: { transform: `rotate(${UPPER_ARM_ANGLE}deg)` },
});

const foldLower = keyframes({
  from: { transform: `rotate(${LINE_ANGLE}deg)` },
  to: { transform: `rotate(${LOWER_ARM_ANGLE}deg)` },
});

// Step 3. The wordmark starts one full word-width to the left, entirely
// behind the clip its wrapper holds, and slides right into place.
//
// The letters therefore arrive one at a time, last to first: the clip's edge
// sits at the wordmark's left edge, so as the word travels right the letter
// nearest its trailing edge crosses first. X clears the line, then U, D, E
// and finally R. That order is not scripted anywhere and there are no
// per-letter elements to stagger; it falls out of sliding a word out of a
// slot, which is also why it stays correct if the wordmark is ever
// re-spaced or re-lettered.
//
// -100% is the element's own width, so this is one word-width regardless of
// the type size the clamp lands on.
const emergeFromLine = keyframes({
  from: { transform: "translateX(-100%)" },
  to: { transform: "translateX(0)" },
});

// Step 6.
const underlineSweep = keyframes({
  from: { transform: "scaleX(0)", opacity: 0.35 },
  to: { transform: "scaleX(1)", opacity: 1 },
});

// The idle for the hold. A frozen last frame reads as a hung page within
// about a second, so the underline breathes slowly while the catalog is
// still on its way. Deliberately low-key: this is a pause that should look
// deliberate, not a second animation competing with the first.
const idleBreath = keyframes({
  "0%": { opacity: 1 },
  "50%": { opacity: 0.42 },
  "100%": { opacity: 1 },
});

// --- Phases -------------------------------------------------------------
//
//   pending  the first render, server and client alike, before the mount
//            check below has decided whether this should play at all. The
//            overlay is on screen but every animation is still sitting on
//            its own first frame, which is the issue's step 1 (a blank
//            screen) either way. Reduced motion and repeat visits leave
//            this state for "done" in a layout effect, before the browser
//            paints, so neither one ever flashes the overlay.
//   playing  steps 1 to 6.
//   settling the finished logo, held still for SETTLE_MS. Always runs, and
//            always for the same length, so the ending does not depend on
//            how quickly the backend answered.
//   holding  the settle beat is over and the catalog still has not arrived.
//   fading   step 7, the fade out. Also where a skip jumps straight to.
//   done     unmounted.
const PHASES = {
  pending: "pending",
  playing: "playing",
  settling: "settling",
  holding: "holding",
  fading: "fading",
  done: "done",
};

// useLayoutEffect on the client, useEffect on the server. The mount check
// has to run before the browser paints (otherwise a repeat visitor gets a
// frame of overlay they should never see), but React logs a warning for
// useLayoutEffect during server rendering, where it does nothing anyway.
// Same pattern MUI itself uses internally for this exact problem.
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

// localStorage throws rather than returning null in a few configurations
// (Safari's old private mode, cookie-blocking policies). Returning null
// there means the stored id can never match, so the animation plays on
// every load in those browsers. That is the wrong end of the trade to be
// on, but the alternatives are worse: refusing to play at all would punish
// a whole class of visitor for a storage policy, and there is nowhere else
// to remember this without setting a cookie the site does not otherwise
// need.
function readStoredBootId() {
  try {
    return window.localStorage.getItem(SPLASH_BOOT_KEY);
  } catch {
    return null;
  }
}

function writeStoredBootId(bootId) {
  try {
    window.localStorage.setItem(SPLASH_BOOT_KEY, bootId);
  } catch {
    // Nothing to do: see readStoredBootId.
  }
}

/**
 * The Home page's one-time startup animation.
 *
 * @param {Object} props
 * @param {boolean} props.ready Whether the catalog fetch has settled, either
 *   way. pages/index.js passes `!loading` from useCatalogIndex; see this
 *   file's header for why that is the whole backend signal.
 * @param {string} [props.bootId] Identifies the server process that served
 *   this page (lib/serverBootId.js, delivered by pages/index.js's
 *   getServerSideProps). The animation plays when this differs from the one
 *   this browser last played for, which is to say once per server start.
 *   Absent, the animation does not play at all: without an id there is no
 *   way to tell a restart from a reload, and playing on every single load
 *   is the worse of the two mistakes.
 */
export default function StartupSplash({ ready, bootId }) {
  const [phase, setPhase] = useState(PHASES.pending);

  const skip = useCallback(() => {
    setPhase((current) =>
      current === PHASES.playing || current === PHASES.settling || current === PHASES.holding
        ? PHASES.fading
        : current,
    );
  }, []);

  useIsomorphicLayoutEffect(() => {
    // Reduced motion skips the animation entirely rather than playing a
    // shortened version of it (decided on #65).
    if (prefersReducedMotion()) {
      setPhase(PHASES.done);
      return;
    }
    // No boot id means no way to distinguish a restart from a reload, so
    // nothing plays. See the prop's own note above.
    if (!bootId || readStoredBootId() === bootId) {
      setPhase(PHASES.done);
      return;
    }
    writeStoredBootId(bootId);
    setPhase(PHASES.playing);
  }, [bootId]);

  // Steps 1 to 6 run to their own preset length regardless of what the
  // backend is doing. Deliberately does not depend on `ready`: the catalog
  // arriving mid-animation must not restart this timer.
  useEffect(() => {
    if (phase !== PHASES.playing) return undefined;
    const timer = setTimeout(() => setPhase(PHASES.settling), ANIMATION_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  // The beat on the finished logo. Runs to SETTLE_MS whatever the backend is
  // doing, which is what stops a catalog that arrived early from cutting the
  // ending short.
  useEffect(() => {
    if (phase !== PHASES.settling) return undefined;
    const timer = setTimeout(() => setPhase(PHASES.holding), SETTLE_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  // Whether the overlay is on its way out. Two of the three ways that
  // happens are explicit phase changes (the skip, and the hold's cap
  // running out below); the third is the catalog arriving while the overlay
  // is holding, which is read straight off `ready` rather than turned into
  // a phase change of its own, so that a catalog landing mid-hold starts the
  // fade in the same render it arrives in.
  const fading = phase === PHASES.fading || (phase === PHASES.holding && ready);
  // The hold's idle only runs while the hold is genuinely still waiting.
  const holding = phase === PHASES.holding && !ready;

  // The cap on the hold: past this the overlay leaves regardless, and T29's
  // (#38) ordinary loading presentation takes over underneath.
  useEffect(() => {
    if (!holding) return undefined;
    const timer = setTimeout(() => setPhase(PHASES.fading), MAX_HOLD_MS);
    return () => clearTimeout(timer);
  }, [holding]);

  // Step 7, then unmount.
  useEffect(() => {
    if (!fading) return undefined;
    const timer = setTimeout(() => setPhase(PHASES.done), FADE_MS);
    return () => clearTimeout(timer);
  }, [fading]);

  useEffect(() => {
    if (
      fading ||
      (phase !== PHASES.playing && phase !== PHASES.settling && phase !== PHASES.holding)
    ) {
      return undefined;
    }

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        skip();
        return;
      }
      if (event.key === " " || event.key === "Spacebar") {
        // Space would otherwise scroll the page underneath, which is both
        // invisible during the fade and somewhere the visitor didn't ask to
        // be when it lands.
        event.preventDefault();
        skip();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [phase, fading, skip]);

  if (phase === PHASES.done) return null;

  return (
    <Box
      id="home-startup-splash"
      data-splash-phase={phase}
      // Decorative, and the real page is mounted underneath: assistive
      // technology should read Home, not this. Nothing in here is focusable,
      // so there is no focus to move or trap either.
      aria-hidden="true"
      onClick={skip}
      sx={(theme) => ({
        position: "fixed",
        inset: 0,
        zIndex: theme.zIndex.modal + 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.palette.background.default,
        // Same warm top-edge glow the page itself has (theme.js's
        // MuiCssBaseline override), so the fade lands on a background that
        // matches instead of brightening as the overlay clears.
        backgroundImage: `radial-gradient(1400px 480px at 18% -12%, ${theme.palette.primary.main}29, transparent 60%)`,
        backgroundRepeat: "no-repeat",
        opacity: fading ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ${EASE_EMERGE}`,
        // Once the fade starts, clicks belong to the page underneath.
        pointerEvents: fading ? "none" : "auto",
      })}
    >
      <noscript>
        {/* If scripting never runs, nothing will ever take this overlay down,
            so hide it outright and leave the page underneath usable. */}
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: a <style> element's content is markup, and this is a fixed literal with no interpolation. */}
        <style
          dangerouslySetInnerHTML={{ __html: "#home-startup-splash{display:none !important}" }}
        />
      </noscript>

      {/* The one font-size for the whole lockup. Every em in the geometry
          above resolves against this, so the ">" and the underline track
          the wordmark at any viewport width instead of only matching it at
          one. */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          fontSize: TYPE_SIZE,
        }}
      >
        {/* Baseline, not centre. The glyph is exactly cap height and its
            ink runs to its own bottom edge, and an empty flex item takes
            its baseline from that bottom edge, so aligning baselines sets
            the arrow down on the same line the letters stand on and its top
            lands on their cap line. Centring instead would align it to the
            line box, and the caps are not centred in that box: on the font
            actually rendering here that left the arrow about 4px high at
            60px type. Doing it this way needs no per-font fudge factor and
            stays correct if the font stack changes. */}
        <Box sx={{ display: "flex", alignItems: "baseline", gap: `${GLYPH_TEXT_GAP}em` }}>
          {/* The ">" prompt. Both arms are absolutely positioned so they
              pivot about the same point, the vertex on the right: see
              ARM_PIVOT for why that point is the centre of the rounded cap
              rather than the end of the bar, and why it matters to the
              glyph reading as a single shape. */}
          <Box
            sx={{
              position: "relative",
              flexShrink: 0,
              width: `${GLYPH_WIDTH}em`,
              // Exactly the cap height of the letters beside it, sat on
              // their baseline by the row's baseline alignment above.
              height: `${GLYPH_HEIGHT}em`,
              // Above the wordmark, so the letters slide out from behind the
              // line's end rather than over the top of it.
              zIndex: 1,
              // Step 4, the travel left. On the container rather than on the
              // arms because it has to move both of them together, and each
              // arm's own transform is already spoken for by its rotation.
              animation: `${shiftIntoPlace} ${STEPS.shift.duration}ms ${EASE_SNAP} ${STEPS.shift.delay}ms both`,
            }}
          >
            {/* Upper arm: draws in (step 2), then folds up (step 5). The
                rotation and the growth are on two nested elements rather than
                one because an element only has one `transform` to animate,
                and these two want different delays, durations and curves. */}
            <Box
              sx={{
                position: "absolute",
                left: `calc(100% - ${ARM_THICKNESS}em)`,
                top: `calc(50% - ${ARM_LENGTH}em)`,
                width: `${ARM_THICKNESS}em`,
                height: `${ARM_BOX_HEIGHT}em`,
                transformOrigin: ARM_PIVOT,
                animation: `${foldUpper} ${STEPS.fold.duration}ms ${EASE_SWEEP} ${STEPS.fold.delay}ms both`,
              }}
            >
              <Box
                sx={(theme) => ({
                  width: "100%",
                  height: "100%",
                  borderRadius: 999,
                  backgroundColor: theme.palette.primary.main,
                  // Grows out of the vertex itself rather than the bottom of
                  // the box, so the bar emerges from the point the whole
                  // glyph is built around.
                  transformOrigin: ARM_PIVOT,
                  animation: `${drawLine} ${STEPS.draw.duration}ms ${EASE_LAUNCH} ${STEPS.draw.delay}ms both`,
                })}
              />
            </Box>

            {/* Lower arm. Lies exactly on top of the upper one for steps 2 to
                4, which is what makes the two of them look like a single
                line, then folds the other way in step 5. It draws in on the
                same keyframe, delay and curve as the upper arm, so the line
                they jointly form grows as one stroke. */}
            <Box
              sx={{
                position: "absolute",
                left: `calc(100% - ${ARM_THICKNESS}em)`,
                top: `calc(50% - ${ARM_LENGTH}em)`,
                width: `${ARM_THICKNESS}em`,
                height: `${ARM_BOX_HEIGHT}em`,
                transformOrigin: ARM_PIVOT,
                animation: `${foldLower} ${STEPS.fold.duration}ms ${EASE_SWEEP} ${STEPS.fold.delay}ms both`,
              }}
            >
              <Box
                sx={(theme) => ({
                  width: "100%",
                  height: "100%",
                  borderRadius: 999,
                  backgroundColor: theme.palette.primary.main,
                  transformOrigin: ARM_PIVOT,
                  animation: `${drawLine} ${STEPS.draw.duration}ms ${EASE_LAUNCH} ${STEPS.draw.delay}ms both`,
                })}
              />
            </Box>
          </Box>

          {/* Step 3. Real live text in the app's own font, the same wordmark
              components/NavBar.js renders, at splash size.

              The slot the letters come out of. The clip and the movement have
              to be on two elements: clip-path is applied in an element's own
              coordinates and then transformed along with it, so a clip on the
              moving element would travel with the word and never reveal
              anything. This one stays put at the wordmark's left edge, which
              is exactly where the line's vertex is parked, and the child
              slides out through it.

              The negative insets on the other three sides keep the clip off
              the glyphs themselves, which overhang their line box slightly at
              this letter-spacing. */}
          <Box
            sx={{
              clipPath: "inset(-30% -12% -30% 0)",
            }}
          >
            <Box
              component="span"
              sx={(theme) => ({
                display: "inline-block",
                color: theme.palette.text.primary,
                // Inherited from the wrapper (TYPE_SIZE) rather than set here,
                // so the wordmark and the geometry above cannot drift apart.
                fontWeight: 700,
                lineHeight: 1,
                letterSpacing: "0.28em",
                // Letter-spacing adds a trailing gap after the X; pulling it
                // back keeps the underline ending at the glyph, not at the gap.
                marginRight: "-0.28em",
                whiteSpace: "nowrap",
                animation: `${emergeFromLine} ${STEPS.title.duration}ms ${EASE_EMERGE} ${STEPS.title.delay}ms both`,
              })}
            >
              REDUX
            </Box>
          </Box>
        </Box>

        {/* Step 6: grows from the left edge of the ">" to the right edge of
            the title, underlining both. */}
        <Box
          sx={{
            marginTop: `${UNDERLINE_GAP}em`,
            height: `${UNDERLINE_THICKNESS}em`,
            transformOrigin: "0% 50%",
            animation: `${underlineSweep} ${STEPS.underline.duration}ms ${EASE_DELIBERATE} ${STEPS.underline.delay}ms both`,
          }}
        >
          {/* The breathing idle is on its own element so it can start and
              stop without touching the sweep's finished state above. */}
          <Box
            sx={(theme) => ({
              width: "100%",
              height: "100%",
              borderRadius: 999,
              backgroundColor: theme.palette.primary.main,
              animation: holding ? `${idleBreath} 2200ms ease-in-out infinite` : "none",
            })}
          />
        </Box>
      </Box>
    </Box>
  );
}
