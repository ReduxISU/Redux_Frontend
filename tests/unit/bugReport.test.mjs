// tests/unit/bugReport.test.mjs
//
// #325: the Report a bug link's address (lib/bugReport.js): the issue's title and body, their
// encoding, and the page address cut short to keep the link under GitHub's length.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  bugReportBody,
  bugReportTitle,
  bugReportUrl,
  MAX_BUG_REPORT_URL_LENGTH,
  NEW_ISSUE_URL,
} from "../../lib/bugReport.js";

const AGENT = "Mozilla/5.0 (Windows NT 10.0) Chrome/140";

describe("bugReportTitle", () => {
  test("names the page by its readable path", () => {
    assert.equal(
      bugReportTitle("https://x.example/Exact%20Cover?instance=1"),
      "Bug on /Exact Cover",
    );
    assert.equal(bugReportTitle("https://x.example/"), "Bug on the problem list");
    assert.equal(bugReportTitle("not a url"), "Bug report");
  });

  test("a long path is cut short", () => {
    const title = bugReportTitle(`https://x.example/${"a".repeat(200)}`);
    assert.ok(title.length <= 90);
    assert.ok(title.endsWith("..."));
  });
});

describe("bugReportBody", () => {
  test("has the page, the browser and the three headings", () => {
    const body = bugReportBody("https://x.example/3SAT", AGENT);
    assert.match(body, /^Page: https:\/\/x\.example\/3SAT\nBrowser: Mozilla/);
    for (const heading of ["### What happened", "### What you expected", "### Steps"]) {
      assert.ok(body.includes(heading), heading);
    }
  });
});

describe("bugReportUrl", () => {
  test("opens a new Redux_Frontend issue with the title and body encoded", () => {
    const pageUrl = "https://x.example/Set%20Cover?instance=({1,2},{{1}})&reduceTo=Clique";
    const url = new URL(bugReportUrl({ pageUrl, userAgent: AGENT }));
    assert.equal(`${url.origin}${url.pathname}`, NEW_ISSUE_URL);
    assert.equal(url.searchParams.get("title"), "Bug on /Set Cover");
    const body = url.searchParams.get("body");
    assert.ok(body.includes(`Page: ${pageUrl}`));
    assert.ok(body.includes(`Browser: ${AGENT}`));
    // Nothing but title and body, and an & in the page address is no new parameter.
    assert.deepEqual([...url.searchParams.keys()], ["title", "body"]);
  });

  test("a long page address is cut short so the link fits", () => {
    const pageUrl = `https://x.example/Exact%20Cover?instance=${"%7B1%7D%2C".repeat(900)}`;
    const href = bugReportUrl({ pageUrl, userAgent: AGENT });
    assert.ok(href.length <= MAX_BUG_REPORT_URL_LENGTH, String(href.length));
    const body = new URL(href).searchParams.get("body");
    const page = body.split("\n")[0];
    assert.ok(page.startsWith("Page: https://x.example/Exact%20Cover?instance="));
    assert.ok(page.endsWith("..."));
    assert.ok(body.includes("### Steps"));
    assert.ok(body.includes(`Browser: ${AGENT}`));
  });

  test("a short address is not cut", () => {
    const href = bugReportUrl({ pageUrl: "https://x.example/3SAT", userAgent: AGENT });
    assert.ok(!new URL(href).searchParams.get("body").includes("..."));
  });
});
