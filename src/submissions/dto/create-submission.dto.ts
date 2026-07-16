import { IsArray, IsBoolean, IsInt, IsOptional, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AnswerInputDto } from './answer-input.dto';

export class CreateSubmissionDto {
  // One entry per question on the assignment. Required for assignments that
  // have a question bank; ignored (see legacy `score` path below) for older
  // assignments created before the question builder existed.
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerInputDto)
  answers?: AnswerInputDto[];

  // Legacy path: only meaningful for AUTO_MARKED assignments with no
  // question bank, where the server has nothing to grade against — the
  // client computes it and the server trusts it. Ignored once the
  // assignment actually has questions (graded from `answers` instead).
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000)
  score?: number;

  // true while the student is still working (the exam-taking UI's
  // autosave calls this endpoint repeatedly with isDraft: true) — no
  // grading happens and the submission stays in DRAFT status, resumable.
  // Omit or set false to finalize: the same endpoint then grades and locks
  // in the submission exactly as before. See SubmissionsService.create.
  @IsOptional()
  @IsBoolean()
  isDraft?: boolean;

  // Client-reported elapsed time on the exam, purely informational (shown
  // to the teacher, never used for grading or lateness — isLate is always
  // computed server-side from Assignment.dueDate).
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000000)
  timeSpentSeconds?: number;
}
