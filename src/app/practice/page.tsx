import Link from 'next/link';
import { getDb } from '@/db';
import { variants, attempts, concepts } from '@/db/schema';
import { eq } from 'drizzle-orm';

export default async function PracticePage() {
  const db = getDb();

  const solvedRows = await db.select({ variantId: attempts.variantId }).from(attempts);
  const solvedIds = new Set(solvedRows.map((r) => r.variantId));

  const allVariants = await db
    .select({
      id: variants.id,
      questionText: variants.questionText,
      conceptName: concepts.name,
    })
    .from(variants)
    .innerJoin(concepts, eq(variants.conceptId, concepts.id));

  const unsolved = allVariants.filter((v) => !solvedIds.has(v.id));

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="mb-4 text-xl font-bold">풀 문제 ({unsolved.length}개)</h1>
      {unsolved.length === 0 && <p>풀 문제가 없어요. 새 문제를 등록해보세요.</p>}
      <ul className="space-y-2">
        {unsolved.map((v) => (
          <li key={v.id}>
            <Link href={`/practice/${v.id}`} className="block rounded border p-3 hover:bg-gray-50">
              <div className="text-sm text-gray-500">{v.conceptName}</div>
              <div>{v.questionText}</div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
