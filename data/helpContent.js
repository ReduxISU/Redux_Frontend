// data/helpContent.js
//
// Static link lists for pages/help.js. Ported from Redux_GUI's pages/help/index.js,
// which keeps the same three lists as page-local consts -- pulled into their own data
// file here instead, per ground rule 3 ("no tag label text is written inside a
// component"): the same spirit applies to a static content page's own link labels,
// and it keeps pages/help.js itself to layout, not a list of URLs.

// Nested one level under "Complexity class" -- its `children` render as a sub-list
// indented under it.
export const BACKGROUND_READING_LINKS = [
  { label: "Computational problem", url: "https://en.wikipedia.org/wiki/Computational_problem" },
  { label: "Algorithm", url: "https://en.wikipedia.org/wiki/Algorithm" },
  { label: "List of algorithms", url: "https://en.wikipedia.org/wiki/List_of_algorithms" },
  {
    label: "Complexity class",
    url: "https://en.wikipedia.org/wiki/Complexity_class",
    children: [
      { label: "P (complexity)", url: "https://en.wikipedia.org/wiki/P_(complexity)" },
      { label: "NP (complexity)", url: "https://en.wikipedia.org/wiki/NP_(complexity)" },
      { label: "NP-hardness", url: "https://en.wikipedia.org/wiki/NP-hardness" },
      { label: "NP-completeness", url: "https://en.wikipedia.org/wiki/NP-completeness" },
      {
        label: "Karp's 21 NP-complete problems",
        url: "https://en.wikipedia.org/wiki/Karp%27s_21_NP-complete_problems",
      },
      {
        label: "List of NP-complete problems",
        url: "https://en.wikipedia.org/wiki/List_of_NP-complete_problems",
      },
    ],
  },
  { label: "Many-one reduction", url: "https://en.wikipedia.org/wiki/Many-one_reduction" },
  {
    label: "Approximation algorithm",
    url: "https://en.wikipedia.org/wiki/Approximation_algorithm",
  },
];

export const ACCESS_LINKS = [
  { label: "RESTful API", url: "https://api.redux.portneuf.cose.isu.edu/swagger/index.html" },
];

export const LEARN_MORE_LINKS = [
  { label: "GitHub", url: "https://github.com/ReduxISU/" },
  {
    label: "Karp's 21 NP-Complete Problems",
    url: "https://cgi.di.uoa.gr/~sgk/teaching/grad/handouts/karp.pdf",
  },
  {
    label: "Redux GUI Documentation",
    url: "https://github.com/ReduxISU/Redux_GUI/blob/ReduxAPI_GUI/Documentation/index.md",
  },
  {
    label: "Redux Backend Documentation",
    url: "https://github.com/ReduxISU/Redux/blob/CSharpAPI/Documentation/index.md",
  },
];
