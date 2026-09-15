// hooks/useContributorProfile.js
//
// Added for the About Us page. Fetches one contributor's full profile on demand
// (`contributorName` starts `null` until a visitor picks someone from the list), and
// re-fetches whenever `contributorName` changes to a new, non-null value. Same
// loading/error/cleanup shape as hooks/useCatalogIndex.js.

import { useEffect, useState } from "react";
import { requestContributorProfile } from "../lib/redux";

/**
 * @param {string} url Base API URL, e.g. `/api/redux/`.
 * @param {string|null} contributorName The selected contributor's display name, or
 *   `null` when no one is selected. `profile` resets to `null` and nothing is fetched
 *   while this is `null`.
 * @returns {{ profile: Object|null, loading: boolean, error: Error|null }}
 */
export function useContributorProfile(url, contributorName) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Reset during render when `contributorName` changes (dialog closed, or a
  // different contributor picked), rather than in the effect below -- React's
  // documented "adjust state when a prop changes" pattern, same one
  // ProblemDetailLayout.js uses for its instance/certificate reset. Settles during
  // the same render instead of an effect calling setState synchronously on its own
  // first pass, which is what the previous version of this hook did.
  const [trackedName, setTrackedName] = useState(contributorName);
  if (trackedName !== contributorName) {
    setTrackedName(contributorName);
    setProfile(null);
    setError(null);
    setLoading(Boolean(contributorName));
  }

  useEffect(() => {
    if (!contributorName) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await requestContributorProfile(url, contributorName);
        if (cancelled) return;
        setProfile(result ?? null);
      } catch (caughtError) {
        if (!cancelled) setError(caughtError);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url, contributorName]);

  return { profile, loading, error };
}
