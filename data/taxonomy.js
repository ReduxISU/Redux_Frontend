// data/taxonomy.js
//
// Single source of truth for every tag category shown in the catalog: the
// ordered facet registry (allowed values, display labels, ordering, accent
// colors), plus the backend -> frontend translation maps and derivation
// rules. No component anywhere may hardcode a label this file owns — a
// future casing change is a one-line edit here, not a hunt through the app.
//
// Pure data and derivation logic only. No React, no MUI, no imports from
// elsewhere in the app. That includes buildOptionsFromBackendNames() below
// (added for the live-backend-enum sidebar options work): it MERGES a live
// backend enum member-name array into this file's own key/label
// conventions, but it does no fetching of its own -- the actual HTTP calls
// to the six Navigation/*Types-and-friends endpoints live in
// hooks/useEnumCatalog.js, which is this file's only new collaborator and
// which itself imports from here, not the other way around.
//
// Facet decisions are ratified in GitHub issue #6 ("T02 — Resolve the open
// taxonomy decisions"); value lists are reconciled against the real backend
// in ai_documentation/TAXONOMY_REFERENCE.md. Citations below point at the
// specific #6 answer that drove each choice.

// Used wherever a tag field has no real or overlay value. Defined once here
// so mergeSupplementalTags.js (#22) and everything downstream import it
// rather than repeating the string literal.
export const UNCLASSIFIED = "Unclassified";

