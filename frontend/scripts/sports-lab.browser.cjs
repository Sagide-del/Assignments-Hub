const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  { readFileSync, mkdirSync } = require("node:fs"),
  { resolve } = require("node:path"),
  ts = require("typescript");
const source = ts.transpileModule(
    readFileSync(
      resolve(__dirname, "../../backend/src/student/sports/sports-engine.ts"),
      "utf8",
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2021,
      },
    },
  ).outputText,
  engine = {};
new Function("exports", source)(engine);
const base = process.env.AUTH_UI_BASE_URL || "http://127.0.0.1:4224",
  out = process.env.AUTH_UI_ARTIFACT_DIR || "/tmp/sports-lab-browser";
mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
    ...(process.env.AUTH_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.AUTH_CHROMIUM_EXECUTABLE }
      : {}),
  });
  try {
    const errors = [],
      progress = new Map();
    let submissions = 0;
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
              name: "Sports learner",
              grade: "Grade 10",
              isIndependentTrial: false,
            },
          },
          version: 0,
        }),
      ),
    );
    await context.route("**/api/v1/**", async (route) => {
      const req = route.request(),
        path = new URL(req.url()).pathname;
      let data = [];
      if (path.endsWith("/student/lab-config"))
        data = {
          label: "Sports Lab",
          route: "/student/labs/sports",
          category: "ARTS_SPORTS",
        };
      else if (path.endsWith("/student/content-scope"))
        data = {
          grade: 10,
          pathway: "Arts & Sports Science",
          track: "Sports Science",
          subjects: ["Sports & Recreation"],
          availability: { labs: 0, skills: 0, csl: true },
          setup_required: false,
        };
      else if (path.endsWith("/student/sports-lab/activities"))
        data = {
          grade: 10,
          activities: engine.SPORTS_IDS.map((id) => ({
            id,
            ...engine.SPORTS_LESSONS[id],
            focus: engine.SPORTS_LESSONS[id].focus[0],
            controls: engine.SPORTS_CONTROLS[id],
            questions: engine
              .sportsQuestions(id, 10)
              .map(({ answer, explanation, ...q }) => q),
          })),
        };
      else if (path.endsWith("/student/sports-lab/progress"))
        data = [...progress.values()];
      else if (path.endsWith("/student/sports-lab/complete")) {
        const p = req.postDataJSON();
        try {
          const result = engine.assessSports(p, 10);
          progress.set(p.simulation, {
            simulation: p.simulation,
            score: result.score,
            completed_at: result.completed ? new Date().toISOString() : null,
          });
          data = { ...result, progress: progress.get(p.simulation) };
          submissions++;
        } catch (e) {
          return route.fulfill({ status: 400, json: { message: e.message } });
        }
      } else if (path.endsWith("/labs/901"))
        data = {
          id: 901,
          key: "ss-bio-10-5",
          title: "Respiratory System Simulator",
          grade: "Grade 10",
          subject: "Biology",
          description: "Compare ventilation.",
          questions: [],
          steps: [],
          media: [],
          learningOutcomes: [],
          materials: [],
          safetyChecklist: [],
          assessmentCriteria: [],
          reflectionPrompts: [],
        };
      else if (/\/schools\/2$/.test(path))
        data = { id: 2, name: "Demo Academy" };
      await route.fulfill({ json: data });
    });
    let page = await context.newPage();
    page.on("pageerror", (e) => {
      console.log("PAGE ERROR", page.url(), e.stack);
      errors.push(e.message);
    });
    page.on("dialog", (d) => void d.accept());
    await page.goto(base + "/student/labs/sports");
    await page
      .getByRole("heading", { name: "Sports Science Lab", exact: true })
      .waitFor();
    assert.equal(
      await page.getByRole("link", { name: /Skeletal explorer/ }).count(),
      1,
    );
    const nav = page
      .getByRole("navigation", { name: "Workspace navigation" })
      .getByRole("link", { name: "Sports Lab", exact: true });
    assert.match(await nav.locator("svg").getAttribute("class"), /dumbbell/);
    await page.screenshot({
      path: out + "/sports-dashboard.png",
      fullPage: true,
    });
    for (const id of engine.SPORTS_IDS) {
      await page.goto(base + "/student/labs/sports/" + id);
      await page
        .getByRole("heading", {
          name: engine.SPORTS_LESSONS[id].title,
          exact: true,
        })
        .waitFor();
      if (id !== "respiratory") {
        await page
          .getByRole("img", {
            name:
              id === "muscle"
                ? "Interactive three-dimensional sarcomere schematic"
                : "Interactive anatomical atlas skeleton",
            exact: true,
          })
          .waitFor();
        await page
          .getByText("Preparing the anatomical workspace…", { exact: true })
          .waitFor({ state: "hidden" });
      }
      if (id === "skeletal") {
        for (const name of ["Femur", "Tibia", "Ribs"])
          await page.getByRole("button", { name, exact: true }).click();
        await page.screenshot({
          path: out + "/sports-skeleton.png",
          fullPage: true,
        });
      }
      if (id === "reflex")
        await page
          .getByRole("button", {
            name: "Apply virtual heat stimulus",
            exact: true,
          })
          .click();
      await page
        .getByLabel("Investigation prediction", { exact: true })
        .fill(
          "Changing this input should change the modeled output because it affects the pathway.",
        );
      await page
        .getByLabel("Trial observation", { exact: true })
        .fill("The initial condition produced the displayed model result.");
      await page
        .getByRole("button", { name: "Record condition 1", exact: true })
        .click();
      const control = engine.SPORTS_CONTROLS[id][0];
      await page
        .getByLabel(control.label, { exact: true })
        .fill(String(control.initial + 5));
      await page
        .getByLabel("Trial observation", { exact: true })
        .fill(
          "The second condition changed the result while the remaining inputs stayed fixed.",
        );
      await page
        .getByRole("button", { name: "Record condition 2", exact: true })
        .click();
      await page
        .getByLabel("Investigation conclusion", { exact: true })
        .fill(
          "The two conditions support my prediction because the recorded outputs changed when I changed one input. The values follow the stated teaching assumptions.",
        );
      const qs = engine.sportsQuestions(id, 10);
      for (let i = 0; i < qs.length; i++)
        await page
          .locator("fieldset")
          .nth(i)
          .getByRole("radio")
          .nth(qs[i].answer)
          .check();
      await page
        .getByRole("button", {
          name: "Check & save investigation",
          exact: true,
        })
        .click();
      await page.getByRole("status").filter({ hasText: "100%" }).waitFor();
      assert.equal(progress.get(id).score, 100);
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(150);
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        id + " mobile overflow",
      );
      await page.screenshot({
        path: out + `/sports-${id}-mobile.png`,
        fullPage: true,
      });
      await page.setViewportSize({ width: 1440, height: 1000 });
    }
    assert.equal(submissions, 5);
    await page.goto(base + "/student/labs/sports");
    await page
      .getByText("5/5 investigations complete", { exact: true })
      .waitFor();
    await page.goto(base + "/student/stem-labs/901");
    await page
      .getByRole("heading", {
        name: "Respiratory System Simulator",
        exact: true,
      })
      .waitFor();
    await page.getByRole("img", { name: /Anatomical atlas model/ }).waitFor();
    await page
      .getByText("Lung lobes, airways and diaphragm", { exact: true })
      .waitFor({ state: "hidden" });
    await page
      .getByLabel("Respiratory prediction", { exact: true })
      .fill(
        "Deeper breaths should move more fresh air beyond the fixed conducting airway space.",
      );
    await page.getByLabel("Show rib cage", { exact: true }).check();
    await page
      .getByRole("button", { name: "Show graph with model", exact: true })
      .click();
    await page
      .getByRole("region", { name: "Live respiratory graphs", exact: true })
      .waitFor();
    await page
      .getByLabel("Breathing playback speed", { exact: true })
      .selectOption("4");
    await page
      .getByLabel("Respiratory observation", { exact: true })
      .fill(
        "The diaphragm moved down during inspiration and the volume trace rose.",
      );
    const record = page.getByRole("button", {
      name: "Record observation",
      exact: true,
    });
    await page.waitForFunction(() =>
      Array.from(document.querySelectorAll("button")).some(
        (b) => b.textContent.trim() === "Record observation" && !b.disabled,
      ),
    );
    await record.click();
    const stored = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("respiratory-studio-v1:10:901")),
    );
    assert.ok(
      stored.events.some(
        (e) => e.type === "observe" && e.notes.startsWith("Prediction: "),
      ),
    );
    await page.screenshot({
      path: out + "/lungs-prediction-comparison.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(150);
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.screenshot({ path: out + "/lungs-mobile.png", fullPage: true });
    // Reopen a fresh document in the same browser context. This verifies
    // durable storage while releasing software-rendered WebGL before navigation.
    await page.close();
    page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(base + "/student/stem-labs/901", { waitUntil: "domcontentloaded" });
    await page.getByLabel("Respiratory prediction", { exact: true }).waitFor();
    assert.match(
      await page
        .getByLabel("Respiratory prediction", { exact: true })
        .inputValue(),
      /Deeper breaths/,
    );
    const restored = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("respiratory-studio-v1:10:901")),
    );
    assert.deepEqual(restored.events, stored.events);
    await page
      .getByRole("button", { name: "Notebook (1)", exact: true })
      .waitFor();
    await page.getByRole("img", { name: /Anatomical atlas model/ }).waitFor();
    await page
      .getByText("Lung lobes, airways and diaphragm", { exact: true })
      .waitFor({ state: "hidden" });
    const other = await browser.newContext({
      storageState: await context.storageState(),
    });
    await other.route("**/api/v1/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      await route.fulfill({
        json: path.endsWith("/student/lab-config")
          ? {
              label: "Pure Sciences Lab",
              route: "/student/labs/pure",
              category: "STEM_PURE",
            }
          : path.endsWith("/student/content-scope")
            ? {
                grade: 10,
                pathway: "STEM",
                track: "Pure Sciences",
                subjects: ["Biology"],
                availability: { labs: 0, skills: 0, csl: true },
              }
            : [],
      });
    });
    const denied = await other.newPage();
    await denied.goto(base + "/student/labs/sports/energy");
    await denied
      .getByRole("heading", {
        name: "This lab isn’t part of your current pathway.",
        exact: true,
      })
      .waitFor();
    await other.close();
    assert.deepEqual(errors, []);
    await context.close();
    console.log(
      "PASS: five real 3D activities, server-derived assessments, saved progress, Sports sidebar, mobile layout, respiratory predictions, atlas rib cage, synchronized comparison graph and notebook preservation.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  if (process.env.GITHUB_ACTIONS === "true") {
    const detail = String(e.stack || e)
      .slice(0, 3000)
      .replace(/%/g, "%25")
      .replace(/\r/g, "%0D")
      .replace(/\n/g, "%0A");
    console.log(
      `::error title=Sports and respiratory browser verification::${detail}`,
    );
  }
  process.exit(1);
});
