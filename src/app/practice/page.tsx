import Link from 'next/link';
import { asc, desc, eq } from 'drizzle-orm';
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

  const [recent] = await db
    .select({
      isCorrect: attempts.isCorrect,
      questionText: variants.questionText,
      conceptName: concepts.name,
      bookName: books.name,
    })
    .from(attempts)
    .innerJoin(variants, eq(attempts.variantId, variants.id))
    .innerJoin(concepts, eq(variants.conceptId, concepts.id))
    .innerJoin(books, eq(concepts.bookId, books.id))
    .orderBy(desc(attempts.solvedAt))
    .limit(1);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 p-14">
      <div className="flex items-baseline justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="font-serif text-3xl font-bold text-ink">빠작 학습노트</h1>
          <p className="text-sm text-muted">문제집을 골라서 오늘 공부를 시작해요</p>
        </div>
        <Link
          href="/"
          aria-label="다른 기능 보기"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-ink-soft hover:bg-accent-soft"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </Link>
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-bold text-ink-soft">내 문제집</h2>

        {allBooks.length === 0 ? (
          <p className="text-sm text-ink-soft">
            등록된 문제집이 없어요.{' '}
            <Link href="/concepts/new" className="font-semibold text-accent underline">
              문제집 목차를 먼저 등록해보세요.
            </Link>
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {allBooks.map((book) => {
              const c = counts.get(book.id) ?? { total: 0, unsolved: 0 };
              const percent = c.total === 0 ? 0 : Math.round(((c.total - c.unsolved) / c.total) * 100);
              return (
                <Link
                  key={book.id}
                  href={`/practice/books/${book.id}`}
                  className="flex h-[220px] flex-col gap-5 rounded-2xl border border-line bg-surface p-7 shadow-sm hover:border-accent"
                >
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-bold text-accent">국어 문법</span>
                    <span className="font-serif text-xl font-bold text-ink">{book.name}</span>
                  </div>
                  <div className="flex-grow" />
                  {c.total === 0 ? (
                    <p className="text-sm text-muted">등록된 문제 없음</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-accent-soft">
                        <div className="h-full bg-accent" style={{ width: `${percent}%` }} />
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted">안 푼 문제 {c.unsolved}개</span>
                        <span className="font-semibold text-ink">→ 이어서 풀기</span>
                      </div>
                    </div>
                  )}
                </Link>
              );
            })}

            <Link
              href="/concepts/new"
              aria-label="새 문제집 등록"
              className="flex h-[220px] flex-col items-center justify-center gap-2.5 rounded-2xl border-[1.5px] border-dashed border-line text-muted hover:border-accent hover:text-accent"
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span className="text-sm font-semibold">새 문제집 등록</span>
            </Link>
          </div>
        )}
      </div>

      {recent && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-bold text-ink-soft">최근 학습</h2>
          <div className="flex items-center gap-4 rounded-2xl border border-line bg-surface px-6 py-4">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-xs font-bold ${
                recent.isCorrect ? 'bg-ok-soft text-ok' : 'bg-danger-soft text-danger'
              }`}
            >
              {recent.isCorrect ? '정답' : '오답'}
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-semibold text-ink">{recent.questionText}</p>
              <p className="text-xs text-muted">
                {recent.conceptName} · {recent.bookName}
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
