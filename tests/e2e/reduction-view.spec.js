// tests/e2e/reduction-view.spec.js
//
// #215: the Reduction View in Reduce mode. Run asks ProblemProvider/reductionView
// (ReduxISU/Redux#660) and draws the source and the target side by side (stacked on a phone),
// each with its picture type's own renderer, through three phases (Build, Solve, Map back)
// driven by the shared step controls; pointing at a piece on either side marks what it is linked
// to through the gadget list, on both sides. A backend without the endpoint (or a reduction it
// can't show) gets Reduce as it was before.
//
// The catalog comes from the real backend, like the rest of the suite. CI's backend has no
// Reduction View, so its answers are captures from a local build (./reduction-payloads.js);
// the fallback tests answer the older requests with ./gadget-payloads.js, as gadgets.spec.js does.

import { expect, test } from "./fixtures";
import { GADGET_PAYLOADS } from "./gadget-payloads";
import { drawnCollisions, openPanel } from "./helpers";
import {
  COLORING_TO_CLIQUE_COVER_VIEW,
  SAT_TO_3SAT_VIEW,
  SAT3_TO_CLIQUE_VIEW,
  SUBSET_SUM_TO_PARTITION_VIEW,
} from "./reduction-payloads";

const REDUCTION_VIEW_REQUEST = /\/api\/redux\/ProblemProvider\/reductionView\?/;
const VISUALIZE_REQUEST = /\/api\/redux\/ProblemProvider\/visualize\?/;
const VISUALIZE_REDUCTION_REQUEST = /\/api\/redux\/ProblemProvider\/visualizeReduction/;
const SOLVE_REQUEST = /\/api\/redux\/ProblemProvider\/solve/;
const REDUCE_REQUEST = /\/api\/redux\/ProblemProvider\/reduce\?/;

const PHONE_TEXT_PX = 11;

/**
 * Each capture with the page that opens it: the problem, its target in the To dropdown, and the
 * instance (the capture's own unless the page needs another).
 */
const CASES = {
  satTo3sat: { view: SAT_TO_3SAT_VIEW, problem: "SAT", target: /^3SAT/ },
  sat3ToClique: { view: SAT3_TO_CLIQUE_VIEW, problem: "3SAT", target: /^Clique(?!\s*Cover)/ },
  coloringToCliqueCover: {
    view: COLORING_TO_CLIQUE_COVER_VIEW,
    problem: "Graph Coloring",
    target: /^Clique Cover/,
  },
  // CI's backend (ghcr.io/reduxisu/redux:latest) has no Subset Sum page yet, so this capture is
  // drawn on 3SAT's page with its Clique target: the view is the capture's, whatever the page.
  subsetSumToPartition: {
    view: SUBSET_SUM_TO_PARTITION_VIEW,
    problem: "3SAT",
    target: /^Clique(?!\s*Cover)/,
    instance: SAT3_TO_CLIQUE_VIEW.source.instance,
  },
};

const VIEW = "#workbench-reduction";
const pane = (page, side) => page.locator(`${VIEW}-${side}`);
const zoomOf = (page, side) => pane(page, side).locator("[data-zoom]");
const svgOf = (page, side) => pane(page, side).locator('svg[id$="-svg"]');
const readout = (page) => page.locator(`${VIEW}-link`);
const phaseButton = (page, key) => page.locator(`#workbench-phases-${key}`);
const nextStep = (page) => page.locator("#workbench-steps-next");
const position = (page) => page.locator("#workbench-steps-position");

/** Opens `problem` on `instance` in Reduce mode with the target matching `target` chosen. */
async function openReduce(page, problem, instance, target) {
  await page.goto(`/${encodeURIComponent(problem)}?instance=${encodeURIComponent(instance)}`);
  await expect(page.getByRole("heading", { level: 1, name: problem })).toBeVisible({
    timeout: 20_000,
  });
  await page.locator("#workbench-mode-reduce").click();
  const current = ((await page.locator("#workbench-target-value").textContent()) ?? "").trim();
  if (!target.test(current)) {
    await page.locator("#workbench-target-button").click();
    await page
      .locator("#workbench-target-listbox")
      .getByRole("option")
      .filter({ hasText: target })
      .first()
      .click();
  }
  await expect(page.locator("#workbench-target-value")).toHaveText(target);
}

