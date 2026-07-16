import { IsArray, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AnswerInputDto } from '../../submissions/dto/answer-input.dto';

export class CreateLabSessionDto {
  // Identifies which lab was completed — matches Lab.key when the lab
  // exists in the catalog (see LabsService), or is a free-text key for labs
  // that predate the catalog / aren't in it.
  @IsString()
  @MinLength(1)
  labKey: string;

  @IsOptional()
  @IsString()
  competency?: string;

  // Answers to the lab's post-video quiz (Lab.questions), submitted once
  // the student finishes watching. Omit entirely for a lab with no quiz —
  // the session is then recorded as "completed" with no score. See
  // LabSessionsService.create for auto-grading.
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerInputDto)
  answers?: AnswerInputDto[];
}
