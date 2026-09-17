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
    <main className="mx-auto max-w-xl p-6">
      <h1 className="mb-4 text-xl font-bold">학습 기록</h1>

      <h2 className="mb-2 font-semibold">개념별 정답률</h2>
      <table className="mb-6 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="py-1">개념</th>
            <th className="py-1">정답률</th>
          </tr>
        </thead>
        <tbody>
          {accuracy.map((a) => (
            <tr key={a.conceptName} className="border-b">
              <td className="py-1">{a.conceptName}</td>
              <td className="py-1">
                {a.correct}/{a.total} ({Math.round((a.correct / a.total) * 100)}%)
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="mb-2 font-semibold">최근 풀이</h2>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.attemptId} className="rounded border p-2 text-sm">
            <div className="text-gray-500">
              {r.conceptName} · {new Date(r.solvedAt).toLocaleString('ko-KR')}
            </div>
            <div>{r.questionText}</div>
            <div className={r.isCorrect ? 'text-green-600' : 'text-red-600'}>
              {r.isCorrect ? '정답' : '오답'}
              {r.gradedBy === 'ai_judged' ? ' (AI 채점)' : ''}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
