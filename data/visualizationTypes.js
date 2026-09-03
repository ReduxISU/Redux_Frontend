// data/visualizationTypes.js
//
// T48 (#111). Concrete home named by ai_documentation/VISUALIZATION_TYPE_CONTRACTS.md
// §5 (the resolver) and §4.4 (the runtime contract-violation canary), so an
// implementation task didn't have to invent the location or guess whether one already
// existed.
//
// This is a frontend-side reconstruction of a contract the backend does not yet
// enforce (§0/§5 of that document) -- provisional, not a permanent authority. Once
// ReduxISU/Redux#524 (a `kind` discriminator on the wire payload) and #525 (a typed
// `IVisualization<U, TPayload>` interface) both ship, most of this file becomes dead
// code to delete -- tracked on Redux_Frontend#107, not re-derived here.

/**
 * Backend `visualizationType` string (`Navigation/Batch/allVisualizationTypes`, or
 * `allInfo`'s per-instance fallback) -> one of the 6 universal type keys, or `null` for
 * a type this contract's v1 has no renderer for at all.
 *
 * Directly transcribed from VISUALIZATION_TYPE_CONTRACTS.md §1's table. `GraphD3` and
 * `GraphLaTeX` share one renderer (§1.1: the LaTeX/TikZ path never ships here);
 * `QuantumCircuitD3` and `QuantumCircuitQjs` share one renderer that only reads the
 * `d3` arm of the payload (§3.2) -- a `QuantumCircuitQjs` instance with no `D3` sibling
 * genuinely has nothing to render under this map, which is `resolveVisualizationType`'s
 * job to surface as "no data", not a violation.
 */
export const VISUALIZATION_TYPE_MAP = {
  GraphD3: "graph",
  GraphLaTeX: "graph",
  QuantumCircuitD3: "quantumCircuit",
  QuantumCircuitQjs: "quantumCircuit",
  BooleanSatisfiability: "booleanSatisfiability",
  SetD3: "recursiveSet",
  DynamicTable: "stepTable",
  PumpSchedule: "pumpSchedule",
  Unimplemented: null,
};

/**
 * Resolves a frame to one of the 6 universal type keys (VISUALIZATION_TYPE_CONTRACTS.md
 * §1), or `null` when nothing in this contract can render it.
 *
 * Prefers a payload-level `kind` field when present (the state once ReduxISU/Redux#524
 * ships) and falls back to the static `backendType` -> universal type map otherwise.
 * `quantumCircuit` at `format: 0` (QASM-only, no `d3` arm) is a real, in-vocabulary
 * backend type that this contract's v1 still can't render (§3.2's decision) -- resolved
 * to `null` here rather than `"quantumCircuit"`, so a caller doesn't have to separately
 * remember that one universal type can still mean "no renderer for this particular
 * frame."
 *
 * @param {string} [backendType] The raw `visualizationType` wire value, e.g. "GraphD3".
 * @param {Object} [payload] One frame, if one is available yet.
 * @returns {string|null}
 */
export function resolveVisualizationType(backendType, payload) {
  if (payload && typeof payload.kind === "string" && payload.kind) {
    return payload.kind;
  }
  const universalType = VISUALIZATION_TYPE_MAP[backendType] ?? null;
  if (universalType === "quantumCircuit" && !(payload?.format === 1 && payload?.d3)) {
    return null;
  }
  return universalType;
}

/**
 * T50 (#113): a more specific "cannot render" reason for the one case that's
 * genuinely in-contract but out of v1's coverage (§3.2's decision) -- a
 * `quantumCircuit` frame at `format: 0` (QASM-only, no `d3` arm).
 * `resolveVisualizationType` already folds this into `null` like any other
 * unresolvable type; this export exists only so the UI can tell that
 * specific case apart from a genuinely unsupported backend type, per the
 * issue's own Done-when list ("show 'cannot render' with a distinct
 * reason, not a fake empty circuit").
 *
 * @param {string} [backendType]
 * @param {Object} [payload]
 * @returns {string|null}
 */
export function describeUnrenderableReason(backendType, payload) {
  if (
    VISUALIZATION_TYPE_MAP[backendType] === "quantumCircuit" &&
    !(payload?.format === 1 && payload?.d3)
  ) {
    return "No structured circuit data for this visualization.";
  }
  return null;
}

const GRAPH_REQUIRED_NODE_STRING_FIELDS = [
  "id",
  "name",
  "color",
  "outline",
  "delay",
  "dashed",
  "additional",
];
const GRAPH_REQUIRED_LINK_STRING_FIELDS = [
  "id",
  "source",
  "target",
  "color",
  "dashed",
  "delay",
  "weight",
  "attribute1",
  "attribute2",
];
const GRAPH_REQUIRED_LINK_BOOLEAN_FIELDS = ["weighted", "directed"];

