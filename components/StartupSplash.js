// components/StartupSplash.js
//
// T43 (#65): the one-time startup animation on the Home page. Original
// idea from Corbin Hay.
//
// Seven steps, in the order the issue lists them: a blank screen, a bar
// grows up from flat ground, the bar angles to the left, the REDUX title
// emerges from the bar moving right, the bar duplicates and the copy
// rotates down so the two form a ">" prompt, a thick underline grows from
// the left of the ">" rightward to the right edge of the title, and then
// the whole screen fades out to the Home page underneath.
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
//     has finished. The title starts emerging at 830ms while the tilt is
//     still running to 980ms; the underline starts at 1590ms while the
//     title is still settling to 1690ms. The overlap is what makes it read
//     as one movement instead of a seven-slide slideshow.
//   - Uniform durations: they range from 400ms (the tilt, which wants to be
//     quick) to 1040ms (the underline, which wants to be deliberate).
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
  // Step 2: the bar grows from nothing to full height.
  grow: { delay: 160, duration: 560 },
  // Step 3: the bar angles to the left. The quickest step by some way.
  tilt: { delay: 580, duration: 400 },
  // Step 4: the title emerges from the bar, moving right.
  title: { delay: 830, duration: 860 },
  // Step 5: the copy rotates down into the second arm of the ">".
  duplicate: { delay: 1050, duration: 640 },
  // Step 6: the underline grows left to right. The slowest step.
  underline: { delay: 1590, duration: 1040 },
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
//     2630 + 650 + 900 = about 4.2 seconds.
//   - Worst case, backend never answers and the hold runs out:
//     2630 + 650 + 2500 + 900 = about 6.7 seconds.
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
const EASE_LAUNCH = "cubic-bezier(0.16, 1.22, 0.32, 1.04)"; // shoots up, overshoots, settles
const EASE_SNAP = "cubic-bezier(0.34, 1.3, 0.5, 1)"; // quick, small overshoot on landing
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
const ARM_LENGTH = 56;
const ARM_THICKNESS = 10;
const UPPER_ARM_ANGLE = -45;
const LOWER_ARM_ANGLE = -135;
// Half the thickness, which is also the radius of the rounded cap on each
// end of an arm. Named because the joint below is built out of it.
const ARM_CAP_RADIUS = ARM_THICKNESS / 2;
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
// The arms are ARM_CAP_RADIUS taller than ARM_LENGTH to pay for it, so the
// pivot still sits ARM_LENGTH from the far end and the glyph keeps the same
// outside dimensions as before.
const ARM_BOX_HEIGHT = ARM_LENGTH + ARM_CAP_RADIUS;
const ARM_PIVOT = `50% calc(100% - ${ARM_CAP_RADIUS}px)`;
// A 45 degree arm reaches ARM_LENGTH / sqrt(2) in each direction from the
// vertex, plus the thickness of the bar itself.
const ARM_REACH = Math.round(ARM_LENGTH * 0.7071);
const GLYPH_WIDTH = ARM_REACH + ARM_THICKNESS;
const GLYPH_HEIGHT = ARM_REACH * 2 + ARM_THICKNESS;
const UNDERLINE_THICKNESS = 10;

// --- Keyframes ----------------------------------------------------------

// Step 2. Scaled from the bottom edge, so it grows up out of flat ground
// rather than expanding from its middle.
const growFromGround = keyframes({
  from: { transform: "scaleY(0)" },
  to: { transform: "scaleY(1)" },
});

// Step 3.
const tiltLeft = keyframes({
  from: { transform: "rotate(0deg)" },
  to: { transform: `rotate(${UPPER_ARM_ANGLE}deg)` },
});

