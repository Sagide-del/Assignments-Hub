// Mirrors backend/src/common/enums/role.enum.ts (re-exported from Prisma).
// PARENT deliberately does not exist yet — the backend has no parent role,
// login endpoint, or parent-scoped data. See src/features/parent/ParentPortal.tsx.
export type Role = 'PLATFORM_ADMIN' | 'SCHOOL_ADMIN' | 'TEACHER' | 'STUDENT';

// Mirrors backend/src/auth/interfaces/authenticated-user.interface.ts —
// the exact shape returned by /auth/me and embedded in every login response.
export interface AuthenticatedUser {
  id: number;
  schoolId: number;
  role: Role;
  name: string;
  email: string | null;
  admissionNumber: string | null;
  grade: string | null;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
  user: AuthenticatedUser;
}

// Mirrors backend/prisma/schema.prisma School model exactly. There is NO
// motto, brandColor, county, or town field — only logoUrl for branding.
// main.ts's ValidationPipe uses `forbidNonWhitelisted: true`, so sending any
// field not in CreateSchoolDto/UpdateSchoolDto (see backend/src/schools/dto)
// gets rejected with a 400. Don't add fields here speculatively.
export interface School {
  id: number;
  name: string;
  code: string;
  type: 'DAY' | 'BOARDING';
  logoUrl?: string | null;
  address?: string | null;
  phone?: string | null;
  contactEmail?: string | null;
  subscriptionStatus: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | string;
  createdAt: string;
}

export interface Assignment {
  id: number;
  title: string;
  subject: string;
  grade: string;
  totalMarks: number;
  isPublished: boolean;
  createdAt: string;
  schoolId: number;
}

// Mirrors backend/prisma/schema.prisma Submission model (there is no
// `submittedAt` field — `createdAt` is when the row was first created,
// `completedAt` is when it stopped being a draft).
export interface Submission {
  id: number;
  assignmentId: number;
  studentId: number;
  score: number | null;
  status: 'DRAFT' | 'SUBMITTED' | 'GRADED' | string;
  isLate: boolean;
  feedback: string | null;
  gradedById: number | null;
  gradedAt: string | null;
  startedAt: string | null;
  timeSpentSeconds: number | null;
  completedAt: string | null;
  createdAt: string;
  answers?: Answer[];
}

export type QuestionType =
  | 'MULTIPLE_CHOICE'
  | 'TRUE_FALSE'
  | 'FILL_BLANK'
  | 'MATCHING'
  | 'ORDERING'
  | 'ESSAY'
  | 'FILE_UPLOAD';

// Matches backend/src/submissions/dto/answer-input.dto.ts exactly — what
// gets POSTed per question when a student submits/saves an assignment.
export interface AnswerInput {
  questionId: number;
  answer: string;
}

export interface Question {
  id: number;
  assignmentId: number;
  sectionId: number | null;
  questionText: string;
  questionType: QuestionType;
  options: unknown;
  // correctAnswer is deliberately absent here — the backend strips it for
  // students (see AssignmentsService.stripAnswersForStudent). Never assume
  // it's present in a findQuestions() response.
  points: number;
  order: number;
  hint: string | null;
}

export interface Section {
  id: number;
  assignmentId: number;
  name: string;
  description: string | null;
  order: number;
  questions: Question[];
}

export interface Answer {
  id: number;
  submissionId: number;
  questionId: number;
  studentAnswer: string;
  isCorrect: boolean | null;
  pointsAwarded: number | null;
  feedback: string | null;
}

// ---- STEM Labs ----

export interface LabQuestion {
  id: number;
  labId: number;
  questionText: string;
  questionType: QuestionType;
  options: unknown;
  points: number;
  order: number;
}

export interface Lab {
  id: number;
  key: string;
  title: string;
  subject: string;
  grade: string;
  topicArea: string | null;
  pathway: string | null;
  competency: string | null;
  description: string | null;
  durationMinutes: number | null;
  type: 'SIMULATION' | 'VIDEO' | 'PRACTICAL' | string;
  resourceUrl: string | null;
  isPublished: boolean;
  questions?: LabQuestion[];
}