/**
 * §3.1's contract, checked field by field. A `link.weight` that isn't numeric (DFA's
 * transition symbols) is explicitly NOT a violation here -- the contract requires a
 * string, not a number, precisely because T40 found the old renderer's opposite
 * assumption was the bug.
 */
function validateGraphFrame(frame) {
  const violations = [];
  if (!Array.isArray(frame?.nodes)) {
    violations.push("nodes: expected an array");
  }
  if (!Array.isArray(frame?.links)) {
    violations.push("links: expected an array");
  }
  if (violations.length > 0) {
    return { valid: false, violations };
  }

  frame.nodes.forEach((node, index) => {
    for (const field of GRAPH_REQUIRED_NODE_STRING_FIELDS) {
      if (typeof node?.[field] !== "string") {
        violations.push(`nodes[${index}].${field}: expected a string`);
      }
    }
  });

  frame.links.forEach((link, index) => {
    for (const field of GRAPH_REQUIRED_LINK_STRING_FIELDS) {
      if (typeof link?.[field] !== "string") {
        violations.push(`links[${index}].${field}: expected a string`);
      }
    }
    for (const field of GRAPH_REQUIRED_LINK_BOOLEAN_FIELDS) {
      if (typeof link?.[field] !== "boolean") {
        violations.push(`links[${index}].${field}: expected a boolean`);
      }
    }
  });

  return { valid: violations.length === 0, violations };
}

/**
 * §3.3's contract, checked field by field. An empty `clauses` array is a valid
 * degenerate case (0 clauses), not malformed -- only a missing/non-array `clauses`, or
 * a clause with no `literals` array, is.
 */
function validateBooleanSatisfiabilityFrame(frame) {
  const violations = [];
  if (!Array.isArray(frame?.clauses)) {
    violations.push("clauses: expected an array");
    return { valid: false, violations };
  }

  frame.clauses.forEach((clause, clauseIndex) => {
    if (typeof clause?.id !== "string") {
      violations.push(`clauses[${clauseIndex}].id: expected a string`);
    }
    if (!Array.isArray(clause?.literals)) {
      violations.push(`clauses[${clauseIndex}].literals: expected an array`);
      return;
    }
    clause.literals.forEach((literal, literalIndex) => {
      if (typeof literal?.id !== "string") {
        violations.push(`clauses[${clauseIndex}].literals[${literalIndex}].id: expected a string`);
      }
      if (typeof literal?.literal !== "string") {
        violations.push(
          `clauses[${clauseIndex}].literals[${literalIndex}].literal: expected a string`,
        );
      }
      if (typeof literal?.color !== "string") {
        violations.push(
          `clauses[${clauseIndex}].literals[${literalIndex}].color: expected a string`,
        );
      }
    });
  });

  return { valid: violations.length === 0, violations };
}

/**
 * §3.2's contract, checked field by field. By the time a frame reaches this
 * validator, resolveVisualizationType has already guaranteed `format === 1`
 * and `frame.d3` is truthy (that's what makes it resolve to
 * "quantumCircuit" instead of null in the first place) -- this only checks
 * the required shape *inside* `d3`, which resolveVisualizationType does not.
 */
function validateQuantumCircuitFrame(frame) {
  const violations = [];
  const d3 = frame?.d3;
  if (!d3 || typeof d3 !== "object") {
    violations.push("d3: expected an object");
    return { valid: false, violations };
  }
  if (!Array.isArray(d3.qubits)) violations.push("d3.qubits: expected an array");
  if (!Array.isArray(d3.classical)) violations.push("d3.classical: expected an array");
  if (!Array.isArray(d3.gates)) violations.push("d3.gates: expected an array");
  if (d3.overlays !== undefined && d3.overlays !== null && !Array.isArray(d3.overlays)) {
    violations.push("d3.overlays: expected an array");
  }
  if (violations.length > 0) {
    return { valid: false, violations };
  }

  d3.gates.forEach((gate, index) => {
    if (typeof gate?.id !== "string") violations.push(`d3.gates[${index}].id: expected a string`);
    if (typeof gate?.type !== "string")
      violations.push(`d3.gates[${index}].type: expected a string`);
    if (!Array.isArray(gate?.targets)) {
      violations.push(`d3.gates[${index}].targets: expected an array`);
    }
    if (typeof gate?.time !== "number")
      violations.push(`d3.gates[${index}].time: expected a number`);
  });

  (d3.overlays ?? []).forEach((overlay, index) => {
    if (typeof overlay?.id !== "string") {
      violations.push(`d3.overlays[${index}].id: expected a string`);
    }
    if (!Array.isArray(overlay?.targets)) {
      violations.push(`d3.overlays[${index}].targets: expected an array`);
    }
    if (typeof overlay?.timeStart !== "number") {
      violations.push(`d3.overlays[${index}].timeStart: expected a number`);
    }
    if (typeof overlay?.timeEnd !== "number") {
      violations.push(`d3.overlays[${index}].timeEnd: expected a number`);
    }
  });

  return { valid: violations.length === 0, violations };
}

