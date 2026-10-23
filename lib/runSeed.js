// lib/runSeed.js
//
// #295 (ReduxISU/Redux#932): a randomized solver (3SAT's WalkSAT, Schöning's algorithm, PPZ)
// reports the seed it ran with as a top-level "seed" in ProblemProvider/visualizeRun,
// ProblemProvider/visualize?format=frames and ProblemProvider/reductionView, and takes `seed`
// on the same requests: the same seed on the same instance gives the same run. Other solvers
// report none and ignore it, and so does a backend older than #932, so a missing or unreadable
// seed is simply no seed.

/**
 * The seed a response reports, or null when it reports none.
 * @param {unknown} response
 * @returns {number|null}
 */
export function seedOf(response) {
  const seed = response && typeof response === "object" ? response.seed : undefined;
  return Number.isSafeInteger(seed) ? seed : null;
}

/**
 * The query parameter that asks for `seed`: "&seed=12345", or "" for none.
 * @param {number|null|undefined} seed
 */
export function seedParam(seed) {
  return Number.isSafeInteger(seed) ? `&seed=${seed}` : "";
}
