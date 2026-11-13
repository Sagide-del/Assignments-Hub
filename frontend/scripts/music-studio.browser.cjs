const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const { mkdirSync } = require("node:fs");
const base = process.env.AUTH_UI_BASE_URL || "http://127.0.0.1:4209";
const artifacts =
  process.env.AUTH_UI_ARTIFACT_DIR || "/tmp/music-studio-browser";
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
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    });
    await context.addInitScript(() =>
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
              name: "Music learner",
              grade: "Grade 10",
              isIndependentTrial: false,
            },
          },
          version: 0,
        }),
      ),
    );
    let saved = null,
      failSave = false;
    const writes = [];
    await context.route("**/api/v1/**", async (route) => {
      const req = route.request(),
        path = new URL(req.url()).pathname;
      let data = [];
      if (path.endsWith("/student/lab-config"))
        data = {
          label: "Music Studio",
          route: "/student/labs/music",
          category: "ARTS_MUSIC",
        };
      else if (path.endsWith("/student/content-scope"))
        data = {
          grade: 10,
          pathway: "Arts & Sports",
          track: "Performing Arts",
          subjects: ["Music"],
          availability: { labs: 0, skills: 0, csl: true },
          setup_required: false,
        };
      else if (path.includes("/student/music-studio/projects")) {
        if (["POST", "PUT"].includes(req.method())) {
          if (failSave)
            return route.fulfill({
              status: 503,
              json: { message: "Temporary storage failure" },
            });
          const body = req.postDataJSON();
          writes.push(body);
          saved = {
            ...body,
            id: "66d1bfde-9ae5-4144-852a-91ea7372a444",
            updated_at: "2026-11-13T12:00:00Z",
          };
          data = saved;
        } else
          data = path.endsWith("/projects") ? (saved ? [saved] : []) : saved;
      } else if (/\/schools\/2$/.test(path))
        data = { id: 2, name: "Demo Academy" };
      await route.fulfill({ json: data });
    });
    const page = await context.newPage(),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base + "/student/labs/music/loops");
    await page
      .getByRole("heading", { name: "Music Studio", exact: true })
      .waitFor();
    await page
      .getByRole("article", { name: "Isukuti Lead Drum", exact: true })
      .waitFor();
    const transfer = await page.evaluateHandle(() => new DataTransfer());
    await page
      .getByRole("article", { name: "Isukuti Lead Drum", exact: true })
      .dispatchEvent("dragstart", { dataTransfer: transfer });
    await page
      .getByRole("group", { name: "Track 1", exact: true })
      .dispatchEvent("drop", { dataTransfer: transfer });
    await page
      .getByRole("region", { name: "Cultural context" })
      .getByText(/Isukha and Idakho/)
      .first()
      .waitFor();
    await page
      .getByLabel("Time signature", { exact: true })
      .selectOption("6/8");
    await page
      .getByRole("button", { name: "Play composition", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Pause composition", exact: true })
      .waitFor();
    await page.waitForFunction(
      () =>
        document.querySelector('meter[aria-label="Output level"]')?.value >
        0.002,
    );
    await page.getByLabel("Tempo", { exact: true }).focus();
    await page.getByLabel("Tempo", { exact: true }).press("End");
    assert.equal(
      await page.getByLabel("Current tempo", { exact: true }).textContent(),
      "180 BPM",
    );
    await page.getByLabel("Selected track", { exact: true }).selectOption("2");
    await page
      .getByRole("button", {
        name: "Add Isukuti Response Drum to Track 2",
        exact: true,
      })
      .click();
    await page
      .getByRole("group", { name: "Track 2", exact: true })
      .getByText("Isukuti Response Drum", { exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "Mute Track 1", exact: true })
      .click();
    assert.equal(
      await page
        .getByRole("button", { name: "Mute Track 1", exact: true })
        .getAttribute("aria-pressed"),
      "true",
    );
    await page
      .getByRole("button", { name: "Solo Track 2", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Stop composition", exact: true })
      .click();
    await page
      .getByLabel("Time signature", { exact: true })
      .selectOption("12/8");
    await page
      .getByLabel("Composition title", { exact: true })
      .fill("My Isukuti rhythm study");
    await page
      .getByRole("button", { name: "Save project", exact: true })
      .click();
    await page
      .getByRole("status")
      .filter({ hasText: "Saved to your account" })
      .waitFor();
    assert.equal(writes.length, 1);
    assert.equal(writes[0].bpm, 180);
    assert.equal(writes[0].time_signature, "12/8");
    assert.equal(writes[0].tracks_json.length, 4);
    assert.equal(writes[0].tracks_json[0].loop_id, "sikuti_lead");
    assert.equal(writes[0].tracks_json[1].solo, true);
    assert.ok(!JSON.stringify(writes[0]).includes("player"));
    await page.screenshot({
      path: artifacts + "/music-desktop.png",
      fullPage: true,
    });
    await page.reload();
    await page.getByLabel("Composition title", { exact: true }).waitFor();
    await page.waitForFunction(
      () =>
        document.querySelector('[aria-label="Composition title"]').value ===
        "My Isukuti rhythm study",
    );
    assert.equal(
      await page
        .getByRole("button", { name: "Play composition", exact: true })
        .count(),
      1,
    );
    await page.getByRole("button", { name: "New", exact: true }).click();
    await page.getByRole("button", { name: "Projects", exact: true }).click();
    await page.getByRole("button", { name: /My Isukuti rhythm study/ }).click();
    assert.equal(
      await page.getByLabel("Composition title", { exact: true }).inputValue(),
      "My Isukuti rhythm study",
    );
    failSave = true;
    await page
      .getByLabel("Composition title", { exact: true })
      .fill("Offline draft");
    await page
      .getByRole("button", { name: "Save project", exact: true })
      .click();
    await page
      .getByRole("alert")
      .filter({ hasText: "Could not save to your account" })
      .waitFor();
    assert.equal(
      await page
        .getByRole("status")
        .filter({ hasText: "Saved to your account" })
        .count(),
      0,
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(
      () =>
        document
          .querySelector("aside.workspace-sidebar")
          .getBoundingClientRect().right <= 1,
    );
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.getByRole("button", { name: "Loops", exact: true }).click();
    await page.getByLabel("Selected track", { exact: true }).selectOption("3");
    await page
      .getByRole("button", {
        name: "Add Benga Guitar Riff to Track 3",
        exact: true,
      })
      .click();
    await page
      .getByRole("group", { name: "Track 3", exact: true })
      .getByText("Benga Guitar Riff", { exact: true })
      .waitFor();
    await page.screenshot({
      path: artifacts + "/music-mobile.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 1440, height: 1000 });
    for (const [category, name] of [
      ["Dancehall", "Dancehall Drums"],
      ["Reggae", "Reggae Drums"],
      ["Kenyan Folk-inspired", "Kenyan Folk-inspired Call & Response"],
    ]) {
      await page.getByRole("button", { name: category, exact: true }).click();
      await page.getByRole("article", { name, exact: true }).waitFor();
      await page
        .getByLabel("Selected track", { exact: true })
        .selectOption("1");
      await page
        .getByRole("button", { name: `Add ${name} to Track 1`, exact: true })
        .click();
      await page
        .getByRole("button", { name: "Solo Track 2", exact: true })
        .evaluate((e) => {
          if (e.getAttribute("aria-pressed") === "true") e.click();
        });
      await page
        .getByRole("button", { name: "Mute Track 1", exact: true })
        .evaluate((e) => {
          if (e.getAttribute("aria-pressed") === "true") e.click();
        });
      await page
        .getByRole("button", { name: "Play composition", exact: true })
        .click();
      await page.waitForFunction(
        () =>
          document.querySelector('meter[aria-label="Output level"]')?.value >
          0.002,
      );
      await page
        .getByRole("button", { name: "Stop composition", exact: true })
        .click();
    }
    await page.getByRole("button", { name: "All styles", exact: true }).click();
    await page.getByLabel("Search loops", { exact: true }).fill("reggae");
    assert.equal(await page.getByRole("article").count(), 3);
    await page.getByLabel("Search loops", { exact: true }).fill("");
    await page.screenshot({
      path: artifacts + "/expanded-loop-library.png",
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    await context.close();
    console.log(
      "PASS: actual non-silent audio after loop drop, tempo/meter controls, cultural context, mixing, project save/reopen, local draft restore, failed-save honesty and mobile tap-to-add.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