/**
 * Answers reductionView with the capture, opens its page and runs it. Returns the list of
 * reductionView requests the page made, so a test can count them.
 */
async function openView(page, key) {
  const { view, problem, target, instance } = CASES[key];
  const asked = [];
  await page.route(REDUCTION_VIEW_REQUEST, (route) => {
    asked.push(route.request().url());
    return route.fulfill({ json: view });
  });
  await openReduce(page, problem, instance ?? view.source.instance, target);
  await page.locator("#workbench-run").click();
  await expect(page.locator(VIEW)).toBeVisible();
  return asked;
}

/** The step controls to `index` (0-based), by the slider's keyboard. */
async function toStep(page, index) {
  const slider = page.locator('#workbench-steps-slider input[type="range"]');
  await slider.focus();
  await page.keyboard.press("Home");
  for (let i = 0; i < index; i += 1) await page.keyboard.press("ArrowRight");
  await expect(page.locator(VIEW)).toHaveAttribute("data-frame-index", String(index));
}

/**
 * Every piece's drawn centre on one side, by its id and kind of mark, in pixels from the pane's
 * top left corner (so scrolling the page to reach the step buttons doesn't count as a move).
 */
function pieceCentres(page, side) {
  return pane(page, side).evaluate((root) => {
    const origin = root.getBoundingClientRect();
    const centres = {};
    for (const element of root.querySelectorAll(
      "[data-node-id],[data-clause-id],[data-variable-id],[data-item-id],[data-element-id]",
    )) {
      const box = element.getBoundingClientRect();
      const name = [...element.attributes]
        .filter((attribute) => attribute.name.endsWith("-id"))
        .map((attribute) => `${attribute.name}=${attribute.value}`)
        .join(" ");
      centres[name] = [
        Math.round(box.x + box.width / 2 - origin.x),
        Math.round(box.y + box.height / 2 - origin.y),
      ];
    }
    return centres;
  });
}

function smallestText(page, side) {
  return svgOf(page, side).evaluate((svg) => {
    const scale = svg.getScreenCTM().a;
    return [...svg.querySelectorAll("text, tspan")]
      .filter((text) => text.textContent.trim() && getComputedStyle(text).visibility !== "hidden")
      .map((text) => Number.parseFloat(getComputedStyle(text).fontSize) * scale)
      .reduce((smallest, px) => Math.min(smallest, px), Number.POSITIVE_INFINITY);
  });
}

// --- Drawing and phases ------------------------------------------------------------------------

for (const key of Object.keys(CASES)) {
  test(`${key}: Run draws the source and the target side by side, each at Fit, on Build's first step`, async ({
    page,
  }) => {
    const { view } = CASES[key];
    await page.setViewportSize({ width: 1280, height: 1000 });
    await openView(page, key);
    await page.locator("#workbench-panel-close").click();

    await expect(pane(page, "source")).toHaveAttribute(
      "data-picture-type",
      view.source.picture.type,
    );
    await expect(pane(page, "target")).toHaveAttribute(
      "data-picture-type",
      view.target.picture.type,
    );
    await expect(page.locator(`${VIEW}-source-title`)).toHaveText(
      `${view.source.problem} · the instance you gave`,
    );
    await expect(page.locator(`${VIEW}-target-title`)).toHaveText(
      `${view.target.problem} · built by the reduction`,
    );
    for (const side of ["source", "target"]) {
      await expect(zoomOf(page, side)).toHaveAttribute("data-zoom", "1.00");
    }
    const source = await pane(page, "source").boundingBox();
    const target = await pane(page, "target").boundingBox();
    expect(target.x).toBeGreaterThan(source.x + source.width);
    expect(Math.abs(target.y - source.y)).toBeLessThan(2);

    // Build's first step, with the phase named in three places: the bar, the caption, the view.
    await expect(page.locator(VIEW)).toHaveAttribute("data-phase", "build");
    await expect(phaseButton(page, "build")).toHaveAttribute("aria-current", "step");
    await expect(phaseButton(page, "solve")).not.toHaveAttribute("aria-current", "step");
    const builds = view.frames.filter((frame) => frame.phase === "build").length;
    await expect(page.locator(`${VIEW}-caption-phase`)).toHaveText(`Build 1 of ${builds}`);
    await expect(page.locator(`${VIEW}-caption-text`)).toHaveText(view.frames[0].caption);
    await expect(position(page)).toHaveText(`Step 1 of ${view.frames.length}`);
    await expect(page.locator("#workbench-showing")).toContainText(`solved by ${view.solver}`);
    await expect(page.locator("#workbench-note")).toHaveCount(0);
    const scroll = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(scroll).toBeLessThanOrEqual(0);
  });
}

