// hooks/useCatalogIndex.js
//
// T23 (issue #32). Fetches the whole catalog from the real Redux backend and
// turns it into the tag data every catalog component reads — same role
// Redux_GUI's useProblemIndex.js plays there, adapted to this project's
// 8-facet taxonomy and its real+overlay merge seam (mergeSupplementalTags.js,
// T22/#31).
//
// -----------------------------------------------------------------------
// Shape contract (read data/fixtures.js's header before changing either side)
// -----------------------------------------------------------------------
// Returns `{ index, completeness, loading, error }`. `index` is a
// `Map<problemName, tags>` where `tags` matches data/fixtures.js's
// `FixtureProblem.tags` shape exactly, key for key: every facet key from
// data/taxonomy.js's TAXONOMY array, valued as an array of option keys (or,
// for computationalModel only, a single option-key string — the one facet
// that's genuinely single-valued per problem). A value with no known real or
// overlay value is omitted from its array rather than appearing as a bare
// "Unclassified" entry, matching fixtures.js's own convention and this
// issue's done-when.
//
// `completeness` is a same-keyed `Map<problemName, {hasSolver,
// hasVisualization, hasVerifier}>` — added by T25 (#34) so Home's cards can
// drive components/StatusIcon.js's isProblemComplete() rule from real
// declared-item presence, since `tags` alone can't: a solver/visualization
// with a backend type this hook doesn't map to a taxonomy option is still a
// declared item for completeness purposes even though it contributes
// nothing to `tags`. Deliberately a second Map rather than extra keys on
// `tags` itself, so the shape contract above stays exact.
//
// The Map is keyed by the real backend's human-readable `problemName`
// (e.g. "Clique", "3SAT", "Deutsch Jozsa"), NOT the raw class/reflection
// code Navigation/Batch/allProblems itself returns (e.g. "CLIQUE", "SAT3").
// This deliberately diverges from Redux_GUI's useProblemIndex.js, which
// keys by the raw code — done here because data/supplementalTags.js's
// SUPPLEMENTAL_TAGS overlay and data/fixtures.js's sample entries are both
// keyed by the same display name (confirmed by querying the live production
// backend directly: all 49 of Navigation/Batch/allProblems's codes' `info[
// code].problemName` values match SUPPLEMENTAL_TAGS's key list exactly), so
// keying this Map the same way lets mergeSupplementalTags(problemName, ...)
// be called with no separate name-translation step.
//
// -----------------------------------------------------------------------
// Where each facet's value actually comes from
// -----------------------------------------------------------------------
// problemType, computationalModel, complexityClass — resolved by
// mergeSupplementalTags(problemName, { complexityClass }) (T22/#31): prefers
// a real backend value, falls back to the data/supplementalTags.js overlay,
// falls back to Unclassified. Only complexityClass has a real backend value
// today (the live backend has no problemType/computationalModel field yet —
// confirmed against the live payload, not assumed).
//
// solverType, solverComplexity — aggregated across every solver the problem
// declares (Navigation/Batch/allSolvers), reading each solver's own
// Navigation/Batch/allInfo entry (`solverType`, `complexityBucket`) through
// SOLVER_TYPE_MAP / SOLVER_COMPLEXITY_MAP.
//
// visualizationType — aggregated across every visualization the problem
// declares (Navigation/Batch/allVisualizations), through
// mergeVisualStyle(visualizationName, undefined) (T22/#31). This facet is
// wholly overlay-driven per the #6 decision (TAXONOMY_REFERENCE.md §9) — the
// backend's VisualizationType enum is a renderer-implementation contract,
// not the conceptual style this facet shows, so no real value is ever passed
// through here.
//
// reductionCost, reductionType — aggregated across every reduction edge
// touching the problem (Navigation/Reductions), in either direction: a
// reduction the problem has TO another problem and one FROM another problem
// both count toward its own tags (matches fixtures.js's own 3-SAT entry,
// which unions its reduces-to and reduces-from costs/types the same way).
// reductionCost reads each edge's `cost` field through REDUCTION_COST_MAP.
//
// reductionType is written against the shape the live API is expected to
// have once ReduxISU/Redux#396 merges (ARCHITECTURE.md's 2026-09-01 note:
// "T23's backend-value translation step should be written against the
// post-#396 shape... there is no reason to write it against a shape already
// known to be temporary") — it reads `edge.reductionType` through
// REDUCTION_TYPE_MAP. Flagged prominently: queried the live production
// Navigation/Reductions endpoint directly while building this hook, and its
// edges do not yet carry a reductionType field at all (only className,
// endpoint, inputType, outputType, fromComplexity, toComplexity, cost) —
// matching this repo's own lib/redux/index.js JSDoc for that endpoint, and
// consistent with #396 still being unmerged. Nor is there a ported
// single-item endpoint (requestReductionInfo) that carries it — T21 (#30)
// deliberately left every non-batch request helper out, and Redux_GUI's own
// reductionType value comes from exactly that non-batch endpoint, not from
// the batch reduction graph. So reductionType legitimately comes back empty
// for every problem today; the read is still written defensively (reads the
// field if present) so nothing here needs to change the day the batch
// endpoint actually grows it. See this task's handback summary.

