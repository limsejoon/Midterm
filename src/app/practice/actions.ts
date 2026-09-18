'use server';

import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { variants, concepts, attempts } from '@/db/schema';
import { gradeAttempt } from '@/lib/grade-attempt';
import { needsMistakeExplanation } from '@/lib/grading';
import { analyzeAndRegenerate } from '@/lib/mistake-followup';

export type SubmitAnswerResult = {
  isCorrect: boolean;
  correctAnswer: string;
  gradedBy: 'exact' | 'ai_judged';
  attemptId: number;
  needsExplanation: boolean;
  mistakeAnalysis: string | null;
};

async function loadVariantAndConcept(variantId: number) {
  const [variant] = await getDb().select().from(variants).where(eq(variants.id, variantId));
  if (!variant) throw new Error('문제를 찾을 수 없습니다.');
  const [concept] = await getDb().select().from(concepts).where(eq(concepts.id, variant.conceptId));
  return { variant, concept };
}

export async function submitAnswerAction(
  variantId: number,
  submittedAnswer: string,
): Promise<SubmitAnswerResult> {
  const db = getDb();

  // idempotent: a variant that already has an attempt is re-graded/re-analyzed here,
  // never resubmitted — otherwise a repeat wrong answer would spawn another round of
  // follow-up variants every time
  const [existing] = await db.select().from(attempts).where(eq(attempts.variantId, variantId));
  if (existing) {
    return {
      isCorrect: existing.isCorrect,
      correctAnswer: (await loadVariantAndConcept(variantId)).variant.correctAnswer,
      gradedBy: existing.gradedBy,
      attemptId: existing.id,
      needsExplanation: false,
      mistakeAnalysis: existing.mistakeAnalysis,
    };
  }

  const { variant, concept } = await loadVariantAndConcept(variantId);

  const result = await gradeAttempt({
    type: variant.type,
    conceptName: concept.name,
    questionText: variant.questionText,
    correctAnswer: variant.correctAnswer,
    submittedAnswer,
  });

  const [attempt] = await db
    .insert(attempts)
    .values({
      variantId,
      submittedAnswer,
      isCorrect: result.isCorrect,
      gradedBy: result.gradedBy,
    })
    .returning();

  // follow-up variants are capped at one level: a wrong answer on a variant that was
  // itself generated as a follow-up doesn't trigger another round of analysis
  const isFollowUpVariant = variant.sourceAttemptId !== null;

  if (result.isCorrect || isFollowUpVariant) {
    return {
      isCorrect: result.isCorrect,
      correctAnswer: variant.correctAnswer,
      gradedBy: result.gradedBy,
      attemptId: attempt.id,
      needsExplanation: false,
      mistakeAnalysis: null,
    };
  }

  const needsExplanation = needsMistakeExplanation(variant.type, variant.choices);

  if (needsExplanation) {
    return {
      isCorrect: false,
      correctAnswer: variant.correctAnswer,
      gradedBy: result.gradedBy,
      attemptId: attempt.id,
      needsExplanation: true,
      mistakeAnalysis: null,
    };
  }

  const mistakeAnalysis = await analyzeAndRegenerate({
    attemptId: attempt.id,
    conceptId: variant.conceptId,
    conceptName: concept.name,
    problemId: variant.problemId,
    questionText: variant.questionText,
    choices: variant.choices,
    correctAnswer: variant.correctAnswer,
    submittedAnswer,
    originalType: variant.type,
    childExplanation: null,
  });

  return {
    isCorrect: false,
    correctAnswer: variant.correctAnswer,
    gradedBy: result.gradedBy,
    attemptId: attempt.id,
    needsExplanation: false,
    mistakeAnalysis,
  };
}

export async function submitExplanationAction(
  variantId: number,
  attemptId: number,
  childExplanation: string,
): Promise<{ mistakeAnalysis: string }> {
  const { variant, concept } = await loadVariantAndConcept(variantId);

  const [attempt] = await getDb().select().from(attempts).where(eq(attempts.id, attemptId));
  if (!attempt) throw new Error('풀이 기록을 찾을 수 없습니다.');

  const mistakeAnalysis = await analyzeAndRegenerate({
    attemptId: attempt.id,
    conceptId: variant.conceptId,
    conceptName: concept.name,
    problemId: variant.problemId,
    questionText: variant.questionText,
    choices: variant.choices,
    correctAnswer: variant.correctAnswer,
    submittedAnswer: attempt.submittedAnswer,
    originalType: variant.type,
    childExplanation,
  });

  return { mistakeAnalysis };
}
