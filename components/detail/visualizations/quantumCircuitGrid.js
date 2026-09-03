// components/detail/visualizations/quantumCircuitGrid.js
//
// T56 (#129) -- pure grid math for QuantumCircuitRenderer.js's drag-to-retime/retarget
// editor. A gate's `time` field is really a position along one timeline shared by every
// wire (QuantumCircuitRenderer.js's `buildLayout` already compresses distinct time values
// into consecutive display columns) -- so moving a gate is either "reuse an existing
// column" (when the wire being dropped on has nothing else there) or "insert a new column
// at this position and renumber", never a raw numeric time write.
//
// Every function here takes `sortedTimes` as a parameter rather than recomputing it from
// `gates` alone -- `buildLayout` folds overlay boundary times into its own sorted-times
// list too (an overlay band can mark a time no gate occupies), so column *positions* on
// screen are `buildLayout`'s to define. Recomputing a gates-only version here would drift
// out of sync with what's actually rendered at each column index; taking the same
// `sortedTimes` the renderer already built keeps the drop target a user clicks on and the
// column index this module resolves it to identical by construction.
//
// Overlays are remapped alongside gates, not left to drift: `buildLayout` already folds
// overlay boundary times into `sortedTimes` (see above), so `insertColumnRemap`'s map
// already has a correct entry for every overlay's `timeStart`/`timeEnd`, not just for gate
// times -- reusing it for overlays too is what closes the gap rather than leaving a
// decorative band pointing at a column that no longer means what it used to.
//
// No React/DOM dependency -- plain functions over `gates`/`overlays` arrays, mirroring
// graphGeometry.js's role for GraphRenderer.js.

import { nextEditId } from "../../../data/frameEditOps";

// Does some OTHER gate already occupy `wireId` at `time`? A wire can only run one
// operation at once; different wires sharing a time value (parallel gates) is normal and
// not a collision.
function hasCollision(gates, excludeGateId, wireId, time) {
  return gates.some(
    (gate) => gate.id !== excludeGateId && gate.time === time && gate.targets.includes(wireId),
  );
}

// The old-time -> new-time remap for inserting one new column at `columnIndex` into
// `sortedTimes` -- every column at or after the insertion point shifts one ordinal
// position later. Operates on sort position, not raw numeric gaps, so it's correct
// whether or not `sortedTimes` happens to already be consecutive integers. Used for both
// gates' `time` and overlays' `timeStart`/`timeEnd` -- `sortedTimes` already folds overlay
// boundaries in (see file header), so one remap covers both.
function insertColumnRemap(sortedTimes, columnIndex) {
  const remap = new Map();
  sortedTimes.forEach((oldTime, index) => {
    remap.set(oldTime, index < columnIndex ? index : index + 1);
  });
  return remap;
}

function remapOverlays(overlays, remap) {
  return overlays.map((overlay) => ({
    ...overlay,
    timeStart: remap.get(overlay.timeStart) ?? overlay.timeStart,
    timeEnd: remap.get(overlay.timeEnd) ?? overlay.timeEnd,
  }));
}

/**
 * Moves one target of an existing gate to `wireId` at `columnIndex` on the shared
 * timeline. `columnIndex === sortedTimes.length` means "after every existing column".
 * Every other gate's `time`, and every overlay's `timeStart`/`timeEnd`, is renumbered
 * alongside the moved gate's if a new column had to be spliced in (the "push existing
 * gates aside" behavior decided on issue #125's thread -- a global shift across every
 * wire, not just the one being dropped on).
 *
 * @param {Array} gates
 * @param {Array} overlays
 * @param {string} gateId
 * @param {number} targetIndex Which position in `gate.targets` this drag is moving -- the
 *   box (the gate's last/lowest-drawn target) or one of the connector dots (any earlier
 *   target).
 * @param {string} wireId The wire (qubit id) dropped on.
 * @param {number} columnIndex
 * @param {number[]} sortedTimes From `buildLayout` -- see file header for why this must be
 *   the same array the renderer used to position the drop target, not recomputed here.
 * @returns {{gates: Array, overlays: Array}}
 */
export function moveGateToCell(
  gates,
  overlays,
  gateId,
  targetIndex,
  wireId,
  columnIndex,
  sortedTimes,
) {
  const movingGate = gates.find((gate) => gate.id === gateId);
  if (!movingGate) return { gates, overlays };

  const clampedColumn = Math.max(0, Math.min(columnIndex, sortedTimes.length));
  const landsOnExistingColumn = clampedColumn < sortedTimes.length;
  const candidateTime = landsOnExistingColumn ? sortedTimes[clampedColumn] : null;

  if (landsOnExistingColumn && !hasCollision(gates, gateId, wireId, candidateTime)) {
    const nextGates = gates.map((gate) => {
      if (gate.id !== gateId) return gate;
      const nextTargets = [...gate.targets];
      nextTargets[targetIndex] = wireId;
      return { ...gate, targets: nextTargets, time: candidateTime };
    });
    return { gates: nextGates, overlays };
  }

  const remap = insertColumnRemap(sortedTimes, clampedColumn);
  const nextGates = gates.map((gate) => {
    if (gate.id === gateId) {
      const nextTargets = [...gate.targets];
      nextTargets[targetIndex] = wireId;
      return { ...gate, targets: nextTargets, time: clampedColumn };
    }
    return { ...gate, time: remap.get(gate.time) ?? gate.time };
  });
  return { gates: nextGates, overlays: remapOverlays(overlays, remap) };
}

/**
 * Adds a brand-new single-target gate on `wireId` at `columnIndex`, using the same
 * reuse-or-insert rule as `moveGateToCell`.
 *
 * @returns {{gates: Array, overlays: Array, newGateId: string}}
 */
export function addGateAtCell(gates, overlays, gateType, wireId, columnIndex, sortedTimes) {
  const clampedColumn = Math.max(0, Math.min(columnIndex, sortedTimes.length));
  const landsOnExistingColumn = clampedColumn < sortedTimes.length;
  const candidateTime = landsOnExistingColumn ? sortedTimes[clampedColumn] : null;
  const newGateId = nextEditId("gate");
  const newGate = {
    id: newGateId,
    type: gateType,
    targets: [wireId],
    classical: null,
    params: null,
    label: null,
    time: 0,
  };

  if (landsOnExistingColumn && !hasCollision(gates, null, wireId, candidateTime)) {
    newGate.time = candidateTime;
    return { gates: [...gates, newGate], overlays, newGateId };
  }

  const remap = insertColumnRemap(sortedTimes, clampedColumn);
  const shifted = gates.map((gate) => ({ ...gate, time: remap.get(gate.time) ?? gate.time }));
  newGate.time = clampedColumn;
  return { gates: [...shifted, newGate], overlays: remapOverlays(overlays, remap), newGateId };
}
