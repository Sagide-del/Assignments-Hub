import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
export class CreateMockDto {
  @IsOptional() @IsIn(['GENERATED', 'BANK']) source?: 'GENERATED' | 'BANK';
  @IsOptional() @IsString() @MaxLength(120) subject?: string;
  @IsOptional() @IsIn([30, 60, 90]) timeLimitMinutes?: number;
}
export class MockAnswerDto {
  @IsString() @Matches(/^q-([1-9]|[1-3][0-9]|40)$/) questionId: string;
  @IsInt() @Min(0) @Max(3) option: number;
}
export class SaveMockDto {
  @IsArray()
  @ArrayMaxSize(40)
  @ArrayUnique((a: MockAnswerDto) => a.questionId)
  @ValidateNested({ each: true })
  @Type(() => MockAnswerDto)
  answers: MockAnswerDto[];
}
