import { readFile, writeFile, mkdir, rm, cp } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import katex from "katex";
import { resources } from "../content/revision.mjs";
import { escapeHtml as e, origin } from "./generate-revision.mjs";
const root = fileURLToPath(new URL("../public/", import.meta.url));
const seed = JSON.parse(
  await readFile(
    new URL("../../backend/src/scripts/taxonomy-seed.json", import.meta.url),
    "utf8",
  ),
);
export const slug = (v) =>
  String(v)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
export const pathFor = (p) => `/revision/grade-${p.grade}/${slug(p.subject)}/`;
const safeText = (v, min = 1, max = 4000) => {
  if (
    typeof v !== "string" ||
    v.trim().length < min ||
    v.length > max ||
    /[<>\u0000-\u0008]/.test(v)
  )
    throw Error("Invalid public revision text");
  return v.trim();
};
export function validateTopic(t) {
  if (
    !Number.isInteger(t.grade) ||
    t.grade < 1 ||
    t.grade > 12 ||
    !Array.isArray(t.questions) ||
    t.questions.length < 3 ||
    t.questions.length > 10 ||
    !Array.isArray(t.tips) ||
    t.tips.length < 2
  )
    throw Error("Incomplete public topic");
  return {
    grade: t.grade,
    subject: safeText(t.subject, 1, 150),
    topic: safeText(t.topic, 1, 300),
    introduction: safeText(t.introduction, 80, 1800),
    tips: t.tips.map((v) => safeText(v, 10, 500)),
    questions: t.questions.map((q) => {
      if (
        !Array.isArray(q.options) ||
        q.options.length !== 4 ||
        !Number.isInteger(q.answer) ||
        q.answer < 0 ||
        q.answer > 3
      )
        throw Error("Invalid sample answer");
      return {
        prompt: safeText(q.prompt),
        options: q.options.map((v) => safeText(v, 1, 1000)),
        answer: q.answer,
        explanation: safeText(q.explanation, 40),
      };
    }),
  };
}
export function groupPages(topics) {
  const pages = new Map();
  for (const raw of topics) {
    const t = validateTopic(raw),
      key = pathFor(t);
    if (!slug(t.subject)) throw Error("Invalid subject slug");
    if (pages.has(key) && pages.get(key).subject !== t.subject)
      throw Error("Subject slug collision");
    const p = pages.get(key) || {
      grade: t.grade,
      subject: t.subject,
      topics: [],
    };
    if (!p.topics.some((existing) => existing.topic === t.topic))
      p.topics.push(t);
    pages.set(key, p);
  }
  return [...pages.values()].sort(
    (a, b) => a.grade - b.grade || a.subject.localeCompare(b.subject),
  );
}
// Only explicit inline LaTeX is interpreted. Ordinary text is always escaped.
export function rich(text) {
  return String(text)
    .split(/(\\\([\s\S]*?\\\)|\$[^$\n]+\$)/g)
    .map((part) =>
      /^(\\\(|\$)/.test(part)
        ? katex.renderToString(
            part.startsWith("$") ? part.slice(1, -1) : part.slice(2, -2),
            {
              throwOnError: false,
              trust: false,
              strict: "ignore",
              output: "htmlAndMathml",
              maxExpand: 100,
              maxSize: 10,
            },
          )
        : e(part),
    )
    .join("");
}
const json = (data) => JSON.stringify(data).replace(/</g, "\\u003c");
function shell(title, description, path, body, schema) {
  return `<!doctype html><html lang="en-KE"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(title)}</title><meta name="description" content="${e(description)}"><meta name="robots" content="index,follow"><link rel="canonical" href="${origin}${path}"><meta property="og:type" content="website"><meta property="og:title" content="${e(title)}"><meta property="og:description" content="${e(description)}"><meta property="og:url" content="${origin}${path}"><meta property="og:image" content="${origin}/product-previews/respiratory.webp"><meta name="theme-color" content="#101820"><link rel="icon" href="/logo.png"><link rel="stylesheet" href="/revision/assets/revision.css"><link rel="stylesheet" href="/revision/assets/directory.css"><link rel="stylesheet" href="/revision/assets/katex/katex.min.css"><script type="application/ld+json">${json(schema)}</script><script type="module" src="/revision/assets/quiz.mjs"></script></head><body><a class="skip" href="#main">Skip to content</a><header><nav aria-label="Main navigation"><a class="brand" href="/"><svg viewBox="60 365 1320 350" width="192" height="51" role="img" aria-label="Assignment Hub"><image href="/logo.png" width="1448" height="1086" /></svg></a><div class="links"><a href="/free-revision/">Free revision</a><a href="/login">Sign in</a></div></nav></header><main id="main" class="wrap">${body}</main><footer><div class="wrap"><strong>Assignment Hub Kenya</strong><p>Original supplementary practice, not an official KNEC paper or KICD-approved publication. Use alongside your teacher’s curriculum guidance.</p><p><a href="https://wa.me/254748519923">WhatsApp: 0748 519 923</a> · <a href="/about/">About us</a> · <a href="/revision/">More free topic quizzes</a></p><p>P.O. Box 14069 · 00100 · Nairobi, Kenya</p></div></footer></body></html>`;
}
export function renderDirectory(pages, taxonomy = seed) {
  const grades = Array.from({ length: 12 }, (_, i) => i + 1);
  const sections = grades
    .map((grade) => {
      const subjects = [
        ...new Set([
          ...taxonomy.filter((t) => t.grade === grade).map((t) => t.subject),
          ...pages.filter((p) => p.grade === grade).map((p) => p.subject),
        ]),
      ].sort();
      return `<section id="grade-${grade}" class="grade-section"><div class="section-heading"><h2>Grade ${grade}</h2><span class="muted">${grade <= 6 ? "Primary school" : grade <= 9 ? "Junior school" : "Senior school"}</span></div><div class="subject-grid">${subjects
        .map((subject) => {
          const p = pages.find(
            (p) => p.grade === grade && p.subject === subject,
          );
          return p
            ? `<a class="subject available" href="${pathFor(p)}"><span>${e(subject)}</span><small>${p.topics.reduce((n, t) => n + t.questions.length, 0)} free questions <span aria-hidden="true">↗</span></small></a>`
            : `<div class="subject unavailable"><span>${e(subject)}</span><small>Samples coming soon</small></div>`;
        })
        .join("")}</div></section>`;
    })
    .join("");
  return shell(
    "Free CBC Revision by Grade & Subject | Assignment Hub Kenya",
    "Find free CBC revision questions and explained answers for Kenyan learners. Browse the Grade 1–12 subject directory and try available practice samples.",
    "/free-revision/",
    `<section class="hero"><span class="eyebrow">Kenya · Free practice</span><h1>A clearer way to revise.</h1><p>Choose your grade and subject. Try available questions, check your understanding and learn from every answer.</p><span class="badge">No login · No payment · Worked answers</span></section><nav class="grade-nav" aria-label="Choose a grade">${grades.map((g) => `<a href="#grade-${g}">Grade ${g}</a>`).join("")}</nav><p class="availability">Available now: ${pages.map((p) => `Grade ${p.grade} ${e(p.subject)}`).join(", ")}. The directory shows planned coverage, not complete published content. Senior-school subjects depend on the learner’s pathway and electives.</p>${sections}<section class="panel"><h2>How to make practice count</h2><ol><li>Try the questions before opening the worked answers.</li><li>Explain the method aloud or write it in your own words.</li><li>Return tomorrow and attempt the difficult questions again.</li></ol><p>Subject labels come from our curriculum directory; outlines are not proof of official approval or exhaustive curriculum coverage.</p></section>`,
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Free CBC revision by grade and subject",
      url: origin + "/free-revision/",
      mainEntity: {
        "@type": "ItemList",
        itemListElement: pages.map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: `Grade ${p.grade} ${p.subject}`,
          url: origin + pathFor(p),
        })),
      },
    },
  );
}
export function renderSubject(p, taxonomy = seed) {
  const title = `Free Grade ${p.grade} ${p.subject} Revision | Assignment Hub Kenya`,
    name = `Free Grade ${p.grade} ${p.subject} Revision & Practice Questions`;
  const description = `Practise free ${p.subject} questions for Grade ${p.grade} in Kenya, with topic reminders and explained answers. No registration required.`;
  const outline = [
    ...new Set(
      taxonomy
        .filter((t) => t.grade === p.grade && t.subject === p.subject)
        .flatMap((t) => t.topics || []),
    ),
  ];
  const qs = p.topics.flatMap((t) => t.questions);
  const body = `<p class="breadcrumbs"><a href="/free-revision/">Free revision</a> / Grade ${p.grade} / ${e(p.subject)}</p><section class="hero"><span class="eyebrow">Kenyan CBC practice · Grade ${p.grade}</span><h1>${e(name)}</h1><p>Build understanding one topic at a time. Use these supplementary practice questions with class notes and your teacher’s current curriculum guidance.</p><span class="badge">${qs.length} questions · ${p.topics.length} topics · Explained answers</span><div class="actions"><a class="button lime" href="#practice">Start free practice</a><a class="button secondary" href="#answers">Read worked answers</a></div></section><div class="reading-layout"><div><section class="panel"><h2>Topic reminders</h2>${p.topics.map((t) => `<article><h3>${e(t.topic)}</h3><p>${rich(t.introduction)}</p><ul class="tip-list">${t.tips.map((tip) => `<li>${rich(tip)}</li>`).join("")}</ul></article>`).join("")}</section><section class="panel" id="practice"><h2>Test your understanding</h2><p>Choose one answer for each question. Your score stays in this browser session and is not sent to our server.</p><noscript><p>You can read every question and worked answer without JavaScript. Automatic scoring needs JavaScript.</p></noscript><form data-quiz="${e(pathFor(p))}">${qs.map((q, i) => `<fieldset data-answer="${q.answer}"><legend>${i + 1}. ${rich(q.prompt)}</legend>${q.options.map((option, j) => `<label><input type="radio" name="q${i}" value="${j}" required><span>${rich(option)}</span></label>`).join("")}<p class="feedback" data-feedback hidden></p></fieldset>`).join("")}<div class="actions"><button type="submit">Check my answers</button><button type="reset" class="secondary">Try again</button></div><p id="quiz-result" role="status" tabindex="-1" hidden></p></form></section><section id="answers" class="panel"><h2>Answers and explanations</h2>${qs.map((q, i) => `<details class="worked-answer"><summary>${i + 1}. ${rich(q.prompt)}</summary><p><strong>Answer: ${rich(q.options[q.answer])}.</strong></p><p>${rich(q.explanation)}</p></details>`).join("")}</section></div><aside><section class="panel outline"><h2>Subject outline</h2>${outline.length ? `<ul>${outline.map((t) => `<li>${e(t)}</li>`).join("")}</ul>` : `<ul>${p.topics.map((t) => `<li>${e(t.topic)}</li>`).join("")}</ul>`}<p class="muted">Directory outline; free samples cover the topics listed in this page’s reminders.</p></section><section class="panel"><h2>Make it stick</h2><p>Close the answers. Explain one method from memory. Revisit it tomorrow, then again in three days.</p></section></aside></div><section class="panel upgrade"><span class="eyebrow">Keep learning</span><h2>Practice with a plan.</h2><p>Create a free learner account for the wider workspace. Individual access is KES 300 per month; schools pay KES 200 per learner per year. Availability of assignments, feedback, study plans and labs depends on published content.</p><div class="actions"><a class="button lime" href="/register?source=free-revision">Create a Free Account</a><a class="button secondary" href="https://wa.me/?text=${encodeURIComponent(name + ": " + origin + pathFor(p))}">Share on WhatsApp</a></div><p>No payment is required to use these public questions.</p></section>`;
  return shell(title, description, pathFor(p), body, {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Course",
        name,
        description,
        url: origin + pathFor(p),
        educationalLevel: `Grade ${p.grade}`,
        inLanguage: "en-KE",
        isAccessibleForFree: true,
        provider: {
          "@type": "Organization",
          name: "Assignment Hub Kenya",
          url: origin,
        },
        hasPart: p.topics.map((t) => ({
          "@type": "LearningResource",
          name: t.topic,
          learningResourceType: "Practice questions with explanations",
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Free revision",
            item: origin + "/free-revision/",
          },
          {
            "@type": "ListItem",
            position: 2,
            name: `Grade ${p.grade} ${p.subject}`,
            item: origin + pathFor(p),
          },
        ],
      },
    ],
  });
}
export async function generatePublic({ publicDir = root, feed } = {}) {
  let remote = feed;
  if (!remote && process.env.PUBLIC_REVISION_FEED_URL) {
    const response = await fetch(process.env.PUBLIC_REVISION_FEED_URL, {
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok)
      throw Error(`Public revision feed failed: HTTP ${response.status}`);
    remote = await response.json();
  }
  if (
    remote &&
    (remote.version !== 1 ||
      !Array.isArray(remote.topics) ||
      !Array.isArray(remote.taxonomy))
  )
    throw Error("Invalid public revision feed");
  const pages = groupPages([
    ...resources.map((r) => ({ ...r, grade: 7 })),
    ...(remote?.topics || []),
  ]);
  const taxonomy = remote?.taxonomy?.length ? remote.taxonomy : seed;
  const manifest = resolve(publicDir, "revision/spoke-manifest.json");
  let old = [];
  try {
    old = JSON.parse(await readFile(manifest, "utf8"));
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }
  const paths = pages.map(pathFor);
  // Delete only directories created by this engine, never legacy or app routes.
  for (const path of old)
    if (
      /^\/revision\/grade-(?:[1-9]|1[0-2])\/[a-z0-9-]+\/$/.test(path) &&
      !paths.includes(path)
    )
      await rm(resolve(publicDir, "." + path), {
        recursive: true,
        force: true,
      });
  for (const p of pages) {
    const dir = resolve(publicDir, "." + pathFor(p));
    await mkdir(dir, { recursive: true });
    await writeFile(resolve(dir, "index.html"), renderSubject(p, taxonomy));
  }
  await mkdir(resolve(publicDir, "free-revision"), { recursive: true });
  await writeFile(
    resolve(publicDir, "free-revision/index.html"),
    renderDirectory(pages, taxonomy),
  );
  await writeFile(manifest, JSON.stringify(paths, null, 2) + "\n");
  const routes = [
    "/free-revision/",
    "/revision/",
    ...resources.map((r) => `/revision/${r.slug}/`),
    ...paths,
  ].map((path) => ({ path, file: path.slice(1) + "index.html" }));
  await writeFile(
    resolve(publicDir, "revision/route-aliases.json"),
    JSON.stringify(routes, null, 2) + "\n",
  );
  const sitemapPath = resolve(publicDir, "sitemap.xml");
  let sitemap = await readFile(sitemapPath, "utf8");
  sitemap = sitemap.replace(
    /\s*<url>\s*<loc>([^<]+)<\/loc>[\s\S]*?<\/url>/g,
    (entry, url) =>
      url === origin + "/free-revision/" ||
      url === origin + "/login" ||
      /^https:\/\/assignmenthub\.co\.ke\/revision\/grade-\d+\//.test(url)
        ? ""
        : entry,
  );
  const entries = ["/free-revision/", ...paths]
    .map((path) => `  <url><loc>${origin}${path}</loc></url>`)
    .join("\n");
  await writeFile(
    sitemapPath,
    sitemap.replace("</urlset>", entries + "\n</urlset>"),
  );
  const katexDir = dirname(fileURLToPath(import.meta.resolve("katex")));
  await mkdir(resolve(publicDir, "revision/assets/katex"), { recursive: true });
  await cp(
    resolve(katexDir, "katex.min.css"),
    resolve(publicDir, "revision/assets/katex/katex.min.css"),
  );
  await cp(
    resolve(katexDir, "fonts"),
    resolve(publicDir, "revision/assets/katex/fonts"),
    { recursive: true },
  );
  console.log(
    `Public revision: ${pages.length} subject pages, ${pages.reduce((n, p) => n + p.topics.length, 0)} topics. Empty subjects are not indexed.`,
  );
  return pages;
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await generatePublic();
