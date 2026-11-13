const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const { mkdirSync } = require("node:fs");
const { join } = require("node:path");
const { tmpdir } = require("node:os");
const base = process.env.AUTH_UI_BASE_URL || "http://127.0.0.1:4198";
const artifacts =
  process.env.AUTH_UI_ARTIFACT_DIR || join(tmpdir(), "assignmenthub-homepage");
mkdirSync(artifacts, { recursive: true });
(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.AUTH_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.AUTH_CHROMIUM_EXECUTABLE }
      : {}),
    args: ["--no-sandbox"],
  });
  try {
    const nojs = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 1440, height: 1000 },
    });
    const staticPage = await nojs.newPage();
    const response = await staticPage.goto(base + "/");
    assert((await response.text()).includes('data-prerendered="homepage"'));
    const heading = staticPage.getByRole("heading", { level: 1 });
    assert((await heading.textContent()).includes("Understand more. Revise with confidence."));
    await staticPage
      .getByRole("heading", {
        name: "One topic. Three clear steps.",
        exact: true,
      })
      .waitFor();
    await staticPage
      .getByRole("heading", {
        name: "Give every study session a clear purpose.",
        exact: true,
      })
      .waitFor();
    await staticPage.getByRole('link', { name: /WhatsApp support/ }).waitFor();
    assert.equal(await staticPage.locator('.early-pricing').count(), 0);
    assert.equal(await staticPage.getByRole('navigation', { name: 'Footer navigation' }).count(), 0);
    const hero = staticPage.locator("main>section").first();
    const h = await heading.boundingBox(),
      image = await hero.locator("#home-product-image").boundingBox();
    assert(
      image.x > h.x + h.width - 1,
      "Lung preview must remain on the right at desktop widths",
    );
    await staticPage.screenshot({
      path: join(artifacts, "homepage-without-javascript.png"),
    });
    await hero
      .getByRole("link", { name: "Try Free CBC Revision", exact: true })
      .click();
    await staticPage.waitForURL(/\/free-revision\/?$/);
    await staticPage
      .getByRole("heading", { name: /A clearer way to revise/ })
      .waitFor();
    await staticPage.getByRole("link", { name: /Mathematics.*free questions/ }).click();
    await staticPage.waitForURL("**/revision/grade-7/mathematics/");
    assert((await staticPage.locator('fieldset').count()) >= 3);
    await staticPage.getByRole('heading', { name: 'Answers and explanations' }).waitFor();
    await staticPage.screenshot({ path: join(artifacts, 'public-mathematics-without-javascript.png'), fullPage: true });
    const context = await browser.newContext();
    await context.route("**/api/v1/**", (r) => r.fulfill({ json: [] }));
    const page = await context.newPage(),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base + "/");
    await page.getByRole("heading", { level: 1 }).waitFor();
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      await page.screenshot({
        path: join(artifacts, `homepage-${width}.png`),
        fullPage: true,
      });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => document.fonts.ready);
    const mobile = await page.evaluate(() => ({
      height: document.documentElement.scrollHeight,
      lungs: document.querySelector('#home-product-image').getBoundingClientRect().top + scrollY,
      practice: document.querySelector('[aria-labelledby="revision-heading"]').getBoundingClientRect().top + scrollY,
      problem: document.querySelector('[aria-labelledby="problem-heading"]').getBoundingClientRect().top + scrollY,
    }));
    assert(mobile.height <= 844 * 8, JSON.stringify(mobile));
    assert(mobile.lungs < 844, 'Lungs must appear on the first mobile screen');
    assert(mobile.practice < mobile.problem, 'Free practice must appear before the Problem section');
    await page.getByRole('button', { name: 'Explore STEM Labs' }).click();
    await page.getByRole('dialog').waitFor();
    assert.equal(new URL(page.url()).pathname, '/');
    await page.getByRole('link', { name: 'Sign in to interact with the full 3D model.' }).waitFor();
    await page.getByRole('button', { name: 'Close product screenshot', exact: true }).click();
    console.log('Mobile layout measurements:', JSON.stringify(mobile));
    await page
      .getByRole("button", { name: "Enlarge product screenshot", exact: true })
      .click();
    await page
      .getByRole("dialog", { name: "Product screenshot", exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "Close product screenshot", exact: true })
      .click();
    const graph = await page
      .locator('script[type="application/ld+json"]')
      .evaluate((e) => JSON.parse(e.textContent)["@graph"]);
    assert.equal(
      graph.find((x) => x["@type"] === "EducationalOrganization").address
        .postOfficeBoxNumber,
      "14069",
    );
    await page.goto(base + "/login?account=staff");
    await page
      .getByRole("heading", { name: "Staff log in", exact: true })
      .waitFor();
    assert.equal(
      await page.locator('#root [id="workflow-heading"]').count(),
      0,
    );
    assert.equal(await page.locator('script[type="application/ld+json"]').count(), 0);
    assert.deepEqual(errors, []);
    console.log(
      "PASS: homepage content without JavaScript, split lung hero, Problem/workflow sections, free-practice navigation, organisation schema, responsive interaction and clean staff deep links.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
