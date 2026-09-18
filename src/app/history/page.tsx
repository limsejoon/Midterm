import { desc, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { attempts, variants, concepts } from '@/db/schema';
import { computeConceptAccuracy } from '@/lib/stats';

export default async function HistoryPage() {
  const db = getDb();

  const rows = await db
    .select({
      attemptId: attempts.id,
      isCorrect: attempts.isCorrect,
      gradedBy: attempts.gradedBy,
      solvedAt: attempts.solvedAt,
      questionText: variants.questionText,
      conceptName: concepts.name,
    })
    .from(attempts)
    .innerJoin(variants, eq(attempts.variantId, variants.id))
    .innerJoin(concepts, eq(variants.conceptId, concepts.id))
    .orderBy(desc(attempts.solvedAt));

  const accuracy = computeConceptAccuracy(rows);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-10 p-14">
      <h1 className="font-serif text-2xl font-bold text-ink">학습 기록</h1>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-bold text-ink-soft">개념별 정답률</h2>
        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line bg-sidebar text-left">
                <th className="px-5 py-3 font-semibold text-ink-soft">개념</th>
                <th className="px-5 py-3 font-semibold text-ink-soft">정답률</th>
              </tr>
            </thead>
            <tbody>
              {accuracy.map((a) => (
                <tr key={a.conceptName} className="border-b border-line last:border-none">
                  <td className="px-5 py-3 text-ink">{a.conceptName}</td>
                  <td className="px-5 py-3 text-ink-soft">
                    {a.correct}/{a.total} ({Math.round((a.correct / a.total) * 100)}%)
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-bold text-ink-soft">최근 풀이</h2>
        <ul className="flex flex-col gap-2.5">
          {rows.map((r) => (
            <li key={r.attemptId} className="rounded-2xl border border-line bg-surface p-4 text-sm">
              <div className="text-muted">
                {r.conceptName} · {new Date(r.solvedAt).toLocaleString('ko-KR')}
              </div>
              <div className="mt-1 text-ink">{r.questionText}</div>
              <div className={`mt-1 font-semibold ${r.isCorrect ? 'text-ok' : 'text-danger'}`}>
                {r.isCorrect ? '정답' : '오답'}
                {r.gradedBy === 'ai_judged' ? ' (AI 채점)' : ''}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
