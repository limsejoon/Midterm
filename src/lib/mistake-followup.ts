import { getDb } from '@/db';
import { attempts, variants } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { analyzeMistake } from '@/ai/analyze-mistake';
import { generateVariants } from '@/ai/generate-variants';

const FOLLOW_UP_COUNT = 2;

export async function analyzeAndRegenerate(params: {
  attemptId: number;
  conceptId: number;
  conceptName: string;
  problemId: number;
  questionText: string;
  choices: string[] | null;
  correctAnswer: string;
  submittedAnswer: string;
  originalType: 'multiple_choice' | 'short_answer' | 'ox';
  childExplanation: string | null;
}): Promise<string> {
  const db = getDb();

  const analysis = await analyzeMistake({
    conceptName: params.conceptName,
    questionText: params.questionText,
    choices: params.choices,
    correctAnswer: params.correctAnswer,
    submittedAnswer: params.submittedAnswer,
    childExplanation: params.childExplanation,
  });

  await db
    .update(attempts)
    .set({ mistakeExplanation: params.childExplanation, mistakeAnalysis: analysis })
    .where(eq(attempts.id, params.attemptId));

  const generated = await generateVariants({
    conceptName: params.conceptName,
    originalQuestionText: params.questionText,
    originalType: params.originalType,
    count: FOLLOW_UP_COUNT,
    focusHint: analysis,
  });

  await db.insert(variants).values(
    generated.map((v) => ({
      problemId: params.problemId,
      conceptId: params.conceptId,
      type: v.type,
      questionText: v.questionText,
      choices: v.choices,
      correctAnswer: v.correctAnswer,
      sourceAttemptId: params.attemptId,
    })),
  );

  return analysis;
}
