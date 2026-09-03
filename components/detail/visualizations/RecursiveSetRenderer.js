// components/detail/visualizations/RecursiveSetRenderer.js
//
// T50 (#113) -- the `recursiveSet` universal type's renderer
// (ai_documentation/VISUALIZATION_TYPE_CONTRACTS.md §3.4), covering the 4
// ExactCover/HittingSet/Partition/SetCover instances. Ported from
// Redux_GUI's StandardSetSvgReact (nested sets drawn as bracketed,
// comma-separated runs of colored elements), rebuilt as plain React-owned
// markup rather than d3 DOM manipulation against `document` (§4.1) -- there
// is nothing here d3 did that isn't already what React's own tree diffing
// does for a static, non-editable render.
//
// §3.4's "malformed at that node, not the whole tree" clause is handled
// entirely inside SetNode below: `validateRecursiveSetFrame`
// (data/visualizationTypes.js) only checks that `frame.data` itself exists,
// not that every node in the tree is internally consistent -- a node with
// `isValue: true` and no `value`, or `isValue: false` and no `list`,
// degrades to a `PlaceholderMark` at that node instead of failing the whole
// render, exactly what the contract asks for.

import Box from "@mui/material/Box";
import { Fragment, useId } from "react";
import { getVisualizationColor } from "../../theme";

function leafCount(node) {
  if (!node || typeof node !== "object") return 0;
  if (node.isValue) return typeof node.value === "string" ? 1 : 0;
  if (!Array.isArray(node.list)) return 0;
  return node.list.reduce((total, child) => total + leafCount(child), 0);
}

function PlaceholderMark({ id }) {
  return (
    <Box id={id} component="span" sx={{ color: "text.secondary", fontStyle: "italic" }}>
      ?
    </Box>
  );
}

function Bracket({ children }) {
  return (
    <Box component="span" aria-hidden="true" sx={{ color: "text.secondary" }}>
      {children}
    </Box>
  );
}

function Comma() {
  return (
    <Box component="span" aria-hidden="true" sx={{ color: "text.secondary", mr: 0.5 }}>
      ,
    </Box>
  );
}

function SetNode({ id, node }) {
  if (!node || typeof node !== "object") {
    return <PlaceholderMark id={id} />;
  }

  if (node.isValue) {
    if (typeof node.value !== "string") {
      return <PlaceholderMark id={id} />;
    }
    return (
      <Box
        id={id}
        component="span"
        sx={{
          fontFamily: '"JetBrains Mono", "Fira Code", Consolas, monospace',
          fontSize: "0.9375rem",
          fontWeight: 600,
          color: getVisualizationColor(node.color),
        }}
      >
        {node.value}
      </Box>
    );
  }

  const open = node.isOrdered ? "(" : "{";
  const close = node.isOrdered ? ")" : "}";
  if (!Array.isArray(node.list)) {
    return (
      <Box id={id} component="span">
        <Bracket>{open}</Bracket>
        <Bracket>{close}</Bracket>
      </Box>
    );
  }

  return (
    <Box
      id={id}
      component="span"
      sx={{ display: "inline-flex", alignItems: "center", flexWrap: "wrap" }}
    >
      <Bracket>{open}</Bracket>
      {node.list.map((child, index) => (
        <Fragment key={child?.id ?? index}>
          {index > 0 && <Comma />}
          <SetNode id={`${id}-${index}`} node={child} />
        </Fragment>
      ))}
      <Bracket>{close}</Bracket>
    </Box>
  );
}

/**
 * @param {Object} props
 * @param {string} props.idPrefix Prefixes every id this component renders,
 *   so two mounted instances (Reductions' side-by-side panes) never collide
 *   (§4.1).
 * @param {string} [props.instanceName] Human-readable visualization name,
 *   folded into the accessible summary when given.
 * @param {{data: Object}} props.frame One already-validated `recursiveSet`
 *   frame.
 */
export default function RecursiveSetRenderer({ idPrefix, instanceName, frame }) {
  const reactId = useId().replace(/:/g, "");
  const scopeId = `${idPrefix}-${reactId}`;

  const count = leafCount(frame.data);
  const summaryBody = `set structure with ${count} element${count === 1 ? "" : "s"}`;
  const summary = instanceName ? `${instanceName}: ${summaryBody}` : summaryBody;

  return (
    <Box
      id={scopeId}
      role="img"
      aria-label={summary}
      sx={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 0.5,
        p: 2,
        minHeight: "100%",
        boxSizing: "border-box",
      }}
    >
      <SetNode id={`${scopeId}-root`} node={frame.data} />
    </Box>
  );
}
