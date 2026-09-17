import { describe, it, expect, vi } from 'vitest';

vi.mock('ai', () => ({
  generateText: vi.fn(),
  Output: { object: vi.fn((config: unknown) => config) },
}));

import { generateText } from 'ai';
import { aiJudgeShortAnswer } from './grade-short-answer';

describe('aiJudgeShortAnswer', () => {
  it('returns the model isCorrect judgment', async () => {
    vi.mocked(generateText).mockResolvedValue({ output: { isCorrect: true } } as never);

    const result = await aiJudgeShortAnswer({
      conceptName: '품사',
      questionText: '"파랗다"의 품사는?',
      correctAnswer: '형용사',
      submittedAnswer: '형용사이다',
    });

    expect(result).toBe(true);
  });
});
