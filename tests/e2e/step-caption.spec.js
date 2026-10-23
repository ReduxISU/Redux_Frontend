// tests/e2e/step-caption.spec.js
//
// #279: a run's step caption (the event, Redux's sentence for the step, and "Verdict: yes/no" at
// the end; in Reduce mode the phase and place in it too) is never drawn inside or over a picture.
// On the page it is in Algorithm Steps, with the step controls, below the picture's box; in full
// screen it sits under the picture with the full-screen step controls, under ids of its own
// (`workbench-full-screen-…`), while the covered copy stops announcing itself. Before Run the
// default picture has no caption. Checked at a phone's width and a desktop's, in Solve mode and
// with a Reduction View.
//
// The catalog comes from the real backend, like the rest of the suite; every compute request is
// answered here (see workbench.spec.js for why).

import { expect, test } from "./fixtures";
import { SAT3_FORMULA_FRAMES } from "./formula-payloads";
import {
  chooseReduceTarget,
  gotoProblemDetail,
  solveReductionTarget,
  startWithPanesExpanded,
} from "./helpers";
import { SAT3_TO_CLIQUE_VIEW } from "./reduction-payloads";

test.beforeEach(async ({ page }) => {
  await startWithPanesExpanded(page);
});

const PROBLEM = "3SAT";
const VISUALIZE_REQUEST = /\/api\/redux\/ProblemProvider\/visualize\?/;
const SOLVE_REQUEST = /\/api\/redux\/ProblemProvider\/solve\?/;
const REDUCTION_VIEW_REQUEST = /\/api\/redux\/ProblemProvider\/reductionView\?/;

/**
 * `caption` is visible, outside every picture's box, and below `view`'s bottom edge (the box of
 * the picture it describes).
 */
async function expectUnderPicture(page, caption, view) {
  await expect(caption).toBeVisible();
  expect(await caption.evaluate((element) => element.closest("[data-picture-view]"))).toBeNull();
  const inside = await caption.evaluate((element) =>
    [...document.querySelectorAll("[data-picture-view]")].some((box) => box.contains(element)),
  );
  expect(inside).toBe(false);
  const viewBox = await view.boundingBox();
  const captionBox = await caption.boundingBox();
  expect(captionBox.y).toBeGreaterThanOrEqual(viewBox.y + viewBox.height - 1);
}

for (const width of [390, 1280]) {
  test(`at ${width}px a Solve run's caption is in Algorithm Steps and, in full screen, under the picture, never on it`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.route(VISUALIZE_REQUEST, (route) => {
      const visualization = new URL(route.request().url()).searchParams.get("visualization") ?? "";
      return route.fulfill({ json: /sat/i.test(visualization) ? SAT3_FORMULA_FRAMES : [] });
    });
    await page.route(SOLVE_REQUEST, (route) =>
      route.fulfill({ json: "(x1:True,x2:False,x3:True)" }),
    );
    await gotoProblemDetail(page, PROBLEM, { expect });
    const caption = page.locator("#workbench-source-frames-caption");
    const view = page.locator("#workbench-source-frame-view");
    // Before Run there is no run to caption.
    await expect(view).toBeVisible();
    await expect(caption).toHaveCount(0);

    await page.locator("#workbench-run").click();
    const last = SAT3_FORMULA_FRAMES.frames.at(-1);
    await expect(page.locator("#workbench-algorithm-steps")).toHaveAttribute("data-open", "true");
    await expect(page.locator("#workbench-source-frames-caption-text")).toHaveText(last.caption);
    await expect(caption).toHaveAttribute("aria-live", "polite");
    expect(
      await caption.evaluate((element) =>
        Boolean(element.closest("#workbench-algorithm-steps-body")),
      ),
    ).toBe(true);
    await expectUnderPicture(page, caption, view);
    // The caption comes before the step controls.
    const position = await page.locator("#workbench-steps-position").boundingBox();
    expect((await caption.boundingBox()).y).toBeLessThan(position.y);

    await page.locator("#workbench-source-frame-fullscreen").click();
    await expect(page.locator("#workbench-source-frame")).toHaveAttribute(
      "data-full-screen",
      "true",
    );
    const full = page.locator("#workbench-full-screen-source-frames-caption");
    await expect(page.locator("#workbench-full-screen-source-frames-caption-text")).toHaveText(
      last.caption,
    );
    await expect(full).toHaveAttribute("aria-live", "polite");
    // The copy the full-screen picture covers says nothing more.
    await expect(caption).toHaveAttribute("aria-live", "off");
    await expectUnderPicture(page, full, view);
    // A step taken in full screen changes its caption.
    await page.locator("#workbench-full-screen-steps-previous").click();
    await expect(page.locator("#workbench-full-screen-source-frames-caption-text")).toHaveText(
      SAT3_FORMULA_FRAMES.frames.at(-2).caption,
    );

    await page.keyboard.press("Escape");
    await expect(full).toHaveCount(0);
    await expect(caption).toHaveAttribute("aria-live", "polite");
  });

  test(`at ${width}px a Reduction View's caption is in Algorithm Steps and, in full screen, under each picture`, async ({
    page,
  }) => {
    const view = SAT3_TO_CLIQUE_VIEW;
    await page.setViewportSize({ width, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.route(REDUCTION_VIEW_REQUEST, (route) => route.fulfill({ json: view }));
    await page.goto(
      `/${encodeURIComponent(PROBLEM)}?instance=${encodeURIComponent(view.source.instance)}`,
    );
    await expect(page.getByRole("heading", { level: 1, name: PROBLEM })).toBeVisible({
      timeout: 20_000,
    });
    await page.locator("#workbench-mode-reduce").click();
    await chooseReduceTarget(page, /^Clique$/, { expect });
    await page.locator("#workbench-run").click();
    await expect(page.locator("#workbench-reduction")).toBeVisible();
    await solveReductionTarget(page, { expect });

    const caption = page.locator("#workbench-reduction-caption");
    await expect(page.locator("#workbench-algorithm-steps")).toHaveAttribute("data-open", "true");
    await expect(page.locator("#workbench-reduction-caption-phase")).toHaveText(/^Map back /);
    expect(
      await caption.evaluate((element) =>
        Boolean(element.closest("#workbench-algorithm-steps-body")),
      ),
    ).toBe(true);
    // Below both pictures (stacked on a phone, the target is the lower one).
    await expectUnderPicture(page, caption, page.locator("#workbench-reduction-source-frame-view"));
    await expectUnderPicture(page, caption, page.locator("#workbench-reduction-target-frame-view"));

    for (const side of ["source", "target"]) {
      const frame = `#workbench-reduction-${side}-frame`;
      await page.locator(`${frame}-fullscreen`).click();
      await expect(page.locator(frame)).toHaveAttribute("data-full-screen", "true");
      const full = page.locator("#workbench-full-screen-reduction-caption");
      await expect(page.locator("#workbench-full-screen-reduction-caption-phase")).toHaveText(
        /^Map back /,
      );
      await expect(full).toHaveAttribute("aria-live", "polite");
      await expect(caption).toHaveAttribute("aria-live", "off");
      await expectUnderPicture(page, full, page.locator(`${frame}-view`));
      await page.keyboard.press("Escape");
      await expect(page.locator(frame)).toHaveAttribute("data-full-screen", "false");
      await expect(caption).toHaveAttribute("aria-live", "polite");
    }
  });
}
