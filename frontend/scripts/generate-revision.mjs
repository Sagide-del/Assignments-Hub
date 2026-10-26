import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { resources } from '../content/revision.mjs';

export const origin = 'https://assignmenthub.co.ke';
const publicDir = fileURLToPath(new URL('../public/', import.meta.url));
export const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const e = escapeHtml;
const pathFor = (resource) => `/revision/${resource.slug}/`;
const card = (resource) => `<article class="card"><span class="badge">Grade 7 · ${e(resource.subject)}</span><h2><a href="${pathFor(resource)}">${e(resource.topic)} revision questions</a></h2><p>${e(resource.introduction)}</p><a class="button" href="${pathFor(resource)}">Try 5 free questions</a></article>`;
const footer = `<footer><div class="wrap"><strong>Assignment Hub · Andolih EdTech Studios</strong><p>Supplementary learning support for Kenyan learners and schools. These original practice resources are not official examination papers or KICD-approved materials.</p><p>Free quizzes run in your browser. They do not ask for names, contact details or an account, and do not send your answers or scores to us. Your score is cleared when the page reloads. Signing up opens the account service, which has separate requirements.</p><p><a href="/about/">About Assignment Hub</a> · <a href="/revision/">Free revision</a> · <a href="/login">Sign in</a></p></div></footer>`;
const registration = (slug) => `<aside class="panel"><span class="eyebrow">Your next step</span><h2>Ready for a learning account?</h2><p>Keep practising here for free, or create an individual learner account for the wider workspace. Account features may require a paid plan. These public quiz scores do not transfer to an account.</p><div class="actions"><a class="button lime" href="/register?source=revision&amp;topic=${e(slug)}" data-register="${e(slug)}">Create learner account</a><a class="button secondary" href="/revision/">Keep practising free</a></div></aside>`;
const parentGuide = `<section id="parents-and-teachers" class="panel parent-guide"><h2>For parents and teachers</h2><p>Try one topic in a 10-minute study session. Let the learner explain their method, compare it with the worked answers and revisit any difficult question. Use these resources alongside class notes and your teacher’s current curriculum guidance.</p><p>Share a topic link with your class or parent group with the group administrator’s permission. No app installation is needed. The pages use system fonts and small local files, with no advertising or embedded videos.</p><p><a href="https://wa.me/254748519923?text=${encodeURIComponent('Hello, I would like to arrange an Assignment Hub demo for my school.')}" target="_blank" rel="noopener noreferrer">Ask about a school demo on WhatsApp</a></p></section>`;

function shell({ title, description, path, body, schema }) {
  return `<!doctype html>
<html lang="en-KE"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${e(title)} | Assignment Hub</title><meta name="description" content="${e(description)}"><meta name="robots" content="index, follow"><meta name="theme-color" content="#101820"><link rel="canonical" href="${origin}${path}"><link rel="icon" href="/logo.png"><meta property="og:type" content="website"><meta property="og:site_name" content="Assignment Hub"><meta property="og:locale" content="en_KE"><meta property="og:title" content="${e(title)}"><meta property="og:description" content="${e(description)}"><meta property="og:url" content="${origin}${path}"><meta property="og:image" content="${origin}/logo.png"><meta name="twitter:card" content="summary"><meta name="twitter:title" content="${e(title)}"><meta name="twitter:description" content="${e(description)}"><meta name="twitter:image" content="${origin}/logo.png"><link rel="stylesheet" href="/revision/assets/revision.css"><script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script><script type="module" src="/revision/assets/quiz.mjs"></script></head><body><a class="skip" href="#main">Skip to revision content</a><header><nav aria-label="Main navigation"><a class="brand" href="/">Assignment Hub</a><div class="links"><a href="/revision/">Free revision</a><a href="/revision/#parents-and-teachers">Parents &amp; teachers</a><a href="/login">Sign in</a></div></nav></header><main id="main" class="wrap" data-resource="${e(path)}">${body}</main>${footer}</body></html>\n`;
}

export function renderHub() {
  return shell({
    title: 'Free Grade 7 CBC / CBE Revision Questions and Answers in Kenya',
    description: 'Free Grade 7 Mathematics and Integrated Science revision for Kenyan junior school learners. Try short quizzes with worked answers, without registration.', path: '/revision/',
    schema: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Free Grade 7 revision', url: `${origin}/revision/`, inLanguage: 'en-KE', mainEntity: { '@type': 'ItemList', itemListElement: resources.map((resource, index) => ({ '@type': 'ListItem', position: index + 1, name: resource.title, url: origin + pathFor(resource) })) } },
    body: `<section class="hero"><span class="eyebrow">Kenya · Junior school · CBC / CBE practice</span><h1>A little practice.<br>A clearer understanding.</h1><p>Start with free Grade 7 revision questions in Mathematics and Integrated Science. Choose a topic, try five questions, then learn from the worked answers.</p><span class="badge">No account or payment needed · About 10 minutes per topic</span></section><section aria-label="Choose a revision topic"><div class="grid">${resources.map(card).join('')}</div></section><section class="panel"><h2>How to use these revision questions</h2><ol><li>Read the short topic reminders.</li><li>Choose an answer for all five questions and check your score.</li><li>Read the worked answers, then retry any difficult questions.</li></ol><p>You can also read all answers without JavaScript. These are starter practice sets, not a complete syllabus or a prediction of examination questions.</p></section>${parentGuide}${registration('hub')}`,
  });
}

