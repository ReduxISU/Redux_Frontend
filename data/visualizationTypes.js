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

const VALIDATORS = {
  graph: validateGraphFrame,
};

/**
 * §4.4's contract-violation canary: a field-presence/type/vocabulary check against §3's
 * contracts, not a general JSON-schema validator. Only checks the failure classes §3
 * already enumerates per type.
 *
 * A universal type with no validator yet (every type besides `graph`, until T49/T50
 * add their own) always reports valid -- there is no renderer consuming it yet either,
 * so there is nothing for a false-negative here to protect.
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