export interface LabSession {
  id: number;
  schoolId: number;
  studentId: number;
  labKey: string;
  competency: string | null;
  completedAt: string | null;
  score: number | null;
  maxScore: number | null;
  quizCompletedAt: string | null;
  createdAt: string;
}

// ---- Community Service Learning ----

export interface CslActivity {
  id: number;
  key: string;
  title: string;
  description: string | null;
  grade: string;
  competency: string | null;
  isRequired: boolean;
  targetHours: number | null;
  isPublished: boolean;
}

export interface CslSubmission {
  id: number;
  cslActivityId: number;
  studentId: number;
  evidenceUrl: string | null;
  reflection: string | null;
  status: 'PENDING' | 'APPROVED' | 'NEEDS_REVISION' | string;
  score: number | null;
  maxScore: number | null;
  feedback: string | null;
  createdAt: string;
}

// ---- Career Pathways ----

export interface PathwayCareer {
  title: string;
  description?: string;
  salaryMinKES?: number;
  salaryMaxKES?: number;
}

export interface PathwayUniversity {
  name: string;
  programs: string[];
}

export interface Track {
  id: number;
  pathwayId: number;
  key: string;
  name: string;
  description: string;
  icon: string;
  requiredSubjects: { subject: string; minGrade: string }[];
  minMeanGrade: string | null;
  careers: PathwayCareer[];
  skills: string[];
  jobOutlook: string | null;
  universitiesKenya: PathwayUniversity[];
  universitiesIntl: PathwayUniversity[];
  interestTags?: string[];
  isPublished: boolean;
}

export interface Pathway {
  id: number;
  key: string;
  name: string;
  description: string;
  icon: string;
  colorHex: string;
  order: number;
  tracks: Track[];
}

export interface StudentPathwaySelection {
  id: number;
  schoolId: number;
  studentId: number;
  trackId: number;
  track?: Track;
  isActive: boolean;
  notes: string | null;
  source: 'MANUAL' | 'RECOMMENDATION';
  createdAt: string;
}

// Matches PathwaysService.recommend()'s actual return shape exactly — track
// and pathway are partial (id/key/name/icon[/description]), not the full
// Track/Pathway entities, and there is no `eligible` boolean; use
// gradeScore/subjectAssessment to judge fit instead.
export interface PathwayRecommendation {
  pathway: { id: number; key: string; name: string; icon: string; colorHex: string };
  track: { id: number; key: string; name: string; icon: string; description: string };
  score: number;
  gradeScore: number;
  interestScore: number;
  matchedInterests: string[];
  subjectAssessment: { subject: string; minGrade: string; studentGrade: string | null; met: boolean | null }[];
}

// ---- Support Needs ----

export type DisabilityCategory =
  | 'VISUAL_IMPAIRMENT'
  | 'HEARING_IMPAIRMENT'
  | 'PHYSICAL_DISABILITY'
  | 'INTELLECTUAL_DEVELOPMENTAL'
  | 'AUTISM_SPECTRUM'
  | 'MULTIPLE_DEAFBLIND'
  | 'OTHER_UNSURE';

export type SupportLevel = 'MILD_SOME_SUPPORT' | 'MODERATE_REGULAR_SUPPORT' | 'SIGNIFICANT_INTENSIVE_SUPPORT';

export interface SupportInstitution {
  id: number;
  key: string;
  name: string;
  type: string;
  categories: string[];
  county: string;
  town: string | null;
  boardingType: string | null;
  ageRange: string | null;
  description: string;
  servicesOffered: string[] | null;
  contactPhone: string | null;
  contactEmail: string | null;
  website: string | null;
}

export interface StudentSupportAssessment {
  id: number;
  studentId: number;
  category: DisabilityCategory;
  supportLevel: SupportLevel;
  hasFormalAssessment: boolean;
  currentChallenges: string | null;
  interests: string[] | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface SubscriptionPlanTier {
  name: string;
  minStudents: number;
  maxStudents: number | null;
  priceDayPerStudent: number;
  priceBoardingPerStudent: number;
  bestFor: string;
}

export interface ComputedPricing {
  tier: SubscriptionPlanTier;
  studentCount: number;
  schoolType: 'DAY' | 'BOARDING';
  ratePerStudent: number;
  amountKES: number;
}

// Generic API error shape thrown by backend/src/common/filters/http-exception.filter.ts
export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
}
