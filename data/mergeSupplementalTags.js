// data/mergeSupplementalTags.js
//
// T22 (issue #31). The migration seam: the only file that changes as the
// real Redux backend catches up on the tag categories it doesn't have a
// field for yet. When the backend adds a real value for one of these
// fields, delete that field's entries from data/supplementalTags.js (or the
// whole file, once every field it carries is backend-covered) -- step 1
// below already prefers a real value the moment one starts arriving, so no
// caller of the functions here ever needs to change.
//
// -----------------------------------------------------------------------
// What this merges, and what it doesn't
// -----------------------------------------------------------------------
// data/supplementalTags.js's own header explains why it holds three
// problem-keyed fields today, not the four the original T22/#31 issue body
// describes: Reduction Type was retargeted to a real backend field
// (issue #31, 2026-09-02) and dropped out of the overlay entirely, so it
// has no merge step here -- it's resolved straight from backend data via
// data/taxonomy.js's REDUCTION_TYPE_MAP, wherever the catalog data hook
// (T23/#32) ends up doing that. What's left to merge:
//
//   - problemType         (problem-keyed,      SUPPLEMENTAL_TAGS)
//   - computationalModel  (problem-keyed,      SUPPLEMENTAL_TAGS)
//   - complexityClass     (problem-keyed,      SUPPLEMENTAL_TAGS -- quantum
//                           half only; the classical half always comes from
//                           the real backend field via
//                           taxonomy.js's deriveComplexityClasses())
//   - visualStyle          (visualization-keyed, SUPPLEMENTAL_VISUAL_STYLE)
//
// The first three are one problem-level merge (mergeSupplementalTags); the
// fourth is keyed per visualization instance rather than per problem (a
// problem can have several visualizations of different conceptual styles),
// so it gets its own function (mergeVisualStyle) with its own key space.
// Same three-step precedence, same file, because both are the same seam.

import { SUPPLEMENTAL_TAGS, SUPPLEMENTAL_VISUAL_STYLE } from "./supplementalTags";
import { deriveComplexityClasses, UNCLASSIFIED } from "./taxonomy";

function firstNonEmptyArray(...arrays) {
  for (const array of arrays) {
    if (Array.isArray(array) && array.length > 0) return array;
  }
  return null;
}

function firstDefined(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

/**
 * Resolves the three problem-keyed gap fields for one problem, applying the
 * three-step precedence independently per field: real backend value (if
 * present) -> data/supplementalTags.js overlay value (if present) ->
 * UNCLASSIFIED. A field arriving from the backend never disables the
 * overlay for the other fields.
 *
 * Pure and side-effect-free. An unknown `problemName` (not in
 * SUPPLEMENTAL_TAGS) resolves every field to UNCLASSIFIED rather than
 * throwing, the same as a known problem with no overlay entry for a given
 * field. Works unchanged with an empty SUPPLEMENTAL_TAGS.
 *
 * @param {string} problemName Exact real problem name (SUPPLEMENTAL_TAGS's key shape).
 * @param {Object} [realTags] Whatever the backend already provides for this problem.
 * @param {string[]} [realTags.problemType] Real Problem Type value(s), if the backend has the field.
 * @param {string} [realTags.computationalModel] Real Computational Model value, if the backend has the field.
 * @param {string} [realTags.complexityClass] The single raw backend `ComplexityClass` enum value (`deriveComplexityClasses`'s `backendComplexityClass` argument) -- always real when present; there is no overlay for the classical half.
 * @returns {{problemType: string[], computationalModel: string, complexityClass: string[]}}
 */
export function mergeSupplementalTags(problemName, realTags = {}) {
  const overlay = SUPPLEMENTAL_TAGS[problemName] ?? {};

  const problemType = firstNonEmptyArray(realTags.problemType, overlay.problemType) ?? [
    UNCLASSIFIED,
  ];

  const computationalModel =
    firstDefined(realTags.computationalModel, overlay.computationalModel) ?? UNCLASSIFIED;

  const derivedComplexityClass = deriveComplexityClasses(
    realTags.complexityClass,
    overlay.complexityClass ?? [],
  );
  const complexityClass =
    derivedComplexityClass.length > 0 ? derivedComplexityClass : [UNCLASSIFIED];

  return { problemType, computationalModel, complexityClass };
}

/**
 * Resolves the conceptual visual style for one visualization instance: real
 * backend value (if the backend ever grows one) -> data/supplementalTags.js's
 * SUPPLEMENTAL_VISUAL_STYLE overlay (keyed by the exact instance name
 * Navigation/Batch/allVisualizations returns, e.g. "ArcSetDefaultVisualization")
 * -> UNCLASSIFIED.
 *
 * Pure and side-effect-free. An unknown `visualizationName` resolves to
 * UNCLASSIFIED rather than throwing.
 *
 * @param {string} visualizationName Exact real visualization instance name.
 * @param {string} [realVisualStyle] A real backend value for this field, if one ever exists.
 * @returns {string}
 */
export function mergeVisualStyle(visualizationName, realVisualStyle) {
  return (
    firstDefined(realVisualStyle, SUPPLEMENTAL_VISUAL_STYLE[visualizationName]) ?? UNCLASSIFIED
  );
}
