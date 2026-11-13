const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const { mkdirSync } = require("node:fs");
const base = process.env.AUTH_UI_BASE_URL || "http://127.0.0.1:4208";
const artifacts = process.env.AUTH_UI_ARTIFACT_DIR || "/tmp/lab-router-browser";
mkdirSync(artifacts, { recursive: true });
(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox"],
    ...(process.env.AUTH_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.AUTH_CHROMIUM_EXECUTABLE }
      : {}),
  });
  try {
    for (const [grade, label, slug, category] of [
      [2, "Play Lab", "play", "LOWER_PLAY"],
      [10, "Music Studio", "music", "ARTS_MUSIC"],
      [10, "Pure Sciences Lab", "pure", "STEM_PURE"],
      [8, "Junior Science Lab", "", null],
    ]) {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
      });
      await context.addInitScript(
        ({ grade }) =>
          localStorage.setItem(
            "assignments-hub-auth",
            JSON.stringify({
              state: {
                accessToken: "fixture",
                refreshToken: "fixture",
                accessTokenExpiresAt: Date.now() + 3600000,
                user: {
                  id: 10,
                  schoolId: 2,
                  role: "STUDENT",
                  name: "Lab learner",
                  grade: `Grade ${grade}`,
                  isIndependentTrial: false,
                },
              },
              version: 0,
            }),
          ),
        { grade },
      );
      const target = `/student/labs${slug ? `/${slug}` : ""}`;
      await context.route("**/api/v1/**", async (route) => {
        const path = new URL(route.request().url()).pathname;
        let data = [];
        if (path.endsWith("/student/lab-config"))
          data = { label, route: target, category };
        else if (path.endsWith("/student/content-scope"))
          data = {
            grade,
            pathway: grade >= 10 ? "STEM" : null,
            track: grade >= 10 ? "Pure Sciences" : null,
            subjects: [],
            availability: { labs: 0, skills: 0, csl: grade >= 10 },
            setup_required: false,
          };
        else if (path.endsWith("/student/lab-modules") && slug === "music")
          data = [
            {
              id: "fixture-module",
              subject: "Music",
              topic: "Rhythm and tempo",
              question_count: 0,
            },
          ];
        else if (/\/schools\/2$/.test(path))
          data = { id: 2, name: "Demo Academy", logoUrl: null };
        await route.fulfill({ json: data });
      });
      const page = await context.newPage();
      await page.goto(base + "/student/labs");
      await page
        .getByRole("heading", {
          name: slug === "music" ? "Music Production" : label,
          exact: true,
        })
        .waitFor();
      assert.equal(new URL(page.url()).pathname, target);
      const nav = page.getByRole("navigation", {
        name: "Workspace navigation",
      });
      assert.equal(
        await nav
          .getByRole("link", { name: label, exact: true })
          .getAttribute("href"),
        target,
      );
      if (slug === "play")
        await page
          .getByRole("heading", { name: "No activities published yet" })
          .waitFor();
      if (slug === "music")
        await page
          .getByRole("heading", { name: "Music Production", exact: true })
          .waitFor();
      await page.screenshot({
        path: `${artifacts}/${slug || "junior"}-desktop.png`,
        fullPage: true,
      });
      await page.setViewportSize({ width: 390, height: 844 });
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await page.screenshot({
        path: `${artifacts}/${slug || "junior"}-mobile.png`,
        fullPage: true,
      });
      if (slug === "pure") {
        await page.goto(base + "/student/labs/music");
        await page
          .getByRole("heading", {
            name: "This lab isn’t part of your current pathway.",
          })
          .waitFor();
        await page.goto(base + "/student/stem-labs");
        await page.getByRole("heading", { name: label, exact: true }).waitFor();
        assert.equal(new URL(page.url()).pathname, target);
      }
      await context.close();
    }
    console.log(
      "PASS: Play, Music, Pure Sciences and junior routes; dynamic navigation; published modules; empty states; wrong-pathway handling; legacy redirect; mobile width.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
