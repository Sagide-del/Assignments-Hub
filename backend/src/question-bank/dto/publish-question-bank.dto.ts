import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MaxLength,
  MinLength,
} from "class-validator";

// Publishes a set of APPROVED QuestionBank rows as an Assignment for
// independent students (the standing "INDEPENDENT" school container — see
// AssignmentsService.createIndependent). Each publish call creates one new
// Assignment; publishing the same question again later creates a separate
// assignment rather than mutating a prior one — there is no "the"
// independent assignment to append to.
export class PublishQuestionBankDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  questionIds: number[];

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(5_000)
  description?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
