// tests/e2e/helpers.js
//
// T30 (#39). Shared DOM helpers for the Home/detail specs. Kept out of
// tests/e2e/fixtures.js on purpose -- that file's only job is the `test`/
// `expect` wrapper itself (see its own header comment); this file is
// ordinary test-support code that happens to be reused across specs, no
// different in kind from a page-object module.
//
// Every helper here locates elements by the real ids/attributes the app
// itself renders (never a hardcoded problem name or count -- this issue's
// own done-when), matching this project's ground rule 4 that every
// interactive element gets a unique id.

/**
 * Navigates to Home and waits for the initial catalog fetch to settle
 * (loading text gone from #home-result-count -- see pages/index.js's own
 * T30 comment on that id). Doesn't assert anything about the *result* --
 * callers check for cards, an empty state, or the error banner themselves.
 */
export async function gotoHomeAndWaitForLoad(page, { expect }) {
  await page.goto("/");
  await expect(page.locator("#home-result-count")).not.toContainText("Loading", {
    timeout: 20_000,
  });
}

/**
 * @returns the integer result count Home's own text currently reports
 *   (`"N problems"` / `"N problems match your filters"`), read fresh off
 *   the page rather than assumed -- this is how every test avoids
 *   hardcoding a catalog size.
 */
export async function readResultCount(page) {
  const text = (await page.locator("#home-result-count").textContent()) ?? "";
  const match = text.match(/^(\d+)/);
  if (!match) {
    throw new Error(`Couldn't parse a result count out of "${text}"`);
  }
  return Number(match[1]);
}

/**
 * Navigates Home -> the first complete problem's detail page by actually
 * clicking its card (only a complete problem's card renders as a real link
 * -- components/ProblemCatalogCard.js's own `isProblemComplete` gate), and
 * waits for the detail page's H1 to show that same name. Never assumes a
 * specific problem exists; whichever one the live catalog puts first is
 * used.
 * @returns {Promise<{name: string}>}
 */
export async function gotoFirstProblemDetail(page, { expect }) {
  await gotoHomeAndWaitForLoad(page, { expect });

  const firstCard = page.locator('a[id^="problem-card-"]').first();
  const name = await firstCard.getAttribute("aria-label");
  if (!name) {
    throw new Error(
      "No complete (linkable) problem card found on Home to open a detail page from.",
    );
  }

  await firstCard.click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  return { name };
}

/**
 * Picks up the Overview section's drag grip with the keyboard, moves it
 * down one position, and drops it -- @dnd-kit's own KeyboardSensor
 * start/move/end sequence (Space, ArrowDown, Space; see
 * components/ProblemDetailLayout.js's own T18 comment on why a
 * KeyboardSensor is registered at all).
 *
 * The short pauses between key presses are load-bearing, not padding:
 * @dnd-kit recomputes every sortable item's position on an animation frame,
 * and the drop's collision detection reads that just-recomputed position --
 * three `press()` calls fired back-to-back (no yield to the event loop in
 * between) can deliver the drop before the preceding move has actually been
 * measured, which drops the item back where it started with no visible
 * reorder. Confirmed by hand: the same three presses with a wait after each
 * one reorders correctly every time; with no wait, the drop is a same-
 * position no-op. `page.waitForTimeout` is normally the wrong tool in a
 * Playwright test (locator assertions auto-retry, so waiting is usually
 * unnecessary) -- this is the genuine exception, since there's no DOM
 * signal to await between "the move was requested" and "@dnd-kit finished
 * measuring it," only real time.
 */
export async function reorderFirstSectionWithKeyboard(page) {
  const grip = page.locator("#section-overview-grip");
  await grip.focus();
  await grip.press("Space");
  await page.waitForTimeout(300);
  await grip.press("ArrowDown");
  await page.waitForTimeout(300);
  await grip.press("Space");
  await page.waitForTimeout(300);
}

/**
 * Expands a sidebar facet group by its facet key, if it isn't already
 * expanded. Facet groups default to collapsed (components/FacetSidebar.js),
 * so any test that needs to click one of a group's checkboxes must open the
 * group first -- exactly what a real visitor would do.
 */
