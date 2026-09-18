import Link from 'next/link';
import { notFound } from 'next/navigation';
import { asc, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { books, concepts, variants, attempts } from '@/db/schema';
import ConceptSidebar from './ConceptSidebar';

export default async function BookLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ bookId: string }>;
}) {
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

  const conceptsWithCounts = bookConcepts.map((c) => ({
    ...c,
    ...(counts.get(c.id) ?? { total: 0, unsolved: 0 }),
  }));

  return (
    <div className="flex h-dvh w-full overflow-hidden">
      <div className="flex w-[300px] shrink-0 flex-col gap-5 overflow-y-auto border-r border-line bg-sidebar px-5 py-7">
        <Link href="/practice" className="flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-ink">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          책 목록
        </Link>

        <div className="flex flex-col gap-0.5 border-b border-line pb-2">
          <span className="font-serif text-xl font-bold text-ink">{book.name}</span>
        </div>

        <ConceptSidebar bookId={bookId} concepts={conceptsWithCounts} />
      </div>

      <div className="flex-grow overflow-y-auto">{children}</div>
    </div>
  );
}
