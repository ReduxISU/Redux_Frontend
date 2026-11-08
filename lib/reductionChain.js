// lib/reductionChain.js
//
// Chains of reductions (A -> B -> C ...) in the workbench's Reduce mode: the pure parts.
// Redux's ProblemProvider/reductionChainView answers a chain with one Reduction View body per
// step ("hop"), each in the shape ProblemProvider/reductionView gives, so the Reduction View
// renderer draws a hop as it draws one reduction. Only the last hop solves; every earlier hop
// gets the answer the next one mapped back (its one "handoff" frame) and maps it back in turn.
// This file holds what needs no React and no renderer, so the unit tests can load it:
//
//   - findChains: the problems a problem reaches only through 2 to 6 reductions, each with one
//     route (the fewest steps, the first reduction of each step), from the reduction graph
//     (Navigation/Reductions) the problem page already loads. The route is sent as `path`, so
//     the chain drawn is exactly the one the To dropdown names.
//   - chainRouteLabel: the To dropdown's words for one ("Partition — via Subset Sum (2 steps)").
//   - chainTimeline: the order a viewer plays the hops' frames in, as one list of steps: every
//     hop's Build, first to last, then the last hop's Solve and Map back, then, from the
//     second-to-last hop back to the first, its handoff and its Map back.
//   - chainFailure: Redux's chain errors in plain words, naming the step that failed.

/** The most reductions a chain can have (ProblemProvider/reductionChainView's limit). */
export const MAX_CHAIN_HOPS = 6;

/**
 * Every problem `start` reaches through 2 to `most` reductions but not through one, with one
 * route each: the fewest steps, found breadth first in the graph's own order, taking each
 * step's first reduction. A step whose edge list is empty, or names no class, is not a step.
 * @param {Object} graph `{ [fromCode]: { [toCode]: edge[] } }` (Navigation/Reductions), each
 *   edge with `className` and, on newer backends, `reductionName`.
 * @param {string} start The first problem's code.
 * @param {(code: string) => string} [nameOf] A problem's display name by code.
 * @param {number} [most]
 * @returns {Array<{targetCode: string, target: string, hops: Array<{className: string,
 *   name: string, fromCode: string, from: string, toCode: string, to: string}>}>} In order of
 *   steps, then as found.
 */
export function findChains(graph, start, nameOf = (code) => code, most = MAX_CHAIN_HOPS) {
  if (!graph || typeof graph !== "object" || typeof start !== "string") return [];
  // How each problem was first reached: the step that reached it, from where.
  const reachedBy = new Map([[start, null]]);
  let frontier = [start];
  const found = [];
  for (let steps = 1; steps <= most && frontier.length > 0; steps += 1) {
    const next = [];
    for (const fromCode of frontier) {
      const toMap = graph[fromCode];
      if (!toMap || typeof toMap !== "object") continue;
      for (const [toCode, edges] of Object.entries(toMap)) {
        if (reachedBy.has(toCode)) continue;
        const edge = (Array.isArray(edges) ? edges : []).find(
          (candidate) => typeof candidate?.className === "string" && candidate.className,
        );
        if (!edge) continue;
        reachedBy.set(toCode, { fromCode, edge });
        next.push(toCode);
        if (steps >= 2) found.push(toCode);
      }
    }
    frontier = next;
  }
  return found.map((targetCode) => {
    const hops = [];
    for (let code = targetCode; code !== start; ) {
      const { fromCode, edge } = reachedBy.get(code);
      hops.unshift({
        className: edge.className,
        name:
          typeof edge.reductionName === "string" && edge.reductionName
            ? edge.reductionName
            : edge.className,
        fromCode,
        from: nameOf(fromCode),
        toCode: code,
        to: nameOf(code),
      });
      code = fromCode;
    }
    return { targetCode, target: nameOf(targetCode), hops };
  });
}

