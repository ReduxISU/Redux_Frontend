// tests/e2e/zoom.spec.js
//
// #303 stage 3: Board G's zoom, pan and move-pieces model, which DiagramZoom.js gives every
// picture on every page. Driven on the Clique page's Graph (one captured run answers every
// picture request, as in picture-renderers.spec.js), whose nodes are movable:
//   - Ctrl + wheel zooms about the pointer; a plain wheel scrolls the page in normal view (no
//     popup over the picture), and zooms in full screen;
//   - zoom runs below fit, down to MIN_ZOOM (a quarter of fit), and up to MAX_ZOOM (ten times
//     fit), + and - doubling and halving it;
//   - a mouse-wheel notch zooms faster than a trackpad pinch's small fractional steps;
//   - a pan works at fit too, and is clamped so part of the picture stays in the window;
//   - a right drag pans anywhere with no context menu, a left drag on a node moves it;
//   - one Reset, neutral and disabled at the default view, orange (the soft button) and enabled
//     after a zoom, a pan or a move, puts all three back;
//   - the keyboard: arrows pan, + and - zoom, 0 resets;
//   - touch: a pinch zooms and pans, press and hold moves a node, and one finger is the page's
//     in normal view but pans in full screen.

import { expect, test } from "./fixtures";
import { gotoProblemDetail } from "./helpers";
import { CLIQUE_GRAPH_FRAMES } from "./picture-payloads";

const VISUALIZE_REQUEST = /\/api\/redux\/ProblemProvider\/visualize\?/;
const SOLVE_REQUEST = /\/api\/redux\/ProblemProvider\/solve/;
const PICTURE = "#workbench-source-picture";
const GRAPH = "#workbench-source-frames-graph";
const SVG = `${GRAPH}-svg`;
const RESET = `${GRAPH}-zoom-reset`;

/** Opens Clique with every picture answered by the Graph capture, and waits for the picture. */
async function openGraph(page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route(VISUALIZE_REQUEST, (route) => route.fulfill({ json: CLIQUE_GRAPH_FRAMES }));
  await page.route(SOLVE_REQUEST, (route) => route.fulfill({ json: "stub" }));
  await gotoProblemDetail(page, "Clique", { expect });
  await expect(page.locator(PICTURE)).toHaveAttribute("data-picture-type", "Graph", {
    timeout: 20_000,
  });
}

const zoomOf = async (page) =>
  Number(await page.locator(`${GRAPH}-zoom`).getAttribute("data-zoom"));
const viewBoxOf = (page) => page.locator(SVG).getAttribute("viewBox");
const graphNode = (page, id) => page.locator(`${GRAPH}-graph [data-node-id="${id}"]`);

/** The fitted viewBox, once the picture area is measured and the window holds still. */
async function settledViewBox(page) {
  await page.locator(SVG).scrollIntoViewIfNeeded();
  let last = null;
  await expect
    .poll(async () => {
      const now = await viewBoxOf(page);
      const same = now === last;
      last = now;
      return same;
    })
    .toBe(true);
  return last;
}

/** The drawing's point under the screen point (x, y). */
function drawingPointAt(page, x, y) {
  return page.locator(SVG).evaluate(
    (svg, at) => {
      const inverse = svg.getScreenCTM().inverse();
      return {
        x: inverse.a * at.x + inverse.c * at.y + inverse.e,
        y: inverse.b * at.x + inverse.d * at.y + inverse.f,
      };
    },
    { x, y },
  );
}

/** A screen point over the picture's background (the <svg> itself, no piece), or null. */
function emptyPoint(page) {
  return page.locator(SVG).evaluate((svg) => {
    const rect = svg.getBoundingClientRect();
    for (let y = rect.top + 10; y < rect.bottom - 10; y += 12) {
      for (let x = rect.left + 10; x < rect.right - 10; x += 12) {
        if (document.elementFromPoint(x, y) === svg) return { x, y };
      }
    }
    return null;
  });
}

/** A mouse drag from `from` by (dx, dy), with `button` ("left" or "right"). */
async function mouseDrag(page, from, dx, dy, button = "left") {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down({ button });
  await page.mouse.move(from.x + dx / 2, from.y + dy / 2, { steps: 4 });
  await page.mouse.move(from.x + dx, from.y + dy, { steps: 4 });
  await page.mouse.up({ button });
}