// The eight sidebar facets (#6, 2026-09-01: the mockup's ninth group, a
// separate "Quantum Complexity Class" facet, was merged into Complexity
// Class — see that facet's entry below). Every facet here is a Home sidebar
// filter; there are no detail-page-only facets in the ratified design
// (ARCHITECTURE.md "The taxonomy gap").
export const TAXONOMY = [
  {
    key: "problemType",
    // #6 q2 (2026-08-31): label is "Problem Type", not the mockup's
    // "Problem Domain" — keeps docs, code and UI on one name.
    label: "Problem Type",
    accentColor: "blue",
    sidebar: true,
    multiValued: true,
    options: [
      { key: "graphTheory", label: "Graph Theory" },
      { key: "networkDesign", label: "Network Design" },
      { key: "setsAndPartitions", label: "Sets and Partitions" },
      { key: "storageAndRetrieval", label: "Storage and Retrieval" },
      { key: "sequencingAndScheduling", label: "Sequencing and Scheduling" },
      { key: "mathematicalProgramming", label: "Mathematical Programming" },
      { key: "algebraAndNumberTheory", label: "Algebra and Number Theory" },
      { key: "computationalGeometry", label: "Computational Geometry" },
      { key: "gamesAndPuzzles", label: "Games and Puzzles" },
      { key: "logic", label: "Logic" },
      { key: "automataAndLanguages", label: "Automata and Languages" },
      { key: "programOptimization", label: "Program Optimization" },
      { key: "miscellaneous", label: "Miscellaneous" },
    ],
  },
  {
    key: "computationalModel",
    label: "Computational Model",
    accentColor: "cyan",
    sidebar: true,
    // Single-valued, mutually exclusive (TAXONOMY_REFERENCE.md §2).
    multiValued: false,
    options: [
      { key: "turingMachines", label: "Turing Machines" },
      { key: "automata", label: "Automata" },
      { key: "logicalFunctionalModels", label: "Logical/Functional Models" },
      { key: "parallelDistributed", label: "Parallel/Distributed" },
      { key: "quantumModels", label: "Quantum Models" },
    ],
  },
  {
    key: "complexityClass",
    label: "Complexity Class",
    accentColor: "amber",
    sidebar: true,
    // #6 (2026-09-01, supersedes the 2026-08-31 record): multi-valued, and
    // absorbs the former separate "Quantum Complexity Class" facet. A
    // problem shows only its single most specific classical class plus any
    // quantum class it also carries (direct project-owner instruction
    // supersedes this facet's earlier "show every class truly held" rule —
    // see deriveComplexityClasses() below for the actual precedence).
    multiValued: true,
    options: [
      // Classical ladder, ordered by increasing difficulty (ratified
      // 2026-08-31). Title-cased "Complete"/"Hard" (direct project-owner
      // instruction; supersedes the earlier Wikipedia-cased lowercase call).
      { key: "p", label: "P" },
      { key: "np", label: "NP" },
      { key: "npComplete", label: "NP-Complete" },
      { key: "npHard", label: "NP-Hard" },
      // Quantum classes, merged in from the deleted facet (#6, 2026-09-01).
      // No backend field exists; these are sourced entirely from the
      // supplementalTags.js overlay (#7).
      { key: "bqp", label: "BQP" },
      { key: "eqp", label: "EQP" },
      { key: "qma", label: "QMA" },
      { key: "qcma", label: "QCMA" },
      { key: "qip", label: "QIP" },
      { key: "mipStar", label: "MIP*" },
    ],
  },
  {
    key: "solverType",
    label: "Solver Type",
    accentColor: "salmon-red",
    sidebar: true,
    multiValued: true,
    options: [
      { key: "exact", label: "Exact" },
      { key: "heuristic", label: "Heuristic" },
      { key: "approximation", label: "Approximation" },
      // No backend source for these three — they legitimately show (0)
      // until the backend adds matching SolverType values or per-solver
      // overlay tagging exists. That's correct behavior, not a bug.
      { key: "randomized", label: "Randomized" },
      { key: "numerical", label: "Numerical" },
      { key: "automatedReasoning", label: "Automated Reasoning" },
      { key: "quantum", label: "Quantum" },
    ],
  },
  {
    key: "solverComplexity",
    label: "Solver Complexity",
    accentColor: "coral",
    // #6 q1 (2026-08-31): IS a sidebar filter, showing all 8 ratified
    // buckets even though the backend enum only has 3 today — the other 5
    // legitimately show (0) rather than being hidden. An earlier draft of
    // ARCHITECTURE.md said this was detail-page-only metadata; that was
    // wrong and has been corrected there and here.
    sidebar: true,
    multiValued: false,
    options: [
      { key: "constant", label: "Constant" },
      { key: "logarithmic", label: "Logarithmic" },
      { key: "linear", label: "Linear" },
      { key: "logLinear", label: "Log-linear" },
      { key: "quadratic", label: "Quadratic" },
      { key: "polynomial", label: "Polynomial" },
      { key: "exponential", label: "Exponential" },
      { key: "factorial", label: "Factorial" },
    ],
  },
  {
    key: "reductionType",
    label: "Reduction Type",
    accentColor: "violet",
    sidebar: true,
    // Retargeted 2026-09-02 (issue #31, comment thread on #7): the
    // 2026-08-31 meeting's ratified vocabulary (Karp (Many-One), Cook
    // (Turing), L/AP-Reductions, Parsimonious, Randomized, Parameterized,
    // Fine-Grained) was checked against Redux's real 20 reductions before
    // this facet was wired up for real -- every one of them is a classical
    // Karp reduction, so that vocabulary would show Karp: 20, everything
    // else: 0. Retargeted to the real backend's `ReductionType` enum
    // instead: Garey & Johnson's proof-technique taxonomy
    // (TAXONOMY_REFERENCE.md §7), which splits genuinely on the same 20
    // reductions (Restriction: 8, LocalReplacement: 5, ComponentDesign: 7).
    // Real-backend-derived once ReduxISU/Redux#396 merges (REDUCTION_TYPE_MAP
    // below) -- unlike the other backend-gap facets, this one needs no
    // supplementalTags.js overlay entry.
    multiValued: false,
    options: [
      { key: "restriction", label: "Restriction" },
      { key: "localReplacement", label: "Local Replacement" },
      { key: "componentDesign", label: "Component Design" },
    ],
  },
  {
    key: "reductionCost",
    label: "Reduction Cost",
    accentColor: "violet",
    sidebar: true,
    multiValued: false,
    options: [
      { key: "linear", label: "Linear" },
      { key: "quadratic", label: "Quadratic" },
      { key: "cubic", label: "Cubic" },
      // C5 / TAXONOMY_REFERENCE.md §8: missing from the original planning
      // doc, but already backend-backed (ReductionCost.HigherPolynomial)
      // and shown in the mockup ("Higher Poly."). No backend work needed.
      { key: "higherPolynomial", label: "Higher Polynomial" },
      // Deliberately left out of v1 (TAXONOMY_REFERENCE.md §8): Logarithmic
      // Space, Approximation Degradation, Kernelization Bounds,
      // Spatial/Qubit Overhead. The backend has no concept of them, so
      // they'd sit permanently at (0).
    ],
  },
  {
    key: "visualizationType",
    label: "Visualization Type",
    accentColor: "green",
    sidebar: true,
    // Each visualization declares exactly one conceptual style.
    multiValued: false,
    // #6 q3 (2026-08-31): conceptual labels supplied by the `visualStyle`
    // overlay field, NOT the backend's renderer-implementation enum
    // (TAXONOMY_REFERENCE.md §9 conflict C4).
    options: [
      { key: "nodeLinkDiagram", label: "Node-Link Diagram" },
      { key: "dag", label: "DAG" },
      { key: "bipartiteFactorGraph", label: "Bipartite Factor Graph" },
      { key: "logicGateSchematic", label: "Logic Gate Schematic" },
      { key: "bdd", label: "BDD" },
      { key: "searchTree", label: "Search Tree" },
      { key: "ganttChart", label: "Gantt Chart" },
      { key: "spaceTimeDiagram", label: "Space-Time Diagram" },
      { key: "voronoiMap", label: "Voronoi Map" },
      { key: "threeDSurfacePlot", label: "3D Surface Plot" },
      { key: "lossLandscape", label: "Loss Landscape" },
      { key: "quantumCircuit", label: "Quantum Circuit" },
    ],
  },
];

