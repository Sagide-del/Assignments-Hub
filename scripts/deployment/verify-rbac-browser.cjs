const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const base = process.env.RBAC_FRONTEND_URL || 'https://assignmenthub.co.ke';
  if (!base.startsWith('https://') && !(process.env.RBAC_LOCAL_TEST === 'true' && /^http:\/\/127\.0\.0\.1:\d+$/.test(base))) throw Error('Use HTTPS for production.');
  if (!process.env.DEMO_TEACHER_PASSWORD) throw Error('Set DEMO_TEACHER_PASSWORD securely.');
  const browser = await chromium.launch({ headless: true, ...(process.env.RBAC_CHROMIUM_PATH ? { executablePath: process.env.RBAC_CHROMIUM_PATH } : {}), args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.goto(base + '/login?account=staff');
    await page.getByLabel('School code', { exact: false }).fill('DEMO-001');
    await page.getByLabel('Email address', { exact: true }).fill('otieno@demo.co.ke');
    await page.getByLabel('Password', { exact: true }).fill(process.env.DEMO_TEACHER_PASSWORD);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForURL(url => url.origin === new URL(base).origin && url.pathname === '/teacher');
    await page.getByRole('heading', { name: 'My teaching', exact: true }).waitFor();
    const classes = page.getByLabel('My classes', { exact: true });
    await page.getByText('Victor Halisi', { exact: true }).waitFor();
    const choices = await classes.locator('option').allTextContents();
    assert.equal(choices.length, 2, 'Only the all-classes control and one assigned class are permitted');
    assert(choices[1].includes('Aviation Technology') && choices[1].includes('Grade 11') && choices[1].includes('1B'));
    assert.equal(await page.getByText('Alice Wanjiru', { exact: true }).count(), 0, 'Alice must not appear');
    if (process.env.RBAC_SCREENSHOT_FILE) await page.screenshot({ path: process.env.RBAC_SCREENSHOT_FILE, fullPage: true });
    console.log('PASS browser: DEMO-001 teacher login; My Classes contains only Aviation Technology / Grade 11 / 1B; Victor visible and Alice absent.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
