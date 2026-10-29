import { api } from "./axios";

export type QuestionBankStatus = "GENERATED" | "APPROVED" | "REJECTED";

export type QuestionBankQuestionType =
  "MULTIPLE_CHOICE" | "TRUE_FALSE" | "NUMERIC" | "SHORT_ANSWER" | "ESSAY";

export type QuestionBankBloomLevel =
  "REMEMBER" | "UNDERSTAND" | "APPLY" | "ANALYZE" | "EVALUATE" | "CREATE";

export interface QuestionBankItem {
  publishedTo?: string[];
  curriculumUnitId?: number | null;
  curriculumSourceIds?: number[] | null;
  sourceDocumentId?: number | null;
  id: number;
  source: "PLATFORM" | "SCHOOL";
  isGlobal: boolean;
  subject: string;
  grade: string;
  topic: string;
  questionText: string;
  contentHtml: string | null;
  questionType: QuestionBankQuestionType;
  options: string[] | null;
  correctAnswer: string | null;
  explanation: string | null;
  points: number;
  hint: string | null;
  difficulty: string | null;
  bloomLevel: QuestionBankBloomLevel | string | null;
  diagramUrl: string | null;
  diagramAlt: string | null;
  status: QuestionBankStatus;
  generationBatchId: string | null;
  sourceFileName: string | null;
  publishedAssignmentId: number | null;
  publishedAt: string | null;
  createdAt: string;
}

export interface SchoolQuestionBankAccess {
  id: number;
  schoolId: number;
  active: boolean;
  activatedAt: string;
  school: { id: number; name: string; code: string };
}

export interface QuestionBankSourceDocument {
  id: number;
  title: string;
  subject: string;
  grade: string;
  fileName: string | null;
  sourceType: "PDF" | "TEXT";
  createdAt: string;
  _count: { chunks: number; questions: number };
}

export interface GenerateQuestionBankInput {
  // PDF is the default. TEXT uses `sourceText` instead of `file` — URL and
  // Video are not implemented yet (see QuestionGenerator's input selector).
  inputType?: "PDF" | "TEXT" | "KNOWLEDGE";
  sourceDocumentId?: number;
  file?: File;
  sourceText?: string;
  subject: string;
  grade: string;
  topic: string;
  questionCount?: number;
  difficulty?: string;
  questionTypes?: QuestionBankQuestionType[];
  autoTagTopic?: boolean;
  includeDiagramPlaceholders?: boolean;
  prioritizeHigherOrder?: boolean;
}

function questionBankFormData(input: GenerateQuestionBankInput) {
  const body = new FormData();
  if (input.file) body.append("file", input.file);
  if (input.inputType) body.append("inputType", input.inputType);
  if (input.sourceText) body.append("sourceText", input.sourceText);
  if (input.sourceDocumentId)
    body.append("sourceDocumentId", String(input.sourceDocumentId));
  body.append("subject", input.subject);
  body.append("grade", input.grade);
  body.append("topic", input.topic);
  if (input.questionCount)
    body.append("questionCount", String(input.questionCount));
  if (input.difficulty) body.append("difficulty", input.difficulty);
  if (input.questionTypes?.length) {
    body.append("questionTypes", JSON.stringify(input.questionTypes));
  }
  if (input.autoTagTopic) body.append("autoTagTopic", "true");
  if (input.includeDiagramPlaceholders)
    body.append("includeDiagramPlaceholders", "true");
  if (input.prioritizeHigherOrder) body.append("prioritizeHigherOrder", "true");
  return body;
}