export async function expandFacetGroup(page, facetKey) {
  const toggle = page.locator(`#facet-${facetKey}-toggle`);
  if ((await toggle.getAttribute("aria-expanded")) !== "true") {
    await toggle.click();
  }
}

/**
 * Every sidebar facet checkbox currently on the page, with its real
 * server-computed count (components/FacetSidebar.js's own `data-count`,
 * T30's addition -- read as a DOM attribute, not parsed back out of the
 * "(N)" label text).
 * @returns {Promise<Array<{id: string, facetKey: string, optionKey: string, count: number}>>}
 */
export async function readFacetOptions(page) {
  const checkboxes = page.locator('nav[aria-label="Filter problems"] input[type="checkbox"]');
  const ids = await checkboxes.evaluateAll((elements) =>
    elements.map((el) => ({ id: el.id, count: Number(el.dataset.count) })),
  );
  return ids.map(({ id, count }) => {
    const match = id.match(/^facet-(.+)-option-(.+)$/);
    if (!match) {
      throw new Error(
        `Facet checkbox id "${id}" didn't match the expected facet-<key>-option-<key> shape`,
      );
    }
    const [, facetKey, optionKey] = match;
    return { id, facetKey, optionKey, count };
  });
}

/**
 * Picks a facet option whose real count is strictly between 0 and
 * `catalogSize` -- guarantees selecting it will actually narrow the result
 * set (some problems match, but not every problem does) rather than being a
 * no-op or a filter nothing matches, without ever naming a specific facet
 * or problem.
 * @param {Array} options From readFacetOptions.
 * @param {number} catalogSize The unfiltered total (readResultCount()
 *   before any filter is applied).
 * @param {Object} [constraints]
 * @param {string} [constraints.excludeFacetKey] Skip options from this
 *   facet -- used to guarantee two picks come from different categories.
 */
export function pickNarrowingOption(options, catalogSize, { excludeFacetKey } = {}) {
  const candidate = options.find(
    (option) =>
      option.count > 0 && option.count < catalogSize && option.facetKey !== excludeFacetKey,
  );
  if (!candidate) {
    throw new Error(
      "No facet option currently has a count strictly between 0 and the catalog size -- " +
        "can't pick a narrowing filter to test with.",
    );
  }
  return candidate;
}

// --- T39 (#97): helpers for the live Run and Verify specs ----------------

/**
 * Opens one named problem's detail page directly by URL and waits for its
 * H1 to appear (which only happens once useProblemDetail's fetch has
 * settled -- pages/[problem].js renders bare chrome until then).
 *
 * Deliberately different from `gotoFirstProblemDetail` above: the live
 * compute specs are pinned to one named problem on purpose (see
 * tests/e2e/live-compute.spec.js's header for why), so they cannot use the
 * "whichever problem comes first" navigation the rest of the suite does.
 */
export async function gotoProblemDetail(page, problemName, { expect }) {
  await page.goto(`/${encodeURIComponent(problemName)}`);
  await expect(page.getByRole("heading", { level: 1, name: problemName })).toBeVisible({
    timeout: 20_000,
  });
}

/**
 * Expands one detail-page section by its key ("solvers", "verifier", ...),
 * if it isn't already expanded. Sections default to collapsed
 * (components/detail/SectionShell.js).
 */
export async function expandSection(page, sectionKey, { expect }) {
  const toggle = page.locator(`#section-${sectionKey}-toggle`);
  if ((await toggle.getAttribute("aria-expanded")) !== "true") {
    await toggle.click();
  }
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
}

/**
 * Selects a solver in the Solvers rail by its displayed name rather than by
 * its position, and confirms it really is the selected one.
 *
 * The by-name part is this issue's own done-when ("no test depends on which
 * solver the catalog happens to return first"). The rail selects index 0 on
 * mount, so a test that just pressed Run would silently be testing whatever
 * solver the backend happened to list first, which for many problems is an
 * exponential brute force.
 */
export async function selectSolverByName(page, solverName, { expect }) {
  // `role="option"` takes its accessible name from its contents, which here
  // is the solver name plus its solver-type chip -- so this is a substring
  // match on purpose, not an exact one.
  const option = page.getByRole("option", { name: solverName });
  await option.click();
  await expect(option).toHaveAttribute("aria-selected", "true");
}
