// components/detail/OverviewSection.js
//
// T16a (#21) — the Overview section of a Problem Detail page: the problem
// statement (left) and source/contributor metadata (right).
//
// Ratified decision (issue #6, conflict C3): explicit `Input:` / `Output:`
// fields, NOT the mockup's "FORMAL DEFINITION" set-notation block.
// `data/fixtures.js`'s `overview.input`/`.output` strings are already
// reshaped into that format (see that file's 3-SAT entry) — this component
// just labels and renders them, it doesn't reformat anything itself.
//
// Only 3-SAT's fixture entry has a populated `overview` object; every other
// problem has it `undefined` (an optional field per `FixtureProblem`'s
// typedef). Both this component's absence-of-`overview` case and its
// absence-of-`source`/`contributedBy` case degrade to a plain message
// rather than a crash or a printed "undefined" — same "real declared data,
// graceful when it's missing" pattern used throughout the Home page
// components (e.g. FacetSidebar's empty option lists).

import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import SectionShell from "./SectionShell";

function LabeledField({ label, value }) {
  return (
    <Box>
      <Typography component="span" sx={{ fontWeight: 700 }}>
        {label}:{" "}
      </Typography>
      <Typography component="span" variant="body1">
        {value}
      </Typography>
    </Box>
  );
}

function StatementCard({ overview }) {
  return (
    <Paper sx={{ p: 2, borderRadius: 3, flex: 1, minWidth: 0 }}>
      {overview ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          <LabeledField label="Input" value={overview.input} />
          <LabeledField label="Output" value={overview.output} />
        </Box>
      ) : (
        <Typography variant="body2" sx={{ color: "text.secondary", fontStyle: "italic" }}>
          Not yet documented.
        </Typography>
      )}
    </Paper>
  );
}

function AdditionalDetailsCard({ overview }) {
  const source = overview?.source;
  const contributedBy = overview?.contributedBy;

  return (
    <Paper sx={{ p: 2, borderRadius: 3, flex: 1, minWidth: 0 }}>
      <Typography variant="overline" component="h3" sx={{ display: "block", mb: 1.5 }}>
        Additional Details
      </Typography>
      {source || contributedBy ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {source && <LabeledField label="Source" value={source} />}
          {contributedBy && <LabeledField label="Contributed by" value={contributedBy} />}
        </Box>
      ) : (
        <Typography variant="body2" sx={{ color: "text.secondary", fontStyle: "italic" }}>
          Not yet documented.
        </Typography>
      )}
    </Paper>
  );
}

/**
 * @param {Object} props
 * @param {Object} props.problem A data/fixtures.js-shaped FixtureProblem.
 * @param {{attributes: Object, listeners: Object}} [props.dragHandleProps]
 *   Forwarded straight through to SectionShell — see T18 (#27).
 */
export default function OverviewSection({ problem, dragHandleProps }) {
  return (
    <SectionShell sectionKey="overview" title="Overview" dragHandleProps={dragHandleProps}>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: 2,
        }}
      >
        <StatementCard overview={problem.overview} />
        <AdditionalDetailsCard overview={problem.overview} />
      </Box>
    </SectionShell>
  );
}
