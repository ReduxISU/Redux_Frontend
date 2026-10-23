// tests/e2e/reduction-view-pictures.spec.js
//
// ReduxISU/Redux#912: each side of the Reduction View keeps its Visualization Type dropdown, at
// the top right of its picture, listing the pictures the view can draw for that side. Choosing one
// asks reductionView again with `sourceVisualization` / `targetVisualization`, shows a loading
// state in place of the pictures, and opens on the same phase and step. A slower answer to an
// earlier choice never lands over a later one, and a backend that ignores the choice (older than
// #912, so it names no visualization) gets a fixed dropdown naming what it drew.
//
// CI's backend has no Reduction View and no 3SAT Factor Graph or Search Tree in its catalog, so
// allInfo and allVisualizations are made to list SAT's and 3SAT's pictures as the local build
// does, and reductionView is answered from captures (./reduction-payloads.js).

import { expect, test } from "./fixtures";
import {
  SAT_FACTOR_GRAPH_TO_3SAT_VIEW,
  SAT_TO_3SAT_FACTOR_GRAPH_VIEW,
  SAT_TO_3SAT_SEARCH_TREE_VIEW,
  SAT_TO_3SAT_VIEW,
} from "./reduction-payloads";

const REDUCTION_VIEW_REQUEST = /\/api\/redux\/ProblemProvider\/reductionView\?/;
const ALL_INFO_REQUEST = /\/api\/redux\/Navigation\/Batch\/allInfo/;
const ALL_VISUALIZATIONS_REQUEST = /\/api\/redux\/Navigation\/Batch\/allVisualizations$/;

const VIEW = "#workbench-reduction";
const pane = (page, side) => page.locator(`${VIEW}-${side}`);
const typeButton = (page, side) => page.locator(`#workbench-${side}-type-button`);

/** The pictures of SAT and 3SAT as the local build's catalog lists them, the default first. */
const PICTURES = {
  SAT: [
    ["SatDefaultVisualization", "SAT Visualization", "GroupedGraph"],
    ["SatFactorGraphVisualization", "SAT Factor Graph", "BipartiteGraph"],
    ["SATGroverVisualization", "SAT Grover", null],
  ],
  SAT3: [
    ["Sat3DefaultVisualization", "3SAT Visualization", "GroupedGraph"],
    ["Sat3FactorGraphVisualization", "3SAT Factor Graph", "BipartiteGraph"],
    ["Sat3SearchTreeVisualization", "3SAT Search Tree", "SearchTree"],
  ],
};

/** The capture with the echo a #912 backend adds to a view drawn with both defaults. */
const DEFAULT_VIEW = {
  ...SAT_TO_3SAT_VIEW,
  source: { ...SAT_TO_3SAT_VIEW.source, visualization: "SatDefaultVisualization" },
  target: {
    ...SAT_TO_3SAT_VIEW.target,
    visualization: "Sat3DefaultVisualization",
    buildReveal: "pieces",
  },
};
const BY_TARGET = {
  Sat3FactorGraphVisualization: SAT_TO_3SAT_FACTOR_GRAPH_VIEW,
  Sat3SearchTreeVisualization: SAT_TO_3SAT_SEARCH_TREE_VIEW,
};

/** Lists SAT's and 3SAT's pictures in the catalog, with their picture types. */
async function listPictures(page) {
  await page.route(ALL_INFO_REQUEST, async (route) => {
    const response = await route.fetch();
    const info = await response.json();
    for (const pictures of Object.values(PICTURES)) {
      for (const [className, name, pictureType] of pictures) {
        info[className] = {
          visualizationName: name,
          visualizationDefinition: "",
          visualizationType: "BooleanSatisfiability",
          ...(info[className] ?? {}),
          pictureType,
        };
      }
    }
    await route.fulfill({ response, json: info });
  });
  await page.route(ALL_VISUALIZATIONS_REQUEST, async (route) => {
    const response = await route.fetch();
    const lists = await response.json();
    for (const [code, pictures] of Object.entries(PICTURES)) {
      lists[code] = pictures.map(([className]) => className);
    }
    await route.fulfill({ response, json: lists });
  });
}

