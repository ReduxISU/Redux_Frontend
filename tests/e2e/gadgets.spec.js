// tests/e2e/gadgets.spec.js
//
// #229 stage 4: the Gadgets section, under the pictures in the Workspace's Visualization section
// since #279 (it was at the bottom of the Result panel), in Reduce mode. Hidden
// when the reduction lists no gadgets (or the backend sends none, or only legacy entries),
// closed by default, grouped by kind with counts, "Show all n" past ten rows, and hovering or
// focusing a row highlighting that gadget's pieces on the source and target pictures.
//
// The catalog comes from the real backend, like the rest of the suite. Every compute request
// is answered here with payloads captured from a real Redux backend (./gadget-payloads.js),
// for the reasons workbench.spec.js gives (these tests are about the page's state, and the
// proxy allows only 10 compute requests a minute), and because upstream Redux does not send
// gadgets with their kinds yet.

import { GADGET_KINDS, GADGETS_INTRO } from "../../data/gadgetKinds";
import { expect, test } from "./fixtures";
import { GADGET_PAYLOADS } from "./gadget-payloads";
import { showPane } from "./helpers";

const VISUALIZE_REQUEST = /\/api\/redux\/ProblemProvider\/visualize\?/;
const VISUALIZE_REDUCTION_REQUEST = /\/api\/redux\/ProblemProvider\/visualizeReduction/;
const SOLVE_REQUEST = /\/api\/redux\/ProblemProvider\/solve/;
const REDUCE_REQUEST = /\/api\/redux\/ProblemProvider\/reduce\?/;

const SAT3 = GADGET_PAYLOADS.sat3ToClique;
const CLIQUE = GADGET_PAYLOADS.cliqueToVertexCover;
const labelOf = (kind) => GADGET_KINDS.find((entry) => entry.kind === kind).label;

/**
 * Answers every compute request with one captured case. `reduceBody` replaces the reduce
 * answer (to drop or empty the gadgets); it is read on every request, so a test can change it
 * between runs.
 */
async function answerCompute(page, payload, reduceBody = () => payload.reduce) {
  // #279 stage 2: Reduce only builds, so the target is drawn as the default picture of the
  // instance it built: the captured reduction's last (target) frame.
  await page.route(VISUALIZE_REQUEST, (route) =>
    route.fulfill({
      json:
        route.request().postDataJSON() === payload.instance
          ? payload.visualize
          : [payload.visualizeReduction.at(-1)],
    }),
  );
  await page.route(SOLVE_REQUEST, (route) => route.fulfill({ json: payload.answer }));
  await page.route(VISUALIZE_REDUCTION_REQUEST, (route) =>
    route.fulfill({ json: payload.visualizeReduction }),
  );
  await page.route(REDUCE_REQUEST, (route) => route.fulfill({ json: reduceBody() }));
}

/** Opens the problem on `instance`, switches to Reduce mode and picks the target by name. */
async function openReduce(page, problem, instance, targetPattern) {
  await page.goto(`/${encodeURIComponent(problem)}?instance=${encodeURIComponent(instance)}`);
  await expect(page.getByRole("heading", { level: 1, name: problem })).toBeVisible({
    timeout: 20_000,
  });
  await page.locator("#workbench-mode-reduce").click();
  const current = ((await page.locator("#workbench-target-value").textContent()) ?? "").trim();
  if (!targetPattern.test(current)) {
    await page.locator("#workbench-target-button").click();
    await page
      .locator("#workbench-target-listbox")
      .getByRole("option")
      .filter({ hasText: targetPattern })
      .first()
      .click();
  }
  await expect(page.locator("#workbench-target-value")).toHaveText(targetPattern);
}

async function runReduction(page) {
  await page.locator("#workbench-run").click();
  await expect(page.locator("#workbench-target-picture")).toHaveAttribute(
    "data-picture-kind",
    "frame",
  );
}

