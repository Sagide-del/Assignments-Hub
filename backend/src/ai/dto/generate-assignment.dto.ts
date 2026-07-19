export class GenerateAssignmentDto {
  grade: string;

  subject: string;

  topic: string;

  strand?: string;

  subStrand?: string;

  numberOfQuestions: number;

  questionTypes: (
    | 'MULTIPLE_CHOICE'
    | 'ESSAY'
    | 'TRUE_FALSE'
    | 'FILL_BLANK'
  )[];
}