// Step 4. The clip is what makes the letters look like they are coming out
// from behind the bar instead of just fading in on the spot: the wordmark
// is revealed left to right while it also slides right. The negative insets
// on the other three sides keep the clip off the glyphs themselves, which
// overhang their line box slightly at this letter-spacing.
const emergeFromBar = keyframes({
  from: {
    clipPath: "inset(-30% 100% -30% 0)",
    transform: "translateX(-20px)",
    opacity: 0,
  },
  to: {
    clipPath: "inset(-30% -12% -30% 0)",
    transform: "translateX(0)",
    opacity: 1,
  },
});

// Step 5. Starts life sitting exactly on top of the first arm (that is what
// makes it read as a duplicate of it) and sweeps down and round.
const rotateDownIntoPrompt = keyframes({
  "0%": { transform: `rotate(${UPPER_ARM_ANGLE}deg)`, opacity: 0 },
  "12%": { opacity: 1 },
  "100%": { transform: `rotate(${LOWER_ARM_ANGLE}deg)`, opacity: 1 },
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

      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "stretch" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 2, sm: 3 } }}>
          {/* The ">" prompt. Both arms are absolutely positioned so they
              pivot about the same point, the vertex on the right: see
              ARM_PIVOT for why that point is the centre of the rounded cap
              rather than the end of the bar, and why it matters to the
              glyph reading as a single shape. */}
          <Box
            sx={{
              position: "relative",
              flexShrink: 0,
              width: GLYPH_WIDTH,
              height: GLYPH_HEIGHT,
            }}
          >
            {/* Upper arm: grows (step 2), then tilts (step 3). The rotation
                and the growth are on two nested elements rather than one
                because an element only has one `transform` to animate, and
                these two want different delays, durations and curves. */}
            <Box
              sx={{
                position: "absolute",
                left: `calc(100% - ${ARM_THICKNESS}px)`,
                top: `calc(50% - ${ARM_LENGTH}px)`,
                width: ARM_THICKNESS,
                height: ARM_BOX_HEIGHT,
                transformOrigin: ARM_PIVOT,
                animation: `${tiltLeft} ${STEPS.tilt.duration}ms ${EASE_SNAP} ${STEPS.tilt.delay}ms both`,
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
                  animation: `${growFromGround} ${STEPS.grow.duration}ms ${EASE_LAUNCH} ${STEPS.grow.delay}ms both`,
                })}
              />
            </Box>

            {/* Lower arm: the duplicate (step 5). Already full height, since
                what it copies is the finished upper arm. */}
            <Box
              sx={{
                position: "absolute",
                left: `calc(100% - ${ARM_THICKNESS}px)`,
                top: `calc(50% - ${ARM_LENGTH}px)`,
                width: ARM_THICKNESS,
                height: ARM_BOX_HEIGHT,
                transformOrigin: ARM_PIVOT,
                animation: `${rotateDownIntoPrompt} ${STEPS.duplicate.duration}ms ${EASE_SWEEP} ${STEPS.duplicate.delay}ms both`,
              }}
            >
              <Box
                sx={(theme) => ({
                  width: "100%",
                  height: "100%",
                  borderRadius: 999,
                  backgroundColor: theme.palette.primary.main,
                })}
              />
            </Box>
          </Box>

          {/* Step 4. Real live text in the app's own font, the same wordmark
              components/NavBar.js renders, at splash size. */}
          <Box
            component="span"
            sx={(theme) => ({
              color: theme.palette.text.primary,
              fontSize: "clamp(2rem, 11vw, 3.75rem)",
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: "0.28em",
              // Letter-spacing adds a trailing gap after the X; pulling it
              // back keeps the underline ending at the glyph, not at the gap.
              marginRight: "-0.28em",
              whiteSpace: "nowrap",
              animation: `${emergeFromBar} ${STEPS.title.duration}ms ${EASE_EMERGE} ${STEPS.title.delay}ms both`,
            })}
          >
            REDUX
          </Box>
        </Box>

        {/* Step 6: grows from the left edge of the ">" to the right edge of
            the title, underlining both. */}
        <Box
          sx={{
            marginTop: `${UNDERLINE_THICKNESS + 8}px`,
            height: UNDERLINE_THICKNESS,
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
