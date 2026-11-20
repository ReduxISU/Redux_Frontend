// tests/unit/permalink.test.mjs
//
// #324 (#174, #176): the problem page's permalink (lib/permalink.js): the query the workbench
// writes, its encoding, and the length check that leaves a too-long instance out.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  fitPermalink,
  MAX_PERMALINK_LENGTH,
  permalinkQuery,
  problemPath,
  searchString,
} from "../../lib/permalink.js";

describe("permalinkQuery", () => {
  test("keeps other keys, drops the route segment and the workbench's old keys", () => {
    const query = permalinkQuery(
      { problem: "3SAT", playlist: "intro", instance: "old", step: "4", viz: "old" },
      { instance: "(x1)", solver: null, viz: "Graph", reduceTo: null, reduction: null },
    );
    assert.deepEqual(query, { playlist: "intro", instance: "(x1)", viz: "Graph" });
  });

  test("adds the reduction (#176) in a fixed order", () => {
    const query = permalinkQuery(
      {},
      {
        reduction: "Karp's Reduction",
        reduceTo: "Clique",
        solver: "Brute Force",
        instance: "x",
      },
    );
    assert.deepEqual(Object.keys(query), ["instance", "solver", "reduceTo", "reduction"]);
  });
});

describe("searchString", () => {
  test("encodes every key and value, repeating an array's key", () => {
    assert.equal(searchString({}), "");
    assert.equal(
      searchString({ instance: "({1,2},{{1}})", reduceTo: "Set Cover", p: ["a", "b"] }),
      "?instance=(%7B1%2C2%7D%2C%7B%7B1%7D%7D)&reduceTo=Set%20Cover&p=a&p=b",
    );
    assert.equal(searchString({ a: null, b: undefined }), "");
  });
});

describe("fitPermalink", () => {
  const origin = "https://redux.example";
  const path = problemPath("Exact Cover");

  test("a short link keeps the instance", () => {
    const fitted = fitPermalink({ origin, path, query: { instance: "(x)", solver: "S" } });
    assert.equal(fitted.instanceOmitted, false);
    assert.equal(fitted.href, "https://redux.example/Exact%20Cover?instance=(x)&solver=S");
    assert.equal(fitted.length, fitted.href.length);
  });

  test("a link over the limit leaves the instance out and keeps the rest (#174)", () => {
    const instance = "x".repeat(MAX_PERMALINK_LENGTH);
    const fitted = fitPermalink({ origin, path, query: { instance, solver: "S", reduceTo: "R" } });
    assert.equal(fitted.instanceOmitted, true);
    assert.equal(fitted.href, "https://redux.example/Exact%20Cover?solver=S&reduceTo=R");
    assert.deepEqual(fitted.query, { solver: "S", reduceTo: "R" });
  });

  test("the limit counts the encoded link: an instance short in text but long encoded", () => {
    // Each "{" encodes to three characters.
    const instance = "{".repeat(Math.ceil(MAX_PERMALINK_LENGTH / 3));
    assert.ok(instance.length < MAX_PERMALINK_LENGTH);
    assert.equal(fitPermalink({ origin, path, query: { instance } }).instanceOmitted, true);
  });

  test("exactly at the limit still fits", () => {
    const base = `${origin}${path}?instance=`;
    const instance = "x".repeat(MAX_PERMALINK_LENGTH - base.length);
    const fitted = fitPermalink({ origin, path, query: { instance } });
    assert.equal(fitted.length, MAX_PERMALINK_LENGTH);
    assert.equal(fitted.instanceOmitted, false);
    assert.equal(
      fitPermalink({ origin, path, query: { instance: `${instance}x` } }).instanceOmitted,
      true,
    );
  });

  test("the limit is about 8000, under nginx's 8 KB request line", () => {
    assert.ok(MAX_PERMALINK_LENGTH >= 7000 && MAX_PERMALINK_LENGTH < 8192);
  });
});
