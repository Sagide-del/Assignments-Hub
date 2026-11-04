export interface LibraryModule {
  id: string;
  batch_number: number;
  grade: number;
  subject: string;
  topic: string;
  question_count: number;
  content_type: string;
  has_cheatsheet: boolean;
  has_lab: boolean;
  concept_diagram: { type: "TIKZ_CODE"; latex_code: string } | null;
}
export interface LibrarySubject {
  subject: string;
  topics: { topic: string; modules: LibraryModule[] }[];
}
export function filterLibrary(subjects: LibrarySubject[], search: string) {
  const term = search.trim().toLocaleLowerCase();
  return subjects
    .map((s) => ({
      ...s,
      topics: s.topics.filter((t) =>
        `${s.subject} ${t.topic}`.toLocaleLowerCase().includes(term),
      ),
    }))
    .filter((s) => s.topics.length);
}
