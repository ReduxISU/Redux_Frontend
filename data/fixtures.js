// data/fixtures.js
//
// SHELL-PHASE ONLY. This is hand-written sample catalog data, not real data
// from the Redux backend. Its only job is letting pages/index.js (T14),
// pages/[problem].js (T19), and every presentational component that reads
// catalog data be built and visually reviewed against the mockups before
// the real data layer (hooks/useCatalogIndex.js, T23/#32) exists.
//
// T31 (issue #40) retires or repurposes this file once Phase 2 lands: either
// delete it, or move it under tests/ as Playwright seed data. No page or
// component should still import it from here after that.
//
// -----------------------------------------------------------------------
// SHAPE CONTRACT (read this before changing either side)
// -----------------------------------------------------------------------
// Issue #13 (T09): "the fixture data must be shaped exactly like what the
// real data hook will produce. That hook is T23 (#32). If T23 hasn't been
// started yet, define the shape here and make T23 conform to it."
//
// As of this file's creation, T23/#32 has not been started (no open PR, no
// branch) -- checked via `gh pr list`. So this is that definition. Whoever
// picks up T23 should read this comment block, not guess.
//
// Only the `tags` object nested in each entry is the part T23's
// `useCatalogIndex()` must reproduce exactly -- that hook returns
// `{ index, loading, error }`, where `index` is a `Map<problemName, tags>`
// built from the 5 real-backend-derived facets (complexityClass, solverType,
// reductionCost, visualizationType, solverComplexity) plus the 4 fully-gap
// facets merged in via `mergeSupplementalTags` (problemType,
// computationalModel, reductionType) and the quantum half of complexityClass
// -- see the overlay-field-count note below for why that list has 5 members,
// not 4. T25 depends on swapping `FIXTURE_CATALOG_INDEX` for the real
// `useCatalogIndex()` return value being a one-line change in pages/index.js,
// so `tags` must stay exactly this shape: every facet key from
// `data/taxonomy.js`'s `TAXONOMY` array, valued as either a single option
// `key` string (facets with `multiValued: false`) or an array of option
// `key` strings (facets with `multiValued: true`, OR any facet -- like
// visualizationType, solverComplexity, reductionCost, reductionType --
// where the real per-instance value is single-valued but a *problem* can
// have several instances, e.g. several visualizations of different types,
// so the problem-level tag aggregates to a set). A value with no known real
// or overlay value is simply omitted from that aggregate set -- it never
// appears as a bare `UNCLASSIFIED` inside a tag array, matching T23's own
// done-when ("Unclassified values are excluded from facet option lists
// rather than appearing as a checkbox").
//
// Everything else on an entry (`overview`, `solvers`, `visualizations`,
// `verifier`, `reductions`) is Phase-1-only convenience data for
// pages/[problem].js (T19). T26 ("Wire pages/[problem].js to real data")
// replaces these with direct calls to requestAllInfo / requestAllSolvers /
// requestAllVerifiers / requestAllVisualizations / requestReductionGraph --
// it is explicitly NOT a one-line swap the way T25 is for the Home page, so
// T23 does not need to reproduce this part of the shape.
//
// -----------------------------------------------------------------------
// DECISION: five overlay fields, not four
// -----------------------------------------------------------------------
// Issue #13's own "Done when" list says "one of the four supplemental
// overlay fields," and TASKLIST.md's T22 write-up and ARCHITECTURE.md's
// directory-tree comment for supplementalTags.js/mergeSupplementalTags.js
// both also say "4 gap fields." That count is stale: it predates the
// 2026-08-31 addition of the conceptual `visualStyle` field (issue #6,
// conflict C4). ARCHITECTURE.md's "The taxonomy gap" section (last touched
// 2026-09-01, the most recently corrected version of this count) and
// TAXONOMY_REFERENCE.md §9 both explicitly call visualStyle "a fifth
// overlay field" / "the fifth overlay field alongside the four backend-gap
// fields." The real, merged `data/taxonomy.js` (T06, PR #45) confirms this
// reading: its `visualizationType` facet's options are already the
// conceptual vocabulary (Node-Link Diagram, Bipartite Factor Graph, BDD,
// ...), not the backend's renderer enum, sourced -- per that file's own
// comment -- from the visualStyle overlay.
//
// So the count is: 3 fully-gap fields with zero backend counterpart
// (problemType, computationalModel, reductionType), + the quantum half of
// complexityClass (partial overlay onto an otherwise-real backend field),
// + visualStyle (partial overlay onto visualizationType) = 5 overlay
// concepts in all. This fixture is built against that reading. Whoever
// picks up T22/T23 should treat "four" in the issue body and in
// mergeSupplementalTags.js's own doc-comment as the stale figure and update
// it to five, rather than reproducing it forward.
//
// (None of the 12 sample problems below are QuantumOracle-classified, so
// none of them exercise the quantum half of complexityClass -- that part of
// the shape is documented here but not demonstrated by this fixture set.)
//
// -----------------------------------------------------------------------
// A known, unresolved vocabulary gap, surfaced by this task
// -----------------------------------------------------------------------
// The "Problem Detail -- draggable panels" mockup shows 3-SAT's second
// visualization as "Assignment Table / Table" -- but the ratified 12-value
// Visualization Type list (data/taxonomy.js) has no "Table" option, and
// TAXONOMY_REFERENCE.md §9 itself flags this exact ambiguity ("Assignment
// Table" is step-table-ish, closest to Search Tree or BDD, but not
// resolved). Rather than force it into a option it doesn't really match,
// that visualization's `type` below is `UNCLASSIFIED` (data/taxonomy.js's
// own exported constant for exactly this situation) with a comment at the
// call site. This is a real, currently-open gap in the ratified taxonomy,
// not a mistake in this file -- flagging it here so it isn't silently
// "fixed" by picking an arbitrary bucket.
//
// -----------------------------------------------------------------------
// Problem selection
// -----------------------------------------------------------------------
// The 12 problems are the ones issue #13 names, chosen so visual review is
// a direct side-by-side comparison against the mockups. 3-SAT gets the full
// detail-page fixture -- both Problem Detail mockup PDFs use it as their
// worked example (Input/Output text, source, contributor, 3 visualizations,
// 4 solvers, certificate format, and the reduces-to/reduces-from lists were
// all extracted from those PDFs' embedded text layers, not eyeballed). The
// other 11 carry real declared-shaped data across every facet, chosen partly
// to give the Home sidebar (T11) non-trivial (>0) counts across most facet
// options for review -- see individual comments below for why a given
// problem was tagged the way it was.