/** The middle of the picture on screen. */
async function middleOf(page) {
  await page.locator(SVG).scrollIntoViewIfNeeded();
  const box = await page.locator(SVG).boundingBox();
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** A node's body centre on screen (scrolled into view first). */
async function screenCentre(node) {
  await node.scrollIntoViewIfNeeded();
  const box = await node.locator("[data-body]").first().boundingBox();
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Every node's body centre, by id, in drawing units. */
function centres(page) {
  return page.locator(`${GRAPH}-graph [data-node-id]`).evaluateAll((nodes) =>
    Object.fromEntries(
      nodes.map((node) => {
        const box = node.querySelector("[data-body]").getBBox();
        return [
          node.getAttribute("data-node-id"),
          { x: box.x + box.width / 2, y: box.y + box.height / 2 },
        ];
      }),
    ),
  );
}

/** How much of the drawn graph (the nodes' union box) the window shows, on each axis (0 to 1). */
function shownShare(page) {
  return page.locator(SVG).evaluate((svg) => {
    const view = svg.viewBox.baseVal;
    const boxes = [...svg.querySelectorAll("[data-node-id] [data-body]")].map((body) =>
      body.getBBox(),
    );
    const left = Math.min(...boxes.map((box) => box.x));
    const right = Math.max(...boxes.map((box) => box.x + box.width));
    const top = Math.min(...boxes.map((box) => box.y));
    const bottom = Math.max(...boxes.map((box) => box.y + box.height));
    const overlap = (low, high, from, to) => Math.max(0, Math.min(high, to) - Math.max(low, from));
    return {
      x: overlap(left, right, view.x, view.x + view.width) / (right - left),
      y: overlap(top, bottom, view.y, view.y + view.height) / (bottom - top),
    };
  });
}

/** Whether Reset is drawn as the active (soft orange) button: a fill, not transparent. */
function resetFilled(page) {
  return page
    .locator(RESET)
    .evaluate((button) => getComputedStyle(button).backgroundColor !== "rgba(0, 0, 0, 0)");
}

test.describe("desktop", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 700 });
    await openGraph(page);
  });

  test("Ctrl + wheel zooms about the pointer; a plain wheel scrolls the page and shows no hint", async ({
    page,
  }) => {
    await settledViewBox(page);
    const box = await page.locator(SVG).boundingBox();
    // Off the middle, so a zoom about the middle would move this point.
    const at = { x: box.x + box.width * 0.3, y: box.y + box.height * 0.4 };
    await page.mouse.move(at.x, at.y);
    const before = await drawingPointAt(page, at.x, at.y);
    await page.keyboard.down("Control");
    await page.mouse.wheel(0, -200);
    await page.keyboard.up("Control");
    await expect.poll(() => zoomOf(page)).toBeGreaterThan(1.2);
    const after = await drawingPointAt(page, at.x, at.y);
    expect(Math.abs(after.x - before.x)).toBeLessThan(0.5);
    expect(Math.abs(after.y - before.y)).toBeLessThan(0.5);
    await expect(page.locator(`${GRAPH}-zoom-hint`)).toHaveCount(0);

    // A plain wheel is the page's: it scrolls and the zoom stays. No popup says how to zoom (the
    // help line under the picture does).
    const zoomed = await zoomOf(page);
    const viewBox = await viewBoxOf(page);
    const scrolled = await page.evaluate(() => window.scrollY);
    const middle = await middleOf(page);
    await page.mouse.move(middle.x, middle.y);
    await page.mouse.wheel(0, 120);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(scrolled);
    expect(await zoomOf(page)).toBe(zoomed);
    expect(await viewBoxOf(page)).toBe(viewBox);
    await expect(page.locator(`${GRAPH}-zoom-hint`)).toHaveCount(0);
    await expect(page.locator(`${GRAPH}-zoom-help`)).toContainText("Ctrl + scroll to zoom");
  });

  test("in full screen a plain wheel zooms, and the help line says so", async ({ page }) => {
    await expect(page.locator(`${GRAPH}-zoom-help`)).toHaveText(
      "Ctrl + scroll to zoom · drag the background or right-drag to pan · drag a node to move it",
    );
    await page.locator("#workbench-full-screen").click();
    await expect(page.locator("#workbench")).toHaveAttribute("data-full-screen", "true");
    await expect(page.locator(`${GRAPH}-zoom-help`)).toHaveText(
      "Scroll to zoom · drag the background or right-drag to pan · drag a node to move it",
    );
    await settledViewBox(page);
    const middle = await middleOf(page);
    await page.mouse.move(middle.x, middle.y);
    await page.mouse.wheel(0, -200);
    await expect.poll(() => zoomOf(page)).toBeGreaterThan(1.2);
    await expect(page.locator(`${GRAPH}-zoom-hint`)).toHaveCount(0);
    await page.mouse.wheel(0, 400);
    await expect.poll(() => zoomOf(page)).toBeLessThan(1);
  });

  test("zoom goes below fit, down to a quarter of it", async ({ page }) => {
    await settledViewBox(page);
    const zoomOut = page.locator(`${GRAPH}-zoom-out`);
    await expect(zoomOut).toBeEnabled();
    await zoomOut.click();
    await expect(page.locator(`${GRAPH}-zoom`)).toHaveAttribute("data-zoom", "0.50");
    // The whole drawing shows, smaller.
    expect(await shownShare(page)).toEqual({ x: 1, y: 1 });
    await expect(page.locator(RESET)).toBeEnabled();
    await zoomOut.click();
    await expect(page.locator(`${GRAPH}-zoom`)).toHaveAttribute("data-zoom", "0.25");
    await expect(zoomOut).toBeDisabled();
    // Ctrl + wheel stops there too.
    const middle = await middleOf(page);
    await page.mouse.move(middle.x, middle.y);
    await page.keyboard.down("Control");
    await page.mouse.wheel(0, 400);
    await page.keyboard.up("Control");
    expect(await zoomOf(page)).toBe(0.25);
  });

  test("zoom goes up to ten times fit, + doubling it, and stops there", async ({ page }) => {
    await settledViewBox(page);
    const zoomIn = page.locator(`${GRAPH}-zoom-in`);
    await zoomIn.click();
    await expect(page.locator(`${GRAPH}-zoom`)).toHaveAttribute("data-zoom", "2.00");
    for (let press = 0; press < 10 && (await zoomIn.isEnabled()); press += 1) await zoomIn.click();
    await expect(zoomIn).toBeDisabled();
    // Ten times fit, or further when the graph's labels need it to read three times their size.
    expect(await zoomOf(page)).toBeGreaterThanOrEqual(10);
    const most = await zoomOf(page);
    const middle = await middleOf(page);
    await page.mouse.move(middle.x, middle.y);
    await page.keyboard.down("Control");
    await page.mouse.wheel(0, -400);
    await page.keyboard.up("Control");
    expect(await zoomOf(page)).toBe(most);
  });

  test("a mouse-wheel notch zooms about 1.3 times; a pinch's small fractional steps zoom slower", async ({
    page,
  }) => {
    await settledViewBox(page);
    const wheel = (deltaY) =>
      page.locator(SVG).evaluate((svg, delta) => {
        const box = svg.getBoundingClientRect();
        svg.dispatchEvent(
          new WheelEvent("wheel", {
            deltaY: delta,
            deltaMode: 0,
            ctrlKey: true,
            clientX: box.left + box.width / 2,
            clientY: box.top + box.height / 2,
            bubbles: true,
            cancelable: true,
          }),
        );
      }, deltaY);
    // One notch, as Chrome sends it: 100 px.
    await wheel(-100);
    await expect.poll(() => zoomOf(page)).toBeCloseTo(1.3, 1);
    await page.locator(RESET).click();
    await expect(page.locator(`${GRAPH}-zoom`)).toHaveAttribute("data-zoom", "1.00");
    // A pinch: 40 steps of 2.5 px, 100 px in all, zoom less (about 1.16 times).
    for (let step = 0; step < 40; step += 1) await wheel(-2.5);
    await expect.poll(() => zoomOf(page)).toBeCloseTo(1.16, 1);
  });

  test("a drag on the background pans at fit, and the pan stops with part of the picture shown", async ({
    page,
  }) => {
    const fit = await settledViewBox(page);
    const empty = await emptyPoint(page);
    expect(empty).not.toBeNull();
    const before = await centres(page);
    await mouseDrag(page, empty, 60, 30);
    expect(await viewBoxOf(page)).not.toBe(fit);
    expect(await zoomOf(page)).toBe(1);
    // Dragged right and down, the window moves left and up; no node moved.
    const [fx, fy] = fit.split(" ").map(Number);
    const [x, y] = (await viewBoxOf(page)).split(" ").map(Number);
    expect(x).toBeLessThan(fx);
    expect(y).toBeLessThan(fy);
    expect(await centres(page)).toEqual(before);

    // Far past the edge (a right drag pans from anywhere), it stops with a quarter of the
    // drawing still in the window.
    const middle = await middleOf(page);
    for (let drag = 0; drag < 4; drag += 1) await mouseDrag(page, middle, 600, 400, "right");
    const stopped = await viewBoxOf(page);
    await mouseDrag(page, middle, 600, 400, "right");
    expect(await viewBoxOf(page)).toBe(stopped);
    const share = await shownShare(page);
    expect(share.x).toBeGreaterThan(0.2);
    expect(share.y).toBeGreaterThan(0.2);
    expect(share.x).toBeLessThan(0.5);
    // And the other way.
    for (let drag = 0; drag < 6; drag += 1) await mouseDrag(page, middle, -600, -400, "right");
    const other = await shownShare(page);
    expect(other.x).toBeGreaterThan(0.2);
    expect(other.x).toBeLessThan(0.5);
  });

  test("a right drag pans over a node without moving it, and opens no context menu", async ({
    page,
  }) => {
    const fit = await settledViewBox(page);
    await page.evaluate(() => {
      window.__menus = [];
      window.addEventListener("contextmenu", (event) =>
        window.__menus.push(event.defaultPrevented),
      );
    });
    const before = await centres(page);
    await mouseDrag(page, await screenCentre(graphNode(page, "2")), -50, 20, "right");
    expect(await viewBoxOf(page)).not.toBe(fit);
    expect(await centres(page)).toEqual(before);
    // Any context menu the right button asked for was kept off the picture.
    expect(await page.evaluate(() => window.__menus.every(Boolean))).toBe(true);
    // A middle drag does nothing.
    const panned = await viewBoxOf(page);
    await mouseDrag(page, await middleOf(page), 80, 0, "middle");
    expect(await viewBoxOf(page)).toBe(panned);
  });

  test("a left drag moves a node straight away, without panning", async ({ page }) => {
    const fit = await settledViewBox(page);
    const before = await centres(page);
    await mouseDrag(page, await screenCentre(graphNode(page, "2")), 60, 40);
    const after = await centres(page);
    expect(Math.hypot(after["2"].x - before["2"].x, after["2"].y - before["2"].y)).toBeGreaterThan(
      15,
    );
    expect(after["1"]).toEqual(before["1"]);
    expect(await viewBoxOf(page)).toBe(fit);
  });

  test("Reset is neutral at the default view, orange after a zoom, a pan or a move, and puts all three back", async ({
    page,
  }) => {
    const fit = await settledViewBox(page);
    const before = await centres(page);
    const reset = page.locator(RESET);
    await expect(reset).toHaveText("Reset");
    await expect(reset).toBeDisabled();
    await expect(reset).not.toHaveAttribute("data-active", "true");
    expect(await resetFilled(page)).toBe(false);
    await expect(reset).toHaveAttribute("aria-label", /default view, zoom 100%/);
    // There is no Fit and no Reset layout any more.
    await expect(page.locator(`${GRAPH}-layout-reset`)).toHaveCount(0);
    await expect(page.locator(`${GRAPH}-zoom`).getByRole("button", { name: "Fit" })).toHaveCount(0);

    // A zoom.
    await page.locator(`${GRAPH}-zoom-in`).click();
    await expect(reset).toBeEnabled();
    await expect(reset).toHaveAttribute("data-active", "true");
    expect(await resetFilled(page)).toBe(true);
    await expect(reset).toHaveAttribute("aria-label", "Reset view: undo zoom (zoom 200%)");
    await reset.click();
    await expect(reset).toBeDisabled();
    expect(await viewBoxOf(page)).toBe(fit);

    // A pan.
    await mouseDrag(page, await middleOf(page), 40, 0, "right");
    await expect(reset).toBeEnabled();
    await expect(reset).toHaveAttribute("aria-label", /undo panning/);
    await reset.click();
    expect(await viewBoxOf(page)).toBe(fit);
    await expect(reset).toBeDisabled();

    // A move.
    await mouseDrag(page, await screenCentre(graphNode(page, "3")), -50, 30);
    await expect(reset).toBeEnabled();
    await expect(reset).toHaveAttribute("aria-label", /undo moved pieces/);
    await reset.click();
    expect(await centres(page)).toEqual(before);
    await expect(reset).toBeDisabled();

    // All three, undone at once.
    await mouseDrag(page, await screenCentre(graphNode(page, "1")), 30, 30);
    await page.locator(`${GRAPH}-zoom-in`).click();
    await mouseDrag(page, await middleOf(page), 30, 20, "right");
    await expect(reset).toHaveAttribute(
      "aria-label",
      /^Reset view: undo zoom, panning and moved pieces/,
    );
    await reset.click();
    await expect(page.locator(`${GRAPH}-zoom`)).toHaveAttribute("data-zoom", "1.00");
    expect(await viewBoxOf(page)).toBe(fit);
    expect(await centres(page)).toEqual(before);
    await expect(reset).toBeDisabled();
    expect(await resetFilled(page)).toBe(false);
  });

  test("the keyboard: arrows pan the focused picture, + and - zoom, 0 resets", async ({ page }) => {
    const fit = await settledViewBox(page);
    const svg = page.locator(SVG);
    await expect(svg).toHaveAttribute("tabindex", "0");
    await svg.focus();
    await page.keyboard.press("ArrowRight");
    const [fx] = fit.split(" ").map(Number);
    const [x] = (await viewBoxOf(page)).split(" ").map(Number);
    expect(x).toBeGreaterThan(fx);
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("+");
    await expect(page.locator(`${GRAPH}-zoom`)).toHaveAttribute("data-zoom", "2.00");
    await page.keyboard.press("-");
    await expect(page.locator(`${GRAPH}-zoom`)).toHaveAttribute("data-zoom", "1.00");
    await page.keyboard.press("-");
    await expect(page.locator(`${GRAPH}-zoom`)).toHaveAttribute("data-zoom", "0.50");
    await expect(page.locator(RESET)).toBeEnabled();
    await page.keyboard.press("0");
    await expect(page.locator(`${GRAPH}-zoom`)).toHaveAttribute("data-zoom", "1.00");
    expect(await viewBoxOf(page)).toBe(fit);
    await expect(page.locator(RESET)).toBeDisabled();
    // The keys are said to a screen reader.
    await expect(page.locator(`${GRAPH}-zoom-keys`)).toHaveText(
      "Arrow keys pan, plus and minus zoom, 0 resets.",
    );
  });
});