import { useEffect, useState } from "react";
import { mergeSupplementalTags, mergeVisualStyle } from "../data/mergeSupplementalTags";
import {
  REDUCTION_COST_MAP,
  REDUCTION_TYPE_MAP,
  SOLVER_COMPLEXITY_MAP,
  SOLVER_TYPE_MAP,
  UNCLASSIFIED,
} from "../data/taxonomy";
import { VISUALIZATION_TYPE_MAP } from "../data/visualizationTypes";
import {
  requestAllInfo,
  requestAllProblems,
  requestAllSolvers,
  requestAllVerifiers,
  requestAllVisualizations,
  requestAllVisualizationTypes,
  requestReductionGraph,
} from "../lib/redux";

/**
 * Re-keys the raw reduction graph's `{ [fromCode]: { [toCode]: edge[] } }`
 * adjacency map (keyed by the raw class/reflection code, despite
 * lib/redux/index.js's JSDoc calling the keys "problemName" -- confirmed
 * against Redux's Nav_Reductions.cs the same way this file's own header
 * already documents for the other batch endpoints) to the display names
 * `hooks/useCatalogFilters.js`'s reachability traversal and the Home page's
 * problem picker both need, since useCatalogIndex's own `index` Map (and
 * everything downstream of it) is keyed by display name, not code.
 *
 * T59 (#134). Edge arrays are concatenated rather than overwritten on a
 * from/to pair that appears more than once after re-keying, which does not
 * happen with today's real names but keeps this correct if it ever did.
 *
 * @param {Object} reductionGraph Raw `requestReductionGraph` result.
 * @param {Map<string, string>} codeToName Problem code -> display name.
 * @returns {Object} `{ [fromName]: { [toName]: edge[] } }`.
 */
function buildReductionGraphByName(reductionGraph, codeToName) {
  const graphByName = {};
  for (const [fromCode, toMap] of Object.entries(reductionGraph)) {
    const fromName = codeToName.get(fromCode) ?? fromCode;
    const toByName = graphByName[fromName] ?? (graphByName[fromName] = {});
    for (const [toCode, edges] of Object.entries(toMap)) {
      const toName = codeToName.get(toCode) ?? toCode;
      toByName[toName] = (toByName[toName] ?? []).concat(edges);
    }
  }
  return graphByName;
}

/**
 * Flattens the reduction graph's `{ from: { to: [edge] } }` adjacency map
 * into `Map<problemCode, edge[]>`, one entry per problem covering both
 * directions it appears in (as the FROM problem and as the TO problem).
 * @param {Object} reductionGraph Raw `requestReductionGraph` result.
 * @returns {Map<string, Object[]>}
 */
function indexReductionEdgesByProblem(reductionGraph) {
  const edgesByProblem = new Map();

  const addEdge = (problemCode, edge) => {
    if (!edgesByProblem.has(problemCode)) edgesByProblem.set(problemCode, []);
    edgesByProblem.get(problemCode).push(edge);
  };

  for (const [fromProblem, toMap] of Object.entries(reductionGraph)) {
    for (const [toProblem, edges] of Object.entries(toMap)) {
      for (const edge of edges) {
        addEdge(fromProblem, edge);
        addEdge(toProblem, edge);
      }
    }
  }

  return edgesByProblem;
}

