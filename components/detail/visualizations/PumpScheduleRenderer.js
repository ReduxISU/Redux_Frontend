// components/detail/visualizations/PumpScheduleRenderer.js
//
// T50 (#113) -- the `pumpSchedule` universal type's renderer
// (ai_documentation/VISUALIZATION_TYPE_CONTRACTS.md §3.6), covering the 2
// PumpSchedulingCM/EM instances. Ported from Redux_GUI's
// PumpSchedulingSvgReact (an hour's snapshot: pump on/off cards, a tank-fill
// bar, metric tiles), rebuilt with MUI components matching this project's
// own dark theme rather than the original's hardcoded light-mode hex values.
//
// §3.6's color-vocabulary exception: this is the one universal type exempt
// from the shared VISUALIZATION_COLOR_KEYS table (§4.3) -- the payload
// carries no color-key field at all, so the small palette below is local to
// this file, not a second copy of anything in components/theme.js.
//
// §4.2 needs no separate alternative for this type: it already renders as
// MUI cards and tiles with real text content, not a diagram standing in for
// one.

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import Typography from "@mui/material/Typography";
import { useId } from "react";

const PUMP_ON_COLOR = "#2E7D32";
const PUMP_OFF_COLOR = "#4B5563";
const PEAK_COLOR = "#C0392B";
const OFF_PEAK_COLOR = "#2E7D32";
const TANK_LOW_COLOR = "#C0392B";
const TANK_HIGH_COLOR = "#D96C1E";
const TANK_NORMAL_COLOR = "#2F6FB3";

function tankColor(fillRatio) {
  if (fillRatio < 0.2) return TANK_LOW_COLOR;
  if (fillRatio > 0.9) return TANK_HIGH_COLOR;
  return TANK_NORMAL_COLOR;
}

function MetricTile({ id, label, value, accent }) {
  return (
    <Box
      id={id}
      sx={{
        flex: "1 1 120px",
        p: 1.25,
        borderRadius: 1.5,
        border: "1px solid",
        borderColor: accent ? TANK_NORMAL_COLOR : "divider",
      }}
    >
      <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 700 }}>
        {value}
      </Typography>
    </Box>
  );
}

/**
 * @param {Object} props
 * @param {string} props.idPrefix Prefixes every id this component renders,
 *   so two mounted instances (Reductions' side-by-side panes) never collide
 *   (§4.1).
 * @param {string} [props.instanceName] Unused here (see file header) -- kept
 *   for signature parity with the other five renderers.
 * @param {{action: string, metrics: Object, state: {pumps: Array}}} props.frame
 *   One already-validated `pumpSchedule` frame.
 */
export default function PumpScheduleRenderer({ idPrefix, frame }) {
  const reactId = useId().replace(/:/g, "");
  const scopeId = `${idPrefix}-${reactId}`;

  const { action, metrics, state } = frame;
  const pumps = state.pumps;
  const fillRatio = Math.min(1, Math.max(0, metrics.tankFillRatio));
  const fillPct = Math.round(fillRatio * 100);

  return (
    <Box id={scopeId} sx={{ display: "flex", flexDirection: "column", gap: 1.5, p: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        <Chip id={`${scopeId}-hour`} label={`Hour ${metrics.hour}`} sx={{ fontWeight: 700 }} />
        <Chip
          id={`${scopeId}-peak`}
          label={metrics.isPeakHour ? "Peak" : "Off-Peak"}
          sx={{
            backgroundColor: metrics.isPeakHour ? PEAK_COLOR : OFF_PEAK_COLOR,
            color: "#FFFFFF",
            fontWeight: 700,
          }}
        />
      </Box>

      {action && (
        <Typography
          id={`${scopeId}-action`}
          variant="body2"
          sx={{
            borderLeft: "4px solid",
            borderLeftColor: TANK_NORMAL_COLOR,
            pl: 1.5,
            py: 0.5,
            color: "text.secondary",
          }}
        >
          {action}
        </Typography>
      )}

      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.75 }}>
          Pump States
        </Typography>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          {pumps.map((pump) => (
            <Box
              key={pump.name}
              id={`${scopeId}-pump-${pump.name}`}
              sx={{
                minWidth: 110,
                textAlign: "center",
                borderRadius: 1.5,
                p: 1,
                backgroundColor: pump.isOn ? PUMP_ON_COLOR : PUMP_OFF_COLOR,
                color: "#FFFFFF",
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {pump.name}
              </Typography>
              <Typography variant="caption" sx={{ display: "block" }}>
                {pump.isOn ? "ON" : "OFF"}
              </Typography>
              {pump.isOn && (
                <Typography variant="caption" sx={{ display: "block", opacity: 0.85 }}>
                  {pump.flowGph.toLocaleString()} gph, {pump.powerKw.toFixed(1)} kW
                </Typography>
              )}
            </Box>
          ))}
        </Box>
      </Box>

      <Box>
        <Typography id={`${scopeId}-tank-label`} variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
          Tank Level: {metrics.tankLevel.toLocaleString()} / {metrics.tankCapacity.toLocaleString()}{" "}
          gal ({fillPct}%)
        </Typography>
        <LinearProgress
          id={`${scopeId}-tank-bar`}
          aria-labelledby={`${scopeId}-tank-label`}
          variant="determinate"
          value={fillPct}
          sx={{
            height: 10,
            borderRadius: 5,
            backgroundColor: "action.disabledBackground",
            "& .MuiLinearProgress-bar": { backgroundColor: tankColor(fillRatio) },
          }}
        />
      </Box>

      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
        <MetricTile
          id={`${scopeId}-flow-in`}
          label="Flow In"
          value={`${metrics.flowIn.toLocaleString()} gph`}
        />
        <MetricTile
          id={`${scopeId}-demand`}
          label="Demand"
          value={`${metrics.demand.toLocaleString()} gph`}
        />
        <MetricTile
          id={`${scopeId}-net`}
          label="Net"
          value={`${(metrics.flowIn - metrics.demand).toFixed(1)} gph`}
        />
        <MetricTile
          id={`${scopeId}-hour-cost`}
          label="Hour Cost"
          value={`$${metrics.stepCost.toFixed(4)}`}
        />
        <MetricTile
          id={`${scopeId}-cumulative-cost`}
          label="Cumulative Cost"
          value={`$${metrics.cumulativeCost.toFixed(4)}`}
          accent
        />
      </Box>
    </Box>
  );
}
