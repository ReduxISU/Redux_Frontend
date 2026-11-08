// tests/e2e/reduction-chain.spec.js
//
// Chains of reductions in Reduce mode. After the direct reductions, the To dropdown lists the
// problems reached only through a chain (from Navigation/Reductions), each naming its route.
// Choosing one and pressing Run the chain asks ProblemProvider/reductionChainView with the route
// as `path`, then one step control walks the whole chain: every hop's Build, the last hop's Solve
// and Map back, then each earlier hop's handoff and Map back. The chain's header names it and
// marks the hop on screen; at the end it says whether the answer carried back checked out.
//
// The catalog comes from the backend behind the suite, like the rest of it. No published
// backend serves chains yet, so the chain's answers are captures from a local build
// (./chain-payloads.js). A backend whose reduction graph lacks Exact Cover -> Subset Sum ->
// Partition (CI's, today) skips these tests.

import {
  EXACT_COVER_TO_PARTITION_CHAIN,
  EXACT_COVER_TO_WEIGHTED_CUT_CHAIN,
  WEIGHTED_CUT_HOP_FAILED,
} from "./chain-payloads";
import { expect, test } from "./fixtures";

const CHAIN_REQUEST = /\/api\/redux\/ProblemProvider\/reductionChainView\?/;
const REDUCTION_VIEW_REQUEST = /\/api\/redux\/ProblemProvider\/reductionView\?/;
const INSTANCE = "({1,2,3},{{1},{2,3},{1,2}})";
const PARTITION_ROUTE = "Partition — via Subset Sum (2 steps)";
const WEIGHTED_CUT_ROUTE = "Weighted Cut — via Subset Sum and Partition (3 steps)";

const header = (page) => page.locator("#workbench-chain");
const view = (page) => page.locator("#workbench-reduction");
const caption = (page) => page.locator("#workbench-reduction-caption-text");

/** Skips the test when the backend's reduction graph has no Exact Cover -> Subset Sum -> Partition. */
async function needsChain(page) {
  const response = await page.request.get("/api/redux/Navigation/Reductions");
  const graph = response.ok() ? await response.json() : {};
  test.skip(
    !graph.EXACTCOVER?.SUBSETSUM || !graph.SUBSETSUM?.PARTITION || !graph.PARTITION?.WEIGHTEDCUT,
    "This backend's reduction graph has no Exact Cover -> Subset Sum -> Partition -> Weighted Cut.",
  );
}

/** Opens Exact Cover on INSTANCE in Reduce mode and picks the To option labelled `label`. */
async function openTarget(page, label) {
  await page.goto(`/${encodeURIComponent("Exact Cover")}?instance=${encodeURIComponent(INSTANCE)}`);
  await expect(page.getByRole("heading", { level: 1, name: "Exact Cover" })).toBeVisible({
    timeout: 20_000,
  });
  await page.locator("#workbench-mode-reduce").click();
  await page.locator("#workbench-target-button").click();
  await page
    .locator("#workbench-target-listbox")
    .getByRole("option")
    .filter({ hasText: label })
    .first()
    .click();
  await expect(page.locator("#workbench-target-value")).toHaveText(label);
}

/** The Start and end stop is on screen: both pictures, its caption, its stop marked. */
async function expectSummary(page) {
  await expect(header(page)).toHaveAttribute("data-summary", "true");
  await expect(page.locator("#workbench-chain-summary")).toHaveAttribute("aria-current", "step");
  await expect(view(page)).toHaveAttribute("data-phase", "summary");
  await expect(view(page).locator("#workbench-reduction-source-pane")).toContainText("Exact Cover");
  await expect(view(page).locator("#workbench-reduction-target-pane")).toContainText("Partition");
  await expect(caption(page)).toHaveText(
    "Exact Cover's answer {{1},{2,3}} came from solving Partition and carrying the answer back through Subset Sum. It checks out: it is a valid Exact Cover answer.",
  );
}

/** A piece on one side of the Reduction View, by its id, whatever attribute marks it. */
function piece(page, side, id) {
  const marks = ["data-node-id", "data-item-id", "data-element-id", "data-piece-id"];
  return page
    .locator(`#workbench-reduction-${side}`)
    .locator(marks.map((mark) => `[${mark}="${id}"]`).join(","))
    .first();
}

