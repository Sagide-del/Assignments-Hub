import { Transform } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

export enum PublishTargetType {
  STORE = "STORE",
  SCHOOL = "SCHOOL",
}

export class PublishDto {
  @IsUUID()
  module_id: string;

  @IsOptional()
  @IsEnum(PublishTargetType)
  target_type?: PublishTargetType;

  @IsOptional()
  @IsEnum({ PUBLIC_STORE: "PUBLIC_STORE", SCHOOL: "SCHOOL" })
  audience?: "PUBLIC_STORE" | "SCHOOL";

  @IsOptional()
  @IsString()
  @Matches(/^[1-9]\d*$/)
  @MaxLength(10)
  school_id?: string;

  // Existing School IDs are integers; the CMS stores their string form.
  @IsOptional()
  @IsString()
  @Matches(/^[1-9]\d*$/)
  @MaxLength(10)
  target_id?: string;

  // Streams/classes are labels in the existing system, not a separate ID table.
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    Array.isArray(value)
      ? value.map((item) => (typeof item === "string" ? item.trim() : item))
      : value,
  )
  @IsArray()
  @ArrayMaxSize(200)
  @ArrayUnique()
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(100, { each: true })
  stream_ids?: string[];
}
