import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { CreateLabReflectionPromptDto } from './create-lab-reflection-prompt.dto';

export class CreateLabReflectionsBatchDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLabReflectionPromptDto)
  reflectionPrompts: CreateLabReflectionPromptDto[];
}
