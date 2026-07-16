import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateLabDto } from './create-lab.dto';

// `key` is immutable after creation — LabSession rows may already reference it.
export class UpdateLabDto extends PartialType(OmitType(CreateLabDto, ['key'] as const)) {}