const TAXONOMY_BY_KEY = new Map(TAXONOMY.map((facet) => [facet.key, facet]));

/**
 * The display label for one facet's option key ("npComplete" -> "NP-Complete"),
 * the same lookup ProblemCatalogCard's chips already used locally before this
 * became the shared copy every caller reads from -- this file's own header
 * comment: "No component anywhere may hardcode a label this file owns."
 * Falls back to the raw key for an option this file doesn't recognize,
 * rather than throwing, so an unmapped/overlay-only value still renders as
 * something instead of crashing the caller.
 */
export function optionLabel(facetKey, optionKey) {
  const option = TAXONOMY_BY_KEY.get(facetKey)?.options.find(
    (candidate) => candidate.key === optionKey,
  );
  return option?.label ?? optionKey;
}

// --- Translation maps: backend vocabulary -> frontend option key(s) -------
//
// The backend's enums and the frontend's display vocabulary don't match.
// Those translations live here, beside the values they translate into, so
// all tag-naming decisions live in exactly one file.

// SolverType (backend, describes algorithm family) -> Solver Type option key
// (frontend, describes solving approach). TAXONOMY_REFERENCE.md §5/§5a.
//
// Three map straight across. Eight exhaustive/deterministic families collapse
// into "Exact". `Greedy` isn't named in this issue's Part 2 body text, but
// TAXONOMY_REFERENCE.md §5a resolves "Greedy Algorithms" to Heuristic, and is
// included here so every backend SolverType member has a mapping (see this
// task's handback summary for that assumption).
export const SOLVER_TYPE_MAP = {
  BruteForce: "exact",
  Greedy: "heuristic",
  DynamicProgramming: "exact",
  Approximation: "approximation",
  Heuristic: "heuristic",
  DivideAndConquer: "exact",
  Quantum: "quantum",
  StateTransition: "exact",
  BreadthFirstSearch: "exact",
  DepthFirstSearch: "exact",
  Backtracking: "exact",
  Constructive: "exact",
  // Not yet hand-tagged by the backend curator — no Solver Type tag.
  Unclassified: undefined,
};

