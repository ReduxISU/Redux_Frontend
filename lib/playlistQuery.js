// lib/playlistQuery.js
//
// #165 -- self-service playlist encode/decode, the same URL-as-storage idea
// lib/compareQuery.js already uses for #149's comparison sets: the whole
// playlist lives in one query value, so a link fully reproduces it for
// anyone who opens it, no backend write and no accounts. Unlike
// compareQuery.js's comma-joined name list, a playlist carries a title, an
// optional description and a per-step optional note -- free text that can
// itself contain a comma -- so this serializes the whole thing as JSON
// first, then encodeURIComponent's the result as one opaque query value
// (short keys, to keep the resulting link a reasonable length).
//
// Consumed by components/PlaylistCreator.js (encode, on submit) and
// pages/playlists/custom.js + pages/[problem].js (decode, on load) --
// pages/[problem].js reaches a custom playlist through the same
// `?playlist=<slug>` param the hand-authored ones use, with the reserved
// slug "custom" plus this module's own `p` param carrying the payload (see
// data/playlists.js's own note on why "custom" can't be a real hand-authored
// slug).
//
// Also holds the "My playlists" localStorage convenience (issue's own
// "optional convenience" scope item): per-browser only, keyed by the same
// `p` query value, so it has no bearing on who else can open a given link.
//
// A step's optional `solver`/`visualization` fields (added alongside this
// feature, not part of #165's original scope) name a declared solver/
// visualization to preselect when that step's problem page loads -- the
// exact same values components/detail/SolversSection.js's/
// VisualizationsSection.js's own `?solver=`/`?viz=` permalink params already
// read (#161 follow-up). Nothing here validates the name against that
// problem's real declared list: an unrecognized name just degrades to the
// default (index 0) the same way a stale/hand-edited `?solver=` link already
// does, so this module doesn't need to know anything about solvers or
// visualizations beyond passing the name through.

export const MAX_CUSTOM_PLAYLIST_PROBLEMS = 5;
export const MAX_TITLE_LENGTH = 80;
export const MAX_DESCRIPTION_LENGTH = 280;
export const MAX_PROBLEM_NAME_LENGTH = 200;
export const MAX_NOTE_LENGTH = 200;

function clampText(value, maxLength) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

/**
 * @param {{title: string, description?: string, problems: {name: string, note?: string, solver?: string, visualization?: string}[]}} playlist
 * @returns {string} The `/playlists/custom` query value (no leading `?p=`).
 */
export function buildCustomPlaylistQueryValue(playlist) {
  const payload = {
    t: clampText(playlist.title, MAX_TITLE_LENGTH),
    d: clampText(playlist.description, MAX_DESCRIPTION_LENGTH),
    s: playlist.problems.slice(0, MAX_CUSTOM_PLAYLIST_PROBLEMS).map((entry) => {
      const step = { n: clampText(entry.name, MAX_PROBLEM_NAME_LENGTH) };
      const note = clampText(entry.note, MAX_NOTE_LENGTH);
      if (note) step.o = note;
      const solver = clampText(entry.solver, MAX_PROBLEM_NAME_LENGTH);
      if (solver) step.sv = solver;
      const visualization = clampText(entry.visualization, MAX_PROBLEM_NAME_LENGTH);
      if (visualization) step.vz = visualization;
      return step;
    }),
  };
  return encodeURIComponent(JSON.stringify(payload));
}

/**
 * Inverse of buildCustomPlaylistQueryValue -- also doubles as the parser for
 * a hand-typed or shared URL, so a malformed/truncated value degrades to
 * `null` (no playlist) rather than throwing, matching parseCompareNames'
 * own defensiveness for a hand-edited link.
 * @param {string|undefined} rawValue `router.query.p` -- Next.js has already
 *   decoded it once by the time a page sees it.
 * @returns {{title: string, description: string, problems: {name: string, note?: string, solver?: string, visualization?: string}[]}|null}
 */
