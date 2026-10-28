// data/supplementalTags.js
//
// T03 (issue #7). THE hand-authored overlay: values for the tag categories the
// real Redux backend has no field for yet. mergeSupplementalTags.js (T22/#31)
// reads this file and prefers a real backend value over what's here whenever
// one exists -- this file only fills the gap.
//
// -----------------------------------------------------------------------
// Source and freshness
// -----------------------------------------------------------------------
// Keys below are the exact `problemName` strings returned by the live
// production backend (https://redux.isu.edu/api/redux/), queried 2026-09-02
// via Navigation/Batch/allProblems (49 problem codes) cross-referenced
// against Navigation/Batch/allInfo (each code's `problemName` field -- the
// human-readable display name, NOT the short code allProblems itself
// returns, e.g. code "SAT3" -> problemName "3SAT"). If this file starts
// showing zero coverage everywhere, re-run that query -- the catalog may
// have grown past 49 problems since this date, or a name may have changed.
//
// Full 49-name list captured this run (paste into the PR description):
//   Feedback Arc Set, Bernstein Vazirani, Bin Packing, Clique, Clique Cover,
//   Convex Hull, Cut, Deutsch, Deutsch Jozsa, DFA Acceptance,
//   Directed Hamiltonian Path, 3-Dimensional Matching, Dominating Set,
//   Edit Distance, Exact Cover, Graph Coloring, Hamiltonian Path,
//   Hitting Set, Independent Set, 0-1 Integer Programming, Job Sequencing,
//   Knapsack (Binary), Lossless Data Compression, Max Cut, Minimum Cut,
//   Minimum Spanning Tree, Minimum S-T Cut, NFA Acceptance,
//   Feedback Node Set, N-Queens, Partition, Prime Factorization,
//   Pump Scheduling Cost Minimization, Pump Scheduling Emergency Resilience,
//   SAT, 3SAT, Set Cover, Simon's Problem,
//   Single Pair Shortest Path Problem, Single Source Shortest Path Problem,
//   Steiner Tree, Strongly Connected Components, Subset Sum, Sudoku,
//   Topological Sort, Traveling Salesperson, Unstructured Search,
//   Vertex Cover, Weighted Cut
//
// Renamed since this snapshot: "Hamiltonian Path" is now "Hamiltonian Cycle"
// and "Directed Hamiltonian Path" is now "Directed Hamiltonian Cycle"
// (ReduxISU/Redux#597), because both problems decide a cycle.
//
// Note this is 49, not the ~59 issue #7 and TASKLIST.md's T03 write-up
// expect from the mockup -- see this task's handback summary. Also note
// several of these real names differ from data/fixtures.js's Phase-1 sample
// keys ("3SAT" not "3-SAT", "Knapsack (Binary)" not "0/1 Knapsack",
// "Hamiltonian Path" not "Hamiltonian Cycle", no "Circuit-SAT" or
// "General CNF-SAT" in the real catalog at all) -- exactly the silent-zero-
// coverage trap this issue warns about. fixtures.js is Shell-phase-only and
// isn't wired to this file, so nothing is broken today, but whoever wires
// T23/useCatalogIndex should key off THIS file's names, not fixtures.js's.
//
// -----------------------------------------------------------------------
// Field precedence and shape
// -----------------------------------------------------------------------
// Only three fields live in this file (down from the four/five referenced in
// older comments -- Reduction Type was retargeted to real backend data on
// 2026-09-02, issue #31, and needs no overlay entry at all; see
// data/taxonomy.js's reductionType facet comment and REDUCTION_TYPE_MAP):
//
//   problemType        string[]  -- always a ONE-ELEMENT array. The real
//                                   backend field (ReduxISU/Redux#396,
//                                   `ProblemType problemType { get; }`) is
//                                   single-valued, not the ProblemType[] this
//                                   project's taxonomy originally assumed.
//                                   Wrapped in an array here so the shape
//                                   matches taxonomy.js's multiValued:true
//                                   problemType facet. None of the 49
//                                   problems in #396's branch declare more
//                                   than one value, so this mismatch stayed
//                                   theoretical for this pass -- see the
//                                   handback summary if that ever changes.
//   computationalModel string    -- single value (taxonomy.js: multiValued
//                                   false), omitted where not confidently
//                                   knowable.
//   complexityClass    string[]  -- ONLY present on genuinely quantum-
//                                   complexity problems (the former
//                                   `QuantumOracle` bucket). This is the
//                                   "overlayQuantumClasses" argument
//                                   data/taxonomy.js's deriveComplexityClasses()
//                                   unions onto the classical set it derives
//                                   from the real backend's ComplexityClass
//                                   value -- see that function's doc comment.
//                                   Every other problem simply has no
//                                   `complexityClass` key here; its badge
//                                   comes entirely from the real backend
//                                   field via COMPLEXITY_CLASS_MAP.
//
// All values are data/taxonomy.js option keys (camelCase), never the
// backend's PascalCase enum names -- e.g. `GraphTheory` -> "graphTheory",
// `EQP` -> "eqp" -- same translation convention as SOLVER_TYPE_MAP /
// REDUCTION_COST_MAP.
//
// -----------------------------------------------------------------------
// Sourcing
// -----------------------------------------------------------------------
// problemType and complexityClass (quantum half) are copied from
// ReduxISU/Redux#396 (open, unmerged, branch
// feature/tag-system-expansion-375-379), per the 2026-09-01 decision on
// issue #31 not to re-derive hand-researched work already sitting in that
// branch. Verified directly against that branch's source (not the PR diff
// summary): grepped `Problems/**/*_Class.cs` for
// `problemType { get; } = ProblemType\.` (49 matches, one per problem) and
// `complexityClass { get; } = ComplexityClass\.(EQP|BQP)` (5 matches:
// Deutsch, Deutsch Jozsa, Bernstein Vazirani -> EQP; Simon's Problem,
// Unstructured Search -> BQP). Both match this issue's and #31's written
// expectations exactly.
//
// computationalModel is fully hand-researched here (#396 doesn't touch this
// facet at all). Default is "turingMachines" for ordinary classical
// decision/optimization problems. Three exceptions, reasoned from each
// problem's actual formal definition (queried from allInfo, not guessed):
//   - DFA Acceptance, NFA Acceptance -> "automata" (the problem IS a finite-
//     automaton acceptance question).
//   - SAT, 3SAT -> "logicalFunctionalModels" (the problem IS a Boolean-
//     formula satisfiability question).
//   - Pump Scheduling Cost Minimization, Pump Scheduling Emergency
//     Resilience -> "parallelDistributed" (deciding which of several pumps
//     to run concurrently each hour -- a genuinely concurrent-resource
//     problem, not just a sequential ordering one).
//   - Deutsch, Deutsch Jozsa, Bernstein Vazirani, Simon's Problem,
//     Unstructured Search -> "quantumModels" (the same 5 problems whose
//     complexity class is quantum -- their formal definitions are stated
//     directly in terms of oracle/black-box quantum functions).
// Deliberately NOT quantum: Prime Factorization, despite Shor's Algorithm
// being one of its solvers. Its formal definition (`{<i> | i is int}`) is a
// plain classical decomposition problem; having a quantum solver available
// doesn't change the problem's own computational model, any more than SAT
// having a Grover-based solver (SATGroverSolver) makes SAT's model quantum.
// See the handback summary -- this is a judgment call, not backend data.
//
// visualStyle (a per-visualization conceptual style, 12 hand-tagged labels
// from #6 q3) used to live here too, as SUPPLEMENTAL_VISUAL_STYLE. Removed
// once the Visualization Type facet switched to the backend's own picture
// types (`pictureType`, ReduxISU/Redux#841, read through data/taxonomy.js's
// derivePictureTypeOption()): the list was frozen on 2026-09-02, so every
// visualization added after that had no entry and its card showed "No
// visualizations". See TAXONOMY_REFERENCE.md §9.

