import { describe, it, expect } from 'vitest';
import { normalizeImageForAI } from './normalize-image';

const ONE_PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

describe('normalizeImageForAI', () => {
  it('passes supported media types through unchanged', async () => {
    const result = await normalizeImageForAI(ONE_PIXEL_PNG, 'image/png');
    expect(result.mediaType).toBe('image/png');
    expect(result.base64).toBe(ONE_PIXEL_PNG.toString('base64'));
  });

  it('converts an unsupported media type (e.g. from a mislabeled or exotic source) to jpeg', async () => {
    const result = await normalizeImageForAI(ONE_PIXEL_PNG, 'image/bmp');
    expect(result.mediaType).toBe('image/jpeg');
    expect(result.base64).not.toBe(ONE_PIXEL_PNG.toString('base64'));
    expect(Buffer.from(result.base64, 'base64').length).toBeGreaterThan(0);
  });
});
