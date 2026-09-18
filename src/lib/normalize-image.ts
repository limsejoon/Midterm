const SUPPORTED_MEDIA_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

export type NormalizedImage = { base64: string; mediaType: string };

/**
 * Anthropic's vision API only accepts jpeg/png/gif/webp. Phone photos are
 * often HEIC (iPhone default), which Sharp can't decode (no licensed HEIC
 * codec in the prebuilt binary), so HEIC falls through to heic-convert.
 */
export async function normalizeImageForAI(buffer: Buffer, mediaType: string): Promise<NormalizedImage> {
  if (SUPPORTED_MEDIA_TYPES.has(mediaType)) {
    return { base64: buffer.toString('base64'), mediaType };
  }

  try {
    const sharp = (await import('sharp')).default;
    const converted = await sharp(buffer).jpeg().toBuffer();
    return { base64: converted.toString('base64'), mediaType: 'image/jpeg' };
  } catch {
    const heicConvert = (await import('heic-convert')).default;
    const converted = await heicConvert({ buffer, format: 'JPEG', quality: 0.9 });
    return { base64: Buffer.from(converted).toString('base64'), mediaType: 'image/jpeg' };
  }
}