/**
 * Builds one problem's full tags object (see file header for the shape
 * contract and per-field sourcing).
 * @param {string} problemCode Raw class/reflection code (e.g. "CLIQUE").
 * @param {Object} info Full `requestAllInfo` result.
 * @param {Object} solversByProblem Full `requestAllSolvers` result.
 * @param {Object} visualizationsByProblem Full `requestAllVisualizations` result.
 * @param {Map<string, Object[]>} reductionEdgesByProblem From `indexReductionEdgesByProblem`.
 * @returns {{problemName: string, tags: Object}}
 */
function buildProblemTags(
  problemCode,
  info,
  solversByProblem,
  visualizationsByProblem,
  reductionEdgesByProblem,
) {
  const problemInfo = info[problemCode] ?? {};
  const problemName = problemInfo.problemName ?? problemCode;

  const { problemType, computationalModel, complexityClass } = mergeSupplementalTags(problemName, {
    complexityClass: problemInfo.complexityClass,
  });

  const solverType = new Set();
  const solverComplexity = new Set();
  for (const solverClassName of solversByProblem[problemCode] ?? []) {
    const solverInfo = info[solverClassName];
    const mappedType = SOLVER_TYPE_MAP[solverInfo?.solverType];
    if (mappedType) solverType.add(mappedType);
    const mappedComplexity = SOLVER_COMPLEXITY_MAP[solverInfo?.complexityBucket];
    if (mappedComplexity) solverComplexity.add(mappedComplexity);
  }

  const visualizationType = new Set();
  for (const visualizationClassName of visualizationsByProblem[problemCode] ?? []) {
    const style = mergeVisualStyle(visualizationClassName, undefined);
    if (style !== UNCLASSIFIED) visualizationType.add(style);
  }

  const reductionCost = new Set();
  const reductionType = new Set();
  for (const edge of reductionEdgesByProblem.get(problemCode) ?? []) {
    const mappedCost = REDUCTION_COST_MAP[edge.cost];
    if (mappedCost) reductionCost.add(mappedCost);
    const mappedType = REDUCTION_TYPE_MAP[edge.reductionType];
    if (mappedType) reductionType.add(mappedType);
  }

  return {
    problemName,
    tags: {
      problemType,
      computationalModel,
      complexityClass,
      solverType: Array.from(solverType),
      solverComplexity: Array.from(solverComplexity),
      reductionType: Array.from(reductionType),
      reductionCost: Array.from(reductionCost),
      visualizationType: Array.from(visualizationType),
    },
  };
}

/**
 * True unless `visualizationTypesByClassName` explicitly names this class's
 * backend type as one `VISUALIZATION_TYPE_MAP` maps to `null` (today, only
 * "Unimplemented" — a real, confirmed "no renderer exists for this" from the
 * backend itself, e.g. ConvexHullVisualization, checked directly against the
 * live production catalog 2026-09-15: 4 of 49 declared visualizations are
 * this). A backend type this map has never heard of at all still counts —
 * unlike a confirmed Unimplemented stub, an unmapped type is just something
 * this frontend hasn't classified yet, not something known not to render.
 */
function isRenderableVisualizationClass(className, visualizationTypesByClassName) {
  const backendType = visualizationTypesByClassName[className];
  if (!Object.hasOwn(VISUALIZATION_TYPE_MAP, backendType)) {
    return true;
  }
  return VISUALIZATION_TYPE_MAP[backendType] !== null;
}

/**
 * Presence-only signal for StatusIcon's isProblemComplete() rule (at least
 * one declared solver, visualization and verifier) — deliberately raw
 * declared-item counts, not the tags object above, with one exception: a
 * declared visualization only counts if it can actually render something.
 * Checked directly (2026-09-15) after Convex Hull's card showed a green
 * "fully catalogued" check despite having no real visualization — its one
 * declared class, ConvexHullVisualization, is backend-confirmed
 * "Unimplemented", so `hasVisualization` was true on nothing but a
 * registered-but-empty class name. A solver whose backend-reported type has
 * no entry in SOLVER_TYPE_MAP is still a declared solver for completeness
 * purposes even though it contributes nothing to `tags` — solvers have no
 * backend-declared "this does nothing" value the way visualizations do, so
 * that part of the original rule still holds.
 * @returns {{hasSolver: boolean, hasVisualization: boolean, hasVerifier: boolean}}
 */
