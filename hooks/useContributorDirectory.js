// hooks/useContributorDirectory.js
//
// Added for the About Us page. Fetches the contributor directory once per mount, same
// loading/error/cleanup shape as hooks/useCatalogIndex.js: `error` is set and
// `directory` stays the empty array it started as rather than throwing, so a page
// using this can show the same "couldn't reach Redux" banner every other data-backed
// page already uses instead of a crash.

import { useEffect, useState } from "react";
import { requestContributorDirectory } from "../lib/redux";

/**
 * @param {string} url Base API URL, e.g. `/api/redux/`.
 * @returns {{
 *   directory: Array<{name: string, githubUsername: string}>,
 *   loading: boolean,
 *   error: Error|null,
 * }}
 */
export function useContributorDirectory(url) {
  const [directory, setDirectory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const entries = await requestContributorDirectory(url);
        if (cancelled) return;
        setDirectory(entries ?? []);
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

  return { directory, loading, error };
}