export function parseCustomPlaylist(rawValue) {
  if (typeof rawValue !== "string" || rawValue === "") return null;

  let parsed;
  try {
    parsed = JSON.parse(rawValue);
  } catch {
    return null;
  }
  if (parsed === null || typeof parsed !== "object" || !Array.isArray(parsed.s)) return null;

  const problems = [];
  for (const step of parsed.s) {
    if (!step || typeof step !== "object") continue;
    const name = clampText(step.n, MAX_PROBLEM_NAME_LENGTH);
    if (!name) continue;
    const entry = { name };
    const note = clampText(step.o, MAX_NOTE_LENGTH);
    if (note) entry.note = note;
    const solver = clampText(step.sv, MAX_PROBLEM_NAME_LENGTH);
    if (solver) entry.solver = solver;
    const visualization = clampText(step.vz, MAX_PROBLEM_NAME_LENGTH);
    if (visualization) entry.visualization = visualization;
    problems.push(entry);
    if (problems.length === MAX_CUSTOM_PLAYLIST_PROBLEMS) break;
  }
  if (problems.length === 0) return null;

  return {
    title: clampText(parsed.t, MAX_TITLE_LENGTH) || "Untitled playlist",
    description: clampText(parsed.d, MAX_DESCRIPTION_LENGTH),
    problems,
  };
}

/**
 * Shared by both playlist kinds (data/playlists.js's hand-authored entries
 * and a self-service one's decoded steps -- same `{name, note?, solver?,
 * visualization?}` shape either way): the `&solver=...&viz=...` suffix to
 * append to a step's problem link so that problem's page preselects the
 * named solver/visualization on load, same params components/detail/
 * SolversSection.js/VisualizationsSection.js already read. Empty string when
 * the step names neither -- every existing hand-authored entry, which has
 * no reason to change just because this feature shipped.
 * @param {{solver?: string, visualization?: string}} entry
 * @returns {string}
 */
export function buildPlaylistStepQuerySuffix(entry) {
  const params = [];
  if (entry.solver) params.push(`solver=${encodeURIComponent(entry.solver)}`);
  if (entry.visualization) params.push(`viz=${encodeURIComponent(entry.visualization)}`);
  return params.length > 0 ? `&${params.join("&")}` : "";
}

// --- "My playlists" (per-browser localStorage convenience) ----------------
//
// Same namespaced-key + version-guard + try/catch shape pages/index.js's
// readStoredHomeFilters/writeStoredHomeFilters (#154) and
// components/StartupSplash.js's readStoredBootId/writeStoredBootId (#65)
// already use in this codebase -- localStorage throws outright in some
// browser configurations (Safari private mode, cookie-blocking policies), so
// every access is wrapped rather than assumed to succeed.
//
// Exposed as a useSyncExternalStore-shaped triple (subscribe/getSnapshot/
// getServerSnapshot) rather than a plain read function pages/playlists/
// index.js would call from a mount effect -- localStorage is exactly the
// "mutable value outside React" useSyncExternalStore exists for, and reading
// it that way (getServerSnapshot answering `[]`, same as this page's
// build-time-prerendered HTML, until the client's subscription takes over)
// avoids both a hydration mismatch and the setState-in-a-mount-effect
// anti-pattern eslint-plugin-react-hooks now flags outright.

const MY_PLAYLISTS_STORAGE_KEY = "redux-frontend:my-playlists";
const MY_PLAYLISTS_STORAGE_VERSION = 1;
const MAX_STORED_PLAYLISTS = 20;

const EMPTY_MY_PLAYLISTS = [];
// Caches the last snapshot handed out, keyed by the raw string it was parsed
// from, so getMyPlaylistsSnapshot returns the SAME array reference across
// calls when nothing has actually changed -- useSyncExternalStore compares
// snapshots with Object.is and re-renders whenever the reference differs, so
// parsing fresh on every call would re-render on every unrelated render of
// whatever component subscribes to this.
let cachedRaw;
let cachedSnapshot = EMPTY_MY_PLAYLISTS;

