'use server';

import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { concepts } from '@/db/schema';
import { extractConceptsFromImage } from '@/ai/extract-concepts';

export async function extractConceptsFromImageAction(formData: FormData): Promise<string[]> {
  const file = formData.get('image');
  if (!(file instanceof File)) {
    throw new Error('이미지 파일이 필요합니다.');
  }
  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  return extractConceptsFromImage(base64, file.type);
}

export async function saveConceptsAction(names: string[]): Promise<{ added: number }> {
  const db = getDb();
  let added = 0;
  for (const rawName of names) {
    const name = rawName.trim();
    if (!name) continue;
    const [existing] = await db.select().from(concepts).where(eq(concepts.name, name));
    if (existing) continue;
    await db.insert(concepts).values({ name });
    added += 1;
  }
  return { added };
}
