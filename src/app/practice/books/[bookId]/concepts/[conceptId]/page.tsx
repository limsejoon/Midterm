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
    })
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
    type: v.type,
    choices: v.choices,
    isCorrect: latestAttempt.has(v.variantId) ? latestAttempt.get(v.variantId)! : null,
  }));

  return <ConceptPracticePanel conceptName={concept.name} rows={rows} />;
}
