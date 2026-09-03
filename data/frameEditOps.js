// data/frameEditOps.js
//
// Pure, framework-free helpers for applying a local structural edit to an in-memory
// `graph`/`quantumCircuit` frame (INTERACTIVE_LAYER_DESIGN.md §2.1.2's local preview).
// Originally written inline in components/detail/VisualizationsSection.js by T51/T52
// (#114/#115); pulled out here by T53 (#116) once components/detail/ReductionsSection.js
// needed the exact same op-applying logic for its own source pane -- moving already-generic
// pure functions to their second real call site, not a speculative abstraction.
//
// SAT3_MAX_LITERALS_PER_CLAUSE lives here for the same reason: both sections need the same
// cap and neither owns it more than the other.

// SAT3's literal-per-clause cap (VISUALIZATION_TYPE_CONTRACTS.md §3.3, T52/#115's own
// issue body) -- SAT itself has no cap. "3SAT" is the real backend `problemName` (per
// data/supplementalTags.js's own header note: code "SAT3" -> problemName "3SAT"), not the
// visualization/solver class-name spelling, so callers check the problem, not the
// visualization, since the cap is a property of the problem's grammar, not of any one
// visualization instance.
export const SAT3_MAX_LITERALS_PER_CLAUSE = 3;

// Ids assigned to a newly-added edge/gate within one editing session only need to be
// unique within that session (React keys, DOM ids) -- a module-level counter is enough,
// shared across every caller so two sections editing at once can never collide.
let editIdCounter = 0;
export function nextEditId(prefix) {
  editIdCounter += 1;
  return `${prefix}-${editIdCounter}`;
}

export function cloneGraphForEdit(frame) {
  return {
    nodes: frame.nodes.map((node) => ({ ...node, _key: node.id })),
    links: frame.links.map((link) => ({ ...link, _key: link.id })),
  };
}

// Applies one GraphRenderer edit descriptor to a cloned {nodes, links} structure.
// Referential integrity for node removal/rename (an edge can't be left dangling, per
// T46's finding that SPADE itself won't catch this) is handled locally here the same way
// data/spadeInstanceText.js's `removeLeafEverywhere`/`renameLeafEverywhere` handle it in
// the text -- the two are independent implementations of the same rule, one over the
// in-memory structure for the local preview, one over the parsed text for Run.
export function applyGraphOp(current, op) {
  switch (op.type) {
    case "addNode": {
      if (current.nodes.some((node) => node.id === op.id)) return current;
      return {
        ...current,
        nodes: [
          ...current.nodes,
          {
            id: op.id,
            name: op.id,
            color: "",
            outline: "",
            delay: "",
            dashed: "",
            additional: "",
            _key: op.id,
          },
        ],
      };
    }
    case "removeNode":
      return {
        nodes: current.nodes.filter((node) => node.id !== op.id),
        links: current.links.filter((link) => link.source !== op.id && link.target !== op.id),
      };
    case "renameNode": {
      if (op.from === op.to || current.nodes.some((node) => node.id === op.to)) return current;
      return {
        nodes: current.nodes.map((node) =>
          node.id === op.from ? { ...node, id: op.to, name: op.to } : node,
        ),
        links: current.links.map((link) => ({
          ...link,
          source: link.source === op.from ? op.to : link.source,
          target: link.target === op.from ? op.to : link.target,
        })),
      };
    }
    case "addEdge": {
      if (op.source === op.target) return current;
      const alreadyExists = current.links.some(
        (link) =>
          (link.source === op.source && link.target === op.target) ||
          (link.source === op.target && link.target === op.source),
      );
      if (alreadyExists) return current;
      return {
        ...current,
        links: [
          ...current.links,
          {
            id: nextEditId("edge"),
            _key: nextEditId("edge-key"),
            source: op.source,
            target: op.target,
            color: "",
            dashed: "",
            delay: "",
            weight: "",
            weighted: false,
            directed: false,
            attribute1: "",
            attribute2: "",
          },
        ],
      };
    }
    case "removeEdge":
      return { ...current, links: current.links.filter((link) => link.id !== op.id) };
    default:
      return current;
  }
}

export function cloneCircuitForEdit(d3) {
  return {
    qubits: [...d3.qubits],
    classical: [...(d3.classical ?? [])],
    gates: (d3.gates ?? []).map((gate) => ({ ...gate, targets: [...gate.targets] })),
    overlays: d3.overlays ?? [],
    metadata: d3.metadata ?? null,
  };
}

// Local-preview-only (data/instanceSerializers.js has no `quantumCircuit` serializer --
// see that file's header) -- so unlike `applyGraphOp`, nothing here needs to track a
// separate op log for Run.
export function applyCircuitOp(current, op) {
  switch (op.type) {
    case "addQubit":
      if (current.qubits.includes(op.id)) return current;
      return { ...current, qubits: [...current.qubits, op.id] };
    case "removeQubit":
      return {
        ...current,
        qubits: current.qubits.filter((qubit) => qubit !== op.id),
        gates: current.gates.filter((gate) => !gate.targets.includes(op.id)),
      };
    case "renameQubit": {
      if (op.from === op.to || current.qubits.includes(op.to)) return current;
      return {
        ...current,
        qubits: current.qubits.map((qubit) => (qubit === op.from ? op.to : qubit)),
        gates: current.gates.map((gate) => ({
          ...gate,
          targets: gate.targets.map((target) => (target === op.from ? op.to : target)),
        })),
      };
    }
    case "addGate": {
      const maxTime = current.gates.reduce((max, gate) => Math.max(max, gate.time ?? 0), -1);
      return {
        ...current,
        gates: [
          ...current.gates,
          {
            id: nextEditId("gate"),
            type: op.gateType,
            targets: [op.target],
            classical: null,
            params: null,
            label: null,
            time: maxTime + 1,
          },
        ],
      };
    }
    case "removeGate":
      return { ...current, gates: current.gates.filter((gate) => gate.id !== op.id) };
    case "relabelGate":
      return {
        ...current,
        gates: current.gates.map((gate) =>
          gate.id === op.id ? { ...gate, type: op.gateType } : gate,
        ),
      };
    default:
      return current;
  }
}
