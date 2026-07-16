import { IsInt, IsString, Min, MinLength } from 'class-validator';

export class RubricCriterionDto {
  @IsString()
  @MinLength(1)
  criteria: string;

  @IsInt()
  @Min(0)
  points: number;
}