test("the phase bar jumps to each phase, and stepping across a phase's end moves the bar", async ({
  page,
}) => {
  const { view } = CASES.satTo3sat;
  await openView(page, "satTo3sat");
  const firstOf = (phase) => view.frames.findIndex((frame) => frame.phase === phase);

  await phaseButton(page, "solve").click();
  await expect(page.locator(VIEW)).toHaveAttribute("data-frame-index", String(firstOf("solve")));
  await expect(phaseButton(page, "solve")).toHaveAttribute("aria-current", "step");
  await expect(phaseButton(page, "build")).not.toHaveAttribute("aria-current", "step");
  await expect(page.locator(`${VIEW}-caption-phase`)).toHaveText(/^Solve 1 of \d+$/);
  await expect(position(page)).toHaveText(`Step ${firstOf("solve") + 1} of ${view.frames.length}`);

  // One step back is Build's last step.
  await page.locator("#workbench-steps-previous").click();
  await expect(phaseButton(page, "build")).toHaveAttribute("aria-current", "step");
  await expect(page.locator(`${VIEW}-caption-event`)).toHaveText("Built");

  await phaseButton(page, "map").click();
  await expect(page.locator(VIEW)).toHaveAttribute("data-phase", "map");
  await expect(page.locator(`${VIEW}-caption-event`)).toHaveText("Mapped");

  // The view's one verdict is on its last step, the end of the map back.
  await expect(page.locator(`${VIEW}-caption-verdict`)).toHaveCount(0);
  await toStep(page, view.frames.length - 1);
  await expect(page.locator(`${VIEW}-caption-verdict`)).toHaveText("Verdict: yes");
  await expect(page.locator(`${VIEW}-caption-text`)).toHaveText(view.frames.at(-1).caption);

  // The Result panel says the answer was mapped back, and by which solver.
  await openPanel(page, "result", { expect });
  await expect(page.locator("#workbench-result-mapped-back")).toContainText(
    view.frames.at(-1).caption,
  );
  await expect(page.locator("#workbench-result-reduce")).toContainText(
    `${view.solver}, on the 3SAT target`,
  );
});

test("Build shows only what the target has built so far, and the finished target after it", async ({
  page,
}) => {
  const { view } = CASES.sat3ToClique;
  await openView(page, "sat3ToClique");
  const { nodes, edges } = view.target.buildOrder;
  const builds = view.frames.filter((frame) => frame.phase === "build");
  for (const [index, frame] of builds.entries()) {
    await toStep(page, index);
    const { builtNodes, builtEdges } = frame.target;
    const hidden = nodes.length - builtNodes + (edges.length - builtEdges);
    await expect(pane(page, "target")).toHaveAttribute("data-hidden-count", String(hidden));
    for (const id of nodes.slice(0, builtNodes)) {
      await expect(pane(page, "target").locator(`[data-node-id="${id}"]`)).toBeVisible();
    }
    for (const id of nodes.slice(builtNodes)) {
      await expect(pane(page, "target").locator(`[data-node-id="${id}"]`)).toBeHidden();
    }
    for (const id of edges.slice(builtEdges)) {
      await expect(pane(page, "target").locator(`[data-edge-id="${id}"]`)).toBeHidden();
    }
  }
  // A pair a rule leaves unjoined is drawn as a dashed line, and the key says what it is.
  const skipping = builds.findIndex((frame) => frame.target.skipped?.length);
  await toStep(page, skipping);
  const ruleSaysNo = pane(page, "target").locator('[data-phantom][data-state="Blocked"]');
  await expect(ruleSaysNo).toHaveCount(builds[skipping].target.skipped.length);
  await expect(page.locator("#workbench-legend-body")).toContainText("Rule says no");
  await expect(page.locator("#workbench-legend-body")).toContainText("Linked by a gadget");

  // Solve and Map back draw the whole target; a dashed line there is the solver's own (a pair
  // its candidate needs and the graph lacks), never a rule's.
  await phaseButton(page, "solve").click();
  await expect(pane(page, "target")).toHaveAttribute("data-hidden-count", "0");
  await expect(ruleSaysNo).toHaveCount(0);
  await phaseButton(page, "map").click();
  await expect(pane(page, "target")).toHaveAttribute("data-hidden-count", "0");
});

