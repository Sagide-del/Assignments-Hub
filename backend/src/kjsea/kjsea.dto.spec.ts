import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateMockDto, SaveMockDto } from './kjsea.dto';
describe('KJSEA request validation', () => {
  it('accepts only supported timing and source values', async () => {
    expect(
      await validate(
        plainToInstance(CreateMockDto, {
          grade: 'Grade 7',
          source: 'BANK',
          subject: 'English',
          timeLimitMinutes: 60,
        }),
      ),
    ).toHaveLength(0);
    expect(
      (
        await validate(
          plainToInstance(CreateMockDto, {
            grade: 'Grade 13',
            source: 'unreviewed',
            timeLimitMinutes: 1,
          }),
        )
      ).length,
    ).toBeGreaterThan(0);
  });
  it('accepts all senior grade values while rejecting out-of-range grades', async () => {
    for (const grade of ['Grade 10','Grade 11','Grade 12']) expect(await validate(plainToInstance(CreateMockDto,{grade}))).toHaveLength(0);
    expect((await validate(plainToInstance(CreateMockDto,{grade:'Grade 13'}))).length).toBeGreaterThan(0);
  });
  it('rejects duplicate questions, invalid choices and oversized answer payloads', async () => {
    for (const answers of [
      [
        { questionId: 'q-1', option: 0 },
        { questionId: 'q-1', option: 1 },
      ],
      [{ questionId: 'q-1', option: 4 }],
      [{ questionId: 'q-41', option: 0 }],
      Array.from({ length: 41 }, (_, i) => ({
        questionId: `q-${i + 1}`,
        option: 0,
      })),
    ]) {
      expect(
        (await validate(plainToInstance(SaveMockDto, { answers }))).length,
      ).toBeGreaterThan(0);
    }
  });
});