/**
 * Answers reductionView from the captures by the pictures asked for (`older` answers the default
 * capture with no echo, as a backend older than #912 does), each after `delays[className]` ms.
 * Returns the requests' query strings.
 */
async function answerViews(page, { older = false, delays = {} } = {}) {
  const asked = [];
  await page.route(REDUCTION_VIEW_REQUEST, async (route) => {
    const url = new URL(route.request().url());
    const source = url.searchParams.get("sourceVisualization");
    const target = url.searchParams.get("targetVisualization");
    asked.push({ source, target });
    let view = DEFAULT_VIEW;
    if (older) view = SAT_TO_3SAT_VIEW;
    // No capture has both sides switched: a switched source wins, so the view says the target
    // went back to its default (and the dropdown follows what it says).
    else if (source === "SatFactorGraphVisualization") view = SAT_FACTOR_GRAPH_TO_3SAT_VIEW;
    else if (BY_TARGET[target]) view = BY_TARGET[target];
    const delay = delays[target] ?? delays[source] ?? 0;
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    try {
      await route.fulfill({ json: view });
    } catch {
      // The page gave up on it (a later choice aborted it).
    }
  });
  return asked;
}

/** Opens SAT in Reduce mode with 3SAT chosen and runs it. */
async function runSatTo3sat(page) {
  await page.goto(`/SAT?instance=${encodeURIComponent(SAT_TO_3SAT_VIEW.source.instance)}`);
  await expect(page.getByRole("heading", { level: 1, name: "SAT" })).toBeVisible({
    timeout: 20_000,
  });
  await page.locator("#workbench-mode-reduce").click();
  const current = ((await page.locator("#workbench-target-value").textContent()) ?? "").trim();
  if (!/^3SAT/.test(current)) {
    await page.locator("#workbench-target-button").click();
    await page
      .locator("#workbench-target-listbox")
      .getByRole("option")
      .filter({ hasText: /^3SAT/ })
      .first()
      .click();
  }
  await page.locator("#workbench-run").click();
  await expect(page.locator(VIEW)).toBeVisible();
  await expect(page.locator(VIEW)).toHaveAttribute("data-loading", "false");
}

/** The option names a side's dropdown lists. */
async function optionNames(page, side) {
  await typeButton(page, side).click();
  const listbox = page.locator(`#workbench-${side}-type-listbox`);
  await expect(listbox).toBeVisible();
  const names = await listbox.getByRole("option").allTextContents();
  await page.keyboard.press("Escape");
  return names;
}

/** Picks a side's picture by its name. */
async function pick(page, side, name) {
  await typeButton(page, side).click();
  await page.locator(`#workbench-${side}-type-listbox`).getByRole("option", { name }).click();
}

test.beforeEach(async ({ page }) => {
  await listPictures(page);
});

