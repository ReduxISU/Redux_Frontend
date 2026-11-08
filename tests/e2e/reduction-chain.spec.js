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

import { EXACT_COVER_TO_PARTITION_CHAIN, WEIGHTED_CUT_HOP_FAILED } from "./chain-payloads";
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

    // It opens on the end: hop 1's last Map back, with what came back to Exact Cover.
    await expect(header(page)).toHaveAttribute("data-current-hop", "1");
    await expect(page.locator("#workbench-chain-end")).toHaveText(
      "The answer carried back to Exact Cover checks out: it is a valid Exact Cover answer.",
    );
    await expect(caption(page)).toHaveText("{{1},{2,3}} is a valid Exact Cover answer.");
    await expect(page.locator("#workbench-result-chain-answer")).toHaveText("{{1},{2,3}}");

    // The first step: hop 1's Build.
    await toStep(page, 0);
    await expect(header(page)).toHaveAttribute("data-current-hop", "1");
    await expect(page.locator("#workbench-chain-hop-1")).toHaveAttribute("aria-current", "step");
    await expect(page.locator("#workbench-phases")).toHaveAttribute("data-current-phase", "build");
    await expect(page.locator("#workbench-chain-end")).toHaveCount(0);

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

    // The hop buttons jump to a hop's first step.
    await page.locator("#workbench-chain-hop-2").click();
    await expect(header(page)).toHaveAttribute("data-current-hop", "2");
    await expect(page.locator("#workbench-phases")).toHaveAttribute("data-current-phase", "build");

    // The end again.
    const slider = page.locator('#workbench-steps-slider input[type="range"]');
    await slider.focus();
    await page.keyboard.press("End");
    await expect(page.locator("#workbench-chain-end")).toContainText("checks out");
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
