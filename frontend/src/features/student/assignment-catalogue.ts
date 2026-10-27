import type { Assignment } from "../../types";
import { assignmentSubject } from "./assignment-list";
export const catalogueKey = (value: string) =>
  value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-KE");
function catalogueSubject(assignment: Assignment) {
  const name = assignmentSubject(assignment);
  return /^(?:math|maths|mathematic|mathematics)$/i.test(name)
    ? "Mathematics"
    : name;
}
/** Prefer supplied topic labels; title cleanup is a navigation fallback, not syllabus mapping. */
export function assignmentTopic(assignment: Assignment): string {
  const labelled = assignment.description
    ?.match(/^\s*Topic\s*:\s*(.+)$/im)?.[1]
    ?.trim();
  if (assignment.topic?.trim() || labelled)
    return assignment.topic?.trim() || labelled!;
  let title = assignment.title.trim();
  if (catalogueKey(title) === catalogueKey(assignmentSubject(assignment)))
    return "General practice";
  const subject = assignmentSubject(assignment);
  if (
    title
      .toLocaleLowerCase("en-KE")
      .startsWith(subject.toLocaleLowerCase("en-KE"))
  ) {
    const suffix = title.slice(subject.length);
    if (/^\s*[:|–—-]\s*/.test(suffix))
      title = suffix.replace(/^\s*[:|–—-]\s*/, "");
  }
  title = title
    .replace(/^(?:revision|practice|mastering)\s+(?:on\s+)?(?=\S)/i, "")
    .replace(/^(?:quiz|test|assessment|assignment)(?:\s+\d+)?\s*[:–—-]\s*/i, "")
    .replace(/^topic\s+\d+\s*[:–—-]\s*/i, "")
    .replace(
      /\s*[-–—:]\s*(?:revision|practice|quiz|test|assessment|assignment)(?:\s+(?:paper\s+)?\d+)?\s*$/i,
      "",
    )
    .trim();
  return !title ||
    /^(?:quiz|test|assessment|assignment|revision|practice)(?:\s+\d+)?$/i.test(
      title,
    )
    ? "General practice"
    : title;
}
export interface TopicGroup {
  key: string;
  name: string;
  assignments: Assignment[];
}
export interface SubjectGroup {
  key: string;
  name: string;
  assignments: Assignment[];
  topics: TopicGroup[];
}
export function groupAssignments(assignments: Assignment[]): SubjectGroup[] {
  const groups = new Map<string, SubjectGroup>();
  for (const assignment of assignments) {
    if (!assignment.isPublished) continue;
    const name = catalogueSubject(assignment),
      key = catalogueKey(name);
    let subject = groups.get(key);
    if (!subject) {
      subject = { key, name, assignments: [], topics: [] };
      groups.set(key, subject);
    }
    subject.assignments.push(assignment);
    const topicName = assignmentTopic(assignment),
      topicKey = catalogueKey(topicName);
    let topic = subject.topics.find((t) => t.key === topicKey);
    if (!topic) {
      topic = { key: topicKey, name: topicName, assignments: [] };
      subject.topics.push(topic);
    }
    topic.assignments.push(assignment);
  }
  const compare = (a: { name: string }, b: { name: string }) =>
    a.name.localeCompare(b.name, "en-KE", {
      numeric: true,
      sensitivity: "base",
    });
  return [...groups.values()]
    .sort(compare)
    .map((subject) => ({ ...subject, topics: subject.topics.sort(compare) }));
}

export function matchesAssignmentSearch(
  assignment: Assignment,
  search: string,
) {
  return [
    catalogueSubject(assignment),
    assignmentTopic(assignment),
    assignment.title,
  ]
    .join(" ")
    .toLocaleLowerCase("en-KE")
    .includes(search.trim().toLocaleLowerCase("en-KE"));
}
