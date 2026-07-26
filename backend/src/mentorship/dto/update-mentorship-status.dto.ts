import { IsIn } from 'class-validator';

// String literal (rather than importing the Prisma-generated MentorshipStatus
// enum) matches the pattern already used by SelectTrackDto.source and
// SubmitSupportAssessmentDto.category — keeps this DTO independent of
// whether `prisma generate` has been re-run yet.
export class UpdateMentorshipRequestStatusDto {
  @IsIn(['ACCEPTED', 'DECLINED', 'COMPLETED'])
  status: string;
}