test.describe("touch", () => {
  /** Raw touches through the DevTools protocol (Playwright has no multi-touch gesture). */
  async function touchScreen(page) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 2 });
    return (type, touchPoints) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints });
  }

  /** A one-finger swipe from `from` by (dx, dy), in six moves. */
  async function swipe(touch, from, dx, dy) {
    await touch("touchStart", [{ x: from.x, y: from.y, id: 0 }]);
    for (let step = 1; step <= 6; step += 1) {
      await touch("touchMove", [
        { x: from.x + (dx * step) / 6, y: from.y + (dy * step) / 6, id: 0 },
      ]);
    }
    await touch("touchEnd", []);
  }

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await openGraph(page);
  });

  test("two fingers pinch to zoom and move together to pan", async ({ page }) => {
    const touch = await touchScreen(page);
    await settledViewBox(page);
    const { x: cx, y: cy } = await middleOf(page);
    const fingers = (spread, shift = 0) => [
      { x: cx - spread + shift, y: cy, id: 0 },
      { x: cx + spread + shift, y: cy, id: 1 },
    ];
    await touch("touchStart", fingers(20));
    for (const spread of [25, 30, 35, 40]) await touch("touchMove", fingers(spread));
    // Spread to twice the distance: twice the zoom, the point between the fingers held still.
    await expect.poll(() => zoomOf(page)).toBeCloseTo(2, 1);
    const held = await drawingPointAt(page, cx, cy);
    // Both fingers move together: the picture follows them, at the same zoom.
    for (const shift of [-10, -20, -30]) await touch("touchMove", fingers(40, shift));
    await touch("touchEnd", []);
    expect(await zoomOf(page)).toBeCloseTo(2, 1);
    const under = await drawingPointAt(page, cx - 30, cy);
    expect(Math.abs(under.x - held.x)).toBeLessThan(1);
    expect(Math.abs(under.y - held.y)).toBeLessThan(1);
  });

  test("press and hold a node, then drag it, moves it; a quick swipe does not", async ({
    page,
  }) => {
    const touch = await touchScreen(page);
    await settledViewBox(page);
    await expect(page.locator(`${GRAPH}-zoom-help`)).toHaveText(
      "Two fingers to pan · pinch to zoom · press and hold a node, then drag to move it",
    );
    const node = graphNode(page, "2");
    const before = await centres(page);
    // A quick sideways swipe over the node: nothing moves.
    await swipe(touch, await screenCentre(node), 60, 0);
    expect(await centres(page)).toEqual(before);

    const at = await screenCentre(node);
    await touch("touchStart", [{ x: at.x, y: at.y, id: 0 }]);
    // The node lifts: a shadow and a slight scale.
    const lifted = page.locator(`${GRAPH}-graph [data-drag-armed]`);
    await expect(lifted).toHaveAttribute("data-node-id", "2");
    await expect
      .poll(() => lifted.evaluate((el) => getComputedStyle(el).transform))
      .not.toBe("none");
    expect(await lifted.evaluate((el) => getComputedStyle(el).filter)).toContain("drop-shadow");
    for (let step = 1; step <= 6; step += 1) {
      await touch("touchMove", [{ x: at.x + step * 8, y: at.y + step * 6, id: 0 }]);
    }
    await touch("touchEnd", []);
    await expect(lifted).toHaveCount(0);
    const after = await centres(page);
    expect(Math.hypot(after["2"].x - before["2"].x, after["2"].y - before["2"].y)).toBeGreaterThan(
      15,
    );
    await expect(page.locator(RESET)).toBeEnabled();
  });

  test("one finger is the page's in normal view, zoomed or not, and pans in full screen", async ({
    page,
  }) => {
    const touch = await touchScreen(page);
    const fit = await settledViewBox(page);
    expect(await page.locator(SVG).evaluate((svg) => getComputedStyle(svg).touchAction)).toBe(
      "pan-y",
    );
    const empty = await emptyPoint(page);
    expect(empty).not.toBeNull();
    await swipe(touch, empty, -80, 0);
    expect(await viewBoxOf(page)).toBe(fit);
    // Zoomed in, still the page's.
    await page.locator(`${GRAPH}-zoom-in`).click();
    const zoomed = await viewBoxOf(page);
    const middle = await middleOf(page);
    await swipe(touch, middle, -80, 0);
    expect(await viewBoxOf(page)).toBe(zoomed);

    // In full screen one finger pans, and every touch gesture is the picture's.
    await page.locator("#workbench-full-screen").click();
    await expect(page.locator("#workbench")).toHaveAttribute("data-full-screen", "true");
    expect(await page.locator(SVG).evaluate((svg) => getComputedStyle(svg).touchAction)).toBe(
      "none",
    );
    await expect(page.locator(`${GRAPH}-zoom-help`)).toHaveText(
      "Drag to pan · pinch to zoom · press and hold a node, then drag to move it",
    );
    const full = await settledViewBox(page);
    await swipe(touch, await middleOf(page), -80, -40);
    expect(await viewBoxOf(page)).not.toBe(full);
  });
});
