import { describe, it, expect } from 'vitest';
import { computeConceptAccuracy } from './stats';

describe('computeConceptAccuracy', () => {
  it('aggregates total and correct counts per concept', () => {
    const result = computeConceptAccuracy([
      { conceptName: '품사', isCorrect: true },
      { conceptName: '품사', isCorrect: false },
      { conceptName: '높임법', isCorrect: true },
    ]);

    expect(result).toEqual([
      { conceptName: '품사', total: 2, correct: 1 },
      { conceptName: '높임법', total: 1, correct: 1 },
    ]);
  });

  it('returns an empty array for no rows', () => {
    expect(computeConceptAccuracy([])).toEqual([]);
  });
});