// ComplexityClass (backend, single-valued) -> the Complexity Class option
// key(s) actually shown for a problem. Reworked again (direct project-owner
// instruction, supersedes the 2026-09-01/#6 "show every class truly held"
// rule): a problem now shows only its single most specific classification,
// not every broader class that classification implies. NP-complete already
// means "in NP and NP-hard", so a problem that is NP-complete shows just
// that, not three chips saying the same fact three ways; same reasoning
// drops "np" from P (P implies NP, "P" is the stronger, more informative
// statement). "np" as a displayed tag is reserved for the one case where
// nothing more specific applies.
//
// Keys here must be the real ReduxISU/Redux enum member names
// (Interfaces/ComplexityClass.cs), not a guessed or historical name for the
// same idea. Checked directly against that file (2026-09-15) after Prime
// Factorization turned up showing no complexity class tag at all: the real
// member for "in NP, not known P or NP-complete" is `NP` itself (its own doc
// comment names integer factorization as the textbook example), not
// `NPIntermediate` -- that key never matched anything, so every problem
// declaring the real `NP` value silently fell through to no tag. The
// backend's six quantum members (BQP, EQP, QMA, QCMA, QIP, MIPStar) are
// listed individually for the same reason, replacing a single made-up
// `QuantumOracle` placeholder that matched none of them -- currently a
// latent bug rather than a live one, since a missing key falls back to `[]`
// the same way a correct one would while quantum classes are still sourced
// from the overlay, but wrong regardless and worth being honest about
// before anything ever reads this map for those values directly.
export const COMPLEXITY_CLASS_MAP = {
  P: ["p"],
  NPComplete: ["npComplete"],
  NP: ["np"],
  NPHard: ["npHard"],
  BQP: [],
  EQP: [],
  QMA: [],
  QCMA: [],
  QIP: [],
  MIPStar: [],
  Unclassified: [],
};

/**
 * The Complexity Class option key(s) a problem displays: its single most
 * specific classical classification (see COMPLEXITY_CLASS_MAP), unioned
 * with any quantum classes from the overlay, since a problem can genuinely
 * carry both (a classical class and a quantum one) at once.
 *
 * `backendComplexityClass` is the single stored `ComplexityClass` enum
 * value. `overlayQuantumClasses` is the problem's quantum classes from the
 * supplementalTags.js overlay (e.g. ["bqp"]).
 *
 * Invariant: "np" appears in the result only when `backendComplexityClass`
 * is "NP" — every other classical value maps to a single, more-specific key
 * instead. A caller that ever sees "np" from any other backend value has a
 * bug in this map, not in the caller.
 */
export function deriveComplexityClasses(backendComplexityClass, overlayQuantumClasses = []) {
  const classical = COMPLEXITY_CLASS_MAP[backendComplexityClass] ?? [];
  return Array.from(new Set([...classical, ...overlayQuantumClasses]));
}

// ReductionCost (backend) -> Reduction Cost option key (frontend). Linear,
// Quadratic, Cubic and HigherPolynomial map straight across — this facet is
// the best-aligned of the backend-gap facets (TAXONOMY_REFERENCE.md §8).
export const REDUCTION_COST_MAP = {
  Linear: "linear",
  Quadratic: "quadratic",
  Cubic: "cubic",
  HigherPolynomial: "higherPolynomial",
  Unclassified: undefined,
};

// ReductionType (backend) -> Reduction Type option key (frontend). Direct
// map, same convention as REDUCTION_COST_MAP. Targets the proof-technique
// vocabulary ReduxISU/Redux#396 actually built, not the reduction-
// complexity-theory vocabulary originally ratified — see the reductionType
// facet's own comment above, TAXONOMY_REFERENCE.md §7, and issue #31.
export const REDUCTION_TYPE_MAP = {
  Restriction: "restriction",
  LocalReplacement: "localReplacement",
  ComponentDesign: "componentDesign",
  Unclassified: undefined,
};

// SolverComplexityBucket (backend) -> Solver Complexity option key (frontend).
// Direct map, same convention as the others above. The backend enum only
// covers 3 of the 8 ratified buckets (TAXONOMY_REFERENCE.md §6) — Constant,
// Logarithmic, Linear, Log-linear and Quadratic have no backend member yet,
// so solvers that are actually one of those are over-bucketed into
// Polynomial today. Sidebar checkboxes for the missing 5 legitimately show
// (0) until the backend enum is extended; that's correct behavior, not a bug
// in this map.
export const SOLVER_COMPLEXITY_MAP = {
  Polynomial: "polynomial",
  Exponential: "exponential",
  Factorial: "factorial",
  Unclassified: undefined,
};