for (const key of ["satTo3sat", "sat3ToClique", "subsetSumToPartition"]) {
  test(`${key}: nothing moves while stepping through all three phases`, async ({ page }) => {
    test.slow();
    const { view } = CASES[key];
    await page.setViewportSize({ width: 1280, height: 1000 });
    await openView(page, key);
    await page.locator("#workbench-panel-close").click();
    // The panes' sizes and where the target sits from the source, which no page scroll changes.
    const panes = async () => {
      const source = await pane(page, "source").boundingBox();
      const target = await pane(page, "target").boundingBox();
      return {
        source: [source.width, source.height],
        target: [target.width, target.height],
        apart: [Math.round(target.x - source.x), Math.round(target.y - source.y)],
      };
    };
    const start = {
      source: await pieceCentres(page, "source"),
      target: await pieceCentres(page, "target"),
      panes: await panes(),
    };
    expect(Object.keys(start.target).length).toBeGreaterThan(0);
    for (let index = 1; index < view.frames.length; index += 1) {
      await nextStep(page).click();
      await expect(page.locator(VIEW)).toHaveAttribute("data-frame-index", String(index));
      expect(await pieceCentres(page, "source"), `source at step ${index + 1}`).toEqual(
        start.source,
      );
      expect(await pieceCentres(page, "target"), `target at step ${index + 1}`).toEqual(
        start.target,
      );
      expect(await panes()).toEqual(start.panes);
      for (const side of ["source", "target"]) {
        await expect(zoomOf(page, side)).toHaveAttribute("data-zoom", "1.00");
      }
    }
  });
}

test("the Packing panes' texts never meet a line or a marker, at each phase's first step", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await openView(page, "subsetSumToPartition");
  await page.locator("#workbench-panel-close").click();
  for (const phase of ["build", "solve", "map"]) {
    await phaseButton(page, phase).click();
    for (const side of ["source", "target"]) {
      const selector = `${VIEW}-${side} svg[id$="-svg"]`;
      expect(await drawnCollisions(page, selector), `${side}, ${phase}`).toEqual([]);
    }
  }
});

// --- Gadget links --------------------------------------------------------------------------------

const hot = (page, side) => pane(page, side).locator('[data-rv-link="hot"]');
const faint = (page, side) => pane(page, side).locator('[data-rv-link="faint"]');

/** The ids marked linked on one side. */
function hotIds(page, side) {
  return hot(page, side).evaluateAll((elements) =>
    elements.map(
      (element) =>
        [...element.attributes].find(
          (attribute) => attribute.name.endsWith("-id") && attribute.name !== "id",
        )?.value,
    ),
  );
}

test("pointing at a source piece marks what it became on the target, and the other way", async ({
  page,
}) => {
  const { view } = CASES.sat3ToClique;
  await page.setViewportSize({ width: 1280, height: 1000 });
  await openView(page, "sat3ToClique");
  await page.locator("#workbench-panel-close").click();
  await phaseButton(page, "solve").click();
  await expect(readout(page)).toHaveAttribute("data-linked", "false");

  // A literal of the formula: its element gadget names one clique node.
  const literal = view.gadgets.find(
    (gadget) => gadget.gadgetKind === "element" && gadget.sourceIds[0] === "c1-1",
  );
  await pane(page, "source").locator('[data-node-id="c1-1"]').hover();
  await expect(readout(page)).toHaveAttribute("data-linked", "true");
  expect((await hotIds(page, "target")).sort()).toEqual([...literal.targetIds].sort());
  expect(await hotIds(page, "source")).toContain("c1-1");
  await expect(readout(page)).toContainText("linked by an element gadget");
  await expect(readout(page)).toContainText(`Clique ${literal.targetIds[0]}`);

  // The rest fades by color, never by opacity.
  const fadedNode = faint(page, "target").first();
  await expect(fadedNode).toBeVisible();
  const look = await fadedNode.evaluate((element) => ({
    filter: getComputedStyle(element).filter,
    opacity: getComputedStyle(element).opacity,
  }));
  expect(look.filter).toContain("grayscale");
  expect(look.opacity).toBe("1");

  // A clique node: back to its literal and its clause's group, on the source.
  const node = literal.targetIds[0];
  await pane(page, "target").locator(`[data-node-id="${node}"]`).hover();
  const back = view.gadgets.filter((gadget) => gadget.targetIds.includes(node));
  const expected = [...new Set(back.flatMap((gadget) => gadget.sourceIds))].sort();
  expect((await hotIds(page, "source")).sort()).toEqual(expected);
  expect(await hotIds(page, "target")).toContain(node);

  // Leaving the picture clears the link.
  await page.mouse.move(2, 2);
  await expect(readout(page)).toHaveAttribute("data-linked", "false");
  await expect(hot(page, "target")).toHaveCount(0);
  await expect(faint(page, "source")).toHaveCount(0);
});

