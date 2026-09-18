import Link from 'next/link';
import { notFound } from 'next/navigation';
import { asc, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { books, concepts, variants, attempts } from '@/db/schema';

export default async function BookTocPage({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId: bookIdParam } = await params;
  const bookId = Number(bookIdParam);
  const db = getDb();

  const [book] = await db.select().from(books).where(eq(books.id, bookId));
  if (!book) notFound();

  const bookConcepts = await db
    .select({ id: concepts.id, name: concepts.name })
    .from(concepts)
    .where(eq(concepts.bookId, bookId))
    .orderBy(asc(concepts.orderIndex));

  const solvedRows = await db.select({ variantId: attempts.variantId }).from(attempts);
  const solvedIds = new Set(solvedRows.map((r) => r.variantId));

  const variantRows = await db.select({ conceptId: variants.conceptId, variantId: variants.id }).from(variants);

  const counts = new Map<number, { total: number; unsolved: number }>();
  for (const row of variantRows) {
    const entry = counts.get(row.conceptId) ?? { total: 0, unsolved: 0 };
    entry.total += 1;
    if (!solvedIds.has(row.variantId)) entry.unsolved += 1;
    counts.set(row.conceptId, entry);
  }

  return (
    <main className="mx-auto max-w-xl p-6">
      <Link href="/practice" className="mb-2 block text-sm text-blue-600 underline">
        ← 문제집 목록
      </Link>
      <h1 className="mb-4 text-xl font-bold">{book.name}</h1>
      {bookConcepts.length === 0 && <p>등록된 목차가 없어요.</p>}
      <ul className="space-y-2">
        {bookConcepts.map((concept) => {
          const c = counts.get(concept.id) ?? { total: 0, unsolved: 0 };
          return (
            <li key={concept.id}>
              <Link
                href={`/practice/books/${bookId}/concepts/${concept.id}`}
                className="block rounded border p-3 hover:bg-gray-50"
              >
                <div>{concept.name}</div>
                <div className="text-sm text-gray-500">
                  {c.total === 0 ? '등록된 문제 없음' : `안 푼 문제 ${c.unsolved}개 / 전체 ${c.total}개`}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
