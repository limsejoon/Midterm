import { notFound } from 'next/navigation';
import { asc, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { concepts, variants, attempts } from '@/db/schema';
import ConceptPracticePanel from './ConceptPracticePanel';

export default async function ConceptProblemsPage({
  params,
}: {
  params: Promise<{ bookId: string; conceptId: string }>;
}) {
  const { conceptId: conceptIdParam } = await params;
  const conceptId = Number(conceptIdParam);
  const db = getDb();

  const [concept] = await db.select().from(concepts).where(eq(concepts.id, conceptId));
  if (!concept) notFound();

  const conceptVariants = await db
    .select({
      variantId: variants.id,
      questionText: variants.questionText,
      type: variants.type,
      choices: variants.choices,
      correctAnswer: variants.correctAnswer,
    })
    .from(variants)
    .where(eq(variants.conceptId, conceptId))
    .orderBy(asc(variants.id));

  // a variant is only ever attempted once now (submitAnswerAction is idempotent), but
  // keep taking the latest row defensively rather than assuming exactly one
  const attemptRows = await db
    .select({
      variantId: attempts.variantId,
      submittedAnswer: attempts.submittedAnswer,
      isCorrect: attempts.isCorrect,
      mistakeAnalysis: attempts.mistakeAnalysis,
      solvedAt: attempts.solvedAt,
    })
    .from(attempts)
    .orderBy(asc(attempts.solvedAt));
  const latestAttempt = new Map<number, (typeof attemptRows)[number]>();
  for (const a of attemptRows) {
    latestAttempt.set(a.variantId, a); // later rows overwrite earlier ones
  }

  const rows = conceptVariants.map((v) => {
    const attempt = latestAttempt.get(v.variantId) ?? null;
    return {
      variantId: v.variantId,
      questionText: v.questionText,
      type: v.type,
      choices: v.choices,
      correctAnswer: v.correctAnswer,
      isCorrect: attempt?.isCorrect ?? null,
      submittedAnswer: attempt?.submittedAnswer ?? null,
      mistakeAnalysis: attempt?.mistakeAnalysis ?? null,
    };
  });

  return <ConceptPracticePanel conceptName={concept.name} rows={rows} />;
}
