// data/gadgetKinds.js
//
// #229 stage 4: what the Result panel's Gadgets section calls each kind of gadget, in the
// order the groups are listed. A reduction's `gadgets` come from the backend
// (ProblemProvider/reduce), each with a `gadgetKind` from Redux's shared GadgetKind list,
// serialized as a camelCase string ("bound", "group", "edgeRule", "element", "palette",
// "orGadget"). The labels and one-line explanations live here, not in the component, so a
// naming change is a one-file change (the same rule data/taxonomy.js follows for tags).
//
// Order and wording follow the workbench mockup (v38): Bounds, Groups, Edge rules, Elements,
// then Palette and Or-gadget, which only some reductions use. A kind Redux adds later that is
// not listed here still shows, under OTHER_GADGET_KIND, rather than being dropped.

/** @type {{kind: string, label: string, about: string}[]} */
export const GADGET_KINDS = [
  { kind: "bound", label: "Bounds", about: "How the target's number is set." },
  {
    kind: "group",
    label: "Groups",
    about: "A source piece and every target piece built for it.",
  },
  { kind: "edgeRule", label: "Edge rules", about: "Which target edges a source piece gets." },
  {
    kind: "element",
    label: "Elements",
    about: "One source piece and the one target piece it becomes.",
  },
  { kind: "palette", label: "Palette", about: "Fixed helper pieces every target gets." },
  {
    kind: "orGadget",
    label: "Or-gadgets",
    about: "A small structure that only works when its clause has a true literal.",
  },
];

/** The group for a gadget kind this file does not list yet. */
export const OTHER_GADGET_KIND = {
  kind: "other",
  label: "Other",
  about: "Gadgets of a kind this page does not describe yet.",
};

/** How many rows a group shows before its "Show all n" button. */
export const GADGET_ROW_LIMIT = 10;

/** The line under the Gadgets heading. */
export const GADGETS_INTRO =
  "A gadget is the part of the target the reduction builds for a part of the source. Each row reads source → target.";

/**
 * What a row shows for a side with no ids (a bound is built from the whole instance, not
 * from one piece of it).
 */
export const GADGET_EMPTY_SIDE = { source: "the source instance", target: "the target instance" };
