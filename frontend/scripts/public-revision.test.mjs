import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resources } from "../content/revision.mjs";
import {
  groupPages,
  renderDirectory,
  renderSubject,
  validateTopic,
  rich,
  generatePublic,
} from "./generate-public-revision.mjs";
const topics = resources.map((r) => ({ ...r, grade: 7 }));
test("starter subjects group actual public topics without inventing coverage", () => {
  const pages = groupPages(topics);
  assert.equal(pages.length, 2);
  assert.equal(pages.find((p) => p.subject === "Mathematics").topics.length, 2);
  const html = renderDirectory(pages);
  assert(html.includes('id="grade-12"'));
  assert(html.includes("Samples coming soon"));
  assert(html.includes('href="/revision/grade-7/mathematics/"'));
  assert(!html.includes('href="/revision/grade-12/'));
});
test("subject HTML includes questions, explanations, guidance, canonical and Course schema without JavaScript", () => {
  const p = groupPages(topics).find((p) => p.subject === "Mathematics");
  const html = renderSubject(p);
  assert.equal((html.match(/<fieldset /g) || []).length, 10);
  assert.equal((html.match(/class="worked-answer"/g) || []).length, 10);
  assert(
    html.includes(
      'href="https://assignmenthub.co.ke/revision/grade-7/mathematics/"',
    ),
  );
  assert(html.includes('"@type":"Course"'));
  assert(html.includes(p.topics[0].questions[0].explanation));
  assert(html.includes("KES 300"));
  assert(html.includes("KES 200"));
});
test("invalid, insufficient and unsafe samples fail closed, while math renders safely", () => {
  assert.throws(() => validateTopic({ ...topics[0], questions: [] }));
  assert.throws(() => validateTopic({ ...topics[0], grade: 13 }));
  assert.throws(() =>
    validateTopic({ ...topics[0], topic: "<script>bad</script>" }),
  );
  assert.throws(() =>
    validateTopic({
      ...topics[0],
      questions: [
        { ...topics[0].questions[0], answer: 8 },
        ...topics[0].questions.slice(1),
      ],
    }),
  );
  assert(rich("$x^2$").includes('class="katex"'));
  assert(!rich("<script>oops</script>").includes("<script>"));
  assert(
    !rich("$\\href{javascript:alert(1)}{x}$").includes('href="javascript:'),
  );
});
test("sitemap lists only published pages, withdrawal removes files, repeat builds are deterministic", async () => {
  const dir = await mkdtemp(join(tmpdir(), "public-revision-"));
  try {
    await mkdir(join(dir, "revision"));
    await writeFile(
      join(dir, "sitemap.xml"),
      "<urlset><url><loc>https://assignmenthub.co.ke/</loc></url></urlset>",
    );
    await generatePublic({
      publicDir: dir,
      feed: { version: 1, topics: [{ ...topics[0], grade: 10 }], taxonomy: [] },
    });
    assert(
      (await readFile(join(dir, "sitemap.xml"), "utf8")).includes(
        "/grade-10/mathematics/",
      ),
    );
    await generatePublic({
      publicDir: dir,
      feed: { version: 1, topics: [], taxonomy: [] },
    });
    const once = await readFile(join(dir, "sitemap.xml"), "utf8");
    assert(!once.includes("/grade-10/"));
    await assert.rejects(
      readFile(join(dir, "revision/grade-10/mathematics/index.html")),
    );
    await generatePublic({
      publicDir: dir,
      feed: { version: 1, topics: [], taxonomy: [] },
    });
    assert.equal(await readFile(join(dir, "sitemap.xml"), "utf8"), once);
    assert(once.includes("https://assignmenthub.co.ke/</loc>"));
    assert(!once.includes("/grade-8/"));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
