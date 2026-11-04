import { Type, Transform } from "class-transformer";
import {
  IsString,
  Length,
  IsNumber,
  Min,
  Max,
  IsUUID,
  IsOptional,
  Matches,
} from "class-validator";
export class LogCslDto {
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @Length(3, 120)
  activity_name!: string;
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @Length(30, 3000)
  description!: string;
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(24)
  hours_logged!: number;
  @IsUUID() submission_key!: string;
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  activity_date?: string;
}
export class RejectCslDto {
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @Length(5, 1000)
  comment!: string;
}
export const CSL_TARGET = 135;
export const COMPETENCIES = [
  "Communication and Collaboration",
  "Self-efficacy",
  "Critical Thinking and Problem Solving",
  "Creativity and Imagination",
  "Citizenship",
  "Digital Literacy",
  "Learning to Learn",
] as const;

export function cslToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const fields = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${fields.year}-${fields.month}-${fields.day}`;
}