/** "a", "a and b", "a, b and c". */
export function joinWords(items) {
  const list = items.filter((item) => typeof item === "string" && item);
  if (list.length <= 1) return list[0] ?? "";
  return `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
}

/** The problems a chain passes through, the first problem to the last. */
export function chainProblems(chain) {
  const hops = chain?.hops ?? [];
  return hops.length === 0 ? [] : [hops[0].from, ...hops.map((hop) => hop.to)];
}

/**
 * The To dropdown's label for a chained target: "Partition — via Subset Sum (2 steps)",
 * "Weighted Cut — via Subset Sum and Partition (3 steps)".
 * @param {{target: string, hops: Array<{to: string}>}} chain
 */
export function chainRouteLabel(chain) {
  const hops = chain.hops ?? [];
  const via = hops.slice(0, -1).map((hop) => hop.to);
  return `${chain.target} — via ${joinWords(via)} (${hops.length} steps)`;
}

/** "Exact Cover → Subset Sum → Partition". */
export function chainTitle(chain) {
  return chainProblems(chain).join(" → ");
}

/**
 * The order a viewer plays a chain's frames in, as one list of steps, each `{hop, frame}`
 * (indexes into `hops` and that hop's `frames`): every hop's build frames, first hop to last;
 * then the last hop's solve and map frames; then, from the second-to-last hop back to the
 * first, its handoff frames and its map frames. A frame of any other phase is left out. Last
 * comes the "Start and end" stop (chainSummaryView): `{hop: hops.length, frame: 0, summary:
 * true}`, the first problem and the last side by side.
 * @param {Array<{frames: Array<{phase: string}>}>} hops
 * @returns {Array<{hop: number, frame: number, summary?: true}>}
 */
export function chainTimeline(hops) {
  const list = Array.isArray(hops) ? hops : [];
  const timeline = [];
  const add = (hop, phase) => {
    (list[hop]?.frames ?? []).forEach((frame, index) => {
      if (frame?.phase === phase) timeline.push({ hop, frame: index });
    });
  };
  const last = list.length - 1;
  for (let hop = 0; hop <= last; hop += 1) add(hop, "build");
  if (last >= 0) {
    add(last, "solve");
    add(last, "map");
  }
  for (let hop = last - 1; hop >= 0; hop -= 1) {
    add(hop, "handoff");
    add(hop, "map");
  }
  if (last >= 0) timeline.push({ hop: list.length, frame: 0, summary: true });
  return timeline;
}

/**
 * The links from the chain's first problem straight to its last, through every hop's gadgets:
 * hop k's target ids are hop k+1's source ids, so a first-problem piece leads to the pieces its
 * gadgets name in the next problem, those to theirs in the one after, and so on. A path stops
 * where an id has no gadget in the next hop; a gadget with no ids on one side (a bound, built
 * from the whole instance) links no piece. One composed gadget per first-problem piece that
 * reaches the last problem, in the order the first hop's gadgets name them: a "bound" when its
 * path goes through a bound (the piece sets a number the next problem is built around), an
 * "element" when it leads to one piece through elements alone, else a "group". The Reduction View's links then
 * work as for one reduction: pointing at a last-problem piece finds every gadget naming it, so
 * every first-problem piece that leads to it.
 * @param {Array<Array<{sourceIds: string[], targetIds: string[]}>>} gadgetLists Each hop's
 *   gadgets (lib/gadgets.js normalizeGadgets), first hop first.
 * @returns {Array<{index: number, kind: "bound"|"element"|"group", sourceIds: string[],
 *   targetIds: string[], legacySourceIds: string[], legacyTargetIds: string[], note: string}>}
 */
export function composeChainGadgets(gadgetLists) {
  const lists = Array.isArray(gadgetLists) ? gadgetLists : [];
  if (lists.length === 0) return [];
  // Each hop as a map from a source id to every gadget naming it (that names target ids too).
  const steps = lists.map((gadgets) => {
    const step = new Map();
    for (const gadget of Array.isArray(gadgets) ? gadgets : []) {
      if ((gadget?.targetIds ?? []).length === 0) continue;
      for (const id of gadget.sourceIds ?? []) {
        if (!step.has(id)) step.set(id, []);
        step.get(id).push(gadget);
      }
    }
    return step;
  });
  const composed = [];
  for (const start of steps[0].keys()) {
    let reached = new Set([start]);
    const kinds = new Set();
    for (const step of steps) {
      const next = new Set();
      for (const id of reached) {
        for (const gadget of step.get(id) ?? []) {
          kinds.add(gadget.kind);
          for (const target of gadget.targetIds) next.add(target);
        }
      }
      reached = next;
      if (reached.size === 0) break;
    }
    if (reached.size === 0) continue;
    let kind = "group";
    if (kinds.has("bound")) kind = "bound";
    else if (reached.size === 1 && [...kinds].every((each) => each === "element")) kind = "element";
    composed.push({
      index: composed.length,
      kind,
      sourceIds: [start],
      targetIds: [...reached],
      legacySourceIds: [],
      legacyTargetIds: [],
      note: "",
    });
  }
  return composed;
}

/** The first-problem pieces that lead to last-problem piece `id` (composeChainGadgets). */
export function startsLeadingTo(composed, id) {
  return composed
    .filter((gadget) => gadget.targetIds.includes(id))
    .map((gadget) => gadget.sourceIds[0]);
}

/**
 * The "Start and end" stop's caption: where the first problem's answer came from, and whether it
 * checks out; on a stopped solve, that there is no answer to compare.
 * @param {{answer: string|null, ok: boolean|null, timedOut: boolean}} result
 * @param {string[]} problems The chain's problems, first to last.
 */
export function chainSummaryCaption(result, problems) {
  const first = problems[0] ?? "The first problem";
  const last = problems[problems.length - 1] ?? "the last problem";
  if (result.timedOut) {
    return `The ${last} solver had not finished, so there is no answer to compare.`;
  }
  if (typeof result.answer !== "string") {
    return `No answer came back to ${first}, so there is nothing to compare.`;
  }
  // The answer is carried back from the last problem, so it passes the middle ones last first.
  const through = joinWords(problems.slice(1, -1).reverse());
  const from = `${first}'s answer ${result.answer} came from solving ${last}${
    through ? ` and carrying the answer back through ${through}` : ""
  }.`;
  if (result.ok === true) return `${from} It checks out: it is a valid ${first} answer.`;
  if (result.ok === false)
    return `${from} It did not check out: it is not a valid ${first} answer.`;
  return from;
}

/**
 * The "Start and end" stop as a Reduction View with one frame, for the Reduction View renderer:
 * the first problem's picture (hop 1's source) in the state of hop 1's last Map back frame (the
 * answer carried all the way back), beside the last problem's picture (the last hop's target) in
 * the state of the last hop's last Solve frame (the solver's answer), linked by the composed
 * gadgets. Its one frame's phase is "summary".
 * @param {{hops: Array<Object>, answer: string|null, ok: boolean|null, timedOut: boolean,
 *   solverName: string, seed: number|null}} chain A normalized chain (lib/reductionView.js
 *   normalizeReductionChain) whose hops can all be drawn.
 * @param {string[]} problems The chain's problems, first to last.
 */
export function chainSummaryView(chain, problems) {
  const first = chain.hops[0];
  const last = chain.hops[chain.hops.length - 1];
  const lastOf = (frames, phase) => frames.filter((frame) => frame.phase === phase).at(-1);
  const carried = lastOf(first.frames, "map") ?? first.frames.at(-1);
  const solved = lastOf(last.frames, "solve") ?? last.frames.at(-1);
  return {
    reduction: "",
    reductionName: "Start and end",
    solverName: chain.solverName ?? "",
    seed: chain.seed ?? null,
    source: first.source,
    target: { ...last.target, buildReveal: "pieces" },
    gadgets: composeChainGadgets(chain.hops.map((hop) => hop.gadgets)),
    frames: [
      {
        phase: "summary",
        event: "Done",
        caption: chainSummaryCaption(chain, problems),
        step: null,
        sourceFocus: [],
        targetFocus: [],
        source: carried?.source ?? {},
        target: solved?.target ?? {},
      },
    ],
  };
}

/** The step of `timeline` showing frame `frame` of hop `hop`, or -1 when none does. */
export function timelineIndexOf(timeline, hop, frame) {
  return timeline.findIndex((entry) => entry.hop === hop && entry.frame === frame);
}

/** The first step of `timeline` on hop `hop`, or -1. */
export function hopStart(timeline, hop) {
  return timeline.findIndex((entry) => entry.hop === hop);
}

/** "step 2 (Subset Sum → Partition)", for hop number `number` (1-based) of `chain`. */
function stepName(chain, number) {
  const hop = chain?.hops?.[number - 1];
  return hop ? `step ${number} (${hop.from} → ${hop.to})` : `step ${number}`;
}

function sentence(text) {
  const trimmed = typeof text === "string" ? text.trim() : "";
  if (!trimmed) return "";
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function capitalize(text) {
  return text ? `${text[0].toUpperCase()}${text.slice(1)}` : text;
}

/**
 * Redux's answer to a chain that did not run, in plain words naming the step it stopped at, or
 * null for an answer the workbench says the usual way (an unreadable instance, too many runs,
 * no backend at all).
 * @param {number} status The HTTP status.
 * @param {Object|null} payload The error body (`{error, hop?, reduction?, detail?, ...}`).
 * @param {{target: string, hops: Array<{className: string, name: string, from: string,
 *   to: string}>}} chain The chain that was asked for.
 * @returns {{headline: string, detail: string, code: string}|null}
 */
export function chainFailure(status, payload, chain) {
  const first = chain?.hops?.[0]?.from ?? "this";
  if (status === 404 || status === 405) {
    return {
      code: "chain_unavailable",
      headline: "Chains need a newer Redux backend",
      detail: `This Redux backend can't show a chain of reductions yet. The reductions straight from ${first} still work.`,
    };
  }
  const error = typeof payload?.error === "string" ? payload.error : "";
  const number = Number.isInteger(payload?.hop) ? payload.hop : null;
  const step = number ? stepName(chain, number) : "one step";
  const hop = number ? chain?.hops?.[number - 1] : null;
  const reductionName = hop?.name ?? payload?.reduction ?? "One of its reductions";
  const detail = sentence(payload?.detail);
  switch (error) {
    case "hop_failed":
      return {
        code: error,
        headline: `${capitalize(step)} could not be built`,
        detail: `${
          hop
            ? `The ${hop.from} instance the chain reached there could not be turned into ${hop.to}`
            : "One step could not use the instance it was handed"
        }${detail ? `: ${detail.charAt(0).toLowerCase()}${detail.slice(1)}` : "."} Each step makes its numbers bigger, so try a smaller ${first} instance.`,
      };
    case "no_build_steps":
      return {
        code: error,
        headline: `${capitalize(step)} can't be shown step by step yet`,
        detail: `${reductionName} does not record how it builds its target, so this chain can't be drawn. The reductions straight from ${first} still work.`,
      };
    case "no_backward_map":
      return {
        code: error,
        headline: `${capitalize(step)} can't carry an answer back yet`,
        detail: `${reductionName} can't map answers back, so the chain can't bring an answer back to ${first}.`,
      };
    case "chain_mismatch":
      return {
        code: error,
        headline: "The chain's steps don't fit together",
        detail: `${capitalize(step)} builds a problem the next step does not start from. Reload the page to pick up the current list of reductions.`,
      };
    case "chain_too_long":
      return {
        code: error,
        headline: "This chain is too long",
        detail: `A chain can have at most ${
          Number.isInteger(payload?.most) ? payload.most : MAX_CHAIN_HOPS
        } steps${Number.isInteger(payload?.hops) ? `, and this one has ${payload.hops}` : ""}.`,
      };
    case "no_path":
      return {
        code: error,
        headline: "Redux found no chain here",
        detail: `Redux knows no chain of reductions from ${first} to ${chain?.target ?? "that problem"}.`,
      };
    case "empty_path":
    case "unknown_reduction":
      return {
        code: error,
        headline: "Redux does not know one of the chain's reductions",
        detail:
          "The catalog offered a reduction the backend no longer has. Reload the page to pick up the current list.",
      };
    case "unknown_solver":
    case "solver_mismatch":
      return {
        code: error,
        headline: `The solver for ${chain?.target ?? "the last problem"} could not run`,
        detail: detail || "Redux does not have that solver for the chain's last problem.",
      };
    case "solver_answer_unmappable":
      return {
        code: error,
        headline: "The answer could not be carried back",
        detail: `The solver's answer for ${chain?.target ?? "the last problem"} could not be mapped back${detail ? `: ${detail}` : "."}`,
      };
    default:
      return null;
  }
}

/**
 * What the end of a chain says about its answer for the first problem, in plain words:
 * `{tone: "ok"|"err"|"warn", text}`.
 * @param {{answer: string|null, ok: boolean|null, timedOut: boolean}} result
 * @param {string} first The first problem's name.
 * @param {string} last The last problem's name.
 */
export function chainEnding(result, first, last) {
  if (result.timedOut) {
    return {
      tone: "warn",
      text: `The ${last} solver had not finished, so no answer came back to ${first}. Try a smaller instance.`,
    };
  }
  if (typeof result.answer !== "string") {
    return { tone: "warn", text: `No answer came back to ${first}.` };
  }
  if (result.ok === true) {
    return {
      tone: "ok",
      text: `The answer carried back to ${first} checks out: it is a valid ${first} answer.`,
    };
  }
  if (result.ok === false) {
    return {
      tone: "err",
      text: `The answer carried back to ${first} did not check out: it is not a valid ${first} answer.`,
    };
  }
  return { tone: "info", text: `The answer carried back to ${first}.` };
}
