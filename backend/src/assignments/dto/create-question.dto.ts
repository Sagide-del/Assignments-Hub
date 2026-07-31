import { IsArray, IsEnum, IsInt, IsObject, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { QuestionType } from '@prisma/client';

export class CreateQuestionDto {
  @IsString()
  @MinLength(1)
  questionText: string;

  // Rich-HTML question body from the teacher Rich Editor (Quill) — bold/
  // italic/lists, KaTeX-rendered math/chemistry equations, embedded images,
  // labeled diagrams. Stored verbatim; NEVER rendered without sanitizing
  // (DOMPurify) on the way out — see RichContent.tsx. Optional so the
  // existing manual builder / AI generator, which never send this, are
  // unaffected.
  @IsOptional()
  @IsString()
  @MaxLength(100000)
  contentHtml?: string;

  @IsOptional()
  @IsEnum(QuestionType)
  questionType?: QuestionType;

  // Only meaningful for MULTIPLE_CHOICE.
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  // Only used for auto-gradable types (MULTIPLE_CHOICE, TRUE_FALSE,
  // FILL_BLANK) — see SubmissionsService.autoGrade. Never sent back to
  // students (AssignmentsService strips it for STUDENT actors).
  @IsOptional()
  @IsString()
  correctAnswer?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  points?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsString()
  hint?: string;

  // Never sent back to students until their submission's results are
  // released — same sensitivity as correctAnswer/config (see
  // AssignmentsService.stripAnswersForStudent /
  // SubmissionsService.sanitizeStudentSubmission). Populated by
  // QuestionBankService when a question comes from the Question Bank;
  // absent for the older manual builder / JSON upload paths.
  @IsOptional()
  @IsString()
  @MaxLength(5_000)
  explanation?: string;
}
