import { Injectable } from '@nestjs/common';
import { DeepseekService } from './deepseek.service';
import { GenerateAssignmentDto } from './dto/generate-assignment.dto';

@Injectable()
export class AiService {
  constructor(
    private readonly deepseekService: DeepseekService,
  ) {}

  async generateAssignment(dto: GenerateAssignmentDto) {
    const questionTypes = dto.questionTypes.join(', ');

    const prompt = `
Create a school assessment assignment.

Return ONLY valid JSON.

Requirements:

Grade:
${dto.grade}

Subject:
${dto.subject}

Topic:
${dto.topic}

Strand:
${dto.strand || 'Not specified'}

Sub Strand:
${dto.subStrand || 'Not specified'}

Number of Questions:
${dto.numberOfQuestions}

Question Types:
${questionTypes}


The JSON must follow this exact structure:

{
  "title": "",
  "description": "",
  "subject": "",
  "grade": "",
  "sections": [
    {
      "title": "Section A",
      "instructions": "",
      "questions": [
        {
          "questionText": "",
          "questionType": "MULTIPLE_CHOICE",
          "points": 5,
          "options": [],
          "correctAnswer": ""
        }
      ]
    }
  ]
}


Rules:

- Create age-appropriate questions.
- Ensure questions match the grade level.
- Multiple choice questions must have options.
- Include correct answers where applicable.
- Essay questions must not have options.
- Assign reasonable marks.
- Do not include explanations.
- Do not include markdown.
`;

    return this.deepseekService.generateAssignment(prompt);
  }
}