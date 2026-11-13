import { IsIn, IsUUID, Matches, MaxLength } from 'class-validator';
export const acquisitionStages = ['practice_start', 'practice_complete', 'registration_open', 'registration_complete', 'payment_attempt'] as const;
export class AcquisitionEventDto {
  @IsUUID('4') session!: string;
  @IsIn(acquisitionStages) stage!: typeof acquisitionStages[number];
  @MaxLength(200)
  @Matches(/^\/(?:$|blog\/[a-z0-9/-]*$|revision\/[a-z0-9/-]*$|free-revision\/?$|register\/?$|student\/activate\/?$)/)
  path!: string;
}
