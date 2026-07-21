import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { CreateLabStepDto } from './create-lab-step.dto';

export class CreateLabStepsBatchDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLabStepDto)
  steps: CreateLabStepDto[];
}
