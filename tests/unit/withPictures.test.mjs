// tests/unit/withPictures.test.mjs
//
// #279: lib/redux/index.js's withPictures(), which adds includePictures=true to every request
// the site sends Redux, so Redux lists its picture views (3SAT's Factor Graph, Formula and
// Search Tree, the Nested Set and Formula views of other problems).

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { PICTURES_OPT_IN, withPictures } from "../../lib/redux/index.js";

describe("withPictures", () => {
  test("starts a query string on a URL without one", () => {
    assert.equal(
      withPictures("/api/redux/Navigation/Batch/allVisualizations"),
      `/api/redux/Navigation/Batch/allVisualizations?${PICTURES_OPT_IN}`,
    );
  });

  test("adds to a query string that is there", () => {
    assert.equal(
      withPictures("/api/redux/ProblemProvider/visualize?visualization=Sat3FormulaVisualization"),
      "/api/redux/ProblemProvider/visualize?visualization=Sat3FormulaVisualization&includePictures=true",
    );
  });

  test("never adds it twice", () => {
    const url = "/api/redux/Navigation/Batch/allInfo?includePictures=true";
    assert.equal(withPictures(url), url);
    assert.equal(withPictures(withPictures("/x?a=1")), "/x?a=1&includePictures=true");
  });
});
