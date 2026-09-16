// data/playlists.js
//
// Hand-authored instructor/course playlists (#151): an ordered, curated subset of
// the catalog an instructor can share as one link (e.g. a syllabus or Canvas page),
// so a student gets a guided next/previous rail through just those problems instead
// of the full facet-filtered catalog. No auth, no admin UI, no database for v1 --
// per the issue's own "rough scope," this file IS the authoring surface: adding a
// playlist is a checked-in edit to the array below, the same "hand-edited JSON file"
// the issue calls out as acceptable ahead of any real authoring UI.
//
// Consumed by pages/playlists/[slug].js (the playlist's own page: title,
// description, ordered problem list) and pages/[problem].js + components/
// PlaylistRail.js (the Previous/Next rail shown when a problem is reached via
// `?playlist=<slug>`). Plain data only, matching data/helpContent.js and
// data/contributeContent.js's own pattern -- no React, no imports from elsewhere in
// this app, so this file stays trivially safe to hand-edit.
//
// Each `problems[].name` must match a real problem's display name exactly as
// pages/[problem].js's route / hooks/useProblemDetail.js resolve it (e.g. "3SAT",
// "Clique", not "3-SAT" or "CLIQUE") -- confirmed against the real 49-problem
// catalog list documented in data/supplementalTags.js's own header comment (queried
// against the live production backend 2026-09-02). A name that doesn't match a real
// problem simply never resolves to a link the visitor can follow anywhere useful;
// nothing in this file validates that at build time, so keep new entries lined up
// with that list (or a fresher one, if this file's freshness note is out of date by
// the time you read it).
//
// `note` is optional short instructor commentary for that one step (e.g. "start
// here"); omit the field entirely for a step with nothing extra to say rather than
// writing an empty string.

export const PLAYLISTS = [
  {
    slug: "np-completeness-week3",
    title: "Week 3: NP-Completeness",
    description:
      "A guided walk from Boolean satisfiability to two of Karp's original NP-complete " +
      "problems, each reached from the last by a reduction: SAT to 3SAT to Clique to " +
      "Vertex Cover.",
    problems: [
      { name: "SAT", note: "Start here -- the original NP-complete problem." },
      {
        name: "3SAT",
        note: "SAT restricted to 3-literal clauses. Still NP-complete, and a more convenient starting point for the reductions that follow.",
      },
      {
        name: "Clique",
        note: "Reduced from 3SAT: a satisfying assignment becomes a clique of the right size in a graph built from the formula's clauses.",
      },
      {
        name: "Vertex Cover",
        note: "Reduced from Clique by complementing the graph -- a maximum clique in one becomes a minimum vertex cover in the other.",
      },
    ],
  },
  {
    slug: "graph-fundamentals",
    title: "Graph Algorithms Fundamentals",
    description:
      "Three foundational graph problems most algorithms courses cover early: " +
      "ordering a DAG, finding its strongly connected components, and building a " +
      "minimum spanning tree.",
    problems: [
      { name: "Topological Sort" },
      { name: "Strongly Connected Components" },
      { name: "Minimum Spanning Tree" },
    ],
  },
];
