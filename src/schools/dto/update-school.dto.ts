import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateSchoolDto } from './create-school.dto';

// School `code` is immutable after creation (it's how students/staff log in).
export class UpdateSchoolDto extends PartialType(OmitType(CreateSchoolDto, ['code'] as const)) {}
