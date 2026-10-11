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
    const embeddings = {
      rankDocumentChunks: jest.fn().mockResolvedValue(new Map()),
      indexDocument: jest.fn(),
    };
    const service = new QuestionBankRetrievalService(prisma as any, embeddings as any);

    const result = await service.retrieveText(1, 'Biology mitosis cell division');

    expect(result.text).toContain('Cell division includes mitosis');
    expect(result.text).toContain('Mitosis produces genetically identical cells');
    expect(result.text).not.toContain('xylem');
  });

  it('matches common word forms without requiring the exact suffix', async () => {
    const prisma = {
      questionBankSourceDocument: {
        findUnique: jest.fn().mockResolvedValue({
          id: 2,
          chunks: [
            { ordinal: 0, content: 'Farmers irrigated crops during dry periods.', searchText: 'farmers irrigated crops during dry periods.' },
            { ordinal: 1, content: 'A circuit contains a battery and lamp.', searchText: 'a circuit contains a battery and lamp.' },
          ],
        }),
      },
    };
    const embeddings = {
      rankDocumentChunks: jest.fn().mockResolvedValue(new Map()),
      indexDocument: jest.fn(),
    };
    const service = new QuestionBankRetrievalService(prisma as any, embeddings as any);

    const result = await service.retrieveText(2, 'farming crop irrigation');

    expect(result.text).toContain('Farmers irrigated crops');
    expect(result.text).not.toContain('battery and lamp');
  });

  it('uses semantic scores when topic wording is not an exact lexical match', async () => {
    const prisma = {
      questionBankSourceDocument: {
        findUnique: jest.fn().mockResolvedValue({
          id: 3,
          chunks: [
            { id: 30, ordinal: 0, content: 'Green plants manufacture glucose using light energy.', searchText: 'green plants manufacture glucose using light energy.' },
            { id: 31, ordinal: 1, content: 'Rocks are weathered by wind and rain.', searchText: 'rocks are weathered by wind and rain.' },
          ],
        }),
      },
    };
    const embeddings = {
      rankDocumentChunks: jest.fn().mockResolvedValue(new Map([[30, 0.91], [31, 0.12]])),
      indexDocument: jest.fn(),
    };
    const service = new QuestionBankRetrievalService(prisma as any, embeddings as any);

    const result = await service.retrieveText(3, 'How photosynthesis makes food');

    expect(result.retrievalMode).toBe('HYBRID_VECTOR_BM25');
    expect(result.text).toContain('manufacture glucose');
    expect(result.text).not.toContain('Rocks are weathered');
  });
});
