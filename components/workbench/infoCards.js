// components/workbench/infoCards.js
//
// #229 stage 2: what the tagged dropdowns show for each choice: its tags (inside the closed
// box and beside each option in the open list) and its info card (on hover in the open list,
// and from the (i) button after the dropdown's label). Pure functions from the problem data
// hooks/useProblemDetail.js builds; components/workbench/TaggedSelect.js draws the result.
//
// Every value comes from the backend's own metadata. A fact the backend does not declare
// reads NOT_DECLARED instead of a guess. Tag labels come from data/taxonomy.js, never from
// here (ground rule 3).

import { PICTURE_TYPE_INFO } from "../../data/pictureTypes";
import { backendEnumLabel, optionLabel, pictureTypeLabel, UNCLASSIFIED } from "../../data/taxonomy";

export const NOT_DECLARED = "Not declared yet";

/**
 * @typedef {{key: string, label: string}} Tag
 * @typedef {{label: string, value: string, note?: string, mono?: boolean}} Fact
 * @typedef {{title: string, kind: string, description: string, facts: Fact[]}} Card
 */

function tagsFrom(labels) {
  return labels.filter(Boolean).map((label) => ({ key: label, label }));
}

function bigO(fn) {
  return /^O\(/.test(fn) ? fn : `O(${fn})`;
}

/**
 * Splits a reduction's declared cost ("O(n^2), n = 3 * |SAT3.clauses| (literal-nodes)") into
 * the Big-O itself and what its variables mean. Matches the Big-O's own parentheses, so a
 * nested one ("O((4/3)^n)") stays whole.
 */
function splitBigO(text) {
  const trimmed = (text ?? "").trim();
  if (!trimmed.startsWith("O(")) return { value: trimmed, note: "" };
  let depth = 0;
  for (let index = 1; index < trimmed.length; index += 1) {
    if (trimmed[index] === "(") depth += 1;
    if (trimmed[index] === ")") {
      depth -= 1;
      if (depth === 0) {
        return {
          value: trimmed.slice(0, index + 1),
          note: trimmed.slice(index + 1).replace(/^[\s,;:]+/, ""),
        };
      }
    }
  }
  return { value: trimmed, note: "" };
}

function complexityFact(label, complexity, missingNote) {
  if (!complexity) return { label, value: NOT_DECLARED, note: missingNote };
  const note =
    complexity.variables ||
    (complexity.variableNames.length > 0
      ? `Variables: ${complexity.variableNames.join(", ")}`
      : "");
  return { label, value: bigO(complexity.function), note, mono: true };
}

function labelsOf(facetKey, keys) {
  return (keys ?? [])
    .filter((key) => key && key !== UNCLASSIFIED)
    .map((key) => optionLabel(facetKey, key));
}

// --- Solver -------------------------------------------------------------------------------

/**
 * #279 stage 2: the tags inside the Execute section's solver dropdowns: the complexity bucket
 * only, as board F has it. Board F also tags each solver Exact or Heuristic; Redux doesn't say
 * which yet (ReduxISU/Redux#877, lib/answers.js solverGuarantee), so that tag is left out rather
 * than guessed. Its label belongs in data/taxonomy.js when it comes. The solver's type stays on
 * its info card.
 */
export function solverRunTags(solver) {
  return tagsFrom([backendEnumLabel("solverComplexity", solver.complexityBucketName)]);
}

/** @returns {Card} */
export function solverCard(solver) {
  return {
    title: solver.name,
    kind: "Solver",
    description: solver.description,
    facts: [
      complexityFact("Time", solver.timeComplexity, "The solver doesn't declare timeComplexity."),
      complexityFact(
        "Space",
        solver.spaceComplexity,
        "The solver doesn't declare spaceComplexity.",
      ),
      {
        label: "Bucket",
        value: backendEnumLabel("solverComplexity", solver.complexityBucketName) ?? NOT_DECLARED,
      },
      {
        label: "Type",
        value: backendEnumLabel("solverType", solver.solverTypeName) ?? NOT_DECLARED,
      },
    ],
  };
}

// --- Target problem (the To dropdown) -----------------------------------------------------

/** The target problem's complexity class, the same tag its own page's title row shows. */
export function targetTags(targetProblem) {
  return tagsFrom(labelsOf("complexityClass", targetProblem?.complexityClass));
}

/** @returns {Card} */
export function targetCard(name, targetProblem) {
  const classes = labelsOf("complexityClass", targetProblem?.complexityClass);
  const types = labelsOf("problemType", targetProblem?.problemType);
  return {
    title: name,
    kind: "Target problem",
    description: targetProblem?.description ?? "",
    facts: [
      { label: "Class", value: classes.length > 0 ? classes.join(", ") : NOT_DECLARED },
      { label: "Type", value: types.length > 0 ? types.join(", ") : NOT_DECLARED },
    ],
  };
}

// --- Reduction (the Using dropdown) -------------------------------------------------------

/** The reduction's type and cost. */
export function reductionTags(reduction) {
  return tagsFrom([
    backendEnumLabel("reductionType", reduction.reductionTypeName),
    backendEnumLabel("reductionCost", reduction.costName),
  ]);
}

/** @returns {Card} */
export function reductionCard(reduction, sourceName) {
  const costLabel = backendEnumLabel("reductionCost", reduction.costName);
  const declared = splitBigO(reduction.bigO);
  const costNote = [costLabel && `${costLabel} in the input size.`, declared.note]
    .filter(Boolean)
    .join(" ");
  const cost = declared.value
    ? { label: "Cost", value: declared.value, note: costNote, mono: true }
    : { label: "Cost", value: costLabel ?? NOT_DECLARED };
  return {
    title: reduction.name,
    kind: `Reduction: ${sourceName} → ${reduction.target}`,
    description: reduction.description ?? "",
    facts: [
      cost,
      {
        label: "Type",
        value: backendEnumLabel("reductionType", reduction.reductionTypeName) ?? NOT_DECLARED,
      },
      {
        label: "Bucket",
        value: backendEnumLabel("solverComplexity", reduction.complexityBucketName) ?? NOT_DECLARED,
      },
    ],
  };
}

// --- Visualization type -------------------------------------------------------------------

/** What the visualization draws (its picture type). */
export function visualizationTags(visualization) {
  return tagsFrom([pictureTypeLabel(visualization?.pictureType)]);
}

/**
 * @param {Object} visualization
 * @param {"source"|"target"} role Where the picture sits: the problem's own picture, or the
 *   instance a reduction built.
 * @returns {Card}
 */
export function visualizationCard(visualization, role) {
  const pictureLabel = pictureTypeLabel(visualization.pictureType);
  const pictureInfo = PICTURE_TYPE_INFO[visualization.pictureType];
  const shows = [];
  if (role === "target") shows.push("The instance the reduction built");
  else if (visualization.solverName) shows.push(`Solver steps from ${visualization.solverName}`);
  if (visualization.verifierName) shows.push(`Verifier checks from ${visualization.verifierName}`);
  return {
    title: visualization.name,
    kind: "Visualization type",
    description: visualization.caption ?? "",
    facts: [
      {
        label: "Draws",
        value: pictureLabel ?? NOT_DECLARED,
        note: pictureInfo?.draws ?? "",
      },
      { label: "Shows", value: shows.length > 0 ? shows.join(". ") : NOT_DECLARED },
      { label: "Best for", value: pictureInfo?.bestFor ?? NOT_DECLARED },
    ],
  };
}
