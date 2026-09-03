// data/instanceSerializers.js
//
// T52 (#115) -- diagram-to-text serializers for the editable universal
// visualization types (ai_documentation/INTERACTIVE_LAYER_DESIGN.md §2.2).
// Turns an edited in-memory frame structure back into instance text the
// backend's own parser accepts, so a structural diagram edit can round-trip
// through Run (`/solve`/`/visualize`) the same way a textarea edit already
// does.
//
// `booleanSatisfiability` (SAT, SAT3) is the only type covered here. Per
// INTERACTIVE_LAYER_DESIGN.md §2.2, SAT/SAT3 don't use the SPADE grammar
// library at all -- they parse a small hand-rolled CNF grammar (`&` between
// clauses, `|` between literals, `!` negation;
// `Problems/NPComplete/NPC_SAT3/SAT3_Class.cs`). The contract's literal
// strings ("x1", "!x2", VISUALIZATION_TYPE_CONTRACTS.md §3.3) already match
// this text format, so the serializer named in issue #115's own body is a
// straightforward join: literals within a clause joined with " | " inside
// parentheses, clauses joined with " & ".
//
// `graph`/`quantumCircuit`/`recursiveSet` (T51/#114) are SPADE-grammar-based
// and are not covered by this file -- a different serialization strategy,
// with its own reasoning recorded where that work lands.

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
