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

// A teacher's read-only selection from the bank, used to build their own
// Assignment (scoped to their own school — see AssignmentsService.create).
// This copies the selected QuestionBank rows' content onto new Question
// rows; it never modifies the bank rows themselves.
export class SelectQuestionBankDto {
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

  @IsOptional()
  @IsBoolean()
  notifyParents?: boolean;
}
