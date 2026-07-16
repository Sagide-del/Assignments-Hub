import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateCslActivityDto } from './create-csl-activity.dto';

// `key` is immutable after creation — CslSubmission rows may already reference it.
export class UpdateCslActivityDto extends PartialType(OmitType(CreateCslActivityDto, ['key'] as const)) {}