// --- Live backend enum -> sidebar option list ------------------------------
//
// Direct project-owner instruction: "we want to make sure the backend is the
// source of all the info coming to the frontend even if it is not super
// accurate to all kinds of problems (we will fix it once we verify the state
// of the backend with more enum values)." For the six facets with a real
// backend enum (problemType, complexityClass, reductionType, reductionCost,
// solverType, solverComplexity), the sidebar's list of AVAILABLE OPTIONS is
// now driven by the live `Navigation/*` enum-catalog endpoints
// (hooks/useEnumCatalog.js) through buildOptionsFromBackendNames() below,
// not by this file's hardcoded `options` arrays directly. Those hardcoded
// arrays are kept (nothing above this comment changed) for two reasons this
// function itself depends on: they're the label lookup source right below,
// and hooks/useCatalogFilters.js falls back to them verbatim before the live
// fetch resolves or if it fails, so the sidebar never goes blank.
//
// This is a one-way merge, not a replacement of the translation maps above:
// COMPLEXITY_CLASS_MAP / REDUCTION_TYPE_MAP / REDUCTION_COST_MAP still answer
// their original question ("what does an instance's declared value translate
// to") for deriveComplexityClasses() and useCatalogIndex.js's per-problem
// tagging, untouched. buildOptionsFromBackendNames() answers a different
// question -- "what options should the filter offer" -- and only reuses
// those maps' keys when they're already a good answer to that question too.

/**
 * PascalCase backend enum member name -> camelCase frontend option key, e.g.
 * `"BruteForce"` -> `"bruteForce"`. The general algorithm (not just "lowercase
 * the first letter"): a run of two or more leading capitals is an acronym,
 * and only its LAST letter starts the next word, e.g. `"NPComplete"` ->
 * `"npComplete"`, `"MIPStar"` -> `"mipStar"`, `"BQP"` (the whole name is the
 * acronym) -> `"bqp"`. Reduces to plain "lowercase the first letter" whenever
 * there's only one leading capital, which is every case in ProblemType,
 * ReductionType, ReductionCost, SolverType and SolverComplexityBucket today
 * -- this is written generically anyway so a future acronym-leading member
 * (as already occurs in ComplexityClass: BQP, EQP, QMA, QCMA, QIP, MIPStar)
 * in any of those enums keys the same way this file's own hand-picked keys
 * for ComplexityClass's quantum members already do, rather than mangling it.
 */
function backendNameToOptionKey(memberName) {
  let upperRunLength = 0;
  while (upperRunLength < memberName.length && /[A-Z]/.test(memberName[upperRunLength])) {
    upperRunLength++;
  }
  if (upperRunLength === 0) return memberName;
  if (upperRunLength === memberName.length) return memberName.toLowerCase();
  if (upperRunLength === 1) return memberName.charAt(0).toLowerCase() + memberName.slice(1);
  return (
    memberName.slice(0, upperRunLength - 1).toLowerCase() + memberName.slice(upperRunLength - 1)
  );
}

/**
 * Readable label auto-generated from a raw PascalCase backend member name,
 * e.g. `"DivideAndConquer"` -> `"Divide And Conquer"`: a space before every
 * capital letter that immediately follows a lowercase letter or digit. An
 * acronym run (e.g. the "NP" in a hypothetical "NPComplete") is left alone
 * by this same rule -- there's no lowercase-then-uppercase boundary inside
 * a run of consecutive capitals -- so it can't mangle one. Only used when
 * `buildOptionsFromBackendNames` can't find an already-hand-picked label for
 * the derived key in the facet's own hardcoded `options` (see that
 * function); in practice that means this mainly fires for solverType, since
 * complexityClass/reductionType/reductionCost keys come from the existing
 * translation maps, which always resolve to an already-labeled key.
 */
function autoLabelFromBackendName(memberName) {
  return memberName.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
}

