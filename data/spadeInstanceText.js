// data/spadeInstanceText.js
//
// T51 (#114) -- a generic parser/serializer for SPADE-shaped instance text, used to
// round-trip a diagram edit back to instance text for the `graph` and `recursiveSet`
// universal types (ai_documentation/VISUALIZATION_TYPE_CONTRACTS.md §3.1/§3.4).
//
// --- Why this exists, and why it isn't grammar-driven (a real deviation from T46's own
// --- recommendation, recorded here rather than silently substituted) ----------------
//
// T46 (#109, ai_documentation/INTERACTIVE_LAYER_DESIGN.md §2.2) verified -- by decompiling
// SPADE's compiled `DiscreteParser.dll` in a throwaway .NET console app -- that SPADE
// instances round-trip through `UtilCollection.ToString()` exactly, and that `Add()`-based
// mutation reparses successfully. Its recommendation for an implementation was to "parse
// each InstanceGrammar's tuple shape once ... to get the reassembly template" from each
// problem's own declared grammar string (e.g. Clique's `"{((N,E),K) | ...}"`).
//
// That recommendation assumes frontend access to `InstanceGrammar`. Checked directly
// against this app's own API surface before writing this file: none of the six batch
// endpoints this app calls (`lib/redux/index.js`) -- `allProblems`, `allInfo`,
// `allSolvers`, `allVerifiers`, `allVisualizations`, `allVisualizationTypes` -- return a
// grammar string anywhere. `allInfo`'s closest field is `instanceFormat`, and per
// `hooks/useProblemDetail.js`'s own header, that's prose with an embedded example, not a
// machine grammar. SPADE itself is a compiled C# library the browser cannot call. So the
// grammar-string-driven design T46 sketched (correct for a backend implementation, which
// does have both) is not buildable here.
//
// The alternative this file implements instead: SPADE's own bracket convention -- `{}` for
// an unordered `HashSet`, `()` for an ordered `List`, comma-separated, confirmed by T46's
// own findings -- is *self-describing text*, independent of the grammar string. So rather
// than generating instance text from a grammar template, this module parses the CURRENT
// instance text (already sitting in the shared instance box, and known-valid since it's
// what produced the frame being edited) into a generic bracket tree, locates the specific
// subtree an edit touches by matching against the *known* node/leaf identities already in
// the frame data, mutates only that subtree, and reserializes the whole tree. Everything
// outside the touched subtree (a Clique instance's trailing "K" parameter, for example,
// which the `graph` contract's {nodes, links} payload never carries at all) passes through
// byte-for-byte unchanged, because it is never parsed apart from the rest -- it doesn't
// need to be, since this module never has to know what it means.
//
// This is a real, deliberate substitution for T46's literal recommendation, made because
// the assumption it depended on (grammar-string access) does not hold from this vantage
// point -- recorded here rather than quietly reduced in scope, per CLAUDE.md's "where a
// task depends on an open decision, don't decide it quietly" rule. See T51's handback
// summary for the consequences: this technique is confident for node identity (short,
// literal tokens that appear verbatim in instance text) and for `recursiveSet` (the whole
// instance IS the edited tree, so no location step is even needed -- see
// data/instanceSerializers.js), but is deliberately NOT extended to edge structure that
// carries more than a bare two-element pair (a weighted or labelled edge, e.g. DFA/NFA's
// transition symbols) -- see that file's graph serializer for the specific, narrower
// guarantee it makes instead of guessing.

/**
 * Tokenizes SPADE-style instance text: `{`, `}`, `(`, `)`, `,` as single-character
 * delimiter tokens, whitespace skipped, and any other run of characters as one leaf token.
 * @param {string} text
 * @returns {Array<{type: string, value: string}>}
 */
function tokenize(text) {
  const tokens = [];
  const DELIMITERS = "{}(),";
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (DELIMITERS.includes(ch)) {
      tokens.push({ type: ch, value: ch });
      i += 1;
      continue;
    }
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }
    let j = i;
    while (j < text.length && !DELIMITERS.includes(text[j]) && !/\s/.test(text[j])) {
      j += 1;
    }
    tokens.push({ type: "leaf", value: text.slice(i, j) });
    i = j;
  }
  return tokens;
}

