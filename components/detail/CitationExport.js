// components/detail/CitationExport.js
//
// #152 — "Export citation" action on the Problem Detail page: downloads the
// problem's citation as a BibTeX entry, or a plain-text summary (name,
// complexity class, source/contributed-by, reduction chain) suitable for
// attaching to coursework.
//
// What this deliberately does NOT do: fabricate bibliographic fields the
// real data doesn't have. The only citation-shaped fields a problem actually
// carries (hooks/useProblemDetail.js's `overview.source`/`overview.
// contributedBy`, both free text, both populated on some problems and
// undefined on others) become an optional `note`/`author` field; there is no
// year, publisher or journal anywhere in the real data, so neither export
// invents one. Same "real declared data, graceful when it's missing" pattern
// components/detail/OverviewSection.js's own header documents -- a problem
// with neither field still exports a valid citation, it just says so plainly
// rather than filling the gap with placeholder text that would read as real
// bibliographic data.
//
// components/aboutus/CitationList.js was NOT reused here despite the name:
// that component renders citations ABOUT the Redux project itself
// (Publications/Awards/Theses on the About Us page, `{citation, doi?, url?,
// pdf?}` objects with no connection to any one problem's data) -- a
// different kind of citation than what this task needs, not a shared shape.
//
// No PDF library added (package.json has none, and #152's own scope calls
// PDF a stretch goal) -- the "PDF-ish" export is a plain-text `.txt` file,
// downloaded the same client-side way the BibTeX file is. It's the honest
// v1 for something meant to be pasted into or attached alongside coursework
// text, without a new dependency to render an actual PDF.

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { optionLabel } from "../../data/taxonomy";

// Same badge facet this page's own H1 badge row reads (pages/[problem].js's
// BADGE_FACET_KEYS) -- this export lists the same complexity class(es) a
// visitor already sees on the page, not a separately-derived value.
const COMPLEXITY_FACET_KEY = "complexityClass";

function slugifyForCitationKey(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

// This app's own permalink for a problem: the exact route pages/[problem].js
// resolves (`/<problem name>`), matching how components/ComparisonColumn.js
// already links to a compared problem's detail page
// (`/${encodeURIComponent(problem.name)}`). Built from window.location.origin
// rather than a hardcoded host so the exported citation always points at
// wherever this app is actually deployed.
function buildPermalink(problemName) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/${encodeURIComponent(problemName)}`;
}

function buildBibtex(problem, permalink) {
  const { source, contributedBy } = problem.overview ?? {};
  const fields = [`  title = {${problem.name}}`];
  if (contributedBy) fields.push(`  author = {${contributedBy}}`);
  if (source) fields.push(`  note = {${source}}`);
  fields.push(`  url = {${permalink}}`);

  const key = `redux_${slugifyForCitationKey(problem.name)}`;
  return `@misc{${key},\n${fields.join(",\n")}\n}\n`;
}

function formatReductionEdge(direction, name, cost, type) {
  const details = [
    cost && optionLabel("reductionCost", cost),
    type && optionLabel("reductionType", type),
  ]
    .filter(Boolean)
    .join(", ");
  const suffix = details ? ` (${details})` : "";
  return direction === "to" ? `Reduces to: ${name}${suffix}` : `Reduces from: ${name}${suffix}`;
}

function buildSummary(problem, permalink) {
  const { source, contributedBy } = problem.overview ?? {};
  const complexityLabels = (problem.tags?.[COMPLEXITY_FACET_KEY] ?? []).map((key) =>
    optionLabel(COMPLEXITY_FACET_KEY, key),
  );
  const to = problem.reductions?.to ?? [];
  const from = problem.reductions?.from ?? [];

  const lines = [problem.name];
  lines.push(complexityLabels.length > 0 ? complexityLabels.join(", ") : "Not yet classified");
  lines.push("");

  if (source) lines.push(`Source: ${source}`);
  if (contributedBy) lines.push(`Contributed by: ${contributedBy}`);
  if (!source && !contributedBy) lines.push("No source documented.");
  lines.push("");

  lines.push("Reduction chain:");
  if (to.length === 0 && from.length === 0) {
    lines.push("No reductions declared.");
  } else {
    for (const edge of to) {
      lines.push(formatReductionEdge("to", edge.target, edge.cost, edge.type));
    }
    for (const edge of from) {
      lines.push(formatReductionEdge("from", edge.source, edge.cost, edge.type));
    }
  }
  lines.push("");

  lines.push(permalink);
  return `${lines.join("\n")}\n`;
}

// Standard client-side download pattern: a Blob URL, a hidden <a download>,
// programmatically clicked then revoked. No backend involvement -- both
// exports are built entirely from data the page already has.
function downloadTextFile(filename, contents, mimeType) {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * @param {Object} props
 * @param {Object} props.problem A data/fixtures.js-shaped FixtureProblem (the
 *   same shape pages/[problem].js already has in hand).
 */
export default function CitationExport({ problem }) {
  const fileBase = slugifyForCitationKey(problem.name) || "problem";

  function handleBibtexExport() {
    const permalink = buildPermalink(problem.name);
    downloadTextFile(`${fileBase}.bib`, buildBibtex(problem, permalink), "application/x-bibtex");
  }

  function handleSummaryExport() {
    const permalink = buildPermalink(problem.name);
    downloadTextFile(`${fileBase}-summary.txt`, buildSummary(problem, permalink), "text/plain");
  }

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1.5 }}>
      <Button
        id="citation-export-bibtex"
        variant="outlined"
        size="small"
        onClick={handleBibtexExport}
      >
        Export BibTeX
      </Button>
      <Button
        id="citation-export-summary"
        variant="outlined"
        size="small"
        onClick={handleSummaryExport}
      >
        Export Summary (.txt)
      </Button>
    </Box>
  );
}
