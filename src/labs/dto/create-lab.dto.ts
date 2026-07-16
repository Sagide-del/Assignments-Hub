import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LabType } from '@prisma/client';
import { CreateLabQuestionDto } from './create-lab-question.dto';

export class CreateLabDto {
  // Slug-like identifier a LabSession.labKey refers to, e.g. "volcano-simulation".
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'key must be lowercase letters, numbers and hyphens only, e.g. "volcano-simulation"',
  })
  key: string;

  @IsString()
  @MinLength(2)
  @MaxLength(150)
  title: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  subject: string;

  // Student grade/class this lab targets, e.g. "Grade 7" — matches
  // User.grade/Assignment.grade. Students only see labs for their own grade
  // (see LabsService.findAll).
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  grade: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  topicArea?: string;

  // Senior School pathway grouping, e.g. "Pure Sciences", "Applied Sciences
  // - Agriculture", "Technical Studies". Omit for Junior School labs.
  @IsOptional()
  @IsString()
  @MaxLength(100)
  pathway?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  competency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  // Expected video length in minutes — drives the frontend's watch-timer
  // gate on the "Continue to Quiz" button.
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(300)
  durationMinutes?: number;

  @IsOptional()
  @IsEnum(LabType)
  type?: LabType;

  // A YouTube URL (watch or embed link — the frontend normalizes it) the
  // student watches before taking the quiz.
  @IsOptional()
  @IsString()
  @MaxLength(500)
  resourceUrl?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  // Ordered narration lines the frontend's text-to-speech voice-over reads
  // aloud before the video plays, introducing the topic and telling the
  // student what to look out for. The post-quiz "well done" line is
  // generated client-side from the score instead of stored here.
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  guidanceSteps?: string[];

  // Knowledge-check quiz shown after the video. Like assignments' nested
  // questions, this only applies on create — editing individual questions
  // after creation isn't supported (see LabsService.update).
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLabQuestionDto)
  questions?: CreateLabQuestionDto[];
}
