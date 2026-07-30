import { IsBoolean, IsInt, IsOptional, Min } from "class-validator";

export class ActivateSchoolDto {
  @IsInt()
  @Min(1)
  schoolId: number;

  // Defaults to true — the common case is "turn this school on". Pass
  // false to deactivate a previously-activated school.
  @IsOptional()
  @IsBoolean()
  active?: boolean = true;
}
