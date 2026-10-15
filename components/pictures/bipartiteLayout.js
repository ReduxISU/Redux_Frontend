// components/pictures/bipartiteLayout.js
//
// #203: where the Bipartite Graph picture puts its pieces. A pure function of the payload: no
// randomness, no DOM, no React, so the same instance always lands in the same place, before Run
// and at every step. Ported from Redux's design mockup
// (Documentation/Visualizations/mockups/bipartite.js, `draw()` of `create` and `createSat`),
// not from its parser or solvers.
//
// Two columns: the payload's `elements` on the left in payload order, its `sets` on the right,
// sorted by the average place of their members on the left (fewer crossings). The set boxes
// keep their names (S1, S2, ... or C1, C2, ...) so they still match the certificate. A set's
// member list, or a clause's literals, wraps onto more lines when it is too long for the box,
// and the box grows.
//
// The SAT factor graph is the same picture with `pickSide: "assignment"`: variables on the
// left (with room for their T / F value), clauses on the right, one edge per literal. A clause
// that uses a variable twice has two edges between the same two nodes; each repeat is bowed to
// one side so both stay visible.

/** An element's (or variable's) radius, in viewBox units. */
export const ELEMENT_RADIUS = 17;

/** The space each left-hand node takes, top to bottom. */
const ROW = 50;

/** A wrapped line's height in a set box. */
const LINE_HEIGHT = 15;

/** Room a factor graph's clause box keeps at its right for the "n true" pill. */
export const HITS_ROOM = 62;

const HEAD_Y = 28;

/** "{1,2,3}", for a set's members. */
export function braces(items) {
  return `{${items.join(",")}}`;
}

/** Half an element's drawn width: a circle for up to 3 characters, a pill for a longer label. */
function halfWidth(label) {
  const text = String(label);
  return text.length > 3 ? Math.max(ELEMENT_RADIUS, (text.length * 8.6 + 18) / 2) : ELEMENT_RADIUS;
}

/**
 * Splits `text` into lines of at most `room` characters, breaking only after a separator (the
 * comma of a member list, the "∨" of a clause). A piece longer than a line keeps its own line.
 */
function wrap(text, room, separator) {
  if (text.length <= room) return [text];
  const parts = text
    .split(separator)
    .map((part, index, all) => (index < all.length - 1 ? `${part}${separator}` : part));
  const lines = [];
  let current = "";
  for (const part of parts) {
    if (current && (current + part).length > room) {
      lines.push(current.trimEnd());
      current = "";
    }
    current += part;
  }
  if (current) lines.push(current.trimEnd());
  return lines;
}

/**
 * The Bipartite Graph's layout.
 *
 * @param {Object} payload The Bipartite Graph payload.
 * @returns {{minX: number, minY: number, width: number, height: number,
 *   assignment: boolean, pickSide: string,
 *   heads: Array<{key: string, x: number, y: number, text: string, picked: string|null}>,
 *   elements: Array<{id: string, label: string, x: number, y: number, half: number,
 *     valueX: number}>,
 *   sets: Array<{id: string, label: string, text: string, x: number, y: number, width: number,
 *     half: number, lines: string[], labelX: number, textX: number, hitsX: number|null}>,
 *   edges: Array<{id: string, a: string, b: string, positive: boolean|undefined, path: string,
 *     x1: number, y1: number, x2: number, y2: number}>,
 *   positions: Map<string, {x: number, y: number}>}}
 */
