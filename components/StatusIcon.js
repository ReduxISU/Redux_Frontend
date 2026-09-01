// components/StatusIcon.js
//
// T13 (#17) — the small status glyph in the top-right corner of each catalog
// card: a green check when a problem is fully catalogued, a grey minus when
// it isn't.
//
// Not a port. ARCHITECTURE.md's directory listing doesn't include this file
// at all -- TASKLIST.md pulled it out into its own module because its
// meaning was still an open question (#6, item 4) when the file tree was
// drawn, and it's consumed from more than one place (this card icon, and
// T12/#16's decision on whether the card is a link at all).
//
// The predicate (#6, item 4, settled 2026-08-31 in this issue's own
// comment): "fully catalogued" means at least one declared solver, at least
// one declared visualization, and a declared verifier. Per data/fixtures.js,
// solvers and visualizations are arrays but verifier is a single
// object-or-null -- so this is an array-length check for two fields and a
// null check for the third, not three interchangeable length checks.
// isProblemComplete() is the one place that rule lives; T12 imports it
// rather than re-deriving "is this thing complete" on its own.
//
// Colors are sampled from the mockup, not invented. The green ring's mockup
// pixels land almost exactly on theme.js's existing FACET_ACCENT_COLORS.green
// (Visualization Type's accent, #4ADE80) -- reused via getFacetAccentColor
// rather than duplicated. The grey ring has no such existing per-facet
// color, but its antialiased mockup pixels scale up (backing out the
// thin-stroke/JPEG blending with the dark panel background) to theme.js's
// palette.secondary.main (#94A3B8), so this resolves that via the standard
// sx palette-path string ("secondary.main") instead of adding a new token.

import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutlineOutlined";
import { getFacetAccentColor } from "./theme";

const COMPLETE_COLOR = getFacetAccentColor("green");
const INCOMPLETE_COLOR = "secondary.main";

const MISSING_PART_LABELS = {
  solver: "a solver",
  visualization: "a visualization",
  verifier: "a verifier",
};

// Fixed order (solver, visualization, verifier) so the message is stable
// regardless of which fields happen to be set on a given fixture.
function getMissingParts(problem) {
  const missing = [];
  if (!(problem.solvers?.length > 0)) {
    missing.push(MISSING_PART_LABELS.solver);
  }
  if (!(problem.visualizations?.length > 0)) {
    missing.push(MISSING_PART_LABELS.visualization);
  }
  if (problem.verifier == null) {
    missing.push(MISSING_PART_LABELS.verifier);
  }
  return missing;
}

function joinWithAnd(parts) {
  if (parts.length === 1) {
    return parts[0];
  }
  if (parts.length === 2) {
    return `${parts[0]} and ${parts[1]}`;
  }
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

/** The one place the completeness rule lives (#6, item 4, 2026-08-31). */
export function isProblemComplete(problem) {
  return getMissingParts(problem).length === 0;
}

export default function StatusIcon({ problem }) {
  const missing = getMissingParts(problem);
  const complete = missing.length === 0;

  // Accurate about which piece is missing when there's only one -- a card
  // missing just a verifier reads differently from one missing everything.
  // titleAccess renders a native <title> (a hover tooltip for sighted mouse
  // users, who have no other affordance on a card that isn't a link) and
  // sets role="img"; aria-label carries the same text as the accessible name
  // for screen readers, since aria-label takes precedence over <title> in
  // the accessible-name computation.
  const label = complete
    ? "Fully catalogued: has at least one solver, visualization, and verifier."
    : `Not yet implemented: missing ${joinWithAnd(missing)}. Details unavailable.`;

  const Icon = complete ? CheckCircleOutlineIcon : RemoveCircleOutlineIcon;
  const color = complete ? COMPLETE_COLOR : INCOMPLETE_COLOR;

  return (
    <Icon titleAccess={label} aria-label={label} fontSize="small" sx={{ color, flexShrink: 0 }} />
  );
}