/**
 * Parses SPADE-style instance text into a generic bracket tree:
 * `{type: "set", children}` for `{...}` (unordered, HashSet), `{type: "tuple", children}`
 * for `(...)` (ordered, List), `{type: "leaf", value}` for a bare token.
 * @param {string} text
 * @returns {Object} the root node.
 * @throws {Error} if `text` isn't balanced/well-formed under this bracket grammar.
 */
export function parseInstanceText(text) {
  const tokens = tokenize(text);
  let pos = 0;

  function parseValue() {
    const token = tokens[pos];
    if (!token) {
      throw new Error("Unexpected end of instance text");
    }
    if (token.type === "{" || token.type === "(") {
      const closing = token.type === "{" ? "}" : ")";
      const kind = token.type === "{" ? "set" : "tuple";
      pos += 1;
      const children = [];
      if (tokens[pos]?.type === closing) {
        pos += 1;
        return { type: kind, children };
      }
      children.push(parseValue());
      while (tokens[pos]?.type === ",") {
        pos += 1;
        children.push(parseValue());
      }
      if (tokens[pos]?.type !== closing) {
        throw new Error(`Expected "${closing}" in instance text`);
      }
      pos += 1;
      return { type: kind, children };
    }
    if (token.type === "leaf") {
      pos += 1;
      return { type: "leaf", value: token.value };
    }
    throw new Error(`Unexpected "${token.value}" in instance text`);
  }

  const root = parseValue();
  if (pos !== tokens.length) {
    throw new Error("Unexpected trailing content in instance text");
  }
  return root;
}

/**
 * Reserializes a bracket tree back to SPADE-style instance text -- the exact inverse of
 * `parseInstanceText`. Round-trips byte-for-byte on any tree this module produced or
 * parsed, matching T46's own finding that SPADE's `ToString()` does the same.
 * @param {Object} node
 * @returns {string}
 */
export function serializeInstanceText(node) {
  if (node.type === "leaf") {
    return node.value;
  }
  const inner = node.children.map(serializeInstanceText).join(",");
  return node.type === "set" ? `{${inner}}` : `(${inner})`;
}

/** @param {Object} node @returns {string[]} every leaf value under `node`, in tree order. */
export function collectLeafValues(node) {
  if (node.type === "leaf") {
    return [node.value];
  }
  return node.children.flatMap(collectLeafValues);
}

/**
 * Finds the deepest node in `root` whose full set of leaf descendants exactly equals
 * `targetValues` (as a set -- duplicates/order don't matter, matching how a node-id set is
 * used). Post-order, so a nested exact match (more specific) wins over an enclosing one.
 * Used to locate a `graph` frame's node-id set, or any similarly-shaped named grammar
 * variable, inside the parsed instance text -- see this file's header for why this is a
 * text-driven location step rather than a grammar-driven one.
 * @param {Object} root
 * @param {string[]} targetValues
 * @returns {Object|null} the matching node, or null if none matches exactly.
 */
export function findExactLeafSetNode(root, targetValues) {
  const targetSet = new Set(targetValues);

  function visit(node) {
    if (node.type === "leaf") {
      return null;
    }
    for (const child of node.children) {
      const found = visit(child);
      if (found) return found;
    }
    const leaves = collectLeafValues(node);
    if (leaves.length !== targetSet.size) {
      return null;
    }
    const leafSet = new Set(leaves);
    if (leafSet.size !== leaves.length) {
      return null; // duplicate leaves under this node -- not the clean id set we want
    }
    for (const value of leafSet) {
      if (!targetSet.has(value)) return null;
    }
    return node;
  }

  return visit(root);
}