test("a tap pins a link, keyboard focus links too, and Escape clears it", async ({ page }) => {
  const { view } = CASES.coloringToCliqueCover;
  await page.setViewportSize({ width: 1280, height: 1000 });
  await openView(page, "coloringToCliqueCover");
  await page.locator("#workbench-panel-close").click();
  await phaseButton(page, "map").click();

  // Tap (click) a node of the source graph: the link stays once the pointer leaves.
  await pane(page, "source").locator('[data-node-id="a"]').click();
  await page.mouse.move(2, 2);
  await expect(readout(page)).toHaveAttribute("data-linked", "true");
  const fromA = view.gadgets.filter((gadget) => gadget.sourceIds.includes("a"));
  const targets = [...new Set(fromA.flatMap((gadget) => gadget.targetIds))].sort();
  expect((await hotIds(page, "target")).sort()).toEqual(targets);
  // Tapping it again lets go.
  await pane(page, "source").locator('[data-node-id="a"]').click();
  await page.mouse.move(2, 2);
  await expect(readout(page)).toHaveAttribute("data-linked", "false");

  // Keyboard: a focused node links like a hovered one, and Escape clears it.
  await pane(page, "target").locator('[data-node-id="b"]').focus();
  await expect(readout(page)).toHaveAttribute("data-linked", "true");
  expect(await hotIds(page, "source")).toContain("b");
  await pane(page, "target").locator('[data-node-id="b"]').click();
  await page.mouse.move(2, 2);
  await expect(readout(page)).toHaveAttribute("data-linked", "true");
  await page.keyboard.press("Escape");
  await expect(readout(page)).toHaveAttribute("data-linked", "false");
});

test("a Gadgets row in the Result panel marks its gadget on both pictures", async ({ page }) => {
  const { view } = CASES.satTo3sat;
  await openView(page, "satTo3sat");
  await openPanel(page, "result", { expect });
  await page.locator("#workbench-result-gadgets-toggle").click();
  const group = view.gadgets.findIndex((gadget) => gadget.gadgetKind === "group");
  const row = page.locator(`#workbench-result-gadgets-row-${group}`);
  await row.scrollIntoViewIfNeeded();
  await row.hover();
  await expect(readout(page)).toHaveAttribute("data-linked", "true");
  expect((await hotIds(page, "source")).sort()).toEqual([...view.gadgets[group].sourceIds].sort());
  // Some of the group's target clauses may not be built yet on Build's first step; every one
  // that is drawn is marked.
  const marked = await hotIds(page, "target");
  expect(marked.length).toBeGreaterThan(0);
  for (const id of marked) expect(view.gadgets[group].targetIds).toContain(id);
});

// --- Phones ---------------------------------------------------------------------------------------

