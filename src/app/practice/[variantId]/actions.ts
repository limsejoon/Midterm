'use server';

import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { variants, concepts, attempts } from '@/db/schema';
import { gradeAttempt } from '@/lib/grade-attempt';

export async function submitAnswerAction(
  variantId: number,
  submittedAnswer: string,
): Promise<{ isCorrect: boolean; correctAnswer: string; gradedBy: 'exact' | 'ai_judged' }> {
  const db = getDb();

  const [variant] = await db.select().from(variants).where(eq(variants.id, variantId));
  if (!variant) throw new Error('문제를 찾을 수 없습니다.');

  const [concept] = await db.select().from(concepts).where(eq(concepts.id, variant.conceptId));

  const result = await gradeAttempt({
    type: variant.type,
    conceptName: concept.name,
    questionText: variant.questionText,
    correctAnswer: variant.correctAnswer,
    submittedAnswer,
  });

  await db.insert(attempts).values({
    variantId,
    submittedAnswer,
    isCorrect: result.isCorrect,
    gradedBy: result.gradedBy,
  });

  return { isCorrect: result.isCorrect, correctAnswer: variant.correctAnswer, gradedBy: result.gradedBy };
}
