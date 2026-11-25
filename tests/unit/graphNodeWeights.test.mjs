// tests/unit/graphNodeWeights.test.mjs
//
// #339 (ReduxISU/Redux#1058): the Graph picture's optional node weights (Weighted Max Clique) and
// the frame's selected total, from components/pictures/graphLayout.js. A graph with no node
// weights has neither, so it draws as before.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  hasNodeWeights,
  layoutGraph,
  NODE_RADIUS,
  NODE_WEIGHT_OFFSET,
  nodeWeightOf,
  nodeWeightPosition,
  nodeWeightText,
  nodeWidth,
  selectedWeightText,
} from "../../components/pictures/graphLayout.js";

// Weighted Max Clique's default instance, as Redux sends it.
const weighted = {
  kind: "graph",
  subtype: "undirected",
  layout: "force",
  nodes: [
    { id: "a", label: "a", weight: "4" },
    { id: "b", label: "b", weight: "3" },
    { id: "c", label: "c", weight: "5" },
    { id: "d", label: "d", weight: "7" },
  ],
  edges: [
    { id: "a-b", a: "a", b: "b" },
    { id: "a-c", a: "a", b: "c" },
    { id: "b-c", a: "b", b: "c" },
    { id: "b-d", a: "b", b: "d" },
  ],
  shape: "subset",
  rule: "clique",
};
const plain = {
  ...weighted,
  nodes: weighted.nodes.map(({ id, label }) => ({ id, label })),
};

describe("node weights", () => {
  test("a node's weight is its whole number string, or null when it has none", () => {
    assert.equal(nodeWeightOf({ id: "a", weight: "4" }), "4");
    assert.equal(nodeWeightOf({ id: "a", weight: "0" }), "0");
    assert.equal(nodeWeightOf({ id: "a", weight: "-2" }), "-2");
    assert.equal(nodeWeightOf({ id: "a" }), null);
    // Redux sends strings (Redux#1034); a bare number or anything not whole is not a weight.
    assert.equal(nodeWeightOf({ id: "a", weight: 4 }), null);
    assert.equal(nodeWeightOf({ id: "a", weight: "4.5" }), null);
    assert.equal(nodeWeightOf({ id: "a", weight: "" }), null);
    assert.equal(nodeWeightOf(null), null);
  });

  test("a weight above 2^53 is shown exactly, not rounded", () => {
    // 2^53 + 1, the first whole number a JavaScript number cannot hold.
    assert.equal(nodeWeightOf({ id: "a", weight: "9007199254740993" }), "9007199254740993");
    assert.equal(nodeWeightText("9007199254740993"), "w 9007199254740993");
    assert.equal(
      selectedWeightText({ selectedWeight: "9007199254740994" }),
      "Selected weight: 9007199254740994",
    );
  });

  test("the tag reads w n, with a real minus sign", () => {
    assert.equal(nodeWeightText("4"), "w 4");
    assert.equal(nodeWeightText("0"), "w 0");
    assert.equal(nodeWeightText("-2"), "w −2");
    assert.equal(nodeWeightText(null), null);
    assert.equal(nodeWeightText(undefined), null);
  });

  test("only a payload with a weighted node is weighted", () => {
    assert.equal(hasNodeWeights(weighted), true);
    assert.equal(hasNodeWeights(plain), false);
    assert.equal(hasNodeWeights({ nodes: [] }), false);
    assert.equal(hasNodeWeights(null), false);
  });

  test("the tag sits under its node, so it moves with the node", () => {
    assert.deepEqual(nodeWeightPosition({ x: 100, y: 50 }), { x: 100, y: 50 + NODE_WEIGHT_OFFSET });
    assert.deepEqual(nodeWeightPosition({ x: 7, y: 9 }), { x: 7, y: 9 + NODE_WEIGHT_OFFSET });
    assert.ok(NODE_WEIGHT_OFFSET > NODE_RADIUS, "below the node's body, not on it");
  });

  test("every tag fits inside the drawing, in both layouts", () => {
    for (const mode of ["force", "circle"]) {
      const layout = layoutGraph(
        {
          nodes: weighted.nodes.map((node) => node.id),
          edges: weighted.edges,
          widths: weighted.nodes.map((node) => nodeWidth(node.label)),
        },
        mode,
      );
      for (const node of weighted.nodes) {
        const tag = nodeWeightPosition(layout.positions.get(node.id));
        // The tag is 18 units tall, centred on its point.
        assert.ok(tag.y + 9 <= layout.minY + layout.height, `${mode}: ${node.id}'s tag is cut off`);
      }
    }
  });

  test("weights do not move the layout", () => {
    const place = (payload) =>
      layoutGraph(
        {
          nodes: payload.nodes.map((node) => node.id),
          edges: payload.edges,
          widths: payload.nodes.map((node) => nodeWidth(node.label)),
        },
        "force",
      );
    assert.deepEqual(place(weighted), place(plain));
  });
});

describe("selected weight", () => {
  test("says the frame's total", () => {
    assert.equal(selectedWeightText({ selectedWeight: "12" }), "Selected weight: 12");
    assert.equal(selectedWeightText({ selectedWeight: "0" }), "Selected weight: 0");
    assert.equal(selectedWeightText({ selectedWeight: "-3" }), "Selected weight: −3");
  });

  test("a frame without a total, such as a stopped run's Done, shows a dash", () => {
    assert.equal(selectedWeightText({ event: "Done", ok: false }), "Selected weight: –");
    assert.equal(selectedWeightText(null), "Selected weight: –");
    assert.equal(selectedWeightText({ selectedWeight: 12 }), "Selected weight: –");
  });
});
