import Link from 'next/link';
import { notFound } from 'next/navigation';
import { asc, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { concepts, variants, attempts } from '@/db/schema';

export default async function ConceptProblemsPage({
  params,
}: {
  params: Promise<{ bookId: string; conceptId: string }>;
}) {
  const { bookId, conceptId: conceptIdParam } = await params;
  const conceptId = Number(conceptIdParam);
  const db = getDb();

  const [concept] = await db.select().from(concepts).where(eq(concepts.id, conceptId));
  if (!concept) notFound();

  const conceptVariants = await db
    .select({ variantId: variants.id, questionText: variants.questionText })
    .from(variants)
    .where(eq(variants.conceptId, conceptId))
    .orderBy(asc(variants.id));

  // a variant can in principle be attempted more than once; use the most recent attempt's result
  const attemptRows = await db
    .select({ variantId: attempts.variantId, isCorrect: attempts.isCorrect, solvedAt: attempts.solvedAt })
    .from(attempts)
    .orderBy(asc(attempts.solvedAt));
  const latestAttempt = new Map<number, boolean>();
  for (const a of attemptRows) {
    latestAttempt.set(a.variantId, a.isCorrect); // later rows overwrite earlier ones
  }

  const rows = conceptVariants.map((v) => ({
    variantId: v.variantId,
    questionText: v.questionText,
    isCorrect: latestAttempt.has(v.variantId) ? latestAttempt.get(v.variantId)! : null,
  }));

  return (
    <main className="mx-auto max-w-xl p-6">
      <Link href={`/practice/books/${bookId}`} className="mb-2 block text-sm text-blue-600 underline">
        ← 목차
      </Link>
      <h1 className="mb-4 text-xl font-bold">{concept.name}</h1>
      {rows.length === 0 && <p>등록된 문제가 없어요.</p>}
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.variantId}>
            <Link href={`/practice/${r.variantId}`} className="block rounded border p-3 hover:bg-gray-50">
              <div className="flex items-center justify-between gap-2">
                <span>{r.questionText}</span>
                <span
                  className={
                    r.isCorrect === null
                      ? 'shrink-0 text-xs text-gray-400'
                      : r.isCorrect
                        ? 'shrink-0 text-xs text-green-600'
                        : 'shrink-0 text-xs text-red-600'
                  }
                >
                  {r.isCorrect === null ? '안 풀었음' : r.isCorrect ? '정답' : '오답'}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
