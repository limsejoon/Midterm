import { describe, it, expect, vi } from 'vitest';

vi.mock('ai', () => ({
  generateText: vi.fn(),
  Output: { object: vi.fn((config: unknown) => config) },
}));

import { generateText } from 'ai';
import { analyzeMistake } from './analyze-mistake';

describe('analyzeMistake', () => {
  it('returns the model analysis text', async () => {
    vi.mocked(generateText).mockResolvedValue({
      output: { analysis: '관형사와 부사를 헷갈린 것 같아요.' },
    } as never);

    const result = await analyzeMistake({
      conceptName: '부사와 관형사 구분',
      questionText: '다음 중 부사인 것은?',
      choices: ['새', '매우', '뛰다', '예쁘게'],
      correctAnswer: '매우',
      submittedAnswer: '새',
      childExplanation: null,
    });

    expect(result).toBe('관형사와 부사를 헷갈린 것 같아요.');
  });

  it('includes the child explanation in the prompt when provided', async () => {
    vi.mocked(generateText).mockResolvedValue({ output: { analysis: '분석' } } as never);

    await analyzeMistake({
      conceptName: '부사와 관형사 구분',
      questionText: '다음 중 부사인 것은?',
      choices: null,
      correctAnswer: '매우',
      submittedAnswer: '새',
      childExplanation: '새는 꾸며주는 말이라서 골랐어요',
    });

    const call = vi.mocked(generateText).mock.calls[0][0] as unknown as { prompt: string };
    expect(call.prompt).toContain('새는 꾸며주는 말이라서 골랐어요');
  });

  it('omits the explanation line when none was given', async () => {
    vi.mocked(generateText).mockResolvedValue({ output: { analysis: '분석' } } as never);

    await analyzeMistake({
      conceptName: '부사와 관형사 구분',
      questionText: '다음 중 부사인 것은?',
      choices: null,
      correctAnswer: '매우',
      submittedAnswer: '새',
      childExplanation: null,
    });

    const call = vi.mocked(generateText).mock.calls[0][0] as unknown as { prompt: string };
    expect(call.prompt).not.toContain('아이가 그렇게 생각한 이유');
  });
});