/**
 * Returns a deep clone of `node` with every leaf equal to `oldValue` renamed to
 * `newValue`, wherever it occurs in the tree (a node id can appear in more than one place
 * -- an edge endpoint, an automaton's initial/accepting-state set -- SPADE does no
 * referential-integrity checking of its own, per T46's finding, so a rename has to reach
 * every occurrence itself).
 * @param {Object} node
 * @param {string} oldValue
 * @param {string} newValue
 * @returns {Object}
 */
export function renameLeafEverywhere(node, oldValue, newValue) {
  if (node.type === "leaf") {
    return node.value === oldValue ? { type: "leaf", value: newValue } : node;
  }
  return {
    ...node,
    children: node.children.map((child) => renameLeafEverywhere(child, oldValue, newValue)),
  };
}

/**
 * Returns a deep clone of `node` with every occurrence of `value` removed. Referential
 * integrity (T46: SPADE itself does not enforce it) is handled here structurally: a direct
 * child that is itself a two-leaf pair (an edge endpoint pair, ordered or unordered)
 * containing `value` is dropped in its entirety rather than left as a dangling one-element
 * pair; everywhere else, only the matching leaf itself is dropped from its parent's
 * children.
 *
 * `protectedNode` (by reference, matched against the *same* `node` this call started
 * with -- not a value comparison) exempts one specific subtree from the pair-collapse
 * rule, always shrinking it by one leaf instead: without this, a plain node-id set that
 * happens to have exactly two members (a two-node graph) is structurally indistinguishable
 * from a two-leaf edge pair, and the collapse rule would wrongly delete the whole set
 * instead of leaving the other node in it. `serializeGraphInstance`
 * (data/instanceSerializers.js) always passes the located node-id set here for exactly
 * this reason -- see that file for the one remaining case this doesn't cover (a relation
 * with more than two positions, e.g. DFA/NFA's `(from, symbol, to)` transitions, where a
 * leaf's removal can still leave a malformed remnant tuple this function has no way to
 * detect).
 * @param {Object} node
 * @param {string} value
 * @param {Object|null} [protectedNode] A subtree (found in the SAME `node` passed as this
 *   call's first argument) that always shrinks rather than ever being collapsed as a pair.
 * @returns {Object}
 */
export function removeLeafEverywhere(node, value, protectedNode = null) {
  if (node.type === "leaf") {
    return node;
  }
  if (node === protectedNode) {
    return {
      ...node,
      children: node.children.filter((child) => !(child.type === "leaf" && child.value === value)),
    };
  }
  const nextChildren = [];
  for (const child of node.children) {
    if (child.type === "leaf") {
      if (child.value !== value) nextChildren.push(child);
      continue;
    }
    if (
      child !== protectedNode &&
      child.children.length === 2 &&
      child.children.every((grandchild) => grandchild.type === "leaf") &&
      child.children.some((grandchild) => grandchild.value === value)
    ) {
      continue; // drop the whole pair -- referential integrity, see doc comment above
    }
    nextChildren.push(removeLeafEverywhere(child, value, protectedNode));
  }
  return { ...node, children: nextChildren };
}

/**
 * Returns a deep clone of `node` with `newValue` appended as a new leaf child of the
 * subtree found by `findExactLeafSetNode(node, currentValues)` -- i.e. "add this id to the
 * same named set the given ids currently live in".
 * @param {Object} node
 * @param {string[]} currentValues The set identifying which subtree to add to (the id set
 *   as it stood before this addition).
 * @param {string} newValue
 * @returns {Object} the mutated tree, or `node` unchanged if no matching subtree is found.
 */
export function addLeafToMatchingSet(node, currentValues, newValue) {
  const target = findExactLeafSetNode(node, currentValues);
  if (!target) {
    return node;
  }
  function visit(candidate) {
    if (candidate === target) {
      return { ...candidate, children: [...candidate.children, { type: "leaf", value: newValue }] };
    }
    if (candidate.type === "leaf") {
      return candidate;
    }
    return { ...candidate, children: candidate.children.map(visit) };
  }
  return visit(node);
}
