/** Assessment guidance, not a claim of KICD endorsement or factual verification. */
export function learningDesign(
  subject: string,
  grade: string,
  written = false,
): string {
  const level = Number(grade.match(/\d+/)?.[0] ?? 7);
  const general = `CURRICULUM-LED ORIGINAL ASSESSMENT
The curriculum establishes scope, not a verified answer key. Use established subject knowledge to create original teaching examples; do not fabricate citations, official exam rules, statistics or quotations. Omit claims you cannot confidently explain. Never claim KICD approval.
Keep every item within the supplied outcome and this grade's vocabulary and prerequisites. Aim for roughly 20% retrieval, 30% understanding and 50% application/reasoning where the outcome permits; do not force higher-order tasks beyond the outcome. Difficulty comes from reasoning, not obscure vocabulary or tricks.
Use varied authentic situations, error diagnosis, comparison, interpretation and transfer. Do not merely change names or numbers in the same stem. Include all data/passages needed in each question: questions are shuffled independently. Never refer to a previous question or an absent passage. Do not copy online papers, publisher passages or the supplied design sample.
For each item: independently solve it, check units and ambiguity, verify exactly one MCQ option is defensible, and use plausible distractors based on distinct misconceptions. Revise or omit uncertain items. An explanation must teach why the answer works, address a likely wrong approach and finish with a short retrieval cue or transfer check. These self-checks do not replace human review.
${written ? "Written-response tasks: include model answers and a concise points-based marking guide in the explanation. Essays require a task-specific rubric, not a single supposedly correct composition. Keep them for reviewed teacher assignments, outside auto-marked MCQ practice." : "Use the requested auto-marked types only; do not disguise compositions as multiple-choice questions."}`;
  if (!/\benglish\b/i.test(subject)) return general;
  return `${general}
ENGLISH DESIGN — ORIGINAL, GRADE-ADAPTED
Use the design philosophy of a balanced language paper: dialogue completion, passage comprehension, inference with textual evidence, vocabulary in context, connected cloze and contextual grammar/editing. This is a blueprint, not a prescribed national paper format. Select only components supported by the current outcome; a grammar-only outcome must not become an unrelated full paper.
${level <= 6 ? "Use short accessible dialogues and passages, familiar situations, meaning in context, sequence and simple evidence-based inference." : level <= 9 ? "Use richer narrative and informational texts, cohesion, inference, purpose and contextual editing with increasing independence." : "Use nuanced original informational/literary texts, tone, argument, synthesis, register and evidence-based interpretation only where supported by the senior-school outcome."}
Embed the complete original passage or dialogue in EVERY relevant questionText, followed by a clear question. For cloze items mark one target blank unambiguously; do not depend on externally numbered blanks. Avoid ambiguous synonyms and dialect-dependent grammar choices. State British English conventions when relevant. Do not assert listening or speaking competence from a written MCQ.
${written ? "Where the outcome calls for writing, include original composition or functional-writing tasks with audience, purpose and grade-appropriate expectations. Rubrics cover task fulfilment, organisation, language and mechanics; suggested responses are examples, not memorised essays." : "Composition belongs in a separate written-response assignment, not in this MCQ batch."}`;
}
export const recallDesign = `Build retrieval practice, not decorative summaries. Each card targets one small idea within the outcome: meaningful cue, accurate memory aid with its limits, concise explanation, and linked facts. Include three different checks: retrieve without hints, explain a misconception, apply in a new situation. Answers must explain the reasoning. Encourage recall before revealing, then revisit after 1, 3, 7 and 14 days; these are suggested study intervals, not guaranteed retention or an automated schedule. Do not invent facts or source citations.`;
