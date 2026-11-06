import { IsString, MaxLength, MinLength } from "class-validator";

export class SubmitIndependentProjectDto {
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  projectId!: string;

  @IsString()
  @MinLength(40)
  @MaxLength(3000)
  reflection!: string;
}