const section = (page) => page.locator("#workbench-gadgets");
const toggle = (page) => page.locator("#workbench-gadgets-toggle");
const row = (page, index) => page.locator(`#workbench-gadgets-row-${index}`);
const sourcePicture = (page) => page.locator("#workbench-source-picture");
const targetPicture = (page) => page.locator("#workbench-target-picture");

/** Index of the first gadget of `kind` whose source ids include `sourceId`. */
function gadgetIndex(payload, kind, sourceId) {
  return payload.reduce.gadgets
    .filter((gadget) => typeof gadget.gadgetKind === "string")
    .findIndex((gadget) => gadget.gadgetKind === kind && gadget.sourceIds.includes(sourceId));
}

test("the Gadgets section is hidden when the reduction sends no gadgets", async ({ page }) => {
  let reduceBody = SAT3.reduce;
  await answerCompute(page, SAT3, () => reduceBody);
  await openReduce(page, "3SAT", SAT3.instance, /clique/i);
  await runReduction(page);
  await showPane(page, "visualization", { expect });
  await expect(section(page)).toBeVisible();

  // Each case runs after a run that showed the section, so "hidden" is a real change, not
  // a check that passes before the new run's answer arrives.
  const withoutGadgets = [
    // No `gadgets` field at all (upstream Redux today).
    { reductionTo: SAT3.reduce.reductionTo },
    // An empty list.
    { ...SAT3.reduce, gadgets: [] },
    // Only legacy entries (color and the old id lists, no gadgetKind).
    {
      ...SAT3.reduce,
      gadgets: SAT3.reduce.gadgets.map(({ color, reductionFromIds, reductionToIds }) => ({
        color,
        reductionFromIds,
        reductionToIds,
      })),
    },
  ];
  for (const body of withoutGadgets) {
    reduceBody = body;
    await page.locator("#workbench-run").click();
    await expect(section(page)).toHaveCount(0);
    await expect(page.locator("#workbench-result-reduce")).toBeVisible();
    await expect(page.locator("#workbench-run")).toBeEnabled();

    reduceBody = SAT3.reduce;
    await page.locator("#workbench-run").click();
    await expect(section(page)).toBeVisible();
    await expect(page.locator("#workbench-run")).toBeEnabled();
  }
});

test("Gadgets is closed by default and groups the gadgets by kind with counts", async ({
  page,
}) => {
  await answerCompute(page, CLIQUE);
  await openReduce(page, "Clique", CLIQUE.instance, /vertex cover/i);
  await runReduction(page);
  await showPane(page, "visualization", { expect });

  const total = CLIQUE.reduce.gadgets.length;
  await expect(toggle(page)).toHaveText(`Gadgets (${total})`);
  await expect(toggle(page)).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#workbench-gadgets-body")).toBeHidden();

  await toggle(page).click();
  await expect(toggle(page)).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#workbench-gadgets-intro")).toHaveText(GADGETS_INTRO);

  // Bounds, Edge rules, Elements, in that order, each with its count and explanation.
  const groups = page.locator("#workbench-gadgets-body [data-gadget-kind]");
  await expect(groups).toHaveCount(3);
  const expected = ["bound", "edgeRule", "element"];
  for (const [position, kind] of expected.entries()) {
    const count = CLIQUE.reduce.gadgets.filter((gadget) => gadget.gadgetKind === kind).length;
    const group = groups.nth(position);
    await expect(group).toHaveAttribute("data-gadget-kind", kind);
    await expect(group.locator(`#workbench-gadgets-group-${kind}-label`)).toHaveText(labelOf(kind));
    await expect(group.locator(`#workbench-gadgets-group-${kind}-count`)).toHaveText(
      `${count} ${count === 1 ? "gadget" : "gadgets"}`,
    );
    await expect(group.locator(`#workbench-gadgets-group-${kind}-about`)).toHaveText(
      GADGET_KINDS.find((entry) => entry.kind === kind).about,
    );
    await expect(group.locator("li")).toHaveCount(count);
  }

  // #239: a row says its gadget in plain words. A bound names no single piece on either side, so
  // its row is its own note, the formula; so is an edge rule's, its reason. Either is said once.
  const boundIndex = CLIQUE.reduce.gadgets.findIndex((gadget) => gadget.gadgetKind === "bound");
  const bound = CLIQUE.reduce.gadgets[boundIndex];
  await expect(row(page, boundIndex)).toHaveAttribute("aria-label", bound.note);
  await expect(row(page, boundIndex)).toHaveText(bound.note);
  await expect(page.locator(`#workbench-gadgets-row-${boundIndex}-note`)).toHaveCount(0);
  const ruleIndex = gadgetIndex(CLIQUE, "edgeRule", "1");
  const rule = CLIQUE.reduce.gadgets[ruleIndex];
  await expect(row(page, ruleIndex)).toHaveAttribute("aria-label", rule.note);
  await expect(row(page, ruleIndex)).toHaveText(rule.note);
  // An element reads "source becomes target.", and has no note of its own.
  const elementIndex = CLIQUE.reduce.gadgets.findIndex((gadget) => gadget.gadgetKind === "element");
  const element = CLIQUE.reduce.gadgets[elementIndex];
  await expect(row(page, elementIndex)).toHaveAttribute(
    "aria-label",
    `${element.sourceIds.join(", ")} becomes ${element.targetIds.join(", ")}.`,
  );
});

