'use server';

import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { concepts } from '@/db/schema';
import { extractConceptsFromImage } from '@/ai/extract-concepts';
import { normalizeImageForAI } from '@/lib/normalize-image';

export async function extractConceptsFromImageAction(formData: FormData): Promise<string[]> {
  const file = formData.get('image');
  if (!(file instanceof File)) {
    throw new Error('이미지 파일이 필요합니다.');
  }
  const arrayBuffer = await file.arrayBuffer();
  const { base64, mediaType } = await normalizeImageForAI(Buffer.from(arrayBuffer), file.type);
  return extractConceptsFromImage(base64, mediaType);
}

export async function saveConceptsAction(bookId: number, names: string[]): Promise<{ added: number }> {
  const db = getDb();

  const existing = await db.select({ name: concepts.name }).from(concepts).where(eq(concepts.bookId, bookId));
  const existingNames = new Set(existing.map((r) => r.name));
  let nextOrderIndex = existing.length;

  let added = 0;
  for (const rawName of names) {
    const name = rawName.trim();
    if (!name || existingNames.has(name)) continue;
    await db.insert(concepts).values({ bookId, name, orderIndex: nextOrderIndex });
    existingNames.add(name);
    nextOrderIndex += 1;
    added += 1;
  }
  return { added };
}
