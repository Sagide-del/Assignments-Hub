import { IsOptional, IsString, MaxLength } from 'class-validator';

// Lets a student edit the reasoning notes on their CURRENT selection without
// creating a new history entry (unlike SelectTrackDto, which always does —
// see PathwaysService.selectTrack). Use this when the track itself hasn't
// changed, just why they chose it.
export class UpdateSelectionNotesDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
