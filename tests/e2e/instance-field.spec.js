// tests/e2e/instance-field.spec.js
//
// #279: the collapsed Instance pane's one-line field scrolls sideways when the instance is long.
// Its scrollbar must sit under the text, not over it, so the field grows by the bar's height.

import { expect, test } from "@playwright/test";
import { gotoProblemDetail, skipStartupSplash } from "./helpers";

const INPUT = "#workbench-instance-full-instance";

// What the field shows of its text: the inside height, less the scrollbar.
const visibleHeight = (input) => input.evaluate((el) => el.clientHeight);

test("a long instance's scrollbar sits under the collapsed field's text, not over it", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await skipStartupSplash(page);
  await gotoProblemDetail(page, "3SAT", { expect });
  const input = page.locator(INPUT);
  await expect(input).toBeVisible();

  await input.fill("(x1 | x2 | !x3)");
  const short = await visibleHeight(input);

  await input.fill(
    Array.from({ length: 60 }, (_, i) => `(x${i} | !x${i + 1} | x${i + 2})`).join(" & "),
  );
  await expect.poll(() => input.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
  // The text keeps all of its room, whatever height the system's scrollbar has.
  await expect.poll(() => visibleHeight(input)).toBe(short);

  // Back to a short instance: no bar, so the field is its usual height again.
  await input.fill("(x1 | x2 | !x3)");
  await expect
    .poll(() => input.evaluate((el) => el.offsetHeight - el.clientHeight))
    .toBeLessThan(5);
});
