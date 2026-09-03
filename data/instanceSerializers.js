// data/instanceSerializers.js
//
// Diagram-to-text serializers for the editable universal visualization types
// (ai_documentation/INTERACTIVE_LAYER_DESIGN.md §2.2). Turns an edited in-memory frame
// structure back into instance text the backend's own parser accepts, so a structural
// diagram edit can round-trip through Run (`/solve`/`/visualize`) the same way a textarea
// edit already does. Built across two independent tasks that landed as separate PRs and
// merged here:
//
// - T52 (#115): `serializeBooleanSatisfiabilityInstance`, covering `booleanSatisfiability`
//   (SAT, SAT3). Per INTERACTIVE_LAYER_DESIGN.md §2.2, SAT/SAT3 don't use the SPADE
//   grammar library at all -- they parse a small hand-rolled CNF grammar (`&` between
//   clauses, `|` between literals, `!` negation;
//   `Problems/NPComplete/NPC_SAT3/SAT3_Class.cs`). The contract's literal strings ("x1",
//   "!x2", VISUALIZATION_TYPE_CONTRACTS.md §3.3) already match this text format, so the
//   serializer named in issue #115's own body is a straightforward join: literals within
//   a clause joined with " | " inside parentheses, clauses joined with " & ".
// - T51 (#114): `serializeGraphInstance` and `serializeRecursiveSetInstance`, covering
//   `graph` and `recursiveSet`. Both build on the generic bracket-tree module in
//   data/spadeInstanceText.js -- see that file's header for why this project's own
//   deviation from T46's grammar-string-driven recommendation is the right call given
//   what this frontend actually has access to. `quantumCircuit` is deliberately NOT
//   covered here -- see components/detail/visualizations/QuantumCircuitRenderer.js's own
//   header for why (T46 never verified SPADE round-tripping against a gate-sequence
//   grammar, so nothing confirms a serializer here wouldn't be a silent guess).

import {
  addLeafToMatchingSet,
  findExactLeafSetNode,
  parseInstanceText,
  removeLeafEverywhere,
  renameLeafEverywhere,
  serializeInstanceText,
} from "./spadeInstanceText";

/**
 * @param {Array<{literals: Array<{literal: string}>}>} clauses
 * @returns {string} Instance text a SAT/SAT3 instance's hand-rolled parser accepts, e.g.
 *   "(x1 | !x2) & (x2 | x3 | !x1)". An empty clause list serializes to "" -- the parser's
 *   own handling of a 0-clause formula, not something this function invents.
 */
export function serializeBooleanSatisfiabilityInstance(clauses) {
  if (!Array.isArray(clauses) || clauses.length === 0) {
    return "";
  }
  return clauses
    .map((clause) => `(${(clause.literals ?? []).map((literal) => literal.literal).join(" | ")})`)
    .join(" & ");
}

