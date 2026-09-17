'use server';

import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { concepts, problems, variants } from '@/db/schema';
import { extractProblemFromImage, type ExtractedProblem } from '@/ai/extract-problem';
import { generateVariants } from '@/ai/generate-variants';

const VARIANT_COUNT = 3;

export async function getConceptNamesAction(): Promise<string[]> {
  const db = getDb();
  const rows = await db.select({ name: concepts.name }).from(concepts);
  return rows.map((r) => r.name);
}

export async function extractFromImageAction(formData: FormData): Promise<ExtractedProblem> {
  const file = formData.get('image');
  if (!(file instanceof File)) {
    throw new Error('이미지 파일이 필요합니다.');
  }
  const db = getDb();
  const existingConcepts = (await db.select({ name: concepts.name }).from(concepts)).map((r) => r.name);

  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  return extractProblemFromImage(base64, file.type, existingConcepts);
}

export async function saveProblemAction(
  data: ExtractedProblem & { sourceNote: string },
): Promise<{ problemId: number; conceptName: string }> {
  const db = getDb();

  let [concept] = await db.select().from(concepts).where(eq(concepts.name, data.conceptName));
  if (!concept) {
    [concept] = await db.insert(concepts).values({ name: data.conceptName }).returning();
  }

  const [problem] = await db
    .insert(problems)
    .values({
      conceptId: concept.id,
      type: data.type,
      questionText: data.questionText,
      choices: data.choices,
      correctAnswer: data.correctAnswer,
      sourceNote: data.sourceNote || null,
    })
    .returning();

  return { problemId: problem.id, conceptName: concept.name };
}

export async function generateVariantsForProblemAction(problemId: number): Promise<{ count: number }> {
  const db = getDb();

  const [problem] = await db.select().from(problems).where(eq(problems.id, problemId));
  if (!problem) throw new Error('문제를 찾을 수 없습니다.');

  const [concept] = await db.select().from(concepts).where(eq(concepts.id, problem.conceptId));

  const generated = await generateVariants({
    conceptName: concept.name,
    originalQuestionText: problem.questionText,
    originalType: problem.type,
    count: VARIANT_COUNT,
  });

  await db.insert(variants).values(
    generated.map((v) => ({
      problemId: problem.id,
      conceptId: problem.conceptId,
      type: v.type,
      questionText: v.questionText,
      choices: v.choices,
      correctAnswer: v.correctAnswer,
    })),
  );

  return { count: generated.length };
}
