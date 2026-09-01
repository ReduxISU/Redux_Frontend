// data/taxonomy.js
//
// Single source of truth for every tag category shown in the catalog: the
// ordered facet registry (allowed values, display labels, ordering, accent
// colors), plus the backend -> frontend translation maps and derivation
// rules. No component anywhere may hardcode a label this file owns — a
// future casing change is a one-line edit here, not a hunt through the app.
//
// Pure data and derivation logic only. No React, no MUI, no imports from
// elsewhere in the app.
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
    // problem shows every class it truly belongs to at once (0/1 Knapsack is
    // both NP-complete and NP) — see deriveComplexityClasses() below.
    multiValued: true,
    options: [
      // Classical ladder, ordered by increasing difficulty (ratified
      // 2026-08-31). Wikipedia casing: lowercase "complete"/"hard".
      { key: "p", label: "P" },
      { key: "np", label: "NP" },
      { key: "npComplete", label: "NP-complete" },
      { key: "npHard", label: "NP-hard" },
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
    // Tier 1, mutually exclusive (TAXONOMY_REFERENCE.md §7).
    multiValued: false,
    options: [
      { key: "karp", label: "Karp (Many-One)" },
      { key: "cook", label: "Cook (Turing)" },
      { key: "lApReductions", label: "L/AP-Reductions" },
      { key: "parsimonious", label: "Parsimonious" },
      { key: "randomized", label: "Randomized" },
      { key: "parameterized", label: "Parameterized" },
      { key: "fineGrained", label: "Fine-Grained" },
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

// ComplexityClass (backend, single-valued) -> the full set of Complexity
// Class option keys a problem belongs to, by true containment. Reworked
// 2026-09-01 (#6): this is a derivation, not a 1:1 rename, because a single
// backend value can (and P/NPComplete do) imply more than one displayed
// class. `QuantumOracle` yields no classical value — those problems carry a
// real quantum class from the overlay instead (see deriveComplexityClasses).
export const COMPLEXITY_CLASS_MAP = {
  P: ["p", "np"],
  NPComplete: ["npComplete", "np", "npHard"],
  NPIntermediate: ["np"],
  NPHard: ["npHard"],
  QuantumOracle: [],
  Unclassified: [],
};

/**
 * The full set of Complexity Class option keys a problem belongs to.
 *
 * `backendComplexityClass` is the single stored `ComplexityClass` enum
 * value. `overlayQuantumClasses` is the problem's quantum classes from the
 * supplementalTags.js overlay (e.g. ["bqp"]) — unioned onto the classical
 * set derived from the backend value, since a problem can carry both.
 *
 * Invariant (TAXONOMY_REFERENCE.md §3/#6 2026-09-01): "np" appears ALONE in
 * the classical portion of the result only when `backendComplexityClass` is
 * "NPIntermediate" — every other classical value either omits "np" or pairs
 * it with "p" or "npComplete"/"npHard". A caller that ever sees a bare "np"
 * from any other backend value has a bug in this map, not in the caller.
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
