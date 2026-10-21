// lib/answers.js
//
// #279 stage 2: what the Execute section reads from a solver's answer, and what it may claim
// from it across a reduction.
//
// Whether an answer was found. Redux has no one "no answer" value: the reductions' backward maps
// use "{}" (ReductionBack.NoAnswer), the SAT solvers answer "No Solution", others an empty
// string, "no solution", "No solution exists", "No Solution Exists: ..." or an empty list. So an
// answer counts as "none" when it is empty, an empty set, list or tuple, or starts with "no
// solution" in any case, and as found otherwise. "{}" can be a real answer in a corner case (the
// empty cover of an edgeless graph); the verifier, not this page, is the judge of that, and
// Check it is right there.
//
// Whether a solver is exact. Only an exact solver's "no" carries across a reduction: a heuristic
// can miss an answer that exists. Redux doesn't say yet which solvers are exact (that contract
// waits on ReduxISU/Redux#877), so every solver is "unknown" for now, and the page never claims a
// "no" proves anything. When Redux sends it, solverGuarantee reads it and the wording follows.

/** @typedef {"exact"|"heuristic"|null} Guarantee null when Redux doesn't say. */

const NO_ANSWER = /^(?:\{\s*\}|\[\s*\]|\(\s*\)|no solution\b.*)$/is;

/** A solver's answer as the text a verifier or mapSolution takes. */
export function answerText(output) {
  if (typeof output === "string") return output;
  return output === null || output === undefined ? "" : JSON.stringify(output);
}

/** Whether a solver's answer is an answer, not "none found". */
export function answerFound(output) {
  const text = answerText(output).trim();
  return text !== "" && !NO_ANSWER.test(text);
}

/**
 * Whether a solver is exact, a heuristic, or not said.
 * @param {Object|null} _solver The solver, as hooks/useProblemDetail.js builds it.
 * @returns {Guarantee} Always null until Redux declares it (ReduxISU/Redux#877).
 */
export function solverGuarantee(_solver) {
  return null;
}

/**
 * The line comparing the two sides once both are solved. Two found answers agree. A "no" only
 * counts when an exact solver gave it; otherwise the sides can't be compared, and a difference is
 * never called a bug.
 * @param {{found: boolean, guarantee: Guarantee}} source
 * @param {{found: boolean, guarantee: Guarantee}} target
 * @returns {{tone: "ok"|"err"|"neutral", text: string}}
 */
export function agreeLine(source, target) {
  const sides = [source, target];
  const unprovenNo = sides.filter((side) => !side.found && side.guarantee !== "exact");
  if (unprovenNo.length > 0) {
    return unprovenNo.some((side) => side.guarantee === "heuristic")
      ? { tone: "neutral", text: "Can't compare: a heuristic can miss answers." }
      : {
          tone: "neutral",
          text: "Can't compare: Redux doesn't say these solvers are exact, and one that isn't can miss answers.",
        };
  }
  if (source.found === target.found) return { tone: "ok", text: "Same answer on both sides." };
  return {
    tone: "err",
    text: "Different answers: with exact solvers that means a bug in a solver or the reduction.",
  };
}

/**
 * What a "no answer" on one side says about the other side.
 * @param {string} found The side that found nothing ("Clique").
 * @param {string} other The side the claim is about ("3SAT").
 * @param {Guarantee} guarantee The solver's.
 * @param {string} solverName
 * @returns {{proves: boolean, text: string}}
 */
export function noAnswerClaim(found, other, guarantee, solverName) {
  if (guarantee === "exact") {
    return { proves: true, text: `No ${found} answer, so this ${other} instance has none either.` };
  }
  if (guarantee === "heuristic") {
    return {
      proves: false,
      text: `No ${found} answer found by a heuristic, so this doesn't show the ${other} instance has none.`,
    };
  }
  return {
    proves: false,
    text: `${solverName} found no ${found} answer. Redux doesn't say whether it is exact, so this doesn't show the ${other} instance has none.`,
  };
}
