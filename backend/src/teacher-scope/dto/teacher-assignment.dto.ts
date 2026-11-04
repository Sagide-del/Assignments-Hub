import { IsString, Length, Matches } from "class-validator";
export class TeacherAssignmentDto {
  @IsString() @Length(1, 120) @Matches(/\S/) subject!: string;
  @IsString() @Length(1, 80) stream_id!: string;
}
export class CreateStreamDto {
  @IsString() @Length(1, 30) grade!: string;
  @IsString() @Length(1, 40) @Matches(/\S/) name!: string;
}