/**
 * §3.4's contract. Only checks that `data` itself is present -- per-node
 * consistency (`isValue: true` with no `value`, `isValue: false` with no
 * `list`) is deliberately NOT checked here. §3.4 is explicit that this kind
 * of defect is "malformed at that node", not a reason to fail the whole
 * frame; RecursiveSetRenderer.js's SetNode degrades a bad node to a
 * placeholder mark instead, so there is nothing for the canary to gate on
 * beyond the one field that really does make the whole frame unrenderable.
 */
function validateRecursiveSetFrame(frame) {
  const violations = [];
  if (!frame?.data || typeof frame.data !== "object") {
    violations.push("data: expected an object");
  }
  return { valid: violations.length === 0, violations };
}

/**
 * §3.5's contract. A `cells` entry missing a column's key is the documented
 * "-" case, not a violation, so only `columns`/`rows` shape is checked here.
 */
function validateStepTableFrame(frame) {
  const violations = [];
  if (!Array.isArray(frame?.columns)) violations.push("columns: expected an array");
  if (!Array.isArray(frame?.rows)) violations.push("rows: expected an array");
  if (violations.length > 0) {
    return { valid: false, violations };
  }

  frame.columns.forEach((column, index) => {
    if (typeof column?.key !== "string")
      violations.push(`columns[${index}].key: expected a string`);
    if (typeof column?.label !== "string") {
      violations.push(`columns[${index}].label: expected a string`);
    }
  });
  frame.rows.forEach((row, index) => {
    if (typeof row?.id !== "string") violations.push(`rows[${index}].id: expected a string`);
    if (!row?.cells || typeof row.cells !== "object") {
      violations.push(`rows[${index}].cells: expected an object`);
    }
  });

  return { valid: violations.length === 0, violations };
}

const PUMP_SCHEDULE_METRIC_NUMBER_FIELDS = [
  "hour",
  "stepCost",
  "cumulativeCost",
  "tankLevel",
  "tankCapacity",
  "tankFillRatio",
  "flowIn",
  "demand",
];

/**
 * §3.6's contract. `pumpSchedule` is the one type whose numeric fields are
 * real JSON numbers rather than strings (per §3.6), so this checks `number`/
 * `boolean`, not `string`, unlike every other validator in this file.
 */
function validatePumpScheduleFrame(frame) {
  const violations = [];
  if (typeof frame?.action !== "string") violations.push("action: expected a string");

  if (!frame?.metrics || typeof frame.metrics !== "object") {
    violations.push("metrics: expected an object");
  } else {
    for (const field of PUMP_SCHEDULE_METRIC_NUMBER_FIELDS) {
      if (typeof frame.metrics[field] !== "number") {
        violations.push(`metrics.${field}: expected a number`);
      }
    }
    if (typeof frame.metrics.isPeakHour !== "boolean") {
      violations.push("metrics.isPeakHour: expected a boolean");
    }
  }

  if (!Array.isArray(frame?.state?.pumps)) {
    violations.push("state.pumps: expected an array");
  } else {
    frame.state.pumps.forEach((pump, index) => {
      if (typeof pump?.name !== "string") {
        violations.push(`state.pumps[${index}].name: expected a string`);
      }
      if (typeof pump?.isOn !== "boolean") {
        violations.push(`state.pumps[${index}].isOn: expected a boolean`);
      }
      if (typeof pump?.flowGph !== "number") {
        violations.push(`state.pumps[${index}].flowGph: expected a number`);
      }
      if (typeof pump?.powerKw !== "number") {
        violations.push(`state.pumps[${index}].powerKw: expected a number`);
      }
    });
  }

  return { valid: violations.length === 0, violations };
}

const VALIDATORS = {
  graph: validateGraphFrame,
  booleanSatisfiability: validateBooleanSatisfiabilityFrame,
  quantumCircuit: validateQuantumCircuitFrame,
  recursiveSet: validateRecursiveSetFrame,
  stepTable: validateStepTableFrame,
  pumpSchedule: validatePumpScheduleFrame,
};

/**
 * §4.4's contract-violation canary: a field-presence/type/vocabulary check against §3's
 * contracts, not a general JSON-schema validator. Only checks the failure classes §3
 * already enumerates per type.
 *
 * All 6 universal types have a validator as of T50. A universal type this map doesn't
 * recognize at all (`null`, or a payload-level `kind` this frontend has never heard of)
 * always reports valid -- there is no renderer consuming it either, so there is nothing
 * for a false-negative here to protect.
 *
 * @param {string|null} universalType
 * @param {Object} frame
 * @returns {{valid: boolean, violations: string[]}}
 */
export function validateFrame(universalType, frame) {
  const validator = VALIDATORS[universalType];
  if (!validator) {
    return { valid: true, violations: [] };
  }
  return validator(frame);
}
