// components/detail/visualizations/StepTableRenderer.js
//
// T50 (#113) -- the `stepTable` universal type's renderer
// (ai_documentation/VISUALIZATION_TYPE_CONTRACTS.md §3.5), covering the 4
// DFATable/NFATable/SPSPTable/SSSPTable instances. Ported from Redux_GUI's
// DynamicTableSvgReact, which already rendered a real HTML `<table>` --
// §4.2's accessibility ask for this type is smaller than the other five as
// a result: a `<caption>`, `scope` on header cells, and a focusable scroll
// region, added here rather than a `<title>`/`role="img"` alternative.
//
// Cell text (including status glyphs like U+2705/U+274C/U+221E, T40's
// finding) is rendered exactly as the backend sends it -- no substituting or
// stripping characters, per §3.5's decision. A `cells` entry missing a
// column's key renders "-", the documented degenerate case, not a
// violation.

import Box from "@mui/material/Box";
import { alpha } from "@mui/material/styles";
import { useId } from "react";
import { getVisualizationColor } from "../../theme";

/**
 * @param {Object} props
 * @param {string} props.idPrefix Prefixes every id this component renders,
 *   so two mounted instances (Reductions' side-by-side panes) never collide
 *   (§4.1).
 * @param {string} [props.instanceName] Human-readable visualization name,
 *   used to build the table's caption when the frame itself has no `title`.
 * @param {{title: string|null, columns: Array, rows: Array}} props.frame One
 *   already-validated `stepTable` frame.
 */
export default function StepTableRenderer({ idPrefix, instanceName, frame }) {
  const reactId = useId().replace(/:/g, "");
  const scopeId = `${idPrefix}-${reactId}`;

  const columns = frame.columns;
  const rows = frame.rows;
  const rowCount = rows.length;
  const captionText =
    frame.title || `${instanceName ?? "Step table"}: ${rowCount} row${rowCount === 1 ? "" : "s"}`;

  return (
    <Box
      id={scopeId}
      tabIndex={0}
      role="group"
      aria-label={captionText}
      sx={{
        maxHeight: 400,
        overflow: "auto",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
      }}
    >
      <Box
        component="table"
        sx={{
          borderCollapse: "collapse",
          width: "100%",
          fontFamily: '"JetBrains Mono", "Fira Code", Consolas, monospace',
          fontSize: "0.8125rem",
        }}
      >
        <Box
          component="caption"
          sx={{ captionSide: "top", textAlign: "left", p: 1, fontWeight: 700 }}
        >
          {captionText}
        </Box>
        <Box component="thead">
          <Box component="tr">
            {columns.map((column) => (
              <Box
                component="th"
                key={column.key}
                id={`${scopeId}-col-${column.key}`}
                scope="col"
                sx={{
                  position: "sticky",
                  top: 0,
                  border: "1px solid",
                  borderColor: "divider",
                  backgroundColor: "background.paper",
                  p: 1,
                  textAlign: "center",
                  fontWeight: 700,
                }}
              >
                {column.label}
              </Box>
            ))}
          </Box>
        </Box>
        <Box component="tbody">
          {rows.map((row, rowIndex) => {
            const rowColor = row.color ? getVisualizationColor(row.color) : null;
            return (
              <Box
                component="tr"
                key={row.id ?? rowIndex}
                sx={{ color: rowColor ?? "inherit", fontWeight: rowColor ? 700 : 400 }}
              >
                {columns.map((column) => {
                  const cellColorKey = row.cellColors?.[column.key];
                  const cellColor = cellColorKey ? getVisualizationColor(cellColorKey) : null;
                  return (
                    <Box
                      component="td"
                      key={column.key}
                      headers={`${scopeId}-col-${column.key}`}
                      sx={{
                        border: "1px solid",
                        borderColor: "divider",
                        p: 1,
                        textAlign: "center",
                        backgroundColor: cellColor ? alpha(cellColor, 0.22) : "transparent",
                      }}
                    >
                      {row.cells?.[column.key] ?? "-"}
                    </Box>
                  );
                })}
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}
