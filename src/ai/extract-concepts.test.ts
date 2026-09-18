import { describe, it, expect, vi } from 'vitest';

vi.mock('ai', () => ({
  generateText: vi.fn(),
  Output: { array: vi.fn((config: unknown) => config) },
}));

import { generateText } from 'ai';
import { extractConceptsFromImage } from './extract-concepts';
import { EXTRACTION_MODEL } from './models';

describe('extractConceptsFromImage', () => {
  it('returns the concept names extracted from the image', async () => {
    vi.mocked(generateText).mockResolvedValue({
      output: ['품사의 종류', '부사와 관형사 구분', '높임법'],
    } as never);

    const result = await extractConceptsFromImage('base64data', 'image/jpeg');

    expect(result).toEqual(['품사의 종류', '부사와 관형사 구분', '높임법']);
  });

  it('sends the image as an image content part to the extraction model', async () => {
    vi.mocked(generateText).mockResolvedValue({ output: [] } as never);

    await extractConceptsFromImage('base64data', 'image/jpeg');

    const call = vi.mocked(generateText).mock.calls[0][0] as {
      model: unknown;
      messages: Array<{ content: Array<{ type: string; image?: string; mediaType?: string }> }>;
    };
    expect(call.model).toBe(EXTRACTION_MODEL);
    const imagePart = call.messages[0].content.find((p) => p.type === 'image');
    expect(imagePart?.image).toBe('base64data');
    expect(imagePart?.mediaType).toBe('image/jpeg');
  });
});