// Facets whose existing backend->frontend translation map is worth
// consulting first for the option key: it already answers "what frontend
// key does this exact backend member name mean" for every non-empty entry.
// solverType/solverComplexity are deliberately left out -- consulting
// SOLVER_TYPE_MAP/SOLVER_COMPLEXITY_MAP here would reintroduce exactly the
// many-backend-members-collapse-into-one-frontend-option behavior this
// function exists to stop using for those two facets (see the solverType/
// solverComplexity bullets in this task's own instructions).
const BACKEND_TRANSLATION_MAPS_FOR_OPTIONS = {
  complexityClass: COMPLEXITY_CLASS_MAP,
  reductionType: REDUCTION_TYPE_MAP,
  reductionCost: REDUCTION_COST_MAP,
};

/**
 * Builds a facet's sidebar option list directly from a live backend enum's
 * member-name array (one of the six `Navigation/*` enum-catalog endpoints,
 * fetched by hooks/useEnumCatalog.js), instead of this file's hardcoded
 * `options` array. See the "Live backend enum -> sidebar option list"
 * comment above for why, and `hooks/useCatalogFilters.js` for where this is
 * actually called from.
 *
 * For each backend member name (skipping "Unclassified" -- defense in depth,
 * since useEnumCatalog.js already filters it out before this ever runs):
 *  - if `facetKey` has an entry in BACKEND_TRANSLATION_MAPS_FOR_OPTIONS and
 *    that map already has a non-empty mapping for this exact member name,
 *    reuse that mapping's key(s) verbatim (COMPLEXITY_CLASS_MAP's values are
 *    arrays -- e.g. P -> ["p"] -- so a single backend member can produce more
 *    than one option, though none of today's real entries do);
 *  - otherwise (no map for this facet, no entry, or an entry mapped to `[]`
 *    -- COMPLEXITY_CLASS_MAP's quantum members today) derive one key with
 *    backendNameToOptionKey(). This is the path solverType and
 *    solverComplexity always take, by design (see
 *    BACKEND_TRANSLATION_MAPS_FOR_OPTIONS above) -- and it's also why the
 *    quantum ComplexityClass members show up as real, correctly-keyed
 *    options: backendNameToOptionKey("BQP") is "bqp", the same key this
 *    file's own hardcoded complexityClass options and
 *    supplementalTags.js's overlay already use, so the live count computed
 *    by useCatalogFilters.js's existing (untouched) counting logic lines up
 *    with whatever deriveComplexityClasses()/the overlay actually produce
 *    for those problems.
 *
 * The label for each key prefers the facet's own hardcoded `options` entry
 * for that exact key, if one exists (so an already-curated label like
 * "NP-Complete" or "MIP*" is never replaced by an auto-generated one just
 * because the option now round-trips through a live fetch); otherwise falls
 * back to `autoLabelFromBackendName`.
 *
 * @param {string} facetKey One of TAXONOMY's facet keys.
 * @param {string[]} backendMemberNames Sorted enum member names from one of
 *   the six enum-catalog endpoints, e.g. `useEnumCatalog()`'s `solverType`.
 * @returns {{key: string, label: string}[]} Same shape as a facet's own
 *   hardcoded `options` array (no `count` -- that's still added by
 *   `useCatalogFilters.js`'s `buildFacetOptions`), in `backendMemberNames`'s
 *   own order (already alphabetical -- the backend sorts before returning).
 */
export function buildOptionsFromBackendNames(facetKey, backendMemberNames) {
  const facet = TAXONOMY_BY_KEY.get(facetKey);
  const existingLabelByKey = new Map(
    (facet?.options ?? []).map((option) => [option.key, option.label]),
  );
  const translationMap = BACKEND_TRANSLATION_MAPS_FOR_OPTIONS[facetKey];

  const seenKeys = new Set();
  const options = [];

  for (const memberName of backendMemberNames ?? []) {
    if (memberName === UNCLASSIFIED) continue;

    const mapped =
      translationMap && Object.hasOwn(translationMap, memberName)
        ? translationMap[memberName]
        : undefined;
    const mappedKeys = Array.isArray(mapped) ? mapped : mapped ? [mapped] : [];
    const keys = mappedKeys.length > 0 ? mappedKeys : [backendNameToOptionKey(memberName)];

    for (const key of keys) {
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      options.push({
        key,
        label: existingLabelByKey.get(key) ?? autoLabelFromBackendName(memberName),
      });
    }
  }

  return options;
}
