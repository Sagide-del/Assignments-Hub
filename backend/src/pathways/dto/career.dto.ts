import { IsInt, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CareerDto {
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  title: string;

  @IsString()
  @MaxLength(1000)
  description: string;

  @IsInt()
  @Min(0)
  @Max(10000000)
  salaryMinKES: number;

  @IsInt()
  @Min(0)
  @Max(10000000)
  salaryMaxKES: number;
}