export function layoutBipartite(payload) {
  const assignment = payload?.pickSide === "assignment";
  const elements = (Array.isArray(payload?.elements) ? payload.elements : []).filter(
    (element) => typeof element?.id === "string",
  );
  const elementIndex = new Map(elements.map((element, index) => [element.id, index]));
  const elementLabel = new Map(
    elements.map((element) => [element.id, String(element.label ?? element.id)]),
  );
  const rawSets = (Array.isArray(payload?.sets) ? payload.sets : []).filter(
    (set) => typeof set?.id === "string",
  );
  const setIds = new Set(rawSets.map((set) => set.id));
  const edges = (Array.isArray(payload?.edges) ? payload.edges : []).filter(
    (edge) => typeof edge?.id === "string" && elementIndex.has(edge.a) && setIds.has(edge.b),
  );

  // What each set box says, and the left-hand places its sorting averages over: a set lists
  // its members; a clause lists its literals in order, one per edge (so ¬x and a repeat count).
  const sets = rawSets.map((set) => {
    const label = String(set.label ?? set.id);
    if (assignment) {
      const literals = edges.filter((edge) => edge.b === set.id);
      const text = literals
        .map((edge) => `${edge.positive === false ? "¬" : ""}${elementLabel.get(edge.a)}`)
        .join(" ∨ ");
      return { id: set.id, label, text, places: literals.map((edge) => elementIndex.get(edge.a)) };
    }
    const members = (Array.isArray(set.members) ? set.members : []).filter((id) =>
      elementIndex.has(id),
    );
    return {
      id: set.id,
      label,
      text: braces(members.map((id) => elementLabel.get(id))),
      places: members.map((id) => elementIndex.get(id)),
    };
  });
  const average = (places) =>
    places.length ? places.reduce((sum, place) => sum + place, 0) / places.length : 1e9;
  // (Array sort is stable, so sets with the same average keep their payload order.)
  const order = sets.slice().sort((a, b) => average(a.places) - average(b.places));

  // The set boxes' width. Sets: as wide as the longest "S1 {1,2,3}" up to 260 (380 when some
  // list is longer than that), and the rest wraps. Clauses: as wide as the longest clause up to
  // 300, plus room for the "n true" pill.
  let boxWidth;
  if (assignment) {
    const want = Math.max(
      ...sets.map((set) => (set.label.length + set.text.length) * 7.6 + 40),
      120,
    );
    boxWidth = Math.min(300, want) + HITS_ROOM;
  } else {
    const want = Math.max(
      ...sets.map((set) => (set.label.length + set.text.length) * 7.6 + 34),
      96,
    );
    boxWidth = Math.min(want > 260 ? 380 : 260, want);
  }
  const textInset = assignment ? 18 : 14;
  const lines = new Map(
    sets.map((set) => {
      const used = textInset + set.label.length * 8.5 + 10 + (assignment ? HITS_ROOM : 0);
      const room = Math.max(6, Math.floor((boxWidth - used) / 7.4));
      return [set.id, wrap(set.text, room, assignment ? " ∨ " : ",")];
    }),
  );
  const maxLines = Math.max(1, ...[...lines.values()].map((list) => list.length));
  const setRow = Math.max(ROW, 34 + (maxLines - 1) * LINE_HEIGHT + 12);

  const halves = new Map(
    elements.map((element) => [element.id, halfWidth(elementLabel.get(element.id))]),
  );
  const widest = Math.max(ELEMENT_RADIUS, ...halves.values());
  const height = Math.max(elements.length * ROW, sets.length * setRow) + 80;
  const width = Math.max(640, 200 + (widest - ELEMENT_RADIUS) + boxWidth + 300);
  const leftX = (assignment ? 110 : 90) + (widest - ELEMENT_RADIUS);
  const rightX = width - 50 - boxWidth;
  const top = (count, rowHeight) => 70 + (height - 80 - count * rowHeight) / 2 + rowHeight / 2;

  const positions = new Map();
  const placedElements = elements.map((element, index) => {
    const half = halves.get(element.id);
    const y = top(elements.length, ROW) + index * ROW;
    positions.set(element.id, { x: leftX, y });
    return {
      id: element.id,
      label: elementLabel.get(element.id),
      x: leftX,
      y,
      half,
      valueX: leftX - half - 8,
    };
  });
  const placedSets = order.map((set, index) => {
    const y = top(sets.length, setRow) + index * setRow;
    const list = lines.get(set.id);
    positions.set(set.id, { x: rightX, y });
    return {
      id: set.id,
      label: set.label,
      text: set.text,
      x: rightX,
      y,
      width: boxWidth,
      half: 17 + ((list.length - 1) * LINE_HEIGHT) / 2,
      lines: list,
      labelX: rightX + 12,
      textX: rightX + textInset + set.label.length * 8.5,
      lineHeight: LINE_HEIGHT,
      hitsX: assignment ? rightX + boxWidth - HITS_ROOM + 4 : null,
    };
  });

  // One edge per membership (per literal), from the element's right edge to the box's left.
  const repeats = new Map();
  const placedEdges = edges.map((edge) => {
    const a = positions.get(edge.a);
    const b = positions.get(edge.b);
    const x1 = a.x + halves.get(edge.a);
    const y1 = a.y;
    const x2 = b.x;
    const y2 = b.y;
    const pair = `${edge.a}\u0000${edge.b}`;
    const repeat = repeats.get(pair) ?? 0;
    repeats.set(pair, repeat + 1);
    let path;
    if (repeat === 0) {
      path = `M${round(x1)},${round(y1)} L${round(x2)},${round(y2)}`;
    } else {
      // A repeat of the same variable in one clause: bowed 22 units to one side per repeat.
      const length = Math.hypot(x2 - x1, y2 - y1) || 1;
      const offset = 22 * repeat;
      const mx = (x1 + x2) / 2 - ((y2 - y1) / length) * offset;
      const my = (y1 + y2) / 2 + ((x2 - x1) / length) * offset;
      path = `M${round(x1)},${round(y1)} Q${round(mx)},${round(my)} ${round(x2)},${round(y2)}`;
    }
    return { id: edge.id, a: edge.a, b: edge.b, positive: edge.positive, path, x1, y1, x2, y2 };
  });

  const pickSide = typeof payload?.pickSide === "string" ? payload.pickSide : "sets";
  const heads = assignment
    ? [
        { key: "left", x: leftX - widest - 22, y: HEAD_Y, text: "VARIABLES", picked: "ASSIGNED" },
        { key: "right", x: rightX, y: HEAD_Y, text: "CLAUSES", picked: null },
      ]
    : [
        {
          key: "left",
          x: leftX - widest,
          y: HEAD_Y,
          text: "ELEMENTS · U",
          picked: pickSide === "elements" ? "PICKED" : null,
        },
        {
          key: "right",
          x: rightX,
          y: HEAD_Y,
          text: "SETS · S",
          picked: pickSide === "sets" ? "PICKED" : null,
        },
      ];

  return {
    minX: 0,
    minY: 0,
    width,
    height,
    assignment,
    pickSide,
    heads,
    elements: placedElements,
    sets: placedSets,
    edges: placedEdges,
    positions,
  };
}

function round(value) {
  return Math.round(value * 10) / 10;
}
