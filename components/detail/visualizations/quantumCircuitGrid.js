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
// Known accepted gap: an overlay's own `timeStart`/`timeEnd` are not remapped when a move
// inserts a new column and shifts later gates -- overlays are read-only/decorative
// (VISUALIZATION_TYPE_CONTRACTS.md §3.2 covers gates/wires, not overlay authoring), so a
// band can visually drift relative to the gates it used to bracket after an edit. Not
// solved here; recorded rather than silently risked, the same discipline
// data/instanceSerializers.js's own header uses for its own open gaps.
//
// No React/DOM dependency -- plain functions over a `gates` array, mirroring
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
// whether or not `sortedTimes` happens to already be consecutive integers.
function insertColumnRemap(sortedTimes, columnIndex) {
  const remap = new Map();
  sortedTimes.forEach((oldTime, index) => {
    remap.set(oldTime, index < columnIndex ? index : index + 1);
  });
  return remap;
}

/**
 * Moves one target of an existing gate to `wireId` at `columnIndex` on the shared
 * timeline. `columnIndex === sortedTimes.length` means "after every existing column".
 * Returns a new `gates` array; every other gate's `time` is renumbered alongside the moved
 * gate's if a new column had to be spliced in (the "push existing gates aside" behavior
 * decided on issue #125's thread -- a global shift across every wire, not just the one
 * being dropped on).
 *
 * @param {Array} gates
 * @param {string} gateId
 * @param {number} targetIndex Which position in `gate.targets` this drag is moving -- the
 *   box (the gate's last/lowest-drawn target) or one of the connector dots (any earlier
 *   target).
 * @param {string} wireId The wire (qubit id) dropped on.
 * @param {number} columnIndex
 * @param {number[]} sortedTimes From `buildLayout` -- see file header for why this must be
 *   the same array the renderer used to position the drop target, not recomputed here.
 */
export function moveGateToCell(gates, gateId, targetIndex, wireId, columnIndex, sortedTimes) {
  const movingGate = gates.find((gate) => gate.id === gateId);
  if (!movingGate) return gates;

  const clampedColumn = Math.max(0, Math.min(columnIndex, sortedTimes.length));
  const landsOnExistingColumn = clampedColumn < sortedTimes.length;
  const candidateTime = landsOnExistingColumn ? sortedTimes[clampedColumn] : null;

  if (landsOnExistingColumn && !hasCollision(gates, gateId, wireId, candidateTime)) {
    return gates.map((gate) => {
      if (gate.id !== gateId) return gate;
      const nextTargets = [...gate.targets];
      nextTargets[targetIndex] = wireId;
      return { ...gate, targets: nextTargets, time: candidateTime };
    });
  }

  const remap = insertColumnRemap(sortedTimes, clampedColumn);
  return gates.map((gate) => {
    if (gate.id === gateId) {
      const nextTargets = [...gate.targets];
      nextTargets[targetIndex] = wireId;
      return { ...gate, targets: nextTargets, time: clampedColumn };
    }
    return { ...gate, time: remap.get(gate.time) ?? gate.time };
  });
}

/**
 * Adds a brand-new single-target gate on `wireId` at `columnIndex`, using the same
 * reuse-or-insert rule as `moveGateToCell`.
 *
 * @returns {{gates: Array, newGateId: string}}
 */
export function addGateAtCell(gates, gateType, wireId, columnIndex, sortedTimes) {
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
    return { gates: [...gates, newGate], newGateId };
  }

  const remap = insertColumnRemap(sortedTimes, clampedColumn);
  const shifted = gates.map((gate) => ({ ...gate, time: remap.get(gate.time) ?? gate.time }));
  newGate.time = clampedColumn;
  return { gates: [...shifted, newGate], newGateId };
}
