import { describe, it, expect, vi } from 'vitest';

vi.mock('ai', () => ({
  generateText: vi.fn(),
  Output: { object: vi.fn((config: unknown) => config) },
}));

import { generateText } from 'ai';
import { extractProblemFromImage } from './extract-problem';

describe('extractProblemFromImage', () => {
  it('returns the structured object extracted by the model', async () => {
    vi.mocked(generateText).mockResolvedValue({
      output: {
        conceptName: '부사와 관형사 구분',
        type: 'multiple_choice',
        questionText: '다음 중 부사인 것은?',
        choices: ['새', '새로운', '매우', '파란'],
        correctAnswer: '매우',
      },
    } as never);

    const result = await extractProblemFromImage('base64data', 'image/jpeg');

    expect(result.conceptName).toBe('부사와 관형사 구분');
    expect(result.correctAnswer).toBe('매우');
  });

  it('sends the image as an image content part to the extraction model', async () => {
    vi.mocked(generateText).mockResolvedValue({
      output: {
        conceptName: 'x',
        type: 'ox',
        questionText: 'x',
        choices: null,
        correctAnswer: 'O',
      },
    } as never);

    await extractProblemFromImage('base64data', 'image/jpeg');

    const call = vi.mocked(generateText).mock.calls[0][0] as {
      model: string;
      messages: Array<{ content: Array<{ type: string; image?: string; mediaType?: string }> }>;
    };
    expect(call.model).toBe('anthropic/claude-sonnet-5');
    const imagePart = call.messages[0].content.find((p) => p.type === 'image');
    expect(imagePart?.image).toBe('base64data');
    expect(imagePart?.mediaType).toBe('image/jpeg');
  });

  it('includes the existing concept list in the prompt when provided', async () => {
    vi.mocked(generateText).mockResolvedValue({
      output: {
        conceptName: '높임법',
        type: 'ox',
        questionText: 'x',
        choices: null,
        correctAnswer: 'O',
      },
    } as never);

    await extractProblemFromImage('base64data', 'image/jpeg', ['품사의 종류', '높임법']);

    const call = vi.mocked(generateText).mock.calls[0][0] as {
      messages: Array<{ content: Array<{ type: string; text?: string }> }>;
    };
    const textPart = call.messages[0].content.find((p) => p.type === 'text');
    expect(textPart?.text).toContain('품사의 종류');
    expect(textPart?.text).toContain('높임법');
  });
});
