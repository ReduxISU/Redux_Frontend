// components/StatusIcon.js
//
// T13 (#17) originally added this module for a status glyph shown on each
// catalog card (a green check when "fully catalogued", a grey minus
// otherwise), plus a separate Monitor "has a renderable visualization" icon
// added later (T57/T58 follow-up work). Direct project-owner instruction:
// both icons are removed from ProblemCatalogCard.js -- with Solvers and
// Visualizations always rendering their own labeled row (a real chip, or
// "No solvers"/"No visualizations"), a person can already read a card's
// completeness directly off those rows, so a separate glyph reporting the
// same thing a second way added nothing. hasRenderableVisualization() (the
// Monitor icon's own predicate) is deleted along with it -- this file's
// only remaining export is the completeness predicate below.
//
// isProblemComplete() is kept at this path (rather than moved/renamed) since
// pages/[problem].js still imports it to decide whether an incomplete
// problem's detail page is reachable at all (#6 item 4, settled
// 2026-08-31) -- that gate is unrelated to whether a card draws an icon, so
// removing the icon doesn't touch it.
//
// "Fully catalogued" means at least one declared solver, at least one
// declared visualization, and a declared verifier. Per data/fixtures.js,
// solvers and visualizations are arrays but verifier is a single
// object-or-null -- so this is an array-length check for two fields and a
// null check for the third, not three interchangeable length checks.

/** The one place the completeness rule lives (#6, item 4, 2026-08-31). */
export function isProblemComplete(problem) {
  return (
    (problem.solvers?.length ?? 0) > 0 &&
    (problem.visualizations?.length ?? 0) > 0 &&
    problem.verifier != null
  );
}