/**
 * @typedef {Object} SupplementalProblemTags
 * @property {string[]} problemType        One-element array; see file header.
 * @property {string} [computationalModel] Omitted where not confidently knowable.
 * @property {string[]} [complexityClass]  Quantum classes only; omitted elsewhere.
 */

/** @type {Object<string, SupplementalProblemTags>} */
export const SUPPLEMENTAL_TAGS = {
  "Feedback Arc Set": { problemType: ["graphTheory"], computationalModel: "turingMachines" },
  "Bernstein Vazirani": {
    problemType: ["miscellaneous"],
    computationalModel: "quantumModels",
    complexityClass: ["eqp"],
  },
  "Bin Packing": { problemType: ["storageAndRetrieval"], computationalModel: "turingMachines" },
  Clique: { problemType: ["graphTheory"], computationalModel: "turingMachines" },
  "Clique Cover": { problemType: ["graphTheory"], computationalModel: "turingMachines" },
  "Convex Hull": {
    problemType: ["computationalGeometry"],
    computationalModel: "turingMachines",
  },
  Cut: { problemType: ["networkDesign"], computationalModel: "turingMachines" },
  Deutsch: {
    problemType: ["miscellaneous"],
    computationalModel: "quantumModels",
    complexityClass: ["eqp"],
  },
  "Deutsch Jozsa": {
    problemType: ["miscellaneous"],
    computationalModel: "quantumModels",
    complexityClass: ["eqp"],
  },
  "DFA Acceptance": { problemType: ["automataAndLanguages"], computationalModel: "automata" },
  "Directed Hamiltonian Cycle": {
    problemType: ["graphTheory"],
    computationalModel: "turingMachines",
  },
  "3-Dimensional Matching": {
    problemType: ["setsAndPartitions"],
    computationalModel: "turingMachines",
  },
  "Dominating Set": { problemType: ["graphTheory"], computationalModel: "turingMachines" },
  "Edit Distance": { problemType: ["storageAndRetrieval"], computationalModel: "turingMachines" },
  "Exact Cover": { problemType: ["setsAndPartitions"], computationalModel: "turingMachines" },
  "Graph Coloring": { problemType: ["graphTheory"], computationalModel: "turingMachines" },
  "Hamiltonian Cycle": { problemType: ["graphTheory"], computationalModel: "turingMachines" },
  "Hitting Set": { problemType: ["setsAndPartitions"], computationalModel: "turingMachines" },
  "Independent Set": { problemType: ["graphTheory"], computationalModel: "turingMachines" },
  "0-1 Integer Programming": {
    problemType: ["mathematicalProgramming"],
    computationalModel: "turingMachines",
  },
  "Job Sequencing": {
    problemType: ["sequencingAndScheduling"],
    computationalModel: "turingMachines",
  },
  "Knapsack (Binary)": {
    problemType: ["mathematicalProgramming"],
    computationalModel: "turingMachines",
  },
  "Lossless Data Compression": {
    problemType: ["storageAndRetrieval"],
    computationalModel: "turingMachines",
  },
  "Max Cut": { problemType: ["networkDesign"], computationalModel: "turingMachines" },
  "Minimum Cut": { problemType: ["networkDesign"], computationalModel: "turingMachines" },
  "Minimum Spanning Tree": {
    problemType: ["networkDesign"],
    computationalModel: "turingMachines",
  },
  "Minimum S-T Cut": { problemType: ["networkDesign"], computationalModel: "turingMachines" },
  "NFA Acceptance": { problemType: ["automataAndLanguages"], computationalModel: "automata" },
  "Feedback Node Set": { problemType: ["graphTheory"], computationalModel: "turingMachines" },
  "N-Queens": { problemType: ["gamesAndPuzzles"], computationalModel: "turingMachines" },
  Partition: { problemType: ["setsAndPartitions"], computationalModel: "turingMachines" },
  "Prime Factorization": {
    problemType: ["algebraAndNumberTheory"],
    // Deliberately classical -- see file header "Deliberately NOT quantum".
    computationalModel: "turingMachines",
  },
  "Pump Scheduling Cost Minimization": {
    problemType: ["sequencingAndScheduling"],
    computationalModel: "parallelDistributed",
  },
  "Pump Scheduling Emergency Resilience": {
    problemType: ["sequencingAndScheduling"],
    computationalModel: "parallelDistributed",
  },
  SAT: { problemType: ["logic"], computationalModel: "logicalFunctionalModels" },
  "3SAT": { problemType: ["logic"], computationalModel: "logicalFunctionalModels" },
  "Set Cover": { problemType: ["setsAndPartitions"], computationalModel: "turingMachines" },
  "Simon's Problem": {
    problemType: ["miscellaneous"],
    computationalModel: "quantumModels",
    complexityClass: ["bqp"],
  },
  "Single Pair Shortest Path Problem": {
    problemType: ["networkDesign"],
    computationalModel: "turingMachines",
  },
  "Single Source Shortest Path Problem": {
    problemType: ["networkDesign"],
    computationalModel: "turingMachines",
  },
  "Steiner Tree": { problemType: ["networkDesign"], computationalModel: "turingMachines" },
  "Strongly Connected Components": {
    problemType: ["graphTheory"],
    computationalModel: "turingMachines",
  },
  "Subset Sum": { problemType: ["setsAndPartitions"], computationalModel: "turingMachines" },
  Sudoku: { problemType: ["gamesAndPuzzles"], computationalModel: "turingMachines" },
  "Topological Sort": { problemType: ["graphTheory"], computationalModel: "turingMachines" },
  "Traveling Salesperson": {
    problemType: ["networkDesign"],
    computationalModel: "turingMachines",
  },
  "Unstructured Search": {
    problemType: ["miscellaneous"],
    computationalModel: "quantumModels",
    complexityClass: ["bqp"],
  },
  "Vertex Cover": { problemType: ["graphTheory"], computationalModel: "turingMachines" },
  "Weighted Cut": { problemType: ["networkDesign"], computationalModel: "turingMachines" },
};

// Reduction Type: intentionally no entries anywhere in this file. Retargeted
// to the real backend's ReductionType field (issue #31, 2026-09-02) -- see
// data/taxonomy.js's reductionType facet comment and REDUCTION_TYPE_MAP.
