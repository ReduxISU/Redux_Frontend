// tests/e2e/tagged-dropdowns.spec.js
//
// #229 stage 2: the workbench's tagged dropdowns (components/workbench/TaggedSelect.js) and
// their info cards. Keyboard operation of the listbox, its ARIA wiring, the chosen option's
// mark, the tags inside the closed box, closing on an outside click and on Tab, the hover card
// beside an open list, the (i) card (role="tooltip", linked with aria-describedby, shown on
// keyboard focus and on a tap, closed by Escape), the right-aligned Visualization Type list,
// and unique ids across every dropdown on the page.
//
// The catalog comes from the real backend; the default picture's compute request is answered
// here, the same way workbench.spec.js does, so these tests never spend the proxy's compute
// budget. Pinned to 3SAT: it has several solvers (so the list has somewhere to move), more than
// one visualization and several reductions.

import { expect, test } from "./fixtures";
import { gotoProblemDetail } from "./helpers";

const PROBLEM = "3SAT";
const VISUALIZE_REQUEST = /\/api\/redux\/ProblemProvider\/visualize\?/;

async function answerDefaultPicture(page) {
  await page.route(VISUALIZE_REQUEST, (route) =>
    route.fulfill({
      json: [
        {
          clauses: [
            {
              id: "0",
              literals: [
                { id: "0-0", literal: "x1", color: "Background" },
                { id: "0-1", literal: "!x2", color: "Background" },
              ],
            },
          ],
        },
      ],
    }),
  );
}

const solverButton = (page) => page.locator("#workbench-solver-button");
const solverList = (page) => page.locator("#workbench-solver-listbox");
const solverOptions = (page) => solverList(page).getByRole("option");

async function optionNames(page) {
  return solverOptions(page).evaluateAll((options) =>
    options.map((option) => document.getElementById(option.id + "-name")?.textContent ?? ""),
  );
}

test.beforeEach(async ({ page }) => {
  await answerDefaultPicture(page);
  await gotoProblemDetail(page, PROBLEM, { expect });
});

test("the Solver dropdown follows the listbox pattern and works from the keyboard", async ({
  page,
}) => {
  const button = solverButton(page);
  await expect(button).toHaveAttribute("aria-haspopup", "listbox");
  await expect(button).toHaveAttribute("aria-expanded", "false");
  await expect(solverList(page)).toHaveCount(0);
  const before = ((await page.locator("#workbench-solver-value").textContent()) ?? "").trim();

  // ArrowDown on the closed button opens the list on the chosen option and moves focus to it.
  await button.focus();
  await page.keyboard.press("ArrowDown");
  await expect(button).toHaveAttribute("aria-expanded", "true");
  await expect(button).toHaveAttribute("aria-controls", "workbench-solver-listbox");
  const list = solverList(page);
  await expect(list).toBeFocused();
  await expect(list).toHaveAttribute("aria-labelledby", "workbench-solver-label");
  await expect(list).toHaveAttribute("aria-activedescendant", "workbench-solver-option-0");

  const names = await optionNames(page);
  expect(names.length).toBeGreaterThan(1);
  expect(names[0]).toBe(before);

  // Exactly one option is selected, and it is the one in the closed box.
  await expect(list.locator('[role="option"][aria-selected="true"]')).toHaveCount(1);
  await expect(page.locator("#workbench-solver-option-0")).toHaveAttribute("aria-selected", "true");

  // Arrows, End and Home move the active option.
  await page.keyboard.press("ArrowDown");
  await expect(list).toHaveAttribute("aria-activedescendant", "workbench-solver-option-1");
  await page.keyboard.press("End");
  await expect(list).toHaveAttribute(
    "aria-activedescendant",
    `workbench-solver-option-${names.length - 1}`,
  );
  await page.keyboard.press("Home");
  await expect(list).toHaveAttribute("aria-activedescendant", "workbench-solver-option-0");
  await page.keyboard.press("ArrowUp");
  await expect(list).toHaveAttribute("aria-activedescendant", "workbench-solver-option-0");

  // Escape closes without choosing and puts focus back on the button.
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Escape");
  await expect(button).toHaveAttribute("aria-expanded", "false");
  await expect(solverList(page)).toHaveCount(0);
  await expect(button).toBeFocused();
  await expect(page.locator("#workbench-solver-value")).toHaveText(before);

  // Enter picks the active option, closes the list and returns focus.
  await page.keyboard.press("ArrowDown");
  await expect(solverList(page)).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(button).toHaveAttribute("aria-expanded", "false");
  await expect(button).toBeFocused();
  await expect(page.locator("#workbench-solver-value")).toHaveText(names[1]);

  // Reopened, the new choice is the selected (and marked) one.
  await page.keyboard.press("Enter");
  await expect(solverList(page)).toBeFocused();
  await expect(page.locator("#workbench-solver-option-1")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#workbench-solver-option-0")).toHaveAttribute(
    "aria-selected",
    "false",
  );
  const marks = await solverOptions(page).evaluateAll((options) =>
    options.map((option) => getComputedStyle(option).borderLeftColor),
  );
  expect(marks[1]).not.toBe("rgba(0, 0, 0, 0)");
  expect(marks[0]).toBe("rgba(0, 0, 0, 0)");

  // Space picks too.
  await page.keyboard.press("Home");
  await page.keyboard.press(" ");
  await expect(page.locator("#workbench-solver-value")).toHaveText(names[0]);
});