/**
 * Replays an ordered log of node-level edits (add/remove/rename -- never edge edits, see
 * `serializeGraphInstance`'s own doc comment for why those are out of scope) against the
 * current instance text, and returns the resulting text.
 *
 * @param {string} originalInstanceText The shared instance text as it stood when the base
 *   frame being edited was fetched -- i.e. text SPADE is already known to parse
 *   successfully, since it's what produced that frame.
 * @param {string[]} baseNodeIds The `graph` frame's node ids as of that same fetch, before
 *   any of `nodeOps` were applied -- the "known identity" this module's location step
 *   matches against (see data/spadeInstanceText.js's header).
 * @param {Array<{type: "add"|"remove"|"rename", id?: string, from?: string, to?: string}>} nodeOps
 *   Ordered edit log: `{type: "add", id}`, `{type: "remove", id}`, or
 *   `{type: "rename", from, to}`. Edge edits never appear here -- see below.
 * @returns {{instanceText: string} | {error: string}} `error` when the current instance
 *   text can't be parsed under the generic bracket grammar at all, or when an `add` can't
 *   find a matching node-id set to add into (both real, surfaceable failures, not silent
 *   corruption).
 *
 * --- Why this only replays node ops, never edge ops -----------------------------------
 * A node id ("1", "2", ...) is a short literal token with no internal structure -- it
 * either appears as a leaf somewhere in the parsed tree or it doesn't, which is exactly
 * what `findExactLeafSetNode`/`removeLeafEverywhere`/`renameLeafEverywhere` need. An edge
 * is not that simple across the 24 `graph` instances: T40's own finding (recorded in
 * GraphRenderer.js's header) is that some instances encode more than a bare pair per edge
 * -- DFA/NFA's `weight` field carries a transition symbol, and the visible link with
 * `weight: "a,b"` plausibly collapses more than one underlying grammar-level transition
 * into one visual edge, not a single two-element tuple this module could locate and edit
 * safely. Rather than guess at which of the 24 instances are "safe" bare pairs and which
 * aren't (unverifiable without a live backend from here), edge structural edits preview
 * locally (§2.1.2) but are not sent through Run -- VisualizationsSection.js's own summary
 * to the user says so plainly rather than silently dropping them.
 *
 * --- A narrower residual risk in node removal, worth stating rather than hiding --------
 * `removeLeafEverywhere`'s referential-integrity cascade recognizes a plain two-leaf pair
 * (an ordinary edge endpoint) and drops it whole rather than leaving a dangling
 * one-element remnant. A relation with *more* than two positions -- concretely, an
 * automaton's `(from, symbol, to)` transition triple -- isn't recognized by that rule, so
 * removing a node that appears inside one leaves a malformed two-element remnant behind
 * instead of dropping the whole transition. This wasn't discoverable without a live
 * instance to inspect (see data/spadeInstanceText.js's header on why grammar access isn't
 * available here at all), so it's recorded here rather than silently risked: node editing
 * is solid for plain node/pair-edge grammars (the majority of the 24 `graph` instances),
 * and carries this one known sharp edge for automaton-shaped ones (DFA/NFA) specifically.
 */
export function serializeGraphInstance(originalInstanceText, baseNodeIds, nodeOps) {
  let tree;
  try {
    tree = parseInstanceText(originalInstanceText);
  } catch (parseError) {
    return {
      error: `Couldn't parse the current instance text to apply node edits (${parseError.message}).`,
    };
  }

  let currentIds = [...baseNodeIds];
  for (const op of nodeOps) {
    if (op.type === "rename") {
      tree = renameLeafEverywhere(tree, op.from, op.to);
      currentIds = currentIds.map((id) => (id === op.from ? op.to : id));
    } else if (op.type === "remove") {
      // The located node-id set is passed as the protected subtree so it always shrinks
      // by one, never gets collapsed by the pair-removal heuristic that also runs in this
      // same pass -- see removeLeafEverywhere's own doc comment for why a plain two-node
      // graph would otherwise be indistinguishable from a two-leaf edge pair.
      const protectedNode = findExactLeafSetNode(tree, currentIds);
      tree = removeLeafEverywhere(tree, op.id, protectedNode);
      currentIds = currentIds.filter((id) => id !== op.id);
    } else if (op.type === "add") {
      const next = addLeafToMatchingSet(tree, currentIds, op.id);
      if (next === tree) {
        return {
          error: `Couldn't find where to add node "${op.id}" in this problem's instance text.`,
        };
      }
      tree = next;
      currentIds = [...currentIds, op.id];
    }
  }

  return { instanceText: serializeInstanceText(tree) };
}

/**
 * Converts an edited `recursiveSet` frame's tree (VISUALIZATION_TYPE_CONTRACTS.md §3.4)
 * directly into instance text.
 *
 * Unlike `graph`, this needs no location step against the original instance text at all:
 * §3.4's contract is that the frame's entire `data` field *is* the instance's whole
 * structure (ExactCover/HittingSet/Partition/SetCover's declared instances carry nothing
 * else) -- so the edited tree can be serialized standalone and used as the complete new
 * instance text, the safest and most direct of the three wave-2 types.
 *
 * @param {{id: string, isOrdered: boolean, isValue: boolean, value?: string, list?: Array}} data
 *   The edited `recursiveSet` frame's `data` field.
 * @returns {string} instance text.
 */
export function serializeRecursiveSetInstance(data) {
  function toBracketNode(node) {
    if (node.isValue) {
      return { type: "leaf", value: node.value ?? "" };
    }
    return {
      type: node.isOrdered ? "tuple" : "set",
      children: (node.list ?? []).map(toBracketNode),
    };
  }
  return serializeInstanceText(toBracketNode(data));
}
