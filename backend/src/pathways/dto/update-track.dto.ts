import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateTrackDto } from './create-track.dto';

// `pathwayId` and `key` are immutable after creation — StudentPathwaySelection
// rows already reference this track by database id, and moving it to a
// different pathway or renaming its key would silently break the
// pathway/track pairing every past selection assumed.
export class UpdateTrackDto extends PartialType(OmitType(CreateTrackDto, ['pathwayId', 'key'] as const)) {}
