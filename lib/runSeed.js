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

// The largest seed Redux takes: `seed` is a C# int.
export const MAX_SEED = 2147483647;

/**
 * Whether a solver is randomized, so its runs take a seed: one of the types it declares is
 * "Stochastic". `solverTypeNames` is /info's `solverTypes`; a backend that sends only the one
 * `solverType` is read from `solverTypeName`.
 * @param {{solverTypeNames?: string[]|null, solverTypeName?: string|null}|null} solver As
 *   hooks/useProblemDetail.js builds it.
 */
export function isRandomizedSolver(solver) {
  if (!solver) return false;
  if (Array.isArray(solver.solverTypeNames)) return solver.solverTypeNames.includes("Stochastic");
  return solver.solverTypeName === "Stochastic";
}

/**
 * The seed a Seed box's text asks for: null when it is blank (Redux picks one), the number
 * when it is digits up to MAX_SEED, and NaN for anything else.
 * @param {string} text
 * @returns {number|null}
 */
export function parseSeed(text) {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  if (!/^\d+$/.test(trimmed)) return Number.NaN;
  const seed = Number(trimmed);
  return seed <= MAX_SEED ? seed : Number.NaN;
}
