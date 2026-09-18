import Link from 'next/link';
import { asc, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { books, concepts, variants, attempts } from '@/db/schema';

export default async function PracticePage() {
  const db = getDb();

  const allBooks = await db.select({ id: books.id, name: books.name }).from(books).orderBy(asc(books.id));

  const solvedRows = await db.select({ variantId: attempts.variantId }).from(attempts);
  const solvedIds = new Set(solvedRows.map((r) => r.variantId));

  const variantRows = await db
    .select({ bookId: concepts.bookId, variantId: variants.id })
    .from(variants)
    .innerJoin(concepts, eq(variants.conceptId, concepts.id));

  const counts = new Map<number, { total: number; unsolved: number }>();
  for (const row of variantRows) {
    const entry = counts.get(row.bookId) ?? { total: 0, unsolved: 0 };
    entry.total += 1;
    if (!solvedIds.has(row.variantId)) entry.unsolved += 1;
    counts.set(row.bookId, entry);
  }

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="mb-4 text-xl font-bold">문제 풀기</h1>
      {allBooks.length === 0 && (
        <p>
          등록된 문제집이 없어요.{' '}
          <Link href="/concepts/new" className="text-blue-600 underline">
            문제집 목차를 먼저 등록해보세요.
          </Link>
        </p>
      )}
      <ul className="space-y-2">
        {allBooks.map((book) => {
          const c = counts.get(book.id) ?? { total: 0, unsolved: 0 };
          return (
            <li key={book.id}>
              <Link href={`/practice/books/${book.id}`} className="block rounded border p-4 hover:bg-gray-50">
                <div className="font-semibold">{book.name}</div>
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
