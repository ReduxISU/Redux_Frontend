// data/pictureTypes.js
//
// #229: short descriptions of each backend picture type (`pictureType` on a visualization in
// Navigation/Batch/allInfo), for the Visualization Type info card. The backend sends what a
// visualization is (`visualizationDefinition`) and which picture type it draws, but nothing
// about what a picture type is good for, so that one line per type lives here. Labels for the
// types themselves are in data/taxonomy.js (PICTURE_TYPE_LABELS).
//
// Each entry: `draws` says what the picture looks like, `bestFor` what it helps with. Written
// from the visualizations that use each type today; keep them general enough to hold for any
// problem that picks the type.

export const PICTURE_TYPE_INFO = {
  Automaton: {
    draws: "States as nodes and transitions as labelled arrows.",
    bestFor: "Following a machine through its input one symbol at a time",
  },
  BipartiteGraph: {
    draws: "Two columns of nodes, with edges only between the columns.",
    bestFor: "Seeing how two kinds of item connect, such as variables and clauses",
  },
  Board: {
    draws: "A grid board with pieces or numbers placed on it.",
    bestFor: "Puzzles played on a grid",
  },
  CodeTree: {
    draws: "Each symbol with its count, and the code the tree gives it.",
    bestFor: "Seeing why frequent symbols get short codes",
  },
  FlowNetwork: {
    draws: "A directed, weighted graph from a source to a sink.",
    bestFor: "Seeing which edges a cut or a flow uses",
  },
  Geometry: {
    draws: "Points with their coordinates.",
    bestFor: "Problems about points in the plane",
  },
  Graph: {
    draws: "Nodes and edges.",
    bestFor: "Seeing which nodes and edges an answer uses",
  },
  GroupedGraph: {
    draws: "One box per group, such as a clause, holding its items.",
    bestFor: "Following an assignment group by group",
  },
  LayeredGraph: {
    draws: "A directed graph drawn in layers, left to right.",
    bestFor: "Orderings, paths and anything that moves rank by rank",
  },
  Packing: {
    draws: "Items with their sizes, and the bins or targets they go into.",
    bestFor: "Seeing which items an answer picks and how full each bin gets",
  },
  QuantumCircuit: {
    draws: "Qubits as wires, with gates placed along them.",
    bestFor: "Reading a quantum algorithm gate by gate",
  },
  Schedule: {
    draws: "Jobs or hours laid out on one time axis.",
    bestFor: "Seeing what runs when and what misses its deadline",
  },
  SearchTree: {
    draws: "The solver's choices as a tree, one level per decision.",
    bestFor: "Seeing where a search backs up and which branch finds the answer",
  },
  Table: {
    draws: "A table with one row per step or constraint.",
    bestFor: "Reading exact values as an algorithm fills them in",
  },
  TripartiteMatching: {
    draws: "Three columns of elements, with each triple drawn as a line through all three.",
    bestFor: "Seeing which triples cover every element exactly once",
  },
};
