// hooks/useFrameEdits.js
//
// #229: on-picture editing for the workbench's base picture. This is the edit state the old
// Visualizations and Reductions sections each kept their own copy of (T51/#114, T52/#115),
// moved into one hook now that the workbench has a single base picture.
//
// The rules are unchanged (INTERACTIVE_LAYER_DESIGN.md sections 2.1.2 and 2.3):
//   - Only the base picture of the instance can be edited, never a solver step.
//   - An edit previews locally. Pressing Run turns a sendable edit back into instance text
//     (`serialize` below) and runs that. `booleanSatisfiability`, `graph` node edits and
//     `recursiveSet` serialize; `graph` edge edits and `quantumCircuit` edits stay
//     preview-only (data/instanceSerializers.js explains why).
//   - A new base picture (another instance, another visualization type) drops any pending
//     edit, so an edit can never be applied to a picture it was not made on.

import { useState } from "react";
import {
  applyCircuitOp,
  applyGraphOp,
  cloneCircuitForEdit,
  cloneGraphForEdit,
  SAT3_MAX_LITERALS_PER_CLAUSE,
} from "../data/frameEditOps";
import {
  serializeBooleanSatisfiabilityInstance,
  serializeGraphInstance,
  serializeRecursiveSetInstance,
} from "../data/instanceSerializers";
import { VISUALIZATION_TYPE_MAP } from "../data/visualizationTypes";

/**
 * @param {Object} options
 * @param {string} [options.backendType] The base picture's raw visualization type.
 * @param {Object|null} options.baseFrame The base picture, or null while there is none.
 * @param {string|null} options.baseInstance The instance text the base picture was drawn from.
 * @param {string} options.problemName Used for 3SAT's three-literals-per-clause cap.
 */
export function useFrameEdits({ backendType, baseFrame, baseInstance, problemName }) {
  const universalType = VISUALIZATION_TYPE_MAP[backendType] ?? null;
  const isBooleanSatisfiability = universalType === "booleanSatisfiability";
  const isGraph = universalType === "graph";
  const isRecursiveSet = universalType === "recursiveSet";
  const isQuantumCircuit = universalType === "quantumCircuit";
  const editable =
    Boolean(baseFrame) &&
    (isBooleanSatisfiability || isGraph || isRecursiveSet || isQuantumCircuit);
  // "3SAT" is the backend problemName of SAT3; SAT itself has no per-clause literal cap.
  const maxLiteralsPerClause =
    isBooleanSatisfiability && problemName === "3SAT" ? SAT3_MAX_LITERALS_PER_CLAUSE : undefined;

  const [editedClauses, setEditedClauses] = useState(null);
  const [editedGraph, setEditedGraph] = useState(null);
  const [graphNodeOps, setGraphNodeOps] = useState([]);
  const [graphHasEdgeEdits, setGraphHasEdgeEdits] = useState(false);
  const [editedRecursiveData, setEditedRecursiveData] = useState(null);
  const [editedCircuit, setEditedCircuit] = useState(null);

  // React's "adjust state when a prop changes" pattern: a different base picture starts
  // with no pending edit.
  const [editedFrame, setEditedFrame] = useState(baseFrame);
  if (editedFrame !== baseFrame) {
    setEditedFrame(baseFrame);
    setEditedClauses(null);
    setEditedGraph(null);
    setGraphNodeOps([]);
    setGraphHasEdgeEdits(false);
    setEditedRecursiveData(null);
    setEditedCircuit(null);
  }

  // GraphRenderer's edit affordances need every row's stable `_key` from the first render,
  // so the editable copy of a graph is made as soon as a base graph exists.
  if (isGraph && baseFrame && editedGraph === null && editedFrame === baseFrame) {
    setEditedGraph(cloneGraphForEdit(baseFrame));
  }

  function onClausesChange(updater) {
    setEditedClauses((current) => updater(current ?? baseFrame?.clauses ?? []));
  }

  function onGraphEdit(op) {
    setEditedGraph((current) => applyGraphOp(current ?? cloneGraphForEdit(baseFrame), op));
    if (op.type === "addNode" || op.type === "removeNode" || op.type === "renameNode") {
      setGraphNodeOps((ops) => [...ops, op]);
    } else {
      setGraphHasEdgeEdits(true);
    }
  }

  function onCircuitEdit(op) {
    setEditedCircuit((current) => applyCircuitOp(current ?? cloneCircuitForEdit(baseFrame.d3), op));
  }

  function onDataChange(updater) {
    setEditedRecursiveData((current) => updater(current ?? baseFrame.data));
  }

  let displayFrame = baseFrame;
  if (baseFrame) {
    if (isBooleanSatisfiability && editedClauses !== null) {
      displayFrame = { ...baseFrame, clauses: editedClauses };
    } else if (isGraph && editedGraph) {
      displayFrame = { ...baseFrame, nodes: editedGraph.nodes, links: editedGraph.links };
    } else if (isRecursiveSet && editedRecursiveData !== null) {
      displayFrame = { ...baseFrame, data: editedRecursiveData };
    } else if (isQuantumCircuit && editedCircuit) {
      displayFrame = { ...baseFrame, d3: { ...baseFrame.d3, ...editedCircuit } };
    }
  }

  const hasPendingEdit =
    (isBooleanSatisfiability && editedClauses !== null) ||
    (isGraph && (graphNodeOps.length > 0 || graphHasEdgeEdits)) ||
    (isRecursiveSet && editedRecursiveData !== null) ||
    (isQuantumCircuit && editedCircuit !== null);

  /**
   * Turns a pending, sendable edit into instance text.
   * @returns {{instanceText: string}|{error: string}|null} null when there is nothing to send.
   */
  function serialize() {
    if (isBooleanSatisfiability && editedClauses !== null) {
      return { instanceText: serializeBooleanSatisfiabilityInstance(editedClauses) };
    }
    if (isGraph && graphNodeOps.length > 0 && baseFrame && baseInstance !== null) {
      const baseNodeIds = baseFrame.nodes.map((node) => node.id);
      return serializeGraphInstance(baseInstance, baseNodeIds, graphNodeOps);
    }
    if (isRecursiveSet && editedRecursiveData !== null) {
      return { instanceText: serializeRecursiveSetInstance(editedRecursiveData) };
    }
    return null;
  }

  return {
    editable,
    displayFrame,
    maxLiteralsPerClause,
    hasPendingEdit,
    previewOnly: isQuantumCircuit,
    serialize,
    handlers: editable ? { onClausesChange, onGraphEdit, onDataChange, onCircuitEdit } : {},
  };
}
