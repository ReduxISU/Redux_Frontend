// tests/unit/shortLinks.test.mjs
//
// ReduxISU/Redux#844: short links (lib/shortLinks.js): the view saved and read back, the short
// link's address, and what the page says when saving or opening one fails.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  isShareId,
  openFailureText,
  queryFromView,
  SAVED_LINK_TEXT,
  saveFailureText,
  shareIdFrom,
  shareRequestBody,
  shortLinkHref,
  viewFromLink,
} from "../../lib/shortLinks.js";

describe("the view", () => {
  test("is the problem and the link's whole query, instance included", () => {
    const view = viewFromLink("Exact Cover", {
      playlist: "intro",
      instance: "({1},{{1}})",
      solver: "Brute Force",
      reduceTo: "Subset Sum",
    });
    assert.deepEqual(view, {
      problem: "Exact Cover",
      playlist: "intro",
      instance: "({1},{{1}})",
      solver: "Brute Force",
      reduceTo: "Subset Sum",
    });
    assert.deepEqual(shareRequestBody(view), { view });
  });

  test("leaves out the route segment, a share id and values an address can't hold", () => {
    const view = viewFromLink("3SAT", {
      problem: "Other",
      share: "abc123XYZ0",
      p: ["a", "b"],
      odd: 5,
      none: null,
    });
    assert.deepEqual(view, { problem: "3SAT", p: ["a", "b"] });
  });

  test("read back, is the router query that opens it", () => {
    assert.deepEqual(
      queryFromView({ problem: "3SAT", instance: "(x1)", viz: "Graph", step: 3, share: "x" }),
      { problem: "3SAT", instance: "(x1)", viz: "Graph" },
    );
  });

  test("read back without a problem opens nothing", () => {
    assert.equal(queryFromView(null), null);
    assert.equal(queryFromView({ instance: "x" }), null);
    assert.equal(queryFromView({ problem: "" }), null);
    assert.equal(queryFromView("3SAT"), null);
  });
});

describe("the short link", () => {
  test("is the page's address with only ?share=", () => {
    assert.equal(
      shortLinkHref("https://redux.example/Exact%20Cover", "abc123XYZ0"),
      "https://redux.example/Exact%20Cover?share=abc123XYZ0",
    );
  });

  test("its id is read from the query", () => {
    assert.equal(shareIdFrom({ share: "abc123XYZ0", instance: "x" }), "abc123XYZ0");
    assert.equal(shareIdFrom({ share: "" }), null);
    assert.equal(shareIdFrom({ share: ["a", "b"] }), null);
    assert.equal(shareIdFrom({}), null);
    assert.equal(shareIdFrom(undefined), null);
  });

  test("an id is letters and digits only", () => {
    assert.equal(isShareId("abc123XYZ0"), true);
    assert.equal(isShareId("abc/../x"), false);
    assert.equal(isShareId("abc 123"), false);
    assert.equal(isShareId(""), false);
    assert.equal(isShareId(null), false);
  });

  test("says how long it lasts", () => {
    assert.match(SAVED_LINK_TEXT, /about 6 months/);
  });
});

describe("saving fails", () => {
  test("each reason in plain words", () => {
    assert.equal(
      saveFailureText({ status: 503 }),
      "A short link couldn't be made: this server can't save links right now.",
    );
    assert.equal(
      saveFailureText({ status: 413 }),
      "A short link couldn't be made: this view is too big even to save.",
    );
    assert.equal(
      saveFailureText(new TypeError("Failed to fetch")),
      "A short link couldn't be made: the page couldn't reach the server.",
    );
    assert.equal(
      saveFailureText({ status: 502 }),
      "A short link couldn't be made: the page couldn't reach the server.",
    );
    assert.equal(
      saveFailureText({ status: 400 }),
      "A short link couldn't be made: the server couldn't save it.",
    );
  });

  test("too many: the wait in whole minutes, rounded up", () => {
    assert.equal(
      saveFailureText({ status: 429, retryAfterSeconds: 1500 }),
      "A short link couldn't be made: too many links were made from here recently. Try again in about 25 minutes.",
    );
    assert.match(saveFailureText({ status: 429, retryAfterSeconds: 61 }), /in about 2 minutes\.$/);
    assert.match(saveFailureText({ status: 429, retryAfterSeconds: 5 }), /in about 1 minute\.$/);
    assert.match(saveFailureText({ status: 429 }), /Try again later\.$/);
  });
});

describe("opening fails", () => {
  test("each reason in plain words", () => {
    assert.equal(
      openFailureText({ status: 404 }),
      "This share link doesn't exist or has expired (links last about 6 months).",
    );
    assert.equal(openFailureText({ status: 503 }), "This server can't open share links right now.");
    assert.match(openFailureText(new TypeError("Failed to fetch")), /couldn't reach the server/);
    assert.equal(
      openFailureText({ status: 500 }),
      "This share link couldn't be opened, so the page opened as usual.",
    );
  });
});
