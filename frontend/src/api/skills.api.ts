import { api } from "./axios";
import type {
  PaymentMethod,
  PaymentStatus,
  SkillAdminSummary,
  SkillCategory,
  SkillContentStatus,
  SkillCourse,
  SkillEnrollment,
  SkillEnrollmentStatus,
  SkillLevel,
  SkillLessonProgress,
  SkillPayment,
  SkillProvider,
} from "../types";

export interface SkillCategoryInput {
  name: string;
  description?: string;
  icon?: string;
  imageUrl?: string;
  displayOrder?: number;
  status?: SkillContentStatus;
}

export interface SkillProviderInput {
  name: string;
  description?: string;
  logoUrl?: string;
  website?: string;
  contactEmail?: string;
  verified?: boolean;
  status?: SkillContentStatus;
}

export interface SkillCourseInput {
  categoryId: number;
  providerId: number;
  title: string;
  shortDescription: string;
  fullDescription: string;
  durationWeeks: number;
  level: SkillLevel;
  costKES: number;
  certificateAvailable?: boolean;
  thumbnailUrl?: string;
  learningOutcomes?: string[];
  courseStructure?: string[];
  status?: SkillContentStatus;
}

export interface SkillProgramSummary {
  title: string;
  focus: string;
  project: string;
  studioRoute: string | null;
  version: string;
  lessons: { key: string; title: string; transfer: string }[];
}
export interface FocusedSkillPath {
  version: number;
  limit: number;
  focus: string | null;
  focusLabel: string | null;
  reason: string;
  choices: { value: string; label: string }[];
  activeCount: number;
  courses: (SkillCourse & {
    program: SkillProgramSummary;
    enrollment: SkillEnrollment | null;
  })[];
  enrollments: (Omit<SkillEnrollment, "course"> & {
    course: SkillCourse;
    program: SkillProgramSummary | null;
    pausedAt?: string | null;
    pauseReason?: string | null;
    lessonProgress: SkillLessonProgress[];
  })[];
}
export const skillsApi = {
  getLearningPath: () =>
    api.get<FocusedSkillPath>("/skills/learning-path").then((r) => r.data),
  chooseFocus: (focus: string) =>
    api
      .patch<FocusedSkillPath>("/skills/learning-path", { focus })
      .then((r) => r.data),
  pause: (id: number) =>
    api.post(`/skills/courses/${id}/pause`).then((r) => r.data),
  workbook: (id: number) =>
    api
      .get<Blob>(`/skills/courses/${id}/workbook`, { responseType: "blob" })
      .then((r) => r.data),
  getCategories: () =>
    api
      .get<SkillCategory[]>("/skills/categories")
      .then((response) => response.data),
  createCategory: (dto: SkillCategoryInput) =>
    api
      .post<SkillCategory>("/skills/categories", dto)
      .then((response) => response.data),
  updateCategory: (id: number, dto: Partial<SkillCategoryInput>) =>
    api
      .patch<SkillCategory>(`/skills/categories/${id}`, dto)
      .then((response) => response.data),

  getProviders: () =>
    api
      .get<SkillProvider[]>("/skills/providers")
      .then((response) => response.data),
  createProvider: (dto: SkillProviderInput) =>
    api
      .post<SkillProvider>("/skills/providers", dto)
      .then((response) => response.data),
  updateProvider: (id: number, dto: Partial<SkillProviderInput>) =>
    api
      .patch<SkillProvider>(`/skills/providers/${id}`, dto)
      .then((response) => response.data),

  getCourses: (categoryId?: number) =>
    api
      .get<SkillCourse[]>("/skills/courses", { params: { categoryId } })
      .then((response) => response.data),
  getCourse: (id: number) =>
    api
      .get<SkillCourse>(`/skills/courses/${id}`)
      .then((response) => response.data),
  getCourseProgress: (id: number) =>
    api
      .get<SkillLessonProgress[]>(`/skills/courses/${id}/progress`)
      .then((response) => response.data),
  completeLesson: (
    id: number,
    lessonKey: string,
    evidence?: { answer: number; artifact: string; reflection: string },
  ) =>
    api
      .post<SkillLessonProgress>(
        `/skills/courses/${id}/lessons/${encodeURIComponent(lessonKey)}/complete`,
        evidence,
      )
      .then((response) => response.data),
  createCourse: (dto: SkillCourseInput) =>
    api
      .post<SkillCourse>("/skills/courses", dto)
      .then((response) => response.data),
  generateDraft: (dto: {
    topic: string;
    gradeBand: "Grade 4-6" | "Grade 7-9" | "Grade 10-12";
    pathway?: "STEM" | "SOCIAL_SCIENCES" | "ARTS_AND_SPORTS";
  }) =>
    api
      .post<SkillCourse>("/skills/admin/generate-draft", dto)
      .then((response) => response.data),
  updateCourse: (id: number, dto: Partial<SkillCourseInput>) =>
    api
      .patch<SkillCourse>(`/skills/courses/${id}`, dto)
      .then((response) => response.data),
  removeCourse: (id: number) =>
    api.delete(`/skills/courses/${id}`).then((response) => response.data),

  requestEnrollment: (courseId: number) =>
    api
      .post<SkillEnrollment>("/skills/enrollments", { courseId })
      .then((response) => response.data),
  getStudentEnrollments: () =>
    api
      .get<SkillEnrollment[]>("/skills/enrollments/student")
      .then((response) => response.data),
  getEnrollments: () =>
    api
      .get<SkillEnrollment[]>("/skills/enrollments")
      .then((response) => response.data),
  updateEnrollment: (
    id: number,
    dto: { status?: SkillEnrollmentStatus; paymentStatus?: PaymentStatus },
  ) =>
    api
      .patch<SkillEnrollment>(`/skills/enrollments/${id}`, dto)
      .then((response) => response.data),

  getPayments: () =>
    api
      .get<SkillPayment[]>("/skills/payments")
      .then((response) => response.data),
  createPayment: (dto: {
    studentId: number;
    courseId: number;
    paymentMethod: PaymentMethod;
    transactionReference?: string;
    status?: PaymentStatus;
  }) =>
    api
      .post<SkillPayment>("/skills/payments", dto)
      .then((response) => response.data),
  updatePayment: (
    id: number,
    dto: { status: PaymentStatus; transactionReference?: string },
  ) =>
    api
      .patch<SkillPayment>(`/skills/payments/${id}`, dto)
      .then((response) => response.data),

  getAdminSummary: () =>
    api
      .get<SkillAdminSummary>("/skills/admin/summary")
      .then((response) => response.data),
};
