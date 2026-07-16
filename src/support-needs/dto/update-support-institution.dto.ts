import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateSupportInstitutionDto } from './create-support-institution.dto';

// `key` is immutable after creation — safe to keep referencing this row by
// key from the seed data without ever colliding with an admin rename.
export class UpdateSupportInstitutionDto extends PartialType(OmitType(CreateSupportInstitutionDto, ['key'] as const)) {}
