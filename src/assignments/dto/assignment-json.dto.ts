import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AssignmentType, QuestionType } from '@prisma/client';

// ============================================================================
// JSON exam-paper schema
// ----------------------------------------------------------------------------
// This is the shape a teacher uploads via the Teacher Dashboard's "Upload
// Assignment" panel (POST /assignments/from-json) or checks ahead of time
// via POST /assignments/validate. See assignment_template.json and
// grade7_mathematics_exam.json at the repo root for annotated examples.
//
// Top level:
//   { title, description?, subject, grade, type?, dueDate?,
//     timeAllowedMinutes?, totalMarks?, instructions?, sections: [...] }
//
// Each section:
//   { name, description?, questions: [...] }
//
// Each question's `options` / `correctAnswer` shape depends on `type`:
//   MULTIPLE_CHOICE  options: string[] (2-8 choices)          correctAnswer: string (must equal one option)
//   TRUE_FALSE       options: not used                        correctAnswer: "true" | "false"
//   FILL_BLANK       options: not used                        correctAnswer: string
//   ESSAY            options: not used                        correctAnswer: not used (always manually graded)
//   FILE_UPLOAD      options: not used                         correctAnswer: not used (always manually graded)
//   MATCHING         options: { left: string[], right: string[] } (equal length)
//                    correctAnswer: object mapping left-index -> right-index, e.g. { "0": "2", "1": "0" }
//   ORDERING         options: string[] (items in scrambled display order)
//                    correctAnswer: string[] (the same items in correct order)
//
// class-validator here only checks basic well-formedness (right primitive
// types, non-empty strings, etc.) — the type-dependent structural rules
// above (e.g. "MULTIPLE_CHOICE needs at least 2 options and a correctAnswer
// that matches one of them") are enforced separately in
// AssignmentsService.validateExamJson, which returns indexed, human-readable
// errors ("Section 2, Question 3: ...") suited to the upload UI's error
// list — a single failed decorator wouldn't tell a teacher which question
// of fifty is wrong.
// ============================================================================

export class ExamQuestionDto {
  // Optional client-side identifier (e.g. "q1") — purely for the teacher's
  // own JSON authoring convenience. Never used as the database id; the
  // database assigns its own auto-increment id on creation.
  @IsOptional()
  @IsString()
  id?: string;

  @IsEnum(QuestionType)
  type: QuestionType;

  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  questionText: string;

  @IsInt()
  @Min(1)
  @Max(1000)
  points: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  hint?: string;

  // Shape depends on `type` — see the module-level comment above. Left as
  // `any` here (validated structurally in AssignmentsService) because
  // class-validator's decorators can't express "array of strings for this
  // enum value, but {left,right} object for that one" cleanly.
  @IsOptional()
  options?: string[] | { left: string[]; right: string[] };

  // Same polymorphism as `options`: a plain string for MULTIPLE_CHOICE/
  // TRUE_FALSE/FILL_BLANK, a { "0": "1", ... } object for MATCHING, or a
  // string[] for ORDERING. Omitted entirely for ESSAY/FILE_UPLOAD, which
  // are always manually graded.
  @IsOptional()
  correctAnswer?: string | string[] | Record<string, string>;
}

export class ExamSectionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExamQuestionDto)
  questions: ExamQuestionDto[];
}

export class AssignmentJsonDto {
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsString()
  @MinLength(2)
  subject: string;

  @IsString()
  @MinLength(1)
  grade: string;

  @IsOptional()
  @IsEnum(AssignmentType)
  type?: AssignmentType;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(600)
  timeAllowedMinutes?: number;

  // If omitted, computed server-side as the sum of every question's points
  // across every section — see AssignmentsService.createFromJson.
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  totalMarks?: number;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  instructions?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExamSectionDto)
  sections: ExamSectionDto[];
}