test("a group past ten rows shows ten and a Show all button", async ({ page }) => {
  await answerCompute(page, SAT3);
  await openReduce(page, "3SAT", SAT3.instance, /clique/i);
  await runReduction(page);
  await showPane(page, "visualization", { expect });
  await toggle(page).click();

  const elements = SAT3.reduce.gadgets.filter((gadget) => gadget.gadgetKind === "element");
  const groupsCount = SAT3.reduce.gadgets.filter((gadget) => gadget.gadgetKind === "group");
  expect(elements.length).toBeGreaterThan(10);
  await expect(toggle(page)).toHaveText(`Gadgets (${SAT3.reduce.gadgets.length})`);

  const groupRows = page.locator("#workbench-gadgets-group-group li");
  await expect(groupRows).toHaveCount(groupsCount.length);
  await expect(page.locator("#workbench-gadgets-group-group-more")).toHaveCount(0);
  // The first clause's group reads with the clause's name and its three nodes.
  await expect(groupRows.first()).toHaveAttribute(
    "aria-label",
    `C1 is built as ${groupsCount[0].targetIds.join(", ")}.`,
  );

  const elementRows = page.locator("#workbench-gadgets-group-element li");
  const more = page.locator("#workbench-gadgets-group-element-more");
  await expect(elementRows).toHaveCount(10);
  await expect(more).toHaveText(`Show all ${elements.length}`);
  await expect(more).toHaveAttribute("aria-expanded", "false");
  await more.click();
  await expect(elementRows).toHaveCount(elements.length);
  await expect(more).toHaveText("Show fewer");
  await more.click();
  await expect(elementRows).toHaveCount(10);
});

