import { describe, it, expect, vi } from 'vitest';

vi.mock('ai', () => ({
  generateText: vi.fn(),
  Output: { array: vi.fn((config: unknown) => config) },
}));

import { generateText } from 'ai';
import { generateVariants } from './generate-variants';

const sampleVariants = [
  {
    type: 'multiple_choice' as const,
    questionText: '다음 중 관형사인 것은?',
    choices: ['새', '매우', '뛰다', '예쁘게'],
    correctAnswer: '새',
  },
  {
    type: 'short_answer' as const,
    questionText: '"파란 하늘"에서 관형사를 쓰시오.',
    choices: null,
    correctAnswer: '파란',
  },
];

describe('generateVariants', () => {
  it('shuffles multiple_choice choices and returns all variants unchanged otherwise', async () => {
    vi.mocked(generateText).mockResolvedValue({ output: sampleVariants } as never);

    const result = await generateVariants({
      conceptName: '부사와 관형사 구분',
      originalQuestionText: '다음 중 부사인 것은?',
      originalType: 'multiple_choice',
      count: 2,
    });

    expect(result).toHaveLength(2);
    expect(result[0].choices?.slice().sort()).toEqual(sampleVariants[0].choices.slice().sort());
    expect(result[0].correctAnswer).toBe('새');
    expect(result[1].choices).toBeNull();
  });

  it('requests exactly `count` variants from the model with the right minItems/maxItems', async () => {
    vi.mocked(generateText).mockResolvedValue({ output: sampleVariants } as never);

    await generateVariants({
      conceptName: '부사와 관형사 구분',
      originalQuestionText: '다음 중 부사인 것은?',
      originalType: 'multiple_choice',
      count: 2,
    });

    const call = vi.mocked(generateText).mock.calls[0][0] as {
      model: string;
      output: { element: unknown; minItems: number; maxItems: number };
    };
    expect(call.model).toBe('anthropic/claude-sonnet-5');
    expect(call.output.minItems).toBe(2);
    expect(call.output.maxItems).toBe(2);
  });
});
