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

// The GitHub repo holding the backend's source; the API's `sourceFile` paths are relative to it
// (the same default and override as Redux_GUI's info boxes). NEXT_PUBLIC_ variables are read at
// build time, so pointing this at a fork takes a rebuild.
const REDUX_REPO_URL = (
  process.env.NEXT_PUBLIC_REDUX_REPO_URL || "https://github.com/ReduxISU/Redux"
).replace(/\/+$/, "");

/**
 * @typedef {{key: string, label: string}} Tag
 * @typedef {{label: string, value: string, note?: string, mono?: boolean, href?: string,
 *   clamp?: number}} Fact
 *   `href` makes the value a link that opens in a new tab; `clamp` cuts it to that many lines,
 *   with the whole value on hover.
 * @typedef {{title: string, kind: string, description: string, facts: Fact[]}} Card
 */

/** A `sourceFile` path's page on GitHub. `blob/HEAD` is the repo's default branch. */
export function sourceFileUrl(sourceFile) {
  const path = sourceFile.split("/").map(encodeURIComponent).join("/");
  return `${REDUX_REPO_URL}/blob/HEAD/${path}`;
}

/**
 * #303: the Source, Code and Authors lines every card ends with, from hooks/useProblemDetail.js's
 * `credits`. Source links its `sourceLink` when one is declared, cut to three lines so a long
 * citation doesn't stretch the card; Code names the file and links it on GitHub, with its
 * folder under it.
 * @returns {Fact[]}
 */
function creditFacts(credits) {
  const { source, sourceLink, sourceFile, contributors = [] } = credits ?? {};
  const slash = sourceFile ? sourceFile.lastIndexOf("/") : -1;
  return [
    source
      ? { label: "Source", value: source, clamp: 3, ...(sourceLink ? { href: sourceLink } : {}) }
      : { label: "Source", value: NOT_DECLARED },
    sourceFile
      ? {
          label: "Code",
          value: sourceFile.slice(slash + 1),
          note: slash > 0 ? sourceFile.slice(0, slash) : "",
          mono: true,
          href: sourceFileUrl(sourceFile),
        }
      : { label: "Code", value: NOT_DECLARED },
    { label: "Authors", value: contributors.length > 0 ? contributors.join(", ") : NOT_DECLARED },
  ];
}

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

/**
 * #299: the labels of every raw backend member in one tag list (a solver's `solverTypeNames`,
 * a reduction's `reductionTypeNames`), in the backend's order, "Unclassified" dropped.
 */
function enumLabelsOf(facetKey, memberNames) {
  return (memberNames ?? []).map((name) => backendEnumLabel(facetKey, name)).filter(Boolean);
}

/** A fact's value: every label, comma-separated, or NOT_DECLARED when there are none. */
function listValue(labels) {
  return labels.length > 0 ? labels.join(", ") : NOT_DECLARED;
}

function labelsOf(facetKey, keys) {
  return (keys ?? [])
    .filter((key) => key && key !== UNCLASSIFIED)
    .map((key) => optionLabel(facetKey, key));
}

// --- Problem (the title's (i), #303) -------------------------------------------------------

/**
 * The problem's own card: its description, its tags (the same ones the title row shows) and
 * what its instances and answers are. Replaces #229's Details panel.
 * @returns {Card}
 */
export function problemCard(problem) {
  const overview = problem.overview ?? {};
  const tags = problem.tags ?? {};
  return {
    title: problem.name,
    kind: "Problem",
    description: problem.oneLiner ?? "",
    facts: [
      { label: "Class", value: listValue(labelsOf("complexityClass", tags.complexityClass)) },
      { label: "Type", value: listValue(labelsOf("problemType", tags.problemType)) },
      { label: "Variant", value: listValue(labelsOf("problemVariant", tags.problemVariant)) },
      {
        label: "Input",
        value: overview.inputDescription ?? overview.input ?? NOT_DECLARED,
      },
      {
        label: "Output",
        value: overview.outputDescription ?? overview.output ?? NOT_DECLARED,
      },
      ...creditFacts(problem.credits),
    ],
  };
}

// --- Solver -------------------------------------------------------------------------------

/**
 * The solver's types (#299: every one it lists). The complexity bucket stays on the solver's
 * info card, so the dropdown's tags say what kind of algorithm each solver is.
 */
export function solverTags(solver) {
  return tagsFrom(enumLabelsOf("solverType", solver.solverTypeNames));
}

/** The open list has room for more: the solver's types, then its complexity bucket. */
export function solverListTags(solver) {
  return tagsFrom([
    ...enumLabelsOf("solverType", solver.solverTypeNames),
    backendEnumLabel("solverComplexity", solver.complexityBucketName),
  ]);
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
      { label: "Type", value: listValue(enumLabelsOf("solverType", solver.solverTypeNames)) },
      ...creditFacts(solver.credits),
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
  // #299: Decision / Optimization, from the target's `problemVariants`.
  const variants = labelsOf("problemVariant", targetProblem?.problemVariant);
  return {
    title: name,
    kind: "Target problem",
    description: targetProblem?.description ?? "",
    facts: [
      { label: "Class", value: listValue(classes) },
      { label: "Type", value: listValue(types) },
      { label: "Variant", value: listValue(variants) },
      ...creditFacts(targetProblem?.credits),
    ],
  };
}

// --- Reduction (the Using dropdown) -------------------------------------------------------

/** The reduction's types (#299: every one it lists) and cost. */
export function reductionTags(reduction) {
  return tagsFrom([
    ...enumLabelsOf("reductionType", reduction.reductionTypeNames),
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
        value: listValue(enumLabelsOf("reductionType", reduction.reductionTypeNames)),
      },
      {
        label: "Bucket",
        value: backendEnumLabel("solverComplexity", reduction.complexityBucketName) ?? NOT_DECLARED,
      },
      ...creditFacts(reduction.credits),
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
      ...creditFacts(visualization.credits),
    ],
  };
}

// --- Verifier (#303 stage 4) ----------------------------------------------------------------

/**
 * A verifier's card: what it checks and the certificate it reads. The backend declares no
 * kinds of verifier, so its dropdown carries no tags.
 * @returns {Card}
 */
export function verifierCard(verifier) {
  return {
    title: verifier.name,
    kind: "Verifier",
    description: verifier.certificateDescription ?? "",
    facts: [
      {
        label: "Certificate",
        value: verifier.certificateFormat || NOT_DECLARED,
      },
      ...creditFacts(verifier.credits),
    ],
  };
}