test("the closed box shows the chosen option's tags, and every option shows its own", async ({
  page,
}) => {
  const closedTags = page.locator("#workbench-solver-tags > span");
  expect(await closedTags.count()).toBeGreaterThan(0);
  const closed = await closedTags.allTextContents();
  // The box is labelled by "Solver" and the chosen name; the tags describe it.
  await expect(solverButton(page)).toHaveAttribute(
    "aria-labelledby",
    "workbench-solver-label workbench-solver-value",
  );
  await expect(solverButton(page)).toHaveAttribute("aria-describedby", "workbench-solver-tags");

  await solverButton(page).click();
  const optionTags = await page.locator("#workbench-solver-option-0-tags > span").allTextContents();
  expect(optionTags).toEqual(closed);

  // The name gives way before the tags: the tags keep their full width.
  const tagsFit = await page
    .locator("#workbench-solver-tags")
    .evaluate((element) => element.scrollWidth <= element.clientWidth + 1);
  expect(tagsFit).toBe(true);
});

test("a click outside closes the list, and so does Tab", async ({ page }) => {
  await solverButton(page).click();
  await expect(solverList(page)).toBeVisible();
  await page.getByRole("heading", { level: 1, name: PROBLEM }).click();
  await expect(solverList(page)).toHaveCount(0);
  await expect(solverButton(page)).toHaveAttribute("aria-expanded", "false");

  await solverButton(page).click();
  await expect(solverList(page)).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(solverList(page)).toHaveCount(0);
  await expect(solverButton(page)).not.toBeFocused();
});

test("hovering an option shows its info card beside the list", async ({ page }) => {
  await solverButton(page).click();
  const names = await optionNames(page);
  await page.locator("#workbench-solver-option-1").hover();
  const card = page.locator("#workbench-solver-option-card");
  await expect(card).toBeVisible();
  await expect(card).toContainText(names[1]);
  await expect(card).toContainText("Time");
  await expect(card).toContainText("Space");

  // Beside the list, not over it.
  const cardBox = await card.boundingBox();
  const listBox = await solverList(page).boundingBox();
  expect(cardBox.x >= listBox.x + listBox.width || cardBox.x + cardBox.width <= listBox.x).toBe(
    true,
  );
});

test("the (i) card shows on keyboard focus and on a tap, as a tooltip the button points to", async ({
  page,
}) => {
  const info = page.locator("#workbench-solver-info-button");
  const card = page.locator("#workbench-solver-info-card");
  await expect(info).toHaveAttribute("aria-describedby", "workbench-solver-info-card");
  await expect(card).toHaveAttribute("role", "tooltip");
  await expect(card).toBeHidden();

  // Keyboard focus (Tab onto it from the control before it) shows it.
  await page.locator("#workbench-mode-reduce").focus();
  await page.keyboard.press("Tab");
  await expect(info).toBeFocused();
  await expect(card).toBeVisible();
  const chosen = ((await page.locator("#workbench-solver-value").textContent()) ?? "").trim();
  await expect(card).toContainText(chosen);
  await expect(card).toContainText("Not declared yet");

  // Escape closes it; focus stays.
  await page.keyboard.press("Escape");
  await expect(card).toBeHidden();
  await expect(info).toBeFocused();

  // A click (or tap) toggles it.
  await page.locator("h1").click();
  await info.click();
  await expect(card).toBeVisible();
  await info.click();
  await expect(card).toBeHidden();

  // The touch target is 44px.
  const box = await info.boundingBox();
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);
});

test("the Visualization Type list opens aligned to the box's right edge", async ({ page }) => {
  const button = page.locator("#workbench-source-type-button");
  await button.click();
  const list = page.locator("#workbench-source-type-listbox");
  await expect(list).toBeVisible();
  const buttonBox = await button.boundingBox();
  const listBox = await list.boundingBox();
  expect(Math.abs(buttonBox.x + buttonBox.width - (listBox.x + listBox.width))).toBeLessThan(2);

  // Its hover card sits to the left of the list.
  await list.getByRole("option").last().hover();
  const card = page.locator("#workbench-source-type-option-card");
  await expect(card).toBeVisible();
  const cardBox = await card.boundingBox();
  expect(cardBox.x + cardBox.width).toBeLessThanOrEqual(listBox.x + 1);
});

test("every id on the page is unique, with every dropdown and card on screen", async ({ page }) => {
  await page.locator("#workbench-mode-reduce").click();
  await expect(page.locator("#workbench-target-button")).toBeVisible();
  await expect(page.locator("#workbench-reduction-button")).toBeVisible();
  await expect(page.locator("#workbench-source-type-button")).toBeVisible();
  await expect(page.locator("#workbench-target-type-button")).toBeVisible();
  await page.locator("#workbench-target-button").click();
  await expect(page.locator("#workbench-target-listbox")).toBeVisible();

  const ids = await page.locator("[id]").evaluateAll((elements) => elements.map((e) => e.id));
  const duplicates = ids.filter((id, index) => id && ids.indexOf(id) !== index);
  expect(duplicates).toEqual([]);

  // Each dropdown has its own (i) card, and each card has its own tooltip.
  for (const prefix of ["target", "reduction", "source-type", "target-type"]) {
    await expect(page.locator(`#workbench-${prefix}-info-card`)).toHaveAttribute("role", "tooltip");
  }
});
