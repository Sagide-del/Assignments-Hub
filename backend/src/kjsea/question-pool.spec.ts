import { approvedChoices, bankPaper, type BankItem } from './question-pool';
const item = (
  id: number,
  subject = 'English',
  topic = 'Grammar',
): BankItem => ({
  id,
  subject,
  grade: 'Grade 9',
  topic,
  questionType: 'MULTIPLE_CHOICE',
  questionText: `Choose the correct word in example ${id}.`,
  contentHtml: null,
  options: ['A noun', 'A verb', 'An adjective', 'An adverb'],
  correctAnswer: 'A noun',
  explanation: 'The selected word names a person, place or thing.',
  diagramUrl: null,
  diagramAlt: null,
});
describe('All available junior-school subject pools', () => {
  it('excludes ungradable, ambiguous, duplicate and unexplained questions', () => {
    const rows = [
      item(1),
      { ...item(2), correctAnswer: 'Missing' },
      { ...item(3), explanation: null },
      {
        ...item(4),
        options: ['same', 'same', 'x', 'y'],
        correctAnswer: 'same',
      },
      { ...item(1), id: 5 },
      { ...item(6), questionType: 'ESSAY' },
    ];
    expect(approvedChoices(rows).map((i) => i.id)).toEqual([1]);
  });
  it('builds balanced multi-topic papers and preserves the answer after option shuffling', () => {
    const rows = approvedChoices(
      Array.from({ length: 80 }, (_, i) =>
        item(i + 1, 'Kiswahili', `Topic ${i % 8}`),
      ),
    );
    const paper = bankPaper(rows, 47, new Set());
    expect(paper).toHaveLength(40);
    expect(new Set(paper.map((q) => q.topicId)).size).toBe(8);
    expect(new Set(paper.map((q) => q.sourceQuestionId)).size).toBe(40);
    for (const q of paper) {
      expect(q.options[q.correctIndex]).toBe('A noun');
      expect(q.sourceGrade).toBe('Grade 9');
    }
  });
  it('prefers questions not seen in recent attempts when a topic has enough alternatives', () => {
    const pool = approvedChoices(
      Array.from({ length: 80 }, (_, i) => item(i + 1)),
    );
    const paper = bankPaper(
      pool,
      99,
      new Set(Array.from({ length: 40 }, (_, i) => i + 1)),
    );
    expect(paper.every((q) => q.sourceQuestionId! > 40)).toBe(true);
  });
  it('returns honest shorter practice sets instead of duplicating content to reach 40', () => {
    const paper = bankPaper(
      approvedChoices([
        item(1, 'Integrated Science'),
        item(2, 'Integrated Science'),
      ]),
      25,
      new Set(),
    );
    expect(paper).toHaveLength(2);
    expect(new Set(paper.map((q) => q.sourceQuestionId)).size).toBe(2);
  });
});