for (const scheme of ["light", "dark"]) {
  for (const width of [390, 320]) {
    test(`on a ${width} px phone in the ${scheme} theme the pictures stack, open at Fit and zoom to readable text`, async ({
      page,
    }) => {
      test.slow();
      await page.emulateMedia({ colorScheme: scheme });
      await page.setViewportSize({ width, height: 900 });
      for (const key of ["satTo3sat", "coloringToCliqueCover"]) {
        await openView(page, key);
        const close = page.locator("#workbench-panel-close");
        if (await close.isVisible()) await close.click();
        const source = await pane(page, "source").boundingBox();
        const target = await pane(page, "target").boundingBox();
        expect(target.y).toBeGreaterThan(source.y + source.height);
        const scroll = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(scroll).toBeLessThanOrEqual(0);
        for (const side of ["source", "target"]) {
          await expect(zoomOf(page, side)).toHaveAttribute("data-zoom", "1.00");
          const zoomIn = pane(page, side).locator('[id$="-zoom-in"]');
          for (let press = 0; press < 4; press += 1) {
            if ((await smallestText(page, side)) >= PHONE_TEXT_PX) break;
            await zoomIn.click();
          }
          expect(await smallestText(page, side), `${key} ${side}`).toBeGreaterThanOrEqual(
            PHONE_TEXT_PX,
          );
        }
        // The view's own words: the phase bar, the caption and the link line read in the theme.
        for (const selector of [
          `#workbench-phases-build`,
          `${VIEW}-caption-text`,
          `${VIEW}-link`,
          `${VIEW}-source-title`,
        ]) {
          const box = await page.locator(selector).boundingBox();
          expect(box.x + box.width, selector).toBeLessThanOrEqual(width);
          const ink = await page
            .locator(selector)
            .evaluate((element) => getComputedStyle(element).color);
          const [r, g, b] = ink.match(/\d+/g).map(Number);
          expect((r + g + b) / 3 > 128, selector).toBe(scheme === "dark");
        }
      }
    });
  }
}

// --- Fallback ------------------------------------------------------------------------------------

const SAT3 = GADGET_PAYLOADS.sat3ToClique;

/** Answers the requests Reduce made before the Reduction View, with a captured case. */
async function answerOlderReduce(page) {
  await page.route(VISUALIZE_REQUEST, (route) => route.fulfill({ json: SAT3.visualize }));
  await page.route(SOLVE_REQUEST, (route) => route.fulfill({ json: SAT3.answer }));
  await page.route(VISUALIZE_REDUCTION_REQUEST, (route) =>
    route.fulfill({ json: SAT3.visualizeReduction }),
  );
  await page.route(REDUCE_REQUEST, (route) => route.fulfill({ json: SAT3.reduce }));
}

for (const [status, body] of [
  [404, { error: "Unknown Redux endpoint" }],
  [405, null],
  [400, { error: "no_build_steps", reduction: "SipserReduceToCliqueStandard" }],
]) {
  test(`reductionView answered ${status}${body?.error ? ` (${body.error})` : ""}: Reduce works as before, and the page stops asking`, async ({
    page,
  }) => {
    await answerOlderReduce(page);
    let asked = 0;
    await page.route(REDUCTION_VIEW_REQUEST, (route) => {
      asked += 1;
      return route.fulfill(body ? { status, json: body } : { status });
    });
    await openReduce(page, "3SAT", SAT3.instance, /^Clique(?!\s*Cover)/);
    await expect(page.locator("#workbench-mode-note")).toContainText("step by step");
    for (let run = 0; run < 2; run += 1) {
      await page.locator("#workbench-run").click();
      await expect(page.locator("#workbench-target-picture")).toHaveAttribute(
        "data-picture-kind",
        "frame",
      );
      await expect(page.locator(VIEW)).toHaveCount(0);
      await expect(page.locator("#workbench-phases-build")).toHaveCount(0);
      await expect(page.locator("#workbench-run")).toBeEnabled();
    }
    expect(asked).toBe(1);
    await expect(page.locator("#workbench-mode-note")).toContainText("carries the answer across");
    await openPanel(page, "result", { expect });
    await expect(page.locator("#workbench-result-carried")).toBeVisible();
  });
}

test("an instance reductionView can't read falls back for that Run only", async ({ page }) => {
  await answerOlderReduce(page);
  let asked = 0;
  await page.route(REDUCTION_VIEW_REQUEST, (route) => {
    asked += 1;
    return asked === 1
      ? route.fulfill({ status: 400, json: { error: "reduction_input_parse_error" } })
      : route.fulfill({ json: SAT3_TO_CLIQUE_VIEW });
  });
  await openReduce(page, "3SAT", SAT3.instance, /^Clique(?!\s*Cover)/);
  await page.locator("#workbench-run").click();
  await expect(page.locator("#workbench-target-picture")).toHaveAttribute(
    "data-picture-kind",
    "frame",
  );
  await page.locator("#workbench-run").click();
  await expect(page.locator(VIEW)).toBeVisible();
  expect(asked).toBe(2);
});