export const questionBankAdminApi = {
  generate: (input: GenerateQuestionBankInput) =>
    api
      .post<QuestionBankItem[]>(
        "/admin/question-bank/generate",
        questionBankFormData(input),
      )
      .then((response) => response.data),

  list: (params?: {
    subject?: string;
    grade?: string;
    topic?: string;
    status?: QuestionBankStatus;
    skip?: number;
    take?: number;
  }) =>
    api
      .get<{
        items: QuestionBankItem[];
        total: number;
        skip: number;
        take: number;
        selectionBefore: string;
      }>("/admin/question-bank", { params })
      .then((response) => response.data),

  update: (
    id: number,
    update: Partial<
      Pick<
        QuestionBankItem,
        | "questionText"
        | "options"
        | "correctAnswer"
        | "explanation"
        | "points"
        | "hint"
        | "topic"
        | "diagramUrl"
        | "diagramAlt"
      >
    >,
  ) =>
    api
      .put<QuestionBankItem>(`/admin/question-bank/${id}`, update)
      .then((response) => response.data),

  remove: (id: number) =>
    api
      .delete<{ id: number; deleted: boolean }>(`/admin/question-bank/${id}`)
      .then((response) => response.data),

  bulkApprove: (
    input:
      | { scope: "IDS"; ids: number[] }
      | {
          scope: "FILTER";
          filters: { grade?: string; subject?: string; topic?: string };
          before: string;
          excludedIds?: number[];
        },
  ) =>
    api
      .post<{
        approved: number;
        invalid: number;
        changed: number;
        examined: number;
        issues: { id: number; reason: string }[];
        moreIssues: boolean;
      }>("/admin/question-bank/bulk-approve", input)
      .then((r) => r.data),

  approve: (id: number) =>
    api
      .post<QuestionBankItem>(`/admin/question-bank/${id}/approve`)
      .then((response) => response.data),

  reject: (id: number, notes?: string) =>
    api
      .post<QuestionBankItem>(`/admin/question-bank/${id}/reject`, { notes })
      .then((response) => response.data),

  publicationTargets: () =>
    api
      .get<{ id: number; name: string; code: string }[]>(
        "/admin/question-bank/publication-targets",
      )
      .then((r) => r.data),
  publishContent: (
    input: (
      | { scope: "IDS"; ids: number[] }
      | {
          scope: "FILTER";
          filters: { grade?: string; subject?: string; topic?: string };
          before: string;
          excludedIds?: number[];
        }
    ) & {
      audience: "INDEPENDENT" | "SCHOOLS" | "BOTH";
      schoolScope?: "ALL" | "SELECTED";
      schoolIds?: number[];
      title?: string;
    },
  ) =>
    api
      .post<{
        id: string;
        status: string;
        schoolCount: number;
        independent: boolean;
      }>("/admin/question-bank/publish-content", input)
      .then((r) => r.data),

  publish: (input: {
    questionIds: number[];
    title: string;
    description?: string;
    dueDate?: string;
    isPublished?: boolean;
  }) =>
    api
      .post<{ assignmentId: number; questionCount: number }>(
        "/admin/question-bank/publish",
        input,
      )
      .then((response) => response.data),

  activateSchool: (input: { schoolId: number; active?: boolean }) =>
    api
      .post<SchoolQuestionBankAccess>(
        "/admin/question-bank/activate-school",
        input,
      )
      .then((response) => response.data),

  listSchoolAccess: () =>
    api
      .get<SchoolQuestionBankAccess[]>(
        "/admin/question-bank/school-access/list",
      )
      .then((response) => response.data),

  sources: () =>
    api
      .get<QuestionBankSourceDocument[]>("/admin/question-bank/sources/list")
      .then((response) => response.data),
};

export const questionBankApi = {
  browse: (params?: {
    subject?: string;
    grade?: string;
    topic?: string;
    skip?: number;
    take?: number;
  }) =>
    api
      .get<{
        items: QuestionBankItem[];
        total: number;
        skip: number;
        take: number;
      }>("/question-bank", { params })
      .then((response) => response.data),

  subjects: () =>
    api
      .get<string[]>("/question-bank/subjects")
      .then((response) => response.data),
  grades: () =>
    api
      .get<string[]>("/question-bank/grades")
      .then((response) => response.data),
  topics: () =>
    api
      .get<string[]>("/question-bank/topics")
      .then((response) => response.data),

  select: (input: {
    questionIds: number[];
    title: string;
    description?: string;
    targetClass?: string;
    targetStream?: string;
    dueDate?: string;
    isPublished?: boolean;
    notifyParents?: boolean;
    kind?: "STANDARD" | "KCSE_PAPER";
  }) =>
    api.post("/question-bank/select", input).then((response) => response.data),

  rotate: (input: {
    title: string;
    subject: string;
    grade: string;
    topic: string;
    questionCount: number;
    uniquePerStudent?: boolean;
    poolSize?: number;
    difficulty?: string;
    targetClass?: string;
    targetStream?: string;
    dueDate?: string;
    isPublished?: boolean;
    notifyParents?: boolean;
    kind?: "STANDARD" | "KCSE_PAPER";
  }) =>
    api.post("/question-bank/rotate", input).then((response) => response.data),
};
