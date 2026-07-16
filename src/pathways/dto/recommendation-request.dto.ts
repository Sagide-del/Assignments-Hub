import { ArrayMaxSize, IsArray, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SubjectGradeInputDto {
  @IsString()
  @MaxLength(60)
  subject: string;

  // KCSE letter grade, e.g. "B+" — validated loosely here (just a short
  // string) since the real comparison logic in
  // PathwaysService.gradeToPoints already tolerates/ignores anything it
  // doesn't recognize rather than rejecting the request.
  @IsString()
  @MaxLength(3)
  grade: string;
}

// Both fields are optional and the engine degrades gracefully with either
// alone (grades-only ranks by eligibility; interests-only ranks by fit) —
// see PathwaysService.recommend. Nothing here is persisted; it's a
// stateless "what-if" calculation the frontend's assessment quiz posts to.
export class RecommendationRequestDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => SubjectGradeInputDto)
  subjectGrades?: SubjectGradeInputDto[];

  // Free-form interest tags — see seed-pathways-data.ts's fixed vocabulary
  // comment for the values the frontend quiz actually sends. Not enforced
  // with @IsIn here so adding a new tag to the vocabulary later never
  // requires a backend redeploy just to accept it.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  interests?: string[];
}
