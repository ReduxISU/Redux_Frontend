// lib/certificateHints.js
//
// #279 stage 4: the hint under each Verify strip's certificate field, and the example that is the
// field's placeholder ("A True/False value for each variable, e.g. (x1:True,x2:False,x3:True)").
//
// What Redux offers: each problem's `certificateFormat` (Navigation/Batch/allInfo), prose that
// nearly always ends in "Example: ..." (or "- e.g. ..."), and each verifier's `certificate`, an
// example that is empty for most verifiers today. There is no shorter, plain description of a
// certificate, so:
//   - the example is always Redux's own (the format's "Example:", else the verifier's
//     `certificate`), so the placeholder is text Redux can read;
//   - the words before it come from the small map below for the problems whose format is
//     notation only ("Format: {K | K is set}") or several sentences long, and otherwise from the
//     format itself, minus its "Format:" and its example;
//   - with no format at all, the hint says Redux doesn't describe it.
// The map is keyed by the problem's class name in Redux (SAT3, CLIQUE), not its display name.

/** Plain descriptions for formats that are notation only or too long for one line. */
const DESCRIPTIONS = {
  SAT: "A True/False value for each variable",
  SAT3: "A True/False value for each variable",
  CLIQUE: "The vertices of a clique of size k",
  INDEPENDENTSET: "k vertices with no edge between any two of them",
  VERTEXCOVER: "The vertices of a cover: every edge has an end among them",
  MINIMUMVERTEXCOVER: "The vertices of a cover: every edge has an end among them",
  SUBSETSUM: "The numbers that add up to the target",
  GRAPHCOLORING: "The color classes, each a set of vertices with no edge inside it",
  SETCOVER: "The chosen subsets, which together cover every element",
  EXACTCOVER: "The chosen subsets, which cover every element exactly once",
};

// "... Example: x" or "... - e.g. x" (an em dash or a hyphen), at the end of the format.
const EXAMPLE = /(?:\s*\bExample:|\s*[—-]\s*e\.g\.)\s*(.+?)\s*$/s;

/**
 * Splits Redux's certificate format into its description and its example.
 * @param {string} format
 * @returns {{description: string, example: string}}
 */
function readFormat(format) {
  const text = (format ?? "").trim();
  const match = EXAMPLE.exec(text);
  let description = match ? text.slice(0, match.index) : text;
  // An example written as the end of a sentence keeps its full stop out of the field.
  const example = match ? match[1].replace(/\.$/, "") : "";
  description = description
    .replace(/^Format:\s*/i, "")
    .replace(/[\s.:;,]+$/, "")
    .trim();
  // A word starts the sentence ("same 9-rows-of-9 ..."); notation ("q0,...,qn", "k |") keeps its case.
  if (/^[a-z]{2,}\b/.test(description)) {
    description = description[0].toUpperCase() + description.slice(1);
  }
  return { description, example };
}

/**
 * The hint and the placeholder for one side's certificate field.
 * @param {{problemCode?: string, certificateFormat?: string, exampleCertificate?: string}|null}
 *   verifier The side's verifier, as hooks/useProblemDetail.js builds it.
 * @returns {{hint: string, example: string}}
 */
export function certificateHint(verifier) {
  const { description, example: formatExample } = readFormat(verifier?.certificateFormat);
  const example = formatExample || (verifier?.exampleCertificate ?? "").trim();
  const words = DESCRIPTIONS[verifier?.problemCode] ?? description;
  if (!words) {
    return {
      hint: example
        ? `Redux doesn't describe this certificate yet. An example: ${example}`
        : "Redux doesn't describe this certificate yet.",
      example,
    };
  }
  return { hint: example ? `${words}, e.g. ${example}` : words, example };
}
