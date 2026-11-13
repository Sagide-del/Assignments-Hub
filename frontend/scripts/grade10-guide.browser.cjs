const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  { mkdirSync } = require("node:fs");
const base = process.env.AUTH_UI_BASE_URL || "http://127.0.0.1:4206",
  dir = process.env.AUTH_UI_ARTIFACT_DIR || "/tmp/grade10-guide";
mkdirSync(dir, { recursive: true });
const id = "eaf37372-651b-4cb7-8668-ad479c9c9fa2";
// Synthetic browser fixture; this file never publishes a real official code.
const combination = {
  id,
  code: "ST0000",
  pathway: "STEM",
  track: "Pure Sciences",
  subjects: ["Biology", "Chemistry", "Physics"],
  source_url: "https://education.go.ke/catalog",
  verified_at: "2026-11-13",
  careers: ["Scientist"],
  preparation: {
    average: 20,
    indicators: [
      {
        area: "integratedscience",
        subject: "Integrated Science",
        percentage: 20,
        gap: 40,
      },
    ],
  },
};
(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox"],
    ...(process.env.AUTH_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.AUTH_CHROMIUM_EXECUTABLE }
      : {}),
  });
  async function context(grade, role = "STUDENT", empty = false) {
    const ctx = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
      }),
      writes = [];
    let choice = null,
      imported = [],
      savedResults = [];
    await ctx.addInitScript(
      ({ grade, role }) =>
        localStorage.setItem(
          "assignments-hub-auth",
          JSON.stringify({
            state: {
              accessToken: "test-token",
              refreshToken: "test-refresh",
              accessTokenExpiresAt: Date.now() + 3600000,
              user: {
                id: 10,
                schoolId: 2,
                role,
                name: "Demo learner",
                grade: `Grade ${grade}`,
                isIndependentTrial: false,
              },
            },
            version: 0,
          }),
        ),
      { grade, role },
    );
    await ctx.route("**/api/v1/**", async (route) => {
      const req = route.request(),
        path = new URL(req.url()).pathname,
        body = req.postData() ? JSON.parse(req.postData()) : null;
      let json = [];
      if (path.endsWith("/student/lab-config")) json = {label: grade <= 9 ? "Junior Science Lab" : "Labs", route: "/student/labs", category: null};
      else if (path.endsWith("/career/kjsea-results")) {
        if (req.method() === "PUT") {
          writes.push({ path, body });
          savedResults = body.results;
        }
        json = {
          results: savedResults,
          source: "SELF_REPORTED",
          updated_at: "2026-11-13",
        };
      } else if (path.endsWith("/student/content-scope"))
        json = {
          grade,
          pathway: null,
          track: null,
          subjects: [],
          availability: { labs: 0, skills: 0, csl: false },
          setup_required: false,
        };
      else if (path.endsWith("/schools/2"))
        json = { id: 2, name: "Demo school", code: "DEMO" };
      else if (path.endsWith("/career/recommend-combinations")) {
        if (body && Object.keys(body).length) writes.push({ path, body });
        json = {
          catalog_count: empty ? 0 : 1,
          catalog: empty
            ? []
            : [
                {
                  ...combination,
                  preparation: savedResults.some((r) => r.performance_level)
                    ? {
                        average: null,
                        indicators: [
                          {
                            area: "integratedscience",
                            subject: "Integrated Science",
                            percentage: null,
                            performance_level: savedResults.find(
                              (r) => r.performance_level,
                            ).performance_level,
                            gap: null,
                          },
                        ],
                      }
                    : combination.preparation,
                },
              ],
          pathways: [
            {
              id: 1,
              name: "Pure Sciences",
              pathway: "STEM",
              description: "Explore science",
              careers: ["Scientist"],
            },
          ],
          target_score: 60,
          scores: [],
          score_source: "none",
          choice,
        };
      } else if (path.endsWith("/career/selection")) {
        writes.push({ path, body });
        choice = {
          combination_id: body.combination_id ?? null,
          track_id: body.track_id ?? null,
          combination: body.combination_id ? combination : null,
          track: body.track_id ? { name: "Pure Sciences" } : null,
        };
        json = choice;
      } else if (path.endsWith("/career/combinations/import")) {
        writes.push({ path, body });
        json = body.dry_run ? { records: 1 } : { imported: 1 };
        if (!body.dry_run) imported = [combination];
      } else if (path.endsWith("/career/combinations")) json = imported;
      await route.fulfill({ json });
    });
    return { ctx, writes };
  }
  try {
    const s = await context(9),
      p = await s.ctx.newPage();
    await p.goto(base + "/student/career/navigator");
    await p
      .getByRole("heading", { name: "Grade 10 Selection Guide", exact: true })
      .waitFor();
    await p.getByRole("heading", { name: "ST0000", exact: true }).waitFor();
    const search = p.getByRole("textbox", { name: "Search combination code or subject" });
    await search.fill("nonexistent subject");
    await p.getByText("No matching combinations. Try another subject, code or pathway.").waitFor();
    await search.fill("Biology");
    await p.getByRole("heading", { name: "ST0000", exact: true }).waitFor();
    await search.fill("");
    await p.getByRole("button", { name: "Shortlist combination" }).click();
    await p
      .getByRole("status")
      .filter({ hasText: "Saved as a planning preference" })
      .waitFor();
    assert.deepEqual(s.writes.find((w) => w.path.endsWith("/selection")).body, {
      combination_id: id,
    });
    await p
      .locator("summary")
      .filter({ hasText: "Add school or KJSEA" })
      .click();
    await p.getByLabel("Mathematics percentage", { exact: true }).fill("0");
    await p.getByRole("button", { name: "Update preparation" }).click();
    await p
      .getByRole("status")
      .filter({ hasText: "Preparation updated" })
      .waitFor();
    assert.equal(
      s.writes.find((w) => w.path.endsWith("/recommend-combinations")).body
        .scores[0].percentage,
      0,
    );
    await p.locator("summary").filter({ hasText: "Grade 9 results" }).click();
    await p
      .getByLabel("Integrated Science saved level", { exact: true })
      .selectOption("EE1");
    await p
      .getByRole("button", { name: "Save Grade 9 results", exact: true })
      .click();
    await p.getByRole("status").filter({ hasText: "Results saved." }).waitFor();
    assert.deepEqual(
      s.writes.find((w) => w.path.endsWith("/kjsea-results")).body,
      {
        results: [{ subject: "Integrated Science", performance_level: "EE1" }],
      },
    );
    await p.getByText("EE1 · reported level", { exact: false }).waitFor();
    assert.equal(
      await p
        .getByLabel("Integrated Science saved percentage", { exact: true })
        .inputValue(),
      "",
    );
    await p.screenshot({
      path: dir + "/grade9-guide-desktop.png",
      fullPage: true,
    });
    await p.setViewportSize({ width: 390, height: 844 });
    await p.waitForFunction(
      () =>
        document.querySelector(".workspace-sidebar").getBoundingClientRect()
          .right <= 1,
    );
    assert(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    await p.screenshot({
      path: dir + "/grade9-guide-mobile.png",
      fullPage: true,
    });
    await s.ctx.close();
    const senior = await context(10),
      q = await senior.ctx.newPage();
    await q.goto(base + "/student/career/navigator");
    await q
      .getByText("This selection guide is for Grade 9 learners.", {
        exact: true,
      })
      .waitFor();
    assert.equal(senior.writes.length, 0);
    await q
      .getByRole("link", { name: "Career Compass", exact: true })
      .waitFor();
    await senior.ctx.close();
    const fallback = await context(9, "STUDENT", true),
      r = await fallback.ctx.newPage();
    await r.goto(base + "/student/career/navigator");
    await r.getByText(/official combinations catalogue is awaiting/).waitFor();
    assert.equal(await r.getByText("ST0000", { exact: true }).count(), 0);
    await r.getByRole("button", { name: "Shortlist pathway" }).click();
    await r
      .getByRole("status")
      .filter({ hasText: "Saved as a planning preference" })
      .waitFor();
    assert.equal(
      fallback.writes.find((w) => w.path.endsWith("/selection")).body.track_id,
      1,
    );
    await fallback.ctx.close();
    const admin = await context(11, "PLATFORM_ADMIN"),
      a = await admin.ctx.newPage();
    await a.goto(base + "/platform/subject-combinations");
    await a
      .getByRole("heading", {
        name: "Grade 10 subject combinations",
        exact: true,
      })
      .waitFor();
    await a
      .getByLabel("Official source page")
      .fill("https://education.go.ke/catalog");
    await a.getByLabel("Catalogue JSON file").setInputFiles({
      name: "synthetic-test.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify([
          {
            code: "ST0000",
            pathway: "STEM",
            track: "Pure Sciences",
            subjects: ["Biology", "Chemistry", "Physics"],
          },
        ]),
      ),
    });
    await a
      .getByRole("button", { name: "Validate without publishing" })
      .click();
    await a
      .getByRole("status")
      .filter({ hasText: "records validated" })
      .waitFor();
    assert(
      await a.getByRole("button", { name: "Publish catalogue" }).isDisabled(),
    );
    await a.getByRole("checkbox").check();
    await a.getByRole("button", { name: "Publish catalogue" }).click();
    await a
      .getByRole("status")
      .filter({ hasText: "1 combinations published" })
      .waitFor();
    assert.deepEqual(
      admin.writes.map((w) => w.body.dry_run),
      [true, false],
    );
    await admin.ctx.close();
    console.log(
      "PASS: Grade 9 guide, zero-score handling, self-only shortlist, Grade 10 gating, missing-catalogue honesty, responsive UI and reviewed admin import.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