test("the 3SAT pane switches between its Grouped Graph, Factor Graph and Search Tree", async ({
  page,
}) => {
  const asked = await answerViews(page);
  await runSatTo3sat(page);
  await expect(page.locator(VIEW)).toHaveAttribute(
    "data-target-visualization",
    "Sat3DefaultVisualization",
  );
  // Only the pictures the view can draw can be chosen: all three on the target. SAT's Grover (no
  // frames picture) is listed last on the source's, greyed, saying why, and can't be picked
  // (#239).
  const targets = await optionNames(page, "target");
  expect(targets).toHaveLength(3);
  expect(targets.join("|")).toMatch(/3SAT Visualization.*3SAT Factor Graph.*3SAT Search Tree/);
  const sources = await optionNames(page, "source");
  expect(sources).toHaveLength(3);
  expect(sources[2]).toContain("Grover");
  await typeButton(page, "source").click();
  const grover = page
    .locator("#workbench-source-type-listbox")
    .getByRole("option", { name: /Grover/ });
  await expect(grover).toHaveAttribute("aria-disabled", "true");
  await expect(grover).toContainText("The Reduction View can't draw this picture yet.");
  await grover.click({ force: true });
  await expect(page.locator("#workbench-source-type-listbox")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(VIEW)).toHaveAttribute(
    "data-source-visualization",
    "SatDefaultVisualization",
  );

  for (const [name, className, type] of [
    ["3SAT Factor Graph", "Sat3FactorGraphVisualization", "BipartiteGraph"],
    ["3SAT Search Tree", "Sat3SearchTreeVisualization", "SearchTree"],
    ["3SAT Visualization", "Sat3DefaultVisualization", "GroupedGraph"],
  ]) {
    await pick(page, "target", name);
    await expect(page.locator(VIEW)).toHaveAttribute("data-target-visualization", className);
    await expect(pane(page, "target")).toHaveAttribute("data-picture-type", type);
    await expect(typeButton(page, "target")).toContainText(name);
    expect(asked.at(-1).target).toBe(className);
  }
  // The source kept its picture throughout.
  await expect(pane(page, "source")).toHaveAttribute("data-picture-type", "GroupedGraph");
});

test("a target picture without the build's pieces is shown whole during Build, with a note", async ({
  page,
}) => {
  await answerViews(page);
  await runSatTo3sat(page);
  await expect(page.locator(VIEW)).toHaveAttribute("data-build-reveal", "pieces");
  await expect(pane(page, "target")).not.toHaveAttribute("data-hidden-count", "0");
  await expect(page.locator(`${VIEW}-target-note`)).toHaveCount(0);

  await pick(page, "target", "3SAT Factor Graph");
  await expect(page.locator(VIEW)).toHaveAttribute("data-build-reveal", "whole");
  await expect(page.locator(VIEW)).toHaveAttribute("data-phase", "build");
  await expect(pane(page, "target")).toHaveAttribute("data-hidden-count", "0");
  await expect(page.locator(`${VIEW}-target-note`)).toContainText("shows it whole");

  await pick(page, "target", "3SAT Search Tree");
  await expect(page.locator(`${VIEW}-target-note`)).toContainText("grows when the solver runs");
  // Past Build that note goes. A Search Tree draws none of the pieces the gadgets name, so the
  // pane keeps saying links can't be shown there (#239).
  await page.locator("#workbench-phases-solve").click();
  await expect(page.locator(`${VIEW}-target-note`)).not.toContainText("grows when the solver runs");
  await expect(page.locator(`${VIEW}-target-note`)).toContainText(
    "Gadget links can't be shown on this picture",
  );
});

test("switching a picture keeps the phase and the step in it", async ({ page }) => {
  await answerViews(page);
  await runSatTo3sat(page);
  await page.locator("#workbench-phases-solve").click();
  const start = Number(await page.locator(VIEW).getAttribute("data-frame-index"));
  await page.locator("#workbench-steps-next").click();
  await page.locator("#workbench-steps-next").click();
  await expect(page.locator(VIEW)).toHaveAttribute("data-frame-index", String(start + 2));
  const caption = await page.locator(`${VIEW}-caption-phase`).textContent();

  await pick(page, "target", "3SAT Search Tree");
  await expect(page.locator(VIEW)).toHaveAttribute(
    "data-target-visualization",
    "Sat3SearchTreeVisualization",
  );
  await expect(page.locator(VIEW)).toHaveAttribute("data-phase", "solve");
  await expect(page.locator(VIEW)).toHaveAttribute("data-frame-index", String(start + 2));
  await expect(page.locator(`${VIEW}-caption-phase`)).toHaveText(caption);

  // The source side too.
  await pick(page, "source", "SAT Factor Graph");
  await expect(page.locator(VIEW)).toHaveAttribute(
    "data-source-visualization",
    "SatFactorGraphVisualization",
  );
  await expect(pane(page, "source")).toHaveAttribute("data-picture-type", "BipartiteGraph");
  await expect(page.locator(VIEW)).toHaveAttribute("data-phase", "solve");
  // That capture drew the target with its default, and the target's dropdown says so.
  await expect(page.locator(VIEW)).toHaveAttribute(
    "data-target-visualization",
    "Sat3DefaultVisualization",
  );
  await expect(typeButton(page, "target")).toContainText("3SAT Visualization");
});