function buildCompleteness(
  problemCode,
  solversByProblem,
  visualizationsByProblem,
  visualizationTypesByClassName,
  verifiersByProblem,
) {
  return {
    hasSolver: (solversByProblem[problemCode]?.length ?? 0) > 0,
    hasVisualization: (visualizationsByProblem[problemCode] ?? []).some((className) =>
      isRenderableVisualizationClass(className, visualizationTypesByClassName),
    ),
    hasVerifier: (verifiersByProblem[problemCode]?.length ?? 0) > 0,
  };
}

/**
 * Fetches the whole catalog and builds `Map<problemName, tags>` — see file
 * header for the exact shape contract this must satisfy against
 * data/fixtures.js.
 *
 * Calls each batch endpoint exactly once per mount (lib/redux/index.js's
 * own in-memory cache also collapses any incidental repeat call, e.g. React
 * StrictMode's double-invoke, into a single network request). No backend
 * reachable -> the batch calls reject -> `error` is set and `index` stays
 * the empty Map it started as, never a crash (#5).
 *
 * @param {string} url Base API URL, e.g. `/api/redux/`.
 * @returns {{
 *   index: Map<string, Object>,
 *   completeness: Map<string, {hasSolver: boolean, hasVisualization: boolean, hasVerifier: boolean}>,
 *   reductionGraphByName: Object,
 *   codeToName: Map<string, string>,
 *   loading: boolean,
 *   error: Error|null,
 * }}
 *   `reductionGraphByName` (T59/#134) is the reduction graph re-keyed by
 *   display name (see `buildReductionGraphByName` above) -- what
 *   `useCatalogFilters`'s reachability filter traverses, since everything
 *   else this hook returns is already keyed by display name.
 *   `codeToName` is the same problem code -> display name map used to build
 *   `reductionGraphByName`, exposed so a caller that must call a backend
 *   endpoint keyed by raw code directly (e.g. `Navigation/Reductions/path`,
 *   via `ReductionPathFinder.js`) can translate a display name the user
 *   picked back to the code the backend expects, and translate the result
 *   back to display names for rendering.
 */
export function useCatalogIndex(url) {
  const [index, setIndex] = useState(new Map());
  const [completeness, setCompleteness] = useState(new Map());
  const [reductionGraphByName, setReductionGraphByName] = useState({});
  const [codeToName, setCodeToName] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const [
          problemCodes,
          info,
          solversByProblem,
          visualizationsByProblem,
          visualizationTypesByClassName,
          verifiersByProblem,
          reductionGraph,
        ] = await Promise.all([
          requestAllProblems(url),
          requestAllInfo(url),
          requestAllSolvers(url),
          requestAllVisualizations(url),
          requestAllVisualizationTypes(url),
          requestAllVerifiers(url),
          requestReductionGraph(url),
        ]);

        if (cancelled) return;

        const reductionEdgesByProblem = indexReductionEdgesByProblem(reductionGraph ?? {});

        const map = new Map();
        const completenessMap = new Map();
        const codeToName = new Map();
        for (const problemCode of problemCodes ?? []) {
          const { problemName, tags } = buildProblemTags(
            problemCode,
            info ?? {},
            solversByProblem ?? {},
            visualizationsByProblem ?? {},
            reductionEdgesByProblem,
          );
          map.set(problemName, tags);
          completenessMap.set(
            problemName,
            buildCompleteness(
              problemCode,
              solversByProblem ?? {},
              visualizationsByProblem ?? {},
              visualizationTypesByClassName ?? {},
              verifiersByProblem ?? {},
            ),
          );
          codeToName.set(problemCode, problemName);
        }

        setIndex(map);
        setCompleteness(completenessMap);
        setReductionGraphByName(buildReductionGraphByName(reductionGraph ?? {}, codeToName));
        setCodeToName(codeToName);
      } catch (caughtError) {
        if (!cancelled) setError(caughtError);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url]);

  return { index, completeness, reductionGraphByName, codeToName, loading, error };
}
