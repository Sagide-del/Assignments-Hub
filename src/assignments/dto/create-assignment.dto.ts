import {
  IsArray,
  IsBoolean,
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
import { AssignmentType } from '@prisma/client';
import { CreateQuestionDto } from './create-question.dto';
import { RubricCriterionDto } from './rubric-criterion.dto';
import { AttachmentRefDto } from './attachment-ref.dto';

export class CreateAssignmentDto {
  @IsString()
  @MinLength(2)
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
  @Max(10000)
  maxPoints?: number;

  // Defaults to true in the service layer if omitted (publish immediately).
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  // Future-dated release — the assignment stays hidden from students until
  // this date even if isPublished is true. See AssignmentsService.findAll.
  @IsOptional()
  @IsDateString()
  publishDate?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  resources?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentRefDto)
  attachments?: AttachmentRefDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  questions?: CreateQuestionDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RubricCriterionDto)
  rubric?: RubricCriterionDto[];

  // Not persisted on Assignment — a one-shot instruction to AssignmentsService
  // to SMS every parent (with a phone on file) in this grade once the
  // assignment is created, useful during holidays when parents aren't
  // checking the platform themselves. See AssignmentsService.create /
  // SmsService.notifyNewAssignment.
  @IsOptional()
  @IsBoolean()
  notifyParents?: boolean;
}