test("while another picture is drawn the panes say so, and a later choice wins over a slower one", async ({
  page,
}) => {
  // The first pick's request is aborted by the second, on purpose.
  page.allowNetworkFailures();
  const asked = await answerViews(page, { delays: { Sat3FactorGraphVisualization: 3_000 } });
  await runSatTo3sat(page);

  await pick(page, "target", "3SAT Factor Graph");
  await expect(page.locator(VIEW)).toHaveAttribute("data-loading", "true");
  await expect(pane(page, "target")).toHaveAttribute("data-loading", "true");
  await expect(pane(page, "target")).toContainText("3SAT Factor Graph");
  // No old picture under the loading line, and no steps to walk.
  await expect(page.locator(`${VIEW} svg[id$="-svg"]`)).toHaveCount(0);
  await expect(page.locator("#workbench-steps-next")).toHaveCount(0);

  // A second choice before the first answers: the first answer, when it comes, is dropped.
  await pick(page, "target", "3SAT Search Tree");
  await expect(page.locator(VIEW)).toHaveAttribute("data-loading", "false");
  await expect(page.locator(VIEW)).toHaveAttribute(
    "data-target-visualization",
    "Sat3SearchTreeVisualization",
  );
  await page.waitForTimeout(3_500);
  await expect(page.locator(VIEW)).toHaveAttribute(
    "data-target-visualization",
    "Sat3SearchTreeVisualization",
  );
  await expect(typeButton(page, "target")).toContainText("3SAT Search Tree");
  // Run asked for the target's default (no pick yet), then the two picks.
  expect(asked.map((request) => request.target)).toEqual([
    null,
    "Sat3FactorGraphVisualization",
    "Sat3SearchTreeVisualization",
  ]);
});

test("a picture picked before Run is the one the view is drawn with", async ({ page }) => {
  const asked = await answerViews(page);
  await page.goto(`/SAT?instance=${encodeURIComponent(SAT_TO_3SAT_VIEW.source.instance)}`);
  await expect(page.getByRole("heading", { level: 1, name: "SAT" })).toBeVisible({
    timeout: 20_000,
  });
  await pick(page, "source", "SAT Factor Graph");
  await page.locator("#workbench-mode-reduce").click();
  const current = ((await page.locator("#workbench-target-value").textContent()) ?? "").trim();
  if (!/^3SAT/.test(current)) {
    await page.locator("#workbench-target-button").click();
    await page
      .locator("#workbench-target-listbox")
      .getByRole("option")
      .filter({ hasText: /^3SAT/ })
      .first()
      .click();
  }
  await page.locator("#workbench-run").click();
  await expect(page.locator(VIEW)).toHaveAttribute(
    "data-source-visualization",
    "SatFactorGraphVisualization",
  );
  expect(asked[0].source).toBe("SatFactorGraphVisualization");
});

test("a backend that ignores the choice gets a fixed dropdown naming what it drew", async ({
  page,
}) => {
  const asked = await answerViews(page, { older: true });
  await runSatTo3sat(page);
  await expect(page.locator(VIEW)).toHaveAttribute("data-target-visualization", "");
  // The capture names no picture, so each dropdown names the side's default and can't open.
  await expect(typeButton(page, "target")).toContainText("3SAT Visualization");
  await expect(typeButton(page, "target")).toBeDisabled();
  await expect(typeButton(page, "source")).toContainText("SAT Visualization");
  await expect(typeButton(page, "source")).toBeDisabled();
  expect(asked).toHaveLength(1);
});
