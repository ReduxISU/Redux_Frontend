// tests/e2e/sat-connectives.spec.js
//
// #224: the SAT picture joins the literals of a clause with OR and the clauses with AND, as
// Redux's CNF instances mean (`(x1 | !x2 | x3) & ...`). It once drew them the other way round.
//
// Pinned to 3SAT, whose picture is the booleanSatisfiability renderer. The picture request is
// answered here with two clauses of three literals, so the counts below are exact.

import { expect, test } from "./fixtures";
import { gotoProblemDetail, startWithPanesExpanded } from "./helpers";

// #279 (Workspace tweaks): Execute and Verify start collapsed for a new viewer. These tests use
// what the open panes hold, so each starts as a viewer who saved them open.
test.beforeEach(async ({ page }) => {
  await startWithPanesExpanded(page);
});

const VISUALIZE_REQUEST = /\/api\/redux\/ProblemProvider\/visualize\?/;

function clause(id, literals) {
  return {
    id,
    literals: literals.map((literal, index) => ({
      id: `${id}-${index}`,
      literal,
      color: "Background",
    })),
  };
}

test("literals in a clause are joined by OR, and clauses by AND", async ({ page }) => {
  const frame = {
    clauses: [clause("0", ["x1", "!x2", "x3"]), clause("1", ["!x1", "x2", "x3"])],
  };
  await page.route(VISUALIZE_REQUEST, (route) => route.fulfill({ json: [frame, frame] }));
  await gotoProblemDetail(page, "3SAT", { expect });

  const picture = page.locator("#workbench-source-picture");
  const ors = picture.locator('[data-connective="or"]');
  const ands = picture.locator('[data-connective="and"]');
  // Two joins inside each of the two clauses, and one join between them.
  await expect(ors).toHaveCount(4);
  await expect(ands).toHaveCount(1);
  for (const text of await ors.allTextContents()) expect(text.trim()).toBe("∨");
  await expect(ands).toHaveText("∧");
});
