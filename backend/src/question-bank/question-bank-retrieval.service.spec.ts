import { QuestionBankRetrievalService } from './question-bank-retrieval.service';

describe('QuestionBankRetrievalService', () => {
  it('returns topic-relevant source chunks before unrelated chapters', async () => {
    const prisma = {
      questionBankSourceDocument: {
        findUnique: jest.fn().mockResolvedValue({
          id: 1,
          chunks: [
            { ordinal: 0, content: 'Cell division includes mitosis and meiosis.', searchText: 'cell division includes mitosis and meiosis.' },
            { ordinal: 1, content: 'Plants transport water through xylem.', searchText: 'plants transport water through xylem.' },
            { ordinal: 2, content: 'Mitosis produces genetically identical cells.', searchText: 'mitosis produces genetically identical cells.' },
          ],
        }),
      },
    };
    const service = new QuestionBankRetrievalService(prisma as any);

    const result = await service.retrieveText(1, 'Biology mitosis cell division');

    expect(result.text).toContain('Cell division includes mitosis');
    expect(result.text).toContain('Mitosis produces genetically identical cells');
    expect(result.text).not.toContain('xylem');
  });
});