import { UNCLASSIFIED } from "./taxonomy";

/**
 * @typedef {Object} FixtureTags
 * @property {string[]} problemType
 * @property {string} computationalModel
 * @property {string[]} complexityClass
 * @property {string[]} solverType
 * @property {string[]} solverComplexity
 * @property {string[]} reductionType
 * @property {string[]} reductionCost
 * @property {string[]} visualizationType
 */

/**
 * @typedef {Object} FixtureProblem
 * @property {string} name          Exact display name; also the Map key.
 * @property {string} slug          Kebab-case, URL-safe -- pages/[problem].js's route param.
 * @property {string} oneLiner      Home card / Detail page one-line description.
 * @property {FixtureTags} tags     The part T23/useCatalogIndex must reproduce exactly.
 * @property {Object} [overview]    Detail page Overview section (T16a) content.
 * @property {Array} [solvers]      Detail page Solvers section (T16c) content.
 * @property {Array} [visualizations] Detail page Visualizations section (T16b) content.
 * @property {Object|null} [verifier] Detail page Verifier section (T16d) content.
 * @property {Object} [reductions]  Detail page Reductions section (T16e) content: { to, from }.
 */

/** @type {FixtureProblem[]} */
export const FIXTURE_PROBLEMS = [
  {
    name: "0/1 Knapsack",
    slug: "0-1-knapsack",
    oneLiner:
      "Given items with weights and values and a capacity limit, does a subset exist with total value at least V without exceeding the capacity?",
    tags: {
      problemType: ["mathematicalProgramming"],
      computationalModel: "turingMachines",
      complexityClass: ["npComplete", "np", "npHard"],
      solverType: ["exact"],
      solverComplexity: ["polynomial", "exponential"],
      reductionType: ["karp"],
      reductionCost: ["linear"],
      visualizationType: ["searchTree"],
    },
    // DP is pseudo-polynomial (O(nW)); the backend's SolverComplexityBucket
    // enum has no bucket for that yet (TAXONOMY_REFERENCE.md §6), so it's
    // shown here as "polynomial" -- the nearest existing bucket, same
    // simplification the real backend would have to make today.
    solvers: [
      { name: "Dynamic Programming", type: "exact", complexityBucket: "polynomial" },
      { name: "Brute Force", type: "exact", complexityBucket: "exponential" },
    ],
    visualizations: [
      {
        name: "Branch and Bound Tree",
        type: "searchTree",
        caption:
          "Search tree over include/exclude decisions per item; pruned branches shown greyed out.",
      },
    ],
    verifier: {
      certificateDescription: "A subset of item indices.",
      certificateFormat: "certificate = [i1, i2, …, ik]",
    },
    reductions: {
      to: [{ target: "Subset Sum", cost: "linear", type: "karp" }],
      from: [],
    },
  },
  {
    name: "1-in-3 SAT",
    slug: "1-in-3-sat",
    oneLiner:
      "Given a Boolean formula in conjunctive normal form with exactly three literals per clause, does there exist an assignment satisfying exactly one literal per clause?",
    tags: {
      problemType: ["logic"],
      computationalModel: "turingMachines",
      complexityClass: ["npComplete", "np", "npHard"],
      solverType: ["exact"],
      solverComplexity: ["exponential"],
      reductionType: ["karp"],
      reductionCost: ["linear"],
      visualizationType: ["bipartiteFactorGraph"],
    },
    solvers: [{ name: "Brute Force", type: "exact", complexityBucket: "exponential" }],
    visualizations: [
      {
        name: "Clause Graph",
        type: "bipartiteFactorGraph",
        caption: "Clause groups with exactly-one-true highlighting per clause.",
      },
    ],
    verifier: {
      certificateDescription: "A satisfying truth assignment: a boolean array of length n.",
      certificateFormat: "certificate = [x1, x2, …, xn]",
    },
    reductions: {
      to: [],
      from: [{ source: "3-SAT", cost: "linear", type: "karp" }],
    },
  },
  {
    name: "3-SAT",
    slug: "3-sat",
    oneLiner:
      "Given a Boolean formula in conjunctive normal form with exactly three literals per clause, does there exist a satisfying variable assignment?",
    tags: {
      problemType: ["logic"],
      computationalModel: "turingMachines",
      // Backend ComplexityClass value is NPComplete -> deriveComplexityClasses
      // yields all three: npComplete + np + npHard (data/taxonomy.js
      // COMPLEXITY_CLASS_MAP, ratified 2026-09-01). The "Problem Detail"
      // mockups only show NP-Complete + NP -- the third (NP-hard) badge is a
      // deliberate, already-ratified expansion of the mockup, not an error
      // introduced by this fixture.
      complexityClass: ["npComplete", "np", "npHard"],
      solverType: ["exact", "heuristic", "automatedReasoning"],
      solverComplexity: ["exponential"],
      reductionType: ["karp"],
      // Union of this problem's own reduces-to (linear, quadratic, quadratic,
      // cubic, higherPolynomial) and reduces-from (linear, linear) costs.
      reductionCost: ["linear", "quadratic", "cubic", "higherPolynomial"],
      // Union of its 3 visualizations' types, excluding the one that's
      // UNCLASSIFIED (see the file-header gap note) -- an unclassified
      // instance doesn't spuriously match any sidebar checkbox.
      visualizationType: ["bipartiteFactorGraph", "bdd"],
    },
    // Extracted from the embedded text layers of both Problem Detail mockup
    // PDFs (mockup_images/), not transcribed by eye.
    overview: {
      // Ratified decision (issue #6, conflict C3): explicit Input:/Output:
      // fields, not the mockup's "FORMAL DEFINITION" set-notation block.
      // Content below is the mockup's own set-notation prose, reshaped into
      // that ratified format rather than dropped.
      input:
        "Φ, a Boolean formula in conjunctive normal form with exactly three literals per clause, over variables x1, …, xn.",
      output:
        "True if there exists an assignment x1, …, xn ∈ {true, false} such that every clause contains at least one true literal; False otherwise.",
      source:
        'Karp, Richard M. "Reducibility among combinatorial problems." Complexity of computer computations. Springer, Boston, MA, 1972. 85–103.',
      contributedBy: "Kaden Marchetti",
    },
    visualizations: [
      {
        name: "Clause Graph",
        type: "bipartiteFactorGraph",
        caption:
          "Three clause groups (C1/C2/C3) placed around a center point; colored chords connect literals of the same variable across clauses.",
        // v1 scope (T16b, ground rule 5): canned, non-interactive
        // step-scrubber chrome -- not live playback.
        stepLabel: "step 3/8",
        stepNarration:
          "Step 3: x1 was just set to False. The two !x1 literals (in C2 and C3) turn true and satisfy their clauses — labels and chords turn orange; the two x1 literals turn false (grey). C1 is still pending, waiting on !x2 or x3. Same canvas doubles as an editor for hand-built instances.",
      },
      {
        name: "Assignment Table",
        // Known ratified-vocabulary gap -- see file header. The mockup shows
        // "Table" here; no such option exists in data/taxonomy.js's ratified
        // 12-value list, and TAXONOMY_REFERENCE.md §9 leaves this exact case
        // unresolved. Left UNCLASSIFIED rather than guessed.
        type: UNCLASSIFIED,
        caption:
          "Each clause as a row; each literal's value under the current assignment, with the satisfying literal in each row highlighted.",
      },
      {
        name: "Satisfiability View",
        type: "bdd",
        caption:
          "Binary decision diagram over x1, …, xn; the highlighted path is the satisfying assignment found for the default instance.",
      },
    ],
    solvers: [
      {
        name: "DPLL",
        type: "automatedReasoning",
        complexityBucket: "exponential",
        bigO: "O(2ⁿ)",
        // Canned Run output (T16c ground rule 5) -- requestSolvedInstance
        // exists and works, but v1 never calls it live.
        runtime: "<1ms",
        result: { status: "Satisfiable", output: "(x1:False,x2:False,x3:True)" },
      },
      { name: "Brute Force", type: "exact", complexityBucket: "exponential", bigO: "O(2ⁿ)" },
      { name: "WalkSAT", type: "heuristic", complexityBucket: "exponential", bigO: "O(2ⁿ)" },
      { name: "CDCL", type: "automatedReasoning", complexityBucket: "exponential", bigO: "O(2ⁿ)" },
    ],
    verifier: {
      certificateDescription:
        "A satisfying truth assignment: a boolean array of length n, one value per variable.",
      certificateFormat: "certificate = [x1, x2, …, xn]\n// xi ∈ {true, false}",
      // Canned Verify output (T16d ground rule 5).
      exampleCertificate: "(x1:False, x2:False, x3:True)",
      resultBanner: {
        valid: true,
        headline: "True",
        detail: "Every clause has at least one true literal — this certificate is valid.",
      },
      properties: [
        "Polynomial-time verifiable",
        "Certificate size: O(n)",
        "Verifier runtime: O(n·m)",
        "Deterministic",
      ],
    },
    reductions: {
      // Order matches the mockup; VERTEX COVER is the one shown as
      // "(shown above)" in the mockup's default selection.
      to: [
        { target: "Vertex Cover", cost: "linear", type: "karp" },
        { target: "Clique", cost: "quadratic", type: "karp" },
        { target: "Subset Sum", cost: "quadratic", type: "karp" },
        { target: "Integer Programming", cost: "cubic", type: "karp" },
        { target: "Hamiltonian Cycle", cost: "higherPolynomial", type: "karp" },
      ],
      from: [
        { source: "General CNF-SAT", cost: "linear", type: "karp" },
        { source: "Circuit-SAT", cost: "linear", type: "karp" },
      ],
    },
  },
  {
    name: "Circuit-SAT",
    slug: "circuit-sat",
    oneLiner:
      "Given a Boolean combinational circuit, does there exist an assignment to its inputs that makes the output true?",
    tags: {
      problemType: ["logic"],
      computationalModel: "turingMachines",
      complexityClass: ["npComplete", "np", "npHard"],
      solverType: ["exact"],
      solverComplexity: ["exponential"],
      reductionType: ["karp"],
      reductionCost: ["linear"],
      visualizationType: ["logicGateSchematic"],
    },
    solvers: [{ name: "Backtracking", type: "exact", complexityBucket: "exponential" }],
    visualizations: [
      {
        name: "Circuit Diagram",
        type: "logicGateSchematic",
        caption: "Gate-level circuit with the current input assignment propagated through it.",
      },
    ],
    verifier: {
      certificateDescription: "An assignment to every circuit input.",
      certificateFormat: "certificate = [in1, in2, …, ink]",
    },
    // Cook-Levin: Circuit-SAT reduces to 3-SAT -- matches 3-SAT's own
    // reduces-from entry above (both say Linear).
    reductions: {
      to: [{ target: "3-SAT", cost: "linear", type: "karp" }],
      from: [],
    },
  },
  {
    name: "Clique",
    slug: "clique",
    oneLiner:
      "Given a graph and an integer k, does there exist a set of k vertices that are all pairwise adjacent?",
    tags: {
      problemType: ["graphTheory"],
      computationalModel: "turingMachines",
      complexityClass: ["npComplete", "np", "npHard"],
      solverType: ["exact"],
      solverComplexity: ["exponential"],
      reductionType: ["karp"],
      reductionCost: ["quadratic"],
      visualizationType: ["nodeLinkDiagram"],
    },
    solvers: [
      { name: "Brute Force", type: "exact", complexityBucket: "exponential" },
      { name: "Branch and Bound", type: "exact", complexityBucket: "exponential" },
    ],
    visualizations: [
      {
        name: "Clique Graph",
        type: "nodeLinkDiagram",
        caption:
          "Candidate clique vertices highlighted; edges within the candidate set drawn bold.",
      },
    ],
    verifier: {
      certificateDescription: "A set of k vertices.",
      certificateFormat: "certificate = [v1, v2, …, vk]",
    },
    // Textbook 3-SAT -> Clique reduction; matches 3-SAT's reduces-to entry.
    reductions: {
      to: [],
      from: [{ source: "3-SAT", cost: "quadratic", type: "karp" }],
    },
  },
  {
    name: "Closest Pair of Points",
    slug: "closest-pair-of-points",
    oneLiner:
      "Given a set of points in the plane, what is the minimum distance between any two of them?",
    tags: {
      problemType: ["computationalGeometry"],
      computationalModel: "turingMachines",
      // A genuine P-class example (O(n log n) divide-and-conquer) --
      // deriveComplexityClasses("P") -> ["p", "np"].
      complexityClass: ["p", "np"],
      solverType: ["exact"],
      // The optimal solver is O(n log n) (log-linear); the backend's
      // SolverComplexityBucket enum has no log-linear bucket yet
      // (TAXONOMY_REFERENCE.md §6), so it legitimately shows as
      // "polynomial" here, same real gap as 0/1 Knapsack above.
      solverComplexity: ["polynomial"],
      reductionType: [],
      reductionCost: [],
      visualizationType: ["voronoiMap"],
    },
    solvers: [
      {
        name: "Divide and Conquer",
        type: "exact",
        complexityBucket: "polynomial",
        bigO: "O(n log n)",
      },
    ],
    visualizations: [
      {
        name: "Point Plot",
        type: "voronoiMap",
        caption:
          "Points plotted in the plane with the closest pair highlighted and its connecting segment drawn.",
      },
    ],
    // Deliberately no verifier -- see the status-icon note below.
    verifier: null,
    reductions: { to: [], from: [] },
  },
  {
    name: "Convex Hull",
    slug: "convex-hull",
    oneLiner:
      "Given a set of points in the plane, what is the smallest convex polygon containing all of them?",
    tags: {
      problemType: ["computationalGeometry"],
      computationalModel: "turingMachines",
      complexityClass: ["p", "np"],
      solverType: ["exact"],
      solverComplexity: ["polynomial"],
      reductionType: [],
      reductionCost: [],
      visualizationType: ["nodeLinkDiagram"],
    },
    // Single badge per row in every category -- this is the mockup's own
    // example of that layout case (T12 done-when).
    solvers: [
      {
        name: "Divide and Conquer",
        type: "exact",
        complexityBucket: "polynomial",
        bigO: "O(n log n)",
      },
    ],
    visualizations: [
      {
        name: "Hull Plot",
        type: "nodeLinkDiagram",
        caption: "Input points with the computed hull boundary drawn as a closed polygon.",
      },
    ],
    verifier: {
      certificateDescription: "An ordered list of hull vertices.",
      certificateFormat: "certificate = [p1, p2, …, pk]",
    },
    reductions: { to: [], from: [] },
  },
  {
    name: "Generalized Sudoku",
    slug: "generalized-sudoku",
    oneLiner:
      "Given a partially filled n²×n² grid with n×n subgrid constraints, does a completion exist satisfying the row/column/subgrid constraints?",
    tags: {
      problemType: ["gamesAndPuzzles"],
      computationalModel: "logicalFunctionalModels",
      complexityClass: ["npComplete", "np", "npHard"],
      solverType: ["exact"],
      solverComplexity: ["exponential"],
      reductionType: [],
      reductionCost: [],
      visualizationType: ["searchTree"],
    },
    solvers: [{ name: "Backtracking", type: "exact", complexityBucket: "exponential" }],
    visualizations: [
      {
        name: "Fill Search Tree",
        type: "searchTree",
        caption: "Cell-by-cell assignment search with constraint-violating branches pruned.",
      },
    ],
    verifier: {
      certificateDescription: "A completed grid.",
      certificateFormat: "certificate = grid[n²][n²]",
    },
    reductions: { to: [], from: [] },
  },
  {
    name: "Graph Coloring",
    slug: "graph-coloring",
    oneLiner:
      "Given a graph and an integer k, can its vertices be colored with k colors so that no two adjacent vertices share a color?",
    tags: {
      problemType: ["graphTheory"],
      computationalModel: "turingMachines",
      complexityClass: ["npComplete", "np", "npHard"],
      solverType: ["exact", "heuristic"],
      solverComplexity: ["exponential", "polynomial"],
      reductionType: ["karp"],
      reductionCost: ["linear"],
      visualizationType: ["nodeLinkDiagram"],
    },
    solvers: [
      { name: "Backtracking", type: "exact", complexityBucket: "exponential" },
      { name: "Greedy", type: "heuristic", complexityBucket: "polynomial" },
    ],
    visualizations: [
      {
        name: "Coloring Diagram",
        type: "nodeLinkDiagram",
        caption:
          "Vertices shaded by assigned color; conflicting adjacent pairs, if any, outlined in red.",
      },
    ],
    verifier: {
      certificateDescription: "A color assignment per vertex.",
      certificateFormat: "certificate = [c(v1), c(v2), …, c(vn)]",
    },
    reductions: {
      to: [{ target: "Clique", cost: "linear", type: "karp" }],
      from: [],
    },
  },
  {
    name: "Hamiltonian Cycle",
    slug: "hamiltonian-cycle",
    oneLiner: "Given a graph, does there exist a cycle that visits every vertex exactly once?",
    tags: {
      problemType: ["graphTheory"],
      computationalModel: "turingMachines",
      complexityClass: ["npComplete", "np", "npHard"],
      solverType: ["exact"],
      solverComplexity: ["exponential"],
      reductionType: ["karp"],
      reductionCost: ["higherPolynomial"],
      // No declared visualization -- see the status-icon note below.
      visualizationType: [],
    },
    solvers: [{ name: "Backtracking", type: "exact", complexityBucket: "exponential" }],
    // Deliberately empty -- this is the fixture set's other "incomplete"
    // (grey status icon) example, see the note below.
    visualizations: [],
    verifier: {
      certificateDescription: "An ordered list of vertices forming the cycle.",
      certificateFormat: "certificate = [v1, v2, …, vn]",
    },
    // Matches 3-SAT's own reduces-to entry (Higher Poly.).
    reductions: {
      to: [],
      from: [{ source: "3-SAT", cost: "higherPolynomial", type: "karp" }],
    },
  },
  {
    name: "Integer Factorization",
    slug: "integer-factorization",
    oneLiner: "Given an integer N and a bound k, does N have a factor d with 1 < d ≤ k?",
    tags: {
      problemType: ["algebraAndNumberTheory"],
      // The canonical quantum-relevant classical problem (Shor's algorithm)
      // -- used deliberately here to give the Computational Model and
      // Solver Type "Quantum" options a non-zero count in this fixture set.
      computationalModel: "quantumModels",
      // Backend value is NPIntermediate -> deriveComplexityClasses yields
      // ["np"] alone (data/taxonomy.js COMPLEXITY_CLASS_MAP), the one case
      // where a bare "NP" badge with no completeness badge is correct --
      // TAXONOMY_REFERENCE.md §3 names Integer Factorization as exactly
      // this example.
      complexityClass: ["np"],
      solverType: ["exact", "numerical", "quantum"],
      solverComplexity: ["exponential", "polynomial"],
      reductionType: [],
      reductionCost: [],
      visualizationType: ["searchTree", "quantumCircuit"],
    },
    solvers: [
      { name: "Trial Division", type: "exact", complexityBucket: "exponential" },
      { name: "Quadratic Sieve", type: "numerical", complexityBucket: "exponential" },
      {
        name: "Shor's Algorithm",
        type: "quantum",
        complexityBucket: "polynomial",
        bigO: "O((log N)³)",
      },
    ],
    visualizations: [
      {
        name: "Factor Tree",
        type: "searchTree",
        caption: "Recursive factor search with each branch's remaining cofactor.",
      },
      {
        name: "Shor's Algorithm Circuit",
        type: "quantumCircuit",
        caption:
          "Quantum phase-estimation circuit used to find the period underlying the factorization.",
      },
    ],
    verifier: {
      certificateDescription: "A factor d.",
      certificateFormat: "certificate = d",
    },
    reductions: { to: [], from: [] },
  },
  {
    name: "Job-Shop Scheduling",
    slug: "job-shop-scheduling",
    oneLiner:
      "Given jobs made of ordered operations on specific machines, what is the minimum-makespan schedule with no machine running two operations at once?",
    tags: {
      problemType: ["sequencingAndScheduling"],
      computationalModel: "parallelDistributed",
      // The optimization form is NP-hard without necessarily being in NP
      // (there's no short certificate for optimality) -- deriveComplexityClasses
      // yields ["npHard"] alone, a deliberate contrast with the NP-complete
      // problems above that show 3 badges.
      complexityClass: ["npHard"],
      solverType: ["heuristic"],
      solverComplexity: ["polynomial", "exponential"],
      reductionType: [],
      reductionCost: [],
      visualizationType: ["ganttChart"],
    },
    solvers: [
      { name: "Greedy", type: "heuristic", complexityBucket: "polynomial" },
      { name: "Genetic Algorithm", type: "heuristic", complexityBucket: "exponential" },
    ],
    visualizations: [
      {
        name: "Schedule Chart",
        type: "ganttChart",
        caption:
          "Per-machine timeline of scheduled operations for the current best-found schedule.",
      },
    ],
    verifier: {
      certificateDescription: "A start time for every operation.",
      certificateFormat: "certificate = [start(op1), start(op2), …, start(opn)]",
    },
    reductions: { to: [], from: [] },
  },
];

// Map<problemName, FixtureProblem> -- same keying as T23/useCatalogIndex's
// eventual `index: Map<problemName, tags>`. Consumers that only need the
// facet data for filtering/badges should read `.tags` off the value; the
// Detail page (T19, Phase 1 only) reads the rest directly.
export const FIXTURE_CATALOG_INDEX = new Map(
  FIXTURE_PROBLEMS.map((problem) => [problem.name, problem]),
);

// Mirrors the { index, loading, error } shape useCatalogIndex() will return
// (T23 done-when), so pages/index.js's eventual swap to the real hook is a
// destructuring rename, not a rewrite.
export function useFixtureCatalogIndex() {
  return { index: FIXTURE_CATALOG_INDEX, loading: false, error: null };
}

/** Slug -> FixtureProblem, for pages/[problem].js's route param lookup. */
export const FIXTURE_PROBLEMS_BY_SLUG = new Map(
  FIXTURE_PROBLEMS.map((problem) => [problem.slug, problem]),
);

export function getFixtureProblemBySlug(slug) {
  return FIXTURE_PROBLEMS_BY_SLUG.get(slug) ?? null;
}
