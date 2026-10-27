import { generatePaper, MOCK_BLUEPRINT, TOPICS } from './mathematics';
describe('KJSEA original mathematics blueprint', () => {
  it('generates 40 distinct questions spanning 32 topics, five areas and exactly 20 visuals', () => {
    expect(TOPICS).toHaveLength(32);
    expect(new Set(TOPICS.map((t) => t.id)).size).toBe(32);
    for (let seed = 1; seed <= 200; seed++) {
      const paper = generatePaper(seed);
      expect(paper).toHaveLength(40);
      expect(new Set(paper.map((q) => q.topicId)).size).toBe(32);
      expect(new Set(paper.map((q) => q.area)).size).toBe(5);
      expect(paper.filter((q) => q.visual)).toHaveLength(20);
      expect(
        new Set(paper.map((q) => q.prompt + JSON.stringify(q.visual ?? null)))
          .size,
      ).toBe(40);
      for (const q of paper) {
        expect(q.options).toHaveLength(4);
        expect(new Set(q.options).size).toBe(4);
        expect(
          q.options.every((o) => !o.includes('NaN') && !o.includes('Infinity')),
        ).toBe(true);
        expect(q.correctIndex).toBeGreaterThanOrEqual(0);
        expect(q.correctIndex).toBeLessThan(4);
        expect(q.explanation.length).toBeGreaterThan(20);
      }
    }
  });
  it('can reproduce a snapshot while new seeds produce different papers', () => {
    expect(generatePaper(314)).toEqual(generatePaper(314));
    expect(generatePaper(314)).not.toEqual(generatePaper(315));
    expect(MOCK_BLUEPRINT.sourceNote).toContain('not an official KNEC paper');
  });
  it('checks geometry, table totals and bar readings against the visible data', () => {
    for (let seed = 1; seed <= 50; seed++)
      for (const q of generatePaper(seed)) {
        const value = Number.parseFloat(q.options[q.correctIndex]);
        const v = q.visual;
        if (v?.kind === 'rectangle') expect(value).toBe(v.width * v.height);
        if (v?.kind === 'triangle') expect(value).toBe((v.base * v.height) / 2);
        if (v?.kind === 'circle')
          expect(value).toBeCloseTo((2 * 22 * v.radius) / 7);
        if (v?.kind === 'angles') expect(value).toBe(180 - v.known);
        if (v?.kind === 'point')
          expect(value).toBe(q.topicId === 'reflection' ? -v.x : v.x);
        if (v?.kind === 'bars') expect(value).toBe(v.values[1]);
        if (v?.kind === 'table' && q.topicId === 'frequency')
          expect(value).toBe(
            v.rows.reduce((sum, row) => sum + Number(row[1]), 0),
          );
        if (v?.kind === 'table' && q.topicId === 'cuboid-volume')
          expect(value).toBe(
            v.rows[0].reduce((product, x) => product * Number(x), 1),
          );
      }
  });
});