/** The ids of the pieces marked as linked on one side. */
function hotIds(page, side) {
  return page
    .locator(`#workbench-reduction-${side} [data-rv-link="hot"]`)
    .evaluateAll((elements) =>
      elements.flatMap((element) =>
        [...element.attributes]
          .filter((attribute) => /^data-[a-z]+-id$/.test(attribute.name))
          .map((attribute) => attribute.value),
      ),
    );
}

/** Whether a stop lies wholly inside the route's visible line. */
function inRoute(stop) {
  return stop.evaluate((button) => {
    const box = button.getBoundingClientRect();
    const line = button.closest("ol").getBoundingClientRect();
    return box.left >= line.left - 1 && box.right <= line.right + 1;
  });
}

/** The step controls to `index` (0-based), by the slider's keyboard. */
async function toStep(page, index) {
  const slider = page.locator('#workbench-steps-slider input[type="range"]');
  await slider.focus();
  await page.keyboard.press("Home");
  for (let i = 0; i < index; i += 1) await page.keyboard.press("ArrowRight");
}

test.describe("Reduce mode: chains of reductions", () => {
  test.beforeEach(async ({ page }) => {
    await needsChain(page);
  });

  test("lists chained targets after the direct ones, each with its route", async ({ page }) => {
    await page.goto(`/${encodeURIComponent("Exact Cover")}`);
    await expect(page.getByRole("heading", { level: 1, name: "Exact Cover" })).toBeVisible({
      timeout: 20_000,
    });
    await page.locator("#workbench-mode-reduce").click();
    await page.locator("#workbench-target-button").click();
    const options = page.locator("#workbench-target-listbox").getByRole("option");
    const labels = (await options.allTextContents()).map((text) => text.trim());
    const direct = labels.findIndex((text) => text.startsWith("Subset Sum"));
    const chained = labels.findIndex((text) => text.startsWith(PARTITION_ROUTE));
    expect(direct).toBeGreaterThanOrEqual(0);
    expect(chained).toBeGreaterThan(direct);
    expect(labels.some((text) => text.startsWith(WEIGHTED_CUT_ROUTE))).toBe(true);
  });

  test("runs the chain and steps from hop 1 to hop 2 and back through the handoff", async ({
    page,
  }) => {
    const asked = [];
    await page.route(CHAIN_REQUEST, (route) => {
      asked.push({ url: route.request().url(), body: route.request().postData() });
      return route.fulfill({ json: EXACT_COVER_TO_PARTITION_CHAIN });
    });
    await openTarget(page, PARTITION_ROUTE);
    // A chain has no Reduce / Solve / Verify stepper: one button runs all of it.
    await expect(page.locator("#workbench-stages")).toHaveCount(0);
    await expect(page.locator("#workbench-reduction-value")).toHaveText(
      "Karp's Subset Sum Reduction, then Partition Reduction",
    );
    const run = page.locator("#workbench-run");
    await expect(run).toHaveText("Run the chain");
    await run.click();

    await expect(header(page)).toBeVisible();
    expect(asked).toHaveLength(1);
    expect(new URL(asked[0].url).searchParams.get("Path")).toBe(
      "KarpExactCoverToSubsetSum,SubsetSumToPartitionReduction",
    );
    expect(JSON.parse(asked[0].body)).toBe(INSTANCE);
    await expect(page.locator("#workbench-chain-title")).toHaveText(
      "Exact Cover → Subset Sum → Partition",
    );
    // Done: the button can't change the result until an input changes.
    await expect(run).toHaveText("Reduced");

    // It opens on the last stop, Start and end: Exact Cover with the answer carried back,
    // beside Partition solved.
    await expectSummary(page);
    await expect(page.locator("#workbench-steps-position")).toContainText("33 of 33");
    // On a wide screen the whole route fits: full labels, no fades.
    const route = page.locator("#workbench-chain-route");
    await expect(route).toHaveAttribute("data-compact", "false");
    await expect(route).toHaveAttribute("data-fade-left", "false");
    await expect(route).toHaveAttribute("data-fade-right", "false");
    await expect(page.locator("#workbench-chain-hop-1")).toHaveText("1 · Exact Cover → Subset Sum");
    await expect(page.locator("#workbench-result-chain-answer")).toHaveText("{{1},{2,3}}");

    // The first step: hop 1's Build.
    await toStep(page, 0);
    await expect(header(page)).toHaveAttribute("data-current-hop", "1");
    await expect(page.locator("#workbench-chain-hop-1")).toHaveAttribute("aria-current", "step");
    await expect(page.locator("#workbench-phases")).toHaveAttribute("data-current-phase", "build");
    await expect(header(page)).toHaveAttribute("data-summary", "false");

    // Hop 1 has 4 Build frames; the 5th step is hop 2's first Build.
    await toStep(page, 4);
    await expect(header(page)).toHaveAttribute("data-current-hop", "2");
    await expect(page.locator("#workbench-chain-hop-2")).toHaveAttribute("aria-current", "step");
    await expect(view(page).locator("#workbench-reduction-target-pane")).toContainText("Partition");
    // Hop 2 is the last: it solves.
    await expect(page.locator("#workbench-phases-solve")).toBeEnabled();
    await page.locator("#workbench-phases-solve").click();
    await expect(page.locator("#workbench-phases")).toHaveAttribute("data-current-phase", "solve");
    await expect(header(page)).toHaveAttribute("data-current-hop", "2");

    // After hop 2's Build (6), Solve (12) and Map back (5): hop 1's handoff, then its Map back.
    await toStep(page, 4 + 6 + 12 + 5);
    await expect(header(page)).toHaveAttribute("data-current-hop", "1");
    await expect(page.locator("#workbench-phases")).toHaveAttribute(
      "data-current-phase",
      "handoff",
    );
    await expect(page.locator("#workbench-phases-handoff")).toHaveText(/Answer handed back/);
    await expect(caption(page)).toHaveText(
      "The answer from Partition, mapped back to Subset Sum: {1,20}.",
    );
    await page.keyboard.press("ArrowRight");
    await expect(page.locator("#workbench-phases")).toHaveAttribute("data-current-phase", "map");

    // Hop 1's last Map back, then the scrubber's last step: Start and end.
    await toStep(page, 31);
    await expect(caption(page)).toHaveText("{{1},{2,3}} is a valid Exact Cover answer.");
    await page.keyboard.press("ArrowRight");
    await expectSummary(page);

    // The hop buttons jump to a hop's first step, and the route's last stop to Start and end.
    await page.locator("#workbench-chain-hop-2").click();
    await expect(header(page)).toHaveAttribute("data-current-hop", "2");
    await expect(page.locator("#workbench-phases")).toHaveAttribute("data-current-phase", "build");
    await page.locator("#workbench-chain-summary").click();
    await expectSummary(page);
  });

  test("Start and end links Exact Cover's pieces straight to Partition's", async ({ page }) => {
    await page.route(CHAIN_REQUEST, (route) =>
      route.fulfill({ json: EXACT_COVER_TO_PARTITION_CHAIN }),
    );
    await openTarget(page, PARTITION_ROUTE);
    await page.locator("#workbench-run").click();
    await expectSummary(page);
    // Set S1 became Subset Sum's number I1, which became Partition's number I1.
    await piece(page, "source", "S1").hover();
    await expect(view(page)).toHaveAttribute("data-linked", "true");
    await expect.poll(() => hotIds(page, "target")).toContain("I1");
    expect(await hotIds(page, "target")).not.toContain("I2");
    // The other way: Partition's I2 leads back to set S2.
    await page.mouse.move(0, 0);
    await piece(page, "target", "I2").hover();
    await expect.poll(() => hotIds(page, "source")).toContain("S2");
    expect(await hotIds(page, "source")).not.toContain("S1");
  });

  test("on a narrow screen the route stays on one line and scrolls to the stop on screen", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 420, height: 1000 });
    await page.route(CHAIN_REQUEST, (route) =>
      route.fulfill({ json: EXACT_COVER_TO_WEIGHTED_CUT_CHAIN }),
    );
    await openTarget(page, WEIGHTED_CUT_ROUTE);
    await page.locator("#workbench-run").click();
    await expect(header(page)).toHaveAttribute("data-summary", "true");

    const route = page.locator("#workbench-chain-route");
    const stops = page.locator("#workbench-chain-stops button");
    await expect(stops).toHaveCount(4);
    // One line: every stop's top is the same.
    const tops = await stops.evaluateAll((buttons) =>
      buttons.map((button) => Math.round(button.getBoundingClientRect().top)),
    );
    expect(new Set(tops).size).toBe(1);
    // Too long to fit: the stops not on screen are compact, their names still full.
    await expect(route).toHaveAttribute("data-compact", "true");
    const first = page.locator("#workbench-chain-hop-1");
    const summary = page.locator("#workbench-chain-summary");
    await expect(first).toHaveText("1 → Subset Sum");
    await expect(first).toHaveAccessibleName("1 · Exact Cover → Subset Sum");
    await expect(summary).toHaveText("Start and end · Exact Cover ↔ Weighted Cut");
    await expect(page.locator("#workbench-chain-stops")).toHaveAccessibleName(
      /^Chain route: 1 · Exact Cover → Subset Sum, then 2 · Subset Sum → Partition/,
    );

    // It opens on Start and end, scrolled to the end: only the left edge fades.
    await expect.poll(() => inRoute(summary)).toBe(true);
    await expect(route).toHaveAttribute("data-fade-left", "true");
    await expect(route).toHaveAttribute("data-fade-right", "false");
    await expect(page.locator("#workbench-chain-fade-left")).toBeVisible();

    // The first step scrolls the route back to its start: now only the right edge fades.
    await toStep(page, 0);
    await expect(header(page)).toHaveAttribute("data-current-hop", "1");
    await expect(first).toHaveText("1 · Exact Cover → Subset Sum");
    await expect.poll(() => inRoute(first)).toBe(true);
    await expect(route).toHaveAttribute("data-fade-right", "true");
    await expect(route).toHaveAttribute("data-fade-left", "false");

    // Stepping on to hop 2 brings it into view.
    await toStep(page, 9);
    await expect(header(page)).toHaveAttribute("data-current-hop", "2");
    await expect.poll(() => inRoute(page.locator("#workbench-chain-hop-2"))).toBe(true);
  });

  test("a step that can't be built says which, in plain words", async ({ page }) => {
    await page.route(CHAIN_REQUEST, (route) =>
      route.fulfill({ status: 400, json: WEIGHTED_CUT_HOP_FAILED }),
    );
    await openTarget(page, WEIGHTED_CUT_ROUTE);
    await page.locator("#workbench-run").click();
    const failure = page.locator("#workbench-chain-run-failure");
    await expect(failure).toContainText("Step 3 (Partition → Weighted Cut) could not be built");
    await expect(failure).toContainText(
      "Each step makes its numbers bigger, so try a smaller Exact Cover instance.",
    );
    await expect(header(page)).toHaveCount(0);
  });

  test("a backend without chains says so and the direct reductions still work", async ({
    page,
  }) => {
    // The fixture answers reductionChainView 404, as a backend without it does.
    await openTarget(page, PARTITION_ROUTE);
    await page.locator("#workbench-run").click();
    await expect(page.locator("#workbench-chain-run-failure")).toContainText(
      "Chains need a newer Redux backend",
    );
    await expect(page.locator("#workbench-run")).toBeDisabled();

    // The chained targets stay listed, greyed, saying why.
    await page.locator("#workbench-target-button").click();
    const listbox = page.locator("#workbench-target-listbox");
    await expect(
      listbox.getByRole("option").filter({ hasText: PARTITION_ROUTE }).first(),
    ).toHaveAttribute("aria-disabled", "true");

    // The direct reduction: its Reduction View (hop 1 of the capture, a reductionView body).
    const [hop] = EXACT_COVER_TO_PARTITION_CHAIN.hops;
    const direct = { ...hop, frames: hop.frames.filter((frame) => frame.phase !== "handoff") };
    await page.route(REDUCTION_VIEW_REQUEST, (route) => route.fulfill({ json: direct }));
    await listbox
      .getByRole("option")
      .filter({ hasText: /^Subset Sum/ })
      .first()
      .click();
    await expect(page.locator("#workbench-stages")).toBeVisible();
    await expect(page.locator("#workbench-run")).toHaveText("Reduce");
    await page.locator("#workbench-run").click();
    await expect(page.locator("#workbench-stage-solve")).toHaveAttribute("aria-current", "step");
    await expect(view(page)).toHaveAttribute("data-phase", "build");
    await expect(header(page)).toHaveCount(0);
  });
});
