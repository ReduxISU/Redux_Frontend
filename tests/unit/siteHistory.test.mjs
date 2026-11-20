// tests/unit/siteHistory.test.mjs
//
// #327: whether the problem page's Back control can go back in history and stay on the site
// (lib/siteHistory.js): pages noted as the visitor moves, a query-only change not counting as a
// page, and a same-origin referrer for a page opened from the site.

import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { cameFromSite, noteRoute, pathOf, resetSiteHistory } from "../../lib/siteHistory.js";

const ORIGIN = "https://redux.example";

describe("siteHistory", () => {
  beforeEach(() => resetSiteHistory());

  test("the page a visit starts on did not come from the site", () => {
    assert.equal(noteRoute("/Exact%20Cover?instance=x"), 0);
    assert.equal(cameFromSite({ referrer: "", origin: ORIGIN }), false);
  });

  test("a query-only change (the workbench's address) is not another page", () => {
    noteRoute("/3SAT");
    noteRoute("/3SAT?solver=A");
    assert.equal(noteRoute("/3SAT?solver=A&viz=B#top"), 0);
    assert.equal(cameFromSite(), false);
  });

  test("moving from the problem list to a problem page came from the site", () => {
    noteRoute("/");
    assert.equal(noteRoute("/3SAT"), 1);
    assert.equal(cameFromSite(), true);
  });

  test("a full page load opened from this site counts, another site's does not", () => {
    noteRoute("/3SAT");
    assert.equal(cameFromSite({ referrer: `${ORIGIN}/reduction-graph`, origin: ORIGIN }), true);
    assert.equal(
      cameFromSite({ referrer: "https://search.example/?q=3sat", origin: ORIGIN }),
      false,
    );
    assert.equal(cameFromSite({ referrer: "not a url", origin: ORIGIN }), false);
  });

  test("pathOf drops the query and hash", () => {
    assert.equal(pathOf("/a/b?c=1#d"), "/a/b");
    assert.equal(pathOf(undefined), "");
  });
});
