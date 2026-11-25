// tests/unit/formulaLayout.test.mjs
//
// #340 (ReduxISU/Redux#1057): the Formula layout with and without clause weights. A formula with
// no weights must land exactly where it did before weights existed (the numbers below were taken
// from the layout before #340); a weighted one names each clause "C1 · w 3", widens a box to hold
// its name, and places the strip head's satisfied weight.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  HEAD_CHAR,
  layoutFormula,
  nameWidth,
  OUTER_WIDTH,
  satisfiedText,
  TOTAL_LINE,
  weightOf,
  weightText,
} from "../../components/pictures/formulaLayout.js";

// (¬x1 ∨ x2) ∧ (x3)
function payload(weights) {
  const groups = [
    { id: "c0", label: "C1", members: ["c0-0", "c0-1"] },
    { id: "c1", label: "C2", members: ["c1-0"] },
  ];
  return {
    kind: "formula",
    layout: "cnf",
    groups: weights ? groups.map((group, i) => ({ ...group, weight: weights[i] })) : groups,
    nodes: [
      { id: "c0-0", label: "¬x1", variable: "v:x1", positive: false, group: "c0" },
      { id: "c0-1", label: "x2", variable: "v:x2", positive: true, group: "c0" },
      { id: "c1-0", label: "x3", variable: "v:x3", positive: true, group: "c1" },
    ],
    variables: [
      { id: "v:x1", label: "x1" },
      { id: "v:x2", label: "x2" },
      { id: "v:x3", label: "x3" },
    ],
  };
}

const round = (value) => Math.round(value * 100) / 100;
const boxes = (layout) => layout.clauses.map((c) => [c.x, c.y, c.w, c.h].map(round));
const pills = (layout) => [...layout.literals.values()].map((l) => [l.x, l.y, l.w].map(round));
const chips = (layout) => layout.variables.map((v) => [v.x, v.y, v.w].map(round));

describe("layoutFormula without weights", () => {
  for (const width of [800, 320]) {
    test(`lands exactly where it did before weights (width ${width})`, () => {
      const layout = layoutFormula(payload(), width);
      assert.deepEqual(boxes(layout), [
        [12, 56, 119.04, 48],
        [165.04, 56, 52.02, 48],
      ]);
      assert.deepEqual(pills(layout), [
        [21, 65, 43.02],
        [88.02, 65, 34.02],
        [174.04, 65, 34.02],
      ]);
      assert.deepEqual(chips(layout), [
        [12, 144, 66],
        [86, 144, 66],
        [160, 144, 66],
      ]);
      assert.equal(layout.height, 188);
      assert.equal(layout.stripY, 126);
    });
  }

  test("has no weights and no satisfied total", () => {
    const layout = layoutFormula(payload());
    assert.deepEqual(
      layout.clauses.map((c) => c.weight),
      [null, null],
    );
    assert.equal(layout.totalWeight, null);
    assert.equal(layout.weightTotal, null);
  });
});

describe("layoutFormula with weights", () => {
  test("keeps each clause's weight and totals them", () => {
    const layout = layoutFormula(payload([3, 1]));
    assert.deepEqual(
      layout.clauses.map((c) => [c.label, c.weight]),
      [
        ["C1", 3],
        ["C2", 1],
      ],
    );
    assert.equal(layout.totalWeight, 4);
  });

  test("widens a box too narrow for its weighted name, and only that one", () => {
    const layout = layoutFormula(payload([3, 1]));
    // C1's box (two pills) is already wider than "C1 · w 3"; C2's single pill is not.
    assert.equal(round(layout.clauses[0].w), 119.04);
    assert.ok(nameWidth("C2 · w 1") > 52.02);
    assert.equal(layout.clauses[1].w, nameWidth("C2 · w 1"));
    // The pills inside stay where the box's padding puts them.
    assert.deepEqual(pills(layout)[2], [174.04, 65, 34.02]);
  });

  test("every name fits its box at the widest clause and the narrowest width", () => {
    for (const width of [800, 320]) {
      const layout = layoutFormula(payload([123456, 7]), width);
      for (const clause of layout.clauses) {
        assert.ok(nameWidth(clause.label + weightText(clause.weight)) <= clause.w + 1e-9);
        assert.ok(clause.x + clause.w <= layout.width - 12 + 1e-9);
      }
    }
  });

  test("a name longer than the line is capped at the line", () => {
    const long = payload([3, 1]);
    long.groups[0].label = "A clause with a very long name indeed";
    const layout = layoutFormula(long, 320);
    assert.equal(layout.clauses[0].w, 320 - 24 - OUTER_WIDTH);
  });

  test("puts the satisfied weight beside the strip head when it fits", () => {
    const layout = layoutFormula(payload([3, 1]), 800);
    assert.deepEqual(layout.weightTotal, { x: 12 + 10 * HEAD_CHAR + 14, y: layout.stripY });
    // The chips do not move.
    assert.deepEqual(chips(layout), chips(layoutFormula(payload(), 800)));
  });

  test("puts it on its own line under the head when it doesn't, and the chips move down", () => {
    const layout = layoutFormula(payload([10 ** 12, 10 ** 12]), 320);
    assert.deepEqual(layout.weightTotal, { x: 12, y: layout.stripY + TOTAL_LINE });
    // Without the extra line the chips start 18 under the head (as in the unweighted layout).
    const before = layoutFormula(payload(), 320);
    assert.equal(before.variables[0].y, before.stripY + 18);
    assert.equal(layout.variables[0].y, layout.stripY + 18 + TOTAL_LINE);
  });
});

describe("weight helpers", () => {
  test("weightOf reads only finite numbers", () => {
    assert.equal(weightOf({ weight: 0 }), 0);
    assert.equal(weightOf({ weight: 5 }), 5);
    assert.equal(weightOf({}), null);
    assert.equal(weightOf({ weight: "5" }), null);
    assert.equal(weightOf({ weight: Number.NaN }), null);
  });

  test("the texts", () => {
    assert.equal(weightText(3), " · w 3");
    assert.equal(weightText(null), "");
    assert.equal(satisfiedText(3, 4), "SATISFIED WEIGHT 3 OF 4");
    assert.equal(satisfiedText(undefined, 4), "SATISFIED WEIGHT – OF 4");
  });
});