test("hovering or focusing a row highlights its pieces on both pictures", async ({ page }) => {
  await answerCompute(page, SAT3);
  await openReduce(page, "3SAT", SAT3.instance, /clique/i);
  await runReduction(page);
  await showPane(page, "visualization", { expect });
  await toggle(page).click();

  const highlighted = (picture) => picture.locator('[data-gadget-highlighted="true"]');
  await expect(highlighted(sourcePicture(page))).toHaveCount(0);
  await expect(highlighted(targetPicture(page))).toHaveCount(0);

  // Hovering clause C1's group: the clause on the 3SAT picture (drawn with the older ids, "0"),
  // its three nodes on the CLIQUE picture.
  const groupIndex = gadgetIndex(SAT3, "group", "c0");
  const group = SAT3.reduce.gadgets[groupIndex];
  await row(page, groupIndex).hover();
  await expect(row(page, groupIndex)).toHaveAttribute("data-active", "true");
  await expect(highlighted(sourcePicture(page))).toHaveCount(1);
  await expect(sourcePicture(page).locator('[data-clause-id="0"]')).toHaveAttribute(
    "data-gadget-highlighted",
    "true",
  );
  await expect(highlighted(targetPicture(page))).toHaveCount(group.targetIds.length);
  for (const id of group.targetIds) {
    await expect(targetPicture(page).locator(`[data-node-id="${id}"]`)).toHaveAttribute(
      "data-gadget-highlighted",
      "true",
    );
  }

  // Moving off the row clears it. (Off the panel, too: focusing a row below can scroll the
  // panel, and a row that scrolls under a resting pointer counts as hovered.)
  await page.locator("#workbench-showing").hover();
  await expect(highlighted(sourcePicture(page))).toHaveCount(0);
  await expect(highlighted(targetPicture(page))).toHaveCount(0);

  // Focus follows the keyboard: Tab from one element row to the next moves the highlight.
  const first = gadgetIndex(SAT3, "element", "c0-0");
  const second = gadgetIndex(SAT3, "element", "c0-1");
  await row(page, first).focus();
  await expect(row(page, first)).toHaveAttribute("data-active", "true");
  await expect(sourcePicture(page).locator('[data-literal-id="0-0"]')).toHaveAttribute(
    "data-gadget-highlighted",
    "true",
  );
  await page.keyboard.press("Tab");
  await expect(row(page, second)).toBeFocused();
  await expect(row(page, second)).toHaveAttribute("data-active", "true");
  await expect(highlighted(sourcePicture(page))).toHaveCount(1);
  await expect(sourcePicture(page).locator('[data-literal-id="0-1"]')).toHaveAttribute(
    "data-gadget-highlighted",
    "true",
  );
  const secondTarget = SAT3.reduce.gadgets[second].targetIds[0];
  await expect(highlighted(targetPicture(page))).toHaveCount(1);
  await expect(targetPicture(page).locator(`[data-node-id="${secondTarget}"]`)).toHaveAttribute(
    "data-gadget-highlighted",
    "true",
  );
});

test("an edge rule highlights its node on the source and its edges on the target", async ({
  page,
}) => {
  await answerCompute(page, CLIQUE);
  await openReduce(page, "Clique", CLIQUE.instance, /vertex cover/i);
  await runReduction(page);
  await showPane(page, "visualization", { expect });
  await toggle(page).click();

  const index = gadgetIndex(CLIQUE, "edgeRule", "1");
  const rule = CLIQUE.reduce.gadgets[index];
  await row(page, index).focus();
  await expect(sourcePicture(page)).toHaveAttribute("data-gadget-highlight-count", "1");
  await expect(sourcePicture(page).locator('[data-node-id="1"]')).toHaveAttribute(
    "data-gadget-highlighted",
    "true",
  );
  await expect(targetPicture(page)).toHaveAttribute(
    "data-gadget-highlight-count",
    String(rule.targetIds.length),
  );
  for (const id of rule.targetIds) {
    await expect(targetPicture(page).locator(`[data-link-id="${id}"]`)).toHaveAttribute(
      "data-gadget-highlighted",
      "true",
    );
  }

  // Closing the section takes the highlight off.
  await toggle(page).click();
  await expect(sourcePicture(page).locator('[data-gadget-highlighted="true"]')).toHaveCount(0);
  await expect(targetPicture(page).locator('[data-gadget-highlighted="true"]')).toHaveCount(0);
});

test("a Reduce without a Reduction View draws the target from the instance it built", async ({
  page,
}) => {
  await answerCompute(page, SAT3);
  const drawn = [];
  page.on("request", (request) => {
    if (VISUALIZE_REQUEST.test(request.url())) drawn.push(request.postDataJSON());
  });
  await openReduce(page, "3SAT", SAT3.instance, /clique/i);
  await runReduction(page);
  await expect(targetPicture(page)).not.toContainText("Cannot render");
  await expect(targetPicture(page).locator("svg").first()).toBeVisible();
  expect(drawn).toContain(SAT3.reduce.reductionTo.instance);
});