export function renderResource(resource) {
  const path = pathFor(resource);
  const questions = resource.questions.map((question, index) => `<fieldset data-answer="${question.answer}"><legend>${index + 1}. ${e(question.prompt)}</legend>${question.options.map((option, optionIndex) => `<label><input type="radio" name="q${index}" value="${optionIndex}" required><span>${e(option)}</span></label>`).join('')}<p class="feedback" data-feedback hidden></p></fieldset>`).join('');
  const answers = resource.questions.map((question, index) => `<details class="worked-answer"><summary>${index + 1}. ${e(question.prompt)}</summary><p><strong>Answer: ${e(question.options[question.answer])}.</strong> ${e(question.explanation)}</p></details>`).join('');
  return shell({ title: resource.title, description: resource.description, path,
    schema: { '@context': 'https://schema.org', '@graph': [
      { '@type': 'LearningResource', name: resource.title, description: resource.description, url: origin + path, inLanguage: 'en-KE', educationalLevel: 'Grade 7', learningResourceType: 'Practice questions with worked answers', isAccessibleForFree: true, teaches: resource.topic, publisher: { '@type': 'Organization', name: 'Assignment Hub', url: origin } },
      { '@type': 'BreadcrumbList', itemListElement: [ { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` }, { '@type': 'ListItem', position: 2, name: 'Free revision', item: `${origin}/revision/` }, { '@type': 'ListItem', position: 3, name: resource.topic, item: origin + path } ] },
    ] },
    body: `<p class="breadcrumbs"><a href="/">Home</a> / <a href="/revision/">Free Grade 7 revision</a> / ${e(resource.topic)}</p><section class="hero"><span class="badge">Grade 7 · ${e(resource.subject)}</span><h1>${e(resource.title)}</h1><p>${e(resource.introduction)}</p><p class="muted">5 questions · About 10 minutes · Free, with no registration</p><div class="actions"><a class="button" href="#practice">Start the free quiz</a><a class="button secondary" href="#answers">Read worked answers</a></div></section><section class="panel"><h2>Before you start</h2><ul class="tip-list">${resource.tips.map((tip) => `<li>${e(tip)}</li>`).join('')}</ul></section><section id="practice" class="panel"><h2>Try the questions</h2><p>Choose one answer per question, then check your score. You can retry as often as you like.</p><noscript><p>The automatic score needs JavaScript. You can still read every question and check your work in the answers below.</p></noscript><form data-quiz="${e(resource.slug)}">${questions}<div class="actions"><button type="submit">Check my answers</button><button type="reset" class="secondary">Try again</button></div><p id="quiz-result" role="status" tabindex="-1" hidden></p></form></section><section id="answers" class="panel"><h2>Answers and explanations</h2><p>Open a question to see the answer and the steps behind it.</p>${answers}</section><section class="panel"><h2>Share this free revision quiz</h2><p>Help another learner practise this topic. Ask permission before posting to a class or parent group.</p><a class="button secondary" href="https://wa.me/?text=${encodeURIComponent(`${resource.title} — free questions and explained answers: ${origin}${path}`)}" target="_blank" rel="noopener noreferrer">Share on WhatsApp</a></section>${registration(resource.slug)}<section aria-label="More free revision"><h2>Try another topic</h2><div class="grid">${resources.filter((other) => other.slug !== resource.slug).map(card).join('')}</div></section>`,
  });
}

export async function generate() {
  await mkdir(resolve(publicDir, 'revision'), { recursive: true });
  await writeFile(resolve(publicDir, 'revision/index.html'), renderHub());
  for (const resource of resources) {
    const directory = resolve(publicDir, 'revision', resource.slug);
    await mkdir(directory, { recursive: true });
    await writeFile(resolve(directory, 'index.html'), renderResource(resource));
  }
  // Keep existing public URLs and replace only the generated revision entries.
  const sitemapPath = resolve(publicDir, 'sitemap.xml');
  const sitemap = (await readFile(sitemapPath, 'utf8')).replace(/\s*<url>\s*<loc>https:\/\/assignmenthub\.co\.ke\/revision\/[\s\S]*?<\/url>/g, '');
  const entries = ['/revision/', ...resources.map(pathFor)].map((path) => `  <url><loc>${origin}${path}</loc></url>`).join('\n');
  await writeFile(sitemapPath, sitemap.replace('</urlset>', `${entries}\n</urlset>`));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await generate();
  console.log(`Generated revision hub and ${resources.length} practice pages.`);
}
