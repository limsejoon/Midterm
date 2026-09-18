'use server';

import { asc, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { books, concepts } from '@/db/schema';

export async function getBooksAction(): Promise<{ id: number; name: string }[]> {
  const db = getDb();
  return db.select({ id: books.id, name: books.name }).from(books).orderBy(asc(books.id));
}

export async function createBookAction(name: string): Promise<{ id: number; name: string }> {
  const db = getDb();
  const trimmed = name.trim();
  if (!trimmed) throw new Error('문제집 이름을 입력해주세요.');
  const [book] = await db.insert(books).values({ name: trimmed }).returning({ id: books.id, name: books.name });
  return book;
}

export async function getConceptsForBookAction(
  bookId: number,
): Promise<{ id: number; name: string; orderIndex: number }[]> {
  const db = getDb();
  return db
    .select({ id: concepts.id, name: concepts.name, orderIndex: concepts.orderIndex })
    .from(concepts)
    .where(eq(concepts.bookId, bookId))
    .orderBy(asc(concepts.orderIndex));
}
