// lib/problemNames.js
//
// #279 (Names): the one place a problem's key becomes the name people read.
//
// Redux names each problem two ways. Its key ("CLIQUE", "VERTEXCOVER", "SAT3") is the
// class/reflection code Navigation/Batch/allProblems lists and every other batch endpoint is
// keyed by. Its display name ("Clique", "Vertex Cover", "3SAT") is the `problemName` field of
// Navigation/Batch/allInfo[key]. People only ever see the display name, written exactly as Redux
// writes it: never re-cased, so an acronym stays an acronym and nothing else is shouted.
//
// The page routes and the catalog are keyed by display name (`/Vertex%20Cover`), so the key only
// matters on the way in (resolving a route or a search typed as a key) and on the way out to
// Redux (Navigation/Reductions/path takes keys).

/**
 * A problem's display name: Redux's `problemName` for the key, or the key itself when Redux gives
 * no name (an older backend, or a problem whose `problemName` is blank).
 * @param {Object|null|undefined} info `requestAllInfo`'s result.
 * @param {string} key The problem's key, e.g. "VERTEXCOVER".
 * @returns {string} e.g. "Vertex Cover".
 */
export function problemDisplayName(info, key) {
  const name = info?.[key]?.problemName;
  return typeof name === "string" && name.trim() ? name.trim() : key;
}

/**
 * Every problem's key mapped to its display name, in Redux's own order.
 * @param {string[]|null|undefined} keys `requestAllProblems`'s result.
 * @param {Object|null|undefined} info `requestAllInfo`'s result.
 * @returns {Map<string, string>} key -> display name.
 */
export function buildKeyToName(keys, info) {
  const keyToName = new Map();
  for (const key of keys ?? []) keyToName.set(key, problemDisplayName(info, key));
  return keyToName;
}

/**
 * The key of the problem a route segment or a typed name names: its display name first, then its
 * key, ignoring case for the key only ("vertexcover" and "VERTEXCOVER" both find Vertex Cover).
 * @param {Map<string, string>} keyToName From `buildKeyToName`.
 * @param {string} nameOrKey e.g. "Vertex Cover" or "VERTEXCOVER".
 * @returns {string|null} The key, or null when nothing matches.
 */
export function findProblemKey(keyToName, nameOrKey) {
  if (!nameOrKey) return null;
  for (const [key, name] of keyToName) if (name === nameOrKey) return key;
  const wanted = nameOrKey.toUpperCase();
  for (const key of keyToName.keys()) if (key.toUpperCase() === wanted) return key;
  return null;
}

/**
 * A problem picker's `filterOptions` (MUI Autocomplete): an option (a display name) matches
 * what was typed when its display name or its key contains it, ignoring case, so "SAT3" finds
 * 3SAT and "vertex" finds Vertex Cover.
 * @param {Map<string, string>|null|undefined} keyToName From `buildKeyToName`.
 * @returns {(options: string[], state: {inputValue: string}) => string[]}
 */
export function problemOptionFilter(keyToName) {
  const nameToKey = new Map();
  for (const [key, name] of keyToName ?? []) nameToKey.set(name, key);
  return (options, { inputValue }) => {
    const typed = inputValue.trim().toLowerCase();
    if (!typed) return options;
    return options.filter(
      (name) =>
        name.toLowerCase().includes(typed) ||
        Boolean(nameToKey.get(name)?.toLowerCase().includes(typed)),
    );
  };
}
