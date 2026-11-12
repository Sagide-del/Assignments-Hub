const { chromium } = require("playwright"),
  assert = require("node:assert/strict");
const { mkdirSync } = require("node:fs"),
  { join } = require("node:path"),
  { tmpdir } = require("node:os");
const base = process.env.AUTH_UI_BASE_URL || "http://127.0.0.1:4196";
const artifacts =
  process.env.AUTH_UI_ARTIFACT_DIR || join(tmpdir(), "assignmenthub-auth-ui");
mkdirSync(artifacts, { recursive: true });
let browser;
(async () => {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(base);
      if (r.ok) break;
    } catch {}
    if (i === 59) throw Error("Auth UI preview is unavailable.");
    await new Promise((r) => setTimeout(r, 100));
  }
  browser = await chromium.launch({
    headless: true,
    ...(process.env.AUTH_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.AUTH_CHROMIUM_EXECUTABLE }
      : {}),
    args: ["--no-sandbox"],
  });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  let registrations = 0,
    subjectWrites = 0,
    stk = 0,
    failSubject = true;
  const errors = [],
    requests = [];
  const options = {
    grade: 10,
    core_subjects: [
      "English",
      "Kiswahili",
      "Core Mathematics",
      "Community Service Learning",
    ],
    subjects: [
      "English",
      "Kiswahili",
      "Core Mathematics",
      "Community Service Learning",
      "Biology",
      "Chemistry",
      "Physics",
      "Computer Science",
    ],
    tracks: [{ id: 19, name: "Pure Sciences", pathway: "STEM" }],
    recommendations: ["Biology", "Chemistry", "Physics"].map((subject) => ({
      subject,
      pathway: "STEM",
      track: "Pure Sciences",
    })),
  };
  await ctx.route("**/api/v1/**", async (r) => {
    const req = r.request(),
      p = new URL(req.url()).pathname;
    let json = [];
    if (req.method() === "POST")
      requests.push({ path: p, data: req.postDataJSON() });
    if (p.endsWith("/student/subject-options")) json = options;
    else if (p.endsWith("/auth/independent/register")) {
      registrations++;
      json = {
        studentId: 17,
        username: "victor.halisi",
        admissionNumber: "VH001",
        name: "Victor Halisi",
        grade: "Grade 10",
      };
    } else if (p.endsWith("/auth/independent/login"))
      json = {
        accessToken: "test",
        refreshToken: "test",
        expiresIn: 3600,
        user: {
          id: 17,
          schoolId: 1,
          role: "STUDENT",
          name: "Victor Halisi",
          grade: "Grade 10",
          isIndependentTrial: true,
        },
      };
    else if (p.endsWith("/student/subjects")) {
      subjectWrites++;
      if (failSubject) {
        failSubject = false;
        return r.fulfill({
          status: 503,
          json: { message: "Subject setup temporarily unavailable." },
        });
      }
      json = { elective_subjects: req.postDataJSON().elective_subjects };
    } else if (p.endsWith("/independent-students/public/payment-info"))
      json = { enabled: true, monthlyAmountKES: 300, annualAmountKES: 3600 };
    else if (/\/(?:tuma|jenga)\/capabilities$/.test(p))
      json = { tumaPaymentsVersion: 1, configured: true };
    else if (/\/(?:tuma|jenga)\/payment$/.test(p)) json = null;
    else if (/\/(?:tuma|jenga)\/stk-push$/.test(p)) {
      stk++;
      json = {};
    }
    await r.fulfill({ json });
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base + "/login");
  await page.getByRole("tab", { name: "Staff", exact: true }).click();
  await page
    .getByRole("heading", { name: "Staff log in", exact: true })
    .waitFor();
  assert.equal(
    await page
      .getByRole("tab", { name: "Staff", exact: true })
      .getAttribute("aria-selected"),
    "true",
  );
  await page.getByRole("link", { name: "Create Account", exact: true }).click();
  await page
    .getByText("Your school provides this account", { exact: true })
    .waitFor();
  assert.equal(
    await page
      .getByRole("button", {
        name: "Create account & pay KES 300",
        exact: true,
      })
      .count(),
    0,
  );
  await page.getByRole("tab", { name: "Independent", exact: true }).click();
  await page.getByLabel("Full name", { exact: true }).waitFor();
  assert.equal(await page.getByLabel("Pathway", { exact: true }).count(), 0);
  await page.getByLabel("Full name", { exact: true }).fill("Victor Halisi");
  assert.equal(
    await page.getByLabel("Username", { exact: true }).inputValue(),
    "victor.halisi",
  );
  await page.getByLabel("Grade", { exact: true }).selectOption("Grade 10");
  await page.getByLabel("Pathway", { exact: true }).selectOption("STEM");
  await page
    .getByRole("combobox", { name: "Senior school track", exact: true })
    .selectOption("19");
  await page.getByText("Other electives (optional)", { exact: true }).click();
  for (const s of ["Biology", "Chemistry", "Computer Science"])
    await page.getByRole("checkbox", { name: s, exact: true }).check();
  assert(
    await page
      .getByRole("checkbox", { name: "Physics", exact: true })
      .isDisabled(),
  );
  await page
    .getByLabel("Phone for M-Pesa", { exact: true })
    .fill("+254 712 345 678");
  await page.getByLabel("Password", { exact: true }).fill("TestFixture123!");
  await page
    .getByLabel("Confirm password", { exact: true })
    .fill("TestFixture123!");
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    await page.screenshot({
      path: join(artifacts, `unified-registration-${width}.png`),
      fullPage: true,
    });
  }
  await page
    .getByRole("button", { name: "Create account & pay KES 300", exact: true })
    .click();
  await page
    .getByRole("alert")
    .filter({ hasText: "Subject setup temporarily unavailable." })
    .waitFor();
  assert.equal(registrations, 1);
  await page.getByText("Account saved", { exact: true }).waitFor();
  await page
    .getByRole("button", {
      name: "Continue to M-Pesa confirmation",
      exact: true,
    })
    .click();
  await page.waitForURL("**/student/activate");
  await page
    .getByRole("textbox", { name: "Payer M-Pesa number", exact: true })
    .waitFor();
  assert.equal(
    await page
      .getByRole("textbox", { name: "Payer M-Pesa number", exact: true })
      .inputValue(),
    "+254712345678",
  );
  assert.equal(registrations, 1);
  assert.equal(subjectWrites, 2);
  assert.equal(stk, 0);
  const body = requests.find((r) =>
    r.path.endsWith("/auth/independent/register"),
  ).data;
  assert.equal(body.name, "Victor Halisi");
  assert.equal(body.parentPhone, "+254712345678");
  assert(!("elective_subjects" in body));
  assert.deepEqual(
    requests.filter((r) => r.path.endsWith("/student/subjects")).at(-1).data
      .elective_subjects,
    ["Biology", "Chemistry", "Computer Science"],
  );
  const login = await browser.newContext();
  const lp = await login.newPage();
  await login.route("**/api/v1/**", (r) => r.fulfill({ json: [] }));
  await lp.goto(base + "/login/staff");
  await lp
    .getByRole("heading", { name: "Staff log in", exact: true })
    .waitFor();
  await lp.goto(base + "/school/DEMO-001/login");
  await lp
    .getByRole("heading", { name: "School learner log in", exact: true })
    .waitFor();
  assert.equal(
    await lp.getByRole("textbox", { name: /School code/ }).count(),
    0,
  );
  await lp.getByRole("tab", { name: "School", exact: true }).click();
  assert(lp.url().includes("/school/DEMO-001/login"));
  await lp.getByRole("tab", { name: "Independent", exact: true }).click();
  await lp
    .getByRole("heading", { name: "Independent learner log in", exact: true })
    .waitFor();
  await lp
    .getByRole("textbox", { name: "Username or email", exact: true })
    .waitFor();
  assert.deepEqual(errors, []);
  await browser.close();
  console.log(
    "PASS: three account tabs, login/create toggle, school/staff invitation boundaries, senior electives, responsive layouts, durable account retry, phone handoff, and zero automatic STK requests.",
  );
})().catch(async (e) => {
  console.error(e);
  await browser?.close();
  process.exitCode = 1;
});
