// hooks/useEnumCatalog.js
//
// Fetches the six closed-vocabulary enum-catalog endpoints
// (Redux/AdditionalControllers/Navigation/Nav_Enums.cs) that back six of
// data/taxonomy.js's eight sidebar facets, so useCatalogFilters.js can build
// each of those facets' sidebar option list from the real backend enum
// instead of a hand-typed copy of it -- direct project-owner instruction,
// see data/taxonomy.js's "Live backend enum -> sidebar option list" comment
// for the full rationale.
//
// Same shape/conventions as hooks/useCatalogIndex.js's own fetch effect:
// loading/error state, a `cancelled` guard in the effect cleanup so a
// second mount (or an unmount mid-fetch) can't clobber a later result, one
// `Promise.all` for all six calls, and -- ground rule #5, "no backend
// reachable must not crash" -- this never throws out of the hook. A failed
// fetch sets `error` and leaves every array at its initial empty-array
// value, which is exactly the signal useCatalogFilters.js's buildFacetOptions
// needs to fall back to data/taxonomy.js's hardcoded `options` arrays instead
// of going blank.
//
// Each returned array already has "Unclassified" filtered out -- matching
// data/taxonomy.js's translation maps' own convention of never emitting it
// as a real option -- so callers (data/taxonomy.js's
// buildOptionsFromBackendNames, in practice) don't have to.

import { useEffect, useState } from "react";
import { UNCLASSIFIED } from "../data/taxonomy";
import {
  requestComplexityClasses,
  requestProblemTypes,
  requestReductionCosts,
  requestReductionTypes,
  requestSolverComplexityBuckets,
  requestSolverTypes,
} from "../lib/redux";

const EMPTY = [];

/**
 * Drops "Unclassified" from a raw enum-catalog response. Defensive against a
 * missing/malformed response (e.g. a caught rejection resolving to
 * `undefined` if this were ever reused somewhere that doesn't reject) by
 * treating anything that isn't an array as empty, same convention
 * `useCatalogIndex.js` follows throughout (`?? {}`/`?? []` at every call
 * site) rather than trusting the network layer's shape.
 */
function withoutUnclassified(names) {
  if (!Array.isArray(names)) return EMPTY;
  return names.filter((name) => name !== UNCLASSIFIED);
}

/**
 * Fetches all six enum-catalog endpoints once per mount and returns their
 * member-name arrays (each already filtered of "Unclassified"), for
 * data/taxonomy.js's buildOptionsFromBackendNames to turn into sidebar
 * options.
 *
 * `lib/redux/index.js`'s own in-memory cache (`cachedRequest`) collapses any
 * incidental repeat call -- e.g. React StrictMode's double-invoke -- into a
 * single network request per endpoint, same as every other hook built on
 * top of that module.
 *
 * @param {string} url Base API URL, e.g. `/api/redux/` (REDUX_API_BASE_URL).
 * @returns {{
 *   complexityClass: string[],
 *   problemType: string[],
 *   reductionType: string[],
 *   reductionCost: string[],
 *   solverType: string[],
 *   solverComplexityBucket: string[],
 *   loading: boolean,
 *   error: Error|null,
 * }}
 *   Every array is `[]` until the fetch resolves, and stays `[]` for any
 *   facet whose underlying call failed or never reached the backend --
 *   never `undefined`, so a caller can check `.length` without a null guard.
 */
export function useEnumCatalog(url) {
  const [complexityClass, setComplexityClass] = useState(EMPTY);
  const [problemType, setProblemType] = useState(EMPTY);
  const [reductionType, setReductionType] = useState(EMPTY);
  const [reductionCost, setReductionCost] = useState(EMPTY);
  const [solverType, setSolverType] = useState(EMPTY);
  const [solverComplexityBucket, setSolverComplexityBucket] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const [
          complexityClassNames,
          problemTypeNames,
          reductionTypeNames,
          reductionCostNames,
          solverTypeNames,
          solverComplexityBucketNames,
        ] = await Promise.all([
          requestComplexityClasses(url),
          requestProblemTypes(url),
          requestReductionTypes(url),
          requestReductionCosts(url),
          requestSolverTypes(url),
          requestSolverComplexityBuckets(url),
        ]);

        if (cancelled) return;

        setComplexityClass(withoutUnclassified(complexityClassNames));
        setProblemType(withoutUnclassified(problemTypeNames));
        setReductionType(withoutUnclassified(reductionTypeNames));
        setReductionCost(withoutUnclassified(reductionCostNames));
        setSolverType(withoutUnclassified(solverTypeNames));
        setSolverComplexityBucket(withoutUnclassified(solverComplexityBucketNames));
      } catch (caughtError) {
        // #5: an unreachable backend must not throw an unhandled error, and
        // must not leave a caller with a mix of resolved and never-set
        // arrays -- Promise.all rejects as soon as the first call fails, so
        // every array here deliberately stays at its EMPTY starting value
        // rather than partially updating.
        if (!cancelled) setError(caughtError);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url]);

  return {
    complexityClass,
    problemType,
    reductionType,
    reductionCost,
    solverType,
    solverComplexityBucket,
    loading,
    error,
  };
}
