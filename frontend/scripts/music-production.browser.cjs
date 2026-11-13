const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const { readFileSync, mkdirSync } = require("node:fs");
const { resolve } = require("node:path");
const catalog = JSON.parse(
  readFileSync(
    resolve(__dirname, "../public/assets/music/songs/songs.json"),
    "utf8",
  ),
).songs;
const base = process.env.AUTH_UI_BASE_URL || "http://127.0.0.1:4212",
  artifacts =
    process.env.AUTH_UI_ARTIFACT_DIR || "/tmp/music-production-browser";
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
    let records = [],
      sequence = 0;
    const errors = [];
    async function context(role = "STUDENT") {
      const ctx = await browser.newContext({
        viewport: { width: 1440, height: 1100 },
      });
      await ctx.addInitScript(
        ({ role }) =>
          localStorage.setItem(
            "assignments-hub-auth",
            JSON.stringify({
              state: {
                accessToken: "fixture",
                refreshToken: "fixture",
                accessTokenExpiresAt: Date.now() + 3600000,
                user: {
                  id: role === "STUDENT" ? 10 : 11,
                  schoolId: 2,
                  role,
                  name: role === "STUDENT" ? "Music learner" : "Music teacher",
                  grade: role === "STUDENT" ? "Grade 10" : undefined,
                  isIndependentTrial: false,
                },
              },
              version: 0,
            }),
          ),
        { role },
      );
      await ctx.route("**/api/v1/**", async (route) => {
        const req = route.request(),
          path = new URL(req.url()).pathname;
        let data = [];
        if (path.endsWith("/teacher/classes"))
          data = [
            {
              subject: "Music & Dance",
              stream: { name: "10M", grade: "Grade 10" },
            },
          ];
        else if (path.endsWith("/student/lab-config"))
          data = {
            label: "Music Studio",
            route: "/student/labs/music",
            category: "ARTS_MUSIC",
            icon: "Music",
          };
        else if (path.endsWith("/student/content-scope"))
          data = {
            grade: 10,
            pathway: "Arts & Sports",
            track: "Performing Arts",
            subjects: ["Music & Dance"],
            availability: { labs: 0, skills: 0, csl: true },
            setup_required: false,
          };
        else if (path.endsWith("/music-production/songs")) data = catalog;
        else if (path.endsWith("/music-production/teacher/submissions"))
          data = records
            .filter((r) => r.status !== "DRAFT")
            .map((r) => ({
              ...r,
              student: {
                name: "Music learner",
                admissionNumber: "MUSIC1001",
                grade: "Grade 10",
              },
            }));
        else if (path.includes("/music-production/teacher/submissions/")) {
          const id = path.split("/").pop(),
            body = req.postDataJSON(),
            record = records.find((r) => r.id === id);
          record.score = body.score;
          record.review_comment = body.comment;
          record.status = "ASSESSED";
          data = record;
        } else if (
          path.endsWith("/music-production/projects") &&
          req.method() === "GET"
        )
          data = records;
        else if (path.includes("/music-production/projects")) {
          if (req.method() === "GET") {
            data = records.find((r) => r.id === path.split("/").pop());
          } else if (path.endsWith("/submit")) {
            const id = path.split("/").at(-2),
              record = records.find((r) => r.id === id);
            record.status = "SUBMITTED";
            data = record;
          } else if (["POST", "PUT"].includes(req.method())) {
            const body = req.postDataJSON(),
              existing =
                req.method() === "PUT"
                  ? records.find((r) => r.id === path.split("/").pop())
                  : null;
            data = {
              ...body,
              id:
                existing?.id ??
                `77d1bfde-9ae5-4144-852a-${String(++sequence).padStart(12, "0")}`,
              status: "DRAFT",
              updated_at: new Date().toISOString(),
              score: null,
              review_comment: null,
            };
            records = existing
              ? records.map((r) => (r.id === data.id ? data : r))
              : [data, ...records];
          }
        } else if (/\/schools\/2$/.test(path))
          data = { id: 2, name: "Demo Academy" };
        await route.fulfill({ json: data });
      });
      const page = await ctx.newPage();
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("dialog", (d) => void d.accept());
      return { ctx, page };
    }
    const { ctx, page } = await context();
    await page.goto(base + "/student/labs/music/composition");
    await page
      .getByRole("heading", { name: "Music Studio", exact: true })
      .waitFor();
    assert.equal(
      await page
        .getByRole("button", { name: "Save mix", exact: true })
        .evaluate((e) => getComputedStyle(e).backgroundColor),
      "rgb(16, 24, 32)",
    );
    await page
      .getByRole("img", { name: /6\/8 score with Soprano, Alto, Tenor, Bass/ })
      .waitFor();
    assert.equal(
      await page.getByLabel("Production tempo", { exact: true }).inputValue(),
      "90",
    );
    const nav = page
      .getByRole("navigation", { name: "Workspace navigation" })
      .getByRole("link", { name: "Music Studio", exact: true });
    assert.match(await nav.locator("svg").getAttribute("class"), /music/i);
    assert.doesNotMatch(
      await nav.locator("svg").getAttribute("class"),
      /flask/i,
    );
    await page.getByLabel("Score parts", { exact: true }).selectOption("all");
    const score = page.getByRole("img", { name: /score with Soprano/ });
    assert.match(
      await score.getAttribute("aria-label"),
      /Organ, Acoustic Guitar, Acoustic Bass, Drumset 1, Drumset 2/,
    );
    await page
      .getByRole("button", { name: "Choose a piece", exact: true })
      .click();
    await page
      .getByLabel("Search studio library", { exact: true })
      .fill("Brenda");
    await page
      .getByRole("heading", { name: "Vulindlela", exact: true })
      .waitFor();
    await page
      .getByRole("heading", { name: "Weekend Special", exact: true })
      .waitFor();
    await page
      .getByLabel("Search studio library", { exact: true })
      .fill("My Heart");
    const ref = page.getByRole("article").filter({
      has: page.getByRole("heading", {
        name: "My Heart Will Go On",
        exact: true,
      }),
    });
    await ref.getByRole("link", { name: "Listen", exact: true }).waitFor();
    assert.equal(await ref.getByRole("button").count(), 0);
    await page
      .getByLabel("Search studio library", { exact: true })
      .fill("Isukuti Circle");
    await page.getByRole("button", { name: "Open", exact: true }).click();
    await page.getByRole("img", { name: /6\/8 score/ }).waitFor();
    assert.equal(await page.getByRole("alert").count(), 0);
    await page
      .getByRole("navigation", { name: "Music activities" })
      .getByRole("link", { name: /Rhythm/ })
      .click();
    assert.equal(
      await page.getByRole("button", { name: /^isatsa step / }).count(),
      12,
    );
    await page
      .getByRole("button", { name: "isatsa step 2", exact: true })
      .click();
    await page
      .getByRole("navigation", { name: "Music activities" })
      .getByRole("link", { name: /Melody/ })
      .click();
    await page
      .getByRole("button", { name: "C5 bar 1 step 1", exact: true })
      .click();
    await page
      .getByRole("navigation", { name: "Music activities" })
      .getByRole("link", { name: /Instruments/ })
      .click();
    await page.getByRole("button", { name: /^Nyatiti/ }).click();
    await page.getByRole("button", { name: "Play C4", exact: true }).click();
    await page
      .getByRole("navigation", { name: "Music activities" })
      .getByRole("link", { name: /Arrange/ })
      .click();
    await page.getByRole("button", { name: "Play mix", exact: true }).click();
    await page
      .getByRole("button", { name: "Pause mix", exact: true })
      .waitFor();
    await page.waitForFunction(() =>
      [...document.querySelectorAll("[data-bar-index]")].some(
        (r) => r.getAttribute("fill") === "#edf3db",
      ),
    );
    await page.getByRole("button", { name: "Stop mix", exact: true }).click();
    assert.equal(
      await page
        .getByRole("region", { name: "Six track mixer" })
        .getByRole("heading", { level: 3 })
        .count(),
      6,
    );
    await page.getByLabel("Production tempo", { exact: true }).focus();
    await page.getByLabel("Production tempo", { exact: true }).press("End");
    await page
      .getByRole("navigation", { name: "Music activities" })
      .getByRole("link", { name: /Produce/ })
      .click();
    await page
      .getByLabel("Production reflection", { exact: true })
      .fill(
        "I contrasted the low drum pulse with a syncopated response and left room for the melody.",
      );
    const downloadPromise = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Download MP3", exact: true })
      .click();
    const download = await downloadPromise;
    assert.match(download.suggestedFilename(), /Music learner\.mp3$/);
    const mp3 = await download.path(),
      bytes = readFileSync(mp3);
    assert.ok(bytes.length > 2000);
    assert.ok(bytes[0] === 0xff || bytes.subarray(0, 3).toString() === "ID3");
    const decoded = await page.evaluate(async (base64) => {
      const array = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)),
        ctx = new AudioContext(),
        buffer = await ctx.decodeAudioData(array.buffer);
      let peak = 0;
      for (const v of buffer.getChannelData(0))
        peak = Math.max(peak, Math.abs(v));
      const result = { duration: buffer.duration, peak };
      await ctx.close();
      return result;
    }, bytes.toString("base64"));
    assert.ok(decoded.duration > 4 && decoded.peak > 0.001);
    await download.saveAs(artifacts + "/original-student-mix.mp3");
    const midiPromise = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Melody MIDI", exact: true })
      .click();
    const midi = await midiPromise;
    assert.match(midi.suggestedFilename(), /\.mid$/);
    assert.equal(
      readFileSync(await midi.path()).toString("ascii", 0, 4),
      "MThd",
    );
    await page.getByRole("button", { name: "Save mix", exact: true }).click();
    await page
      .getByRole("status")
      .filter({ hasText: "Saved to your account" })
      .waitFor();
    assert.equal(records[0].tracks_json.tracks.length, 6);
    assert.equal(records[0].tracks_json.tracks[0].instrument, "Nyatiti");
    await page
      .getByRole("button", { name: "Submit to teacher", exact: true })
      .click();
    await page
      .getByRole("status")
      .filter({ hasText: "Submitted to your Music teacher" })
      .waitFor();
    assert.equal(records[0].status, "SUBMITTED");
    await page.screenshot({
      path: artifacts + "/production-desktop.png",
      fullPage: true,
    });
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
    await page.screenshot({
      path: artifacts + "/production-mobile.png",
      fullPage: true,
    });
    const teacher = await context("TEACHER");
    await teacher.page.goto(base + "/teacher/music");
    await teacher.page.getByRole("button", { name: /Music learner/ }).click();
    await teacher.page
      .getByLabel("Music assessment score", { exact: true })
      .fill("82");
    await teacher.page
      .getByLabel("Music assessment feedback", { exact: true })
      .fill("Clear rhythmic contrast and thoughtful balance.");
    await teacher.page
      .getByRole("button", { name: "Save assessment", exact: true })
      .click();
    await teacher.page
      .getByRole("status")
      .filter({ hasText: "Assessment saved." })
      .waitFor();
    assert.equal(records[0].status, "ASSESSED");
    await teacher.ctx.close();
    await page.reload();
    await page.getByRole("button", { name: "Projects", exact: true }).click();
    await page.getByRole("button", { name: /ASSESSED/ }).click();
    await page
      .getByText("Clear rhythmic contrast and thoughtful balance.", {
        exact: true,
      })
      .waitFor();
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(base + "/student/labs/music");
    await page
      .getByRole("heading", { name: "Shape the band", exact: true })
      .waitFor();
    await page.getByLabel("Count in", { exact: true }).uncheck();
    await page
      .getByRole("button", { name: "Play backing", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Pause backing", exact: true })
      .waitFor();
    await page.waitForTimeout(850);
    await page
      .getByRole("button", { name: "Pause backing", exact: true })
      .click();
    const paused = Number(
      await page.getByLabel("Playback position", { exact: true }).inputValue(),
    );
    assert.ok(paused > 0.5);
    await page
      .getByRole("button", { name: "Solo keys stem", exact: true })
      .click();
    await page.getByLabel("Selected stem pan", { exact: true }).fill("-0.7");
    const backingDownload = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Export backing MP3", exact: true })
      .click();
    const backing = await backingDownload,
      backingBytes = readFileSync(await backing.path());
    const analysis = await page.evaluate(async (b64) => {
      const context = new AudioContext(),
        buffer = await context.decodeAudioData(
          Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer,
        );
      const channels = [0, 1].map((i) =>
        buffer.getChannelData(i).reduce((sum, v) => sum + v * v, 0),
      );
      await context.close();
      return { duration: buffer.duration, channels };
    }, backingBytes.toString("base64"));
    assert.ok(analysis.duration > 10 && analysis.duration < 11);
    assert.ok(analysis.channels[0] > analysis.channels[1] * 2);
    assert.ok(analysis.channels[0] > 0.01);
    await backing.saveAs(artifacts + "/recorded-backing.mp3");
    await page
      .getByRole("button", { name: "Save session", exact: true })
      .click();
    await page
      .getByRole("status")
      .filter({ hasText: "Saved to your account" })
      .waitFor();
    const practiceId = records[0].id;
    assert.equal(
      records[0].tracks_json.play_along.stems.find((s) => s.id === "keys").pan,
      -0.7,
    );
    await page
      .getByRole("navigation", { name: "Studio workspace" })
      .getByRole("link", { name: "My projects", exact: true })
      .click();
    await page
      .getByRole("link")
      .filter({
        has: page.getByRole("heading", {
          name: "Ode to Joy — my session",
          exact: true,
        }),
      })
      .click();
    await page
      .getByRole("status")
      .filter({ hasText: "Loaded from your account" })
      .waitFor();
    assert.ok(page.url().includes(practiceId));
    await page.screenshot({
      path: artifacts + "/play-along-desktop.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(250);
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.screenshot({
      path: artifacts + "/play-along-mobile.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 1440, height: 1000 });
    const arrangementLibrary = JSON.parse(
      readFileSync(
        resolve(__dirname, "../public/assets/music/recorded/arrangements.json"),
        "utf8",
      ),
    ).arrangements;
    const picker = page.getByLabel("Play-along piece", { exact: true });
    assert.equal(await picker.locator("option").count(), 12);
    for (const arrangement of arrangementLibrary) {
      await picker.selectOption(arrangement.id);
      await page
        .getByRole("heading", { name: arrangement.title, exact: true })
        .waitFor();
      await page.getByLabel("Count in", { exact: true }).uncheck();
      await page
        .getByRole("button", { name: "Play backing", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Pause backing", exact: true })
        .waitFor();
      await page.waitForTimeout(150);
      await page
        .getByRole("button", { name: "Stop backing", exact: true })
        .click();
      if (
        ["isukuti-circle", "rhumba-evening"].includes(arrangement.song_slug)
      ) {
        const exported = page.waitForEvent("download");
        await page
          .getByRole("button", { name: "Export backing MP3", exact: true })
          .click();
        const file = await exported,
          bytes = readFileSync(await file.path());
        const audio = await page.evaluate(async (b64) => {
          const c = new AudioContext(),
            b = await c.decodeAudioData(
              Uint8Array.from(atob(b64), (v) => v.charCodeAt(0)).buffer,
            );
          const energy = b.getChannelData(0).reduce((sum, v) => sum + v * v, 0);
          await c.close();
          return { duration: b.duration, energy };
        }, bytes.toString("base64"));
        assert.ok(Math.abs(audio.duration - arrangement.duration) < 0.1);
        assert.ok(audio.energy > 0.01);
        await page
          .getByRole("button", { name: "Save session", exact: true })
          .click();
        await page
          .getByRole("status")
          .filter({ hasText: "Saved to your account" })
          .waitFor();
        assert.equal(records[0].bpm, arrangement.bpm);
        assert.equal(records[0].time_signature, arrangement.time_signature);
        assert.equal(
          records[0].tracks_json.play_along.arrangement_id,
          arrangement.id,
        );
      }
    }
    await page.getByRole("button", { name: "Library", exact: true }).click();
    await page
      .getByLabel("Search studio library", { exact: true })
      .fill("Benga");
    await page.getByRole("button", { name: "Play along", exact: true }).click();
    assert.equal(await picker.inputValue(), "benga-daybreak-band-v1");
    assert.deepEqual(errors, []);
    await ctx.close();
    console.log(
      "PASS: commercial listening references, original exercises, SATB/instrument notation, 12-step rhythm, four-bar melody, six tracks, synth instruments, Music icon, measure highlight, audible MP3 decode, saving/submission, teacher assessment, twelve recorded pieces, dynamic meters, genre search and mobile layout.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