function parseStoredEntries(raw) {
  if (!raw) return EMPTY_MY_PLAYLISTS;

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return EMPTY_MY_PLAYLISTS;
  }
  if (
    parsed === null ||
    typeof parsed !== "object" ||
    parsed.version !== MY_PLAYLISTS_STORAGE_VERSION ||
    !Array.isArray(parsed.entries)
  ) {
    return EMPTY_MY_PLAYLISTS;
  }

  return parsed.entries.filter(
    (entry) =>
      entry &&
      typeof entry.title === "string" &&
      typeof entry.query === "string" &&
      typeof entry.createdAt === "number",
  );
}

function writeMyPlaylists(entries) {
  try {
    window.localStorage.setItem(
      MY_PLAYLISTS_STORAGE_KEY,
      JSON.stringify({ version: MY_PLAYLISTS_STORAGE_VERSION, entries }),
    );
  } catch {
    // Nothing to do: reading back degrades to "nothing stored" the same way.
  }
  // localStorage's own "storage" event only fires in OTHER tabs/windows, not
  // the one that made the change -- this notifies same-tab subscribers (the
  // component that just called addMyPlaylist/removeMyPlaylist) immediately.
  notifyMyPlaylistsListeners();
}

const myPlaylistsListeners = new Set();

function notifyMyPlaylistsListeners() {
  for (const listener of myPlaylistsListeners) listener();
}

/**
 * useSyncExternalStore's `subscribe` argument for the "My playlists" list.
 * @param {() => void} onStoreChange
 * @returns {() => void} Unsubscribe.
 */
export function subscribeMyPlaylists(onStoreChange) {
  myPlaylistsListeners.add(onStoreChange);
  const onStorageEvent = (event) => {
    if (event.key === MY_PLAYLISTS_STORAGE_KEY) onStoreChange();
  };
  window.addEventListener("storage", onStorageEvent);
  return () => {
    myPlaylistsListeners.delete(onStoreChange);
    window.removeEventListener("storage", onStorageEvent);
  };
}

/**
 * useSyncExternalStore's `getSnapshot` argument.
 * @returns {{title: string, query: string, createdAt: number}[]} Newest
 *   first. Always an array, even if nothing is stored or storage is
 *   unavailable.
 */
export function getMyPlaylistsSnapshot() {
  let raw = null;
  try {
    raw = window.localStorage.getItem(MY_PLAYLISTS_STORAGE_KEY);
  } catch {
    // Falls through with raw left null -- see parseStoredEntries.
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedSnapshot = parseStoredEntries(raw);
  }
  return cachedSnapshot;
}

/**
 * useSyncExternalStore's `getServerSnapshot` argument -- matches this page's
 * build-time-prerendered HTML (no window, so nothing stored), which is what
 * lets the client's real value take over post-hydration without a mismatch.
 * @returns {[]}
 */
export function getMyPlaylistsServerSnapshot() {
  return EMPTY_MY_PLAYLISTS;
}

/**
 * Records a just-created playlist in this browser's own list. De-duplicates
 * on `query` (creating the same playlist twice moves it back to the front
 * rather than appearing twice) and caps at MAX_STORED_PLAYLISTS, dropping
 * the oldest.
 * @param {{title: string, query: string}} entry
 */
export function addMyPlaylist({ title, query }) {
  const rest = getMyPlaylistsSnapshot().filter((existing) => existing.query !== query);
  const next = [{ title, query, createdAt: Date.now() }, ...rest].slice(0, MAX_STORED_PLAYLISTS);
  writeMyPlaylists(next);
}

/**
 * Removes one entry from this browser's own list -- only forgets the local
 * shortcut, never affects the link itself or anyone else who has it.
 * @param {string} query
 */
export function removeMyPlaylist(query) {
  writeMyPlaylists(getMyPlaylistsSnapshot().filter((existing) => existing.query !== query));
}
