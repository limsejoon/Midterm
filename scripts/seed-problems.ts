import { readFileSync } from 'fs';
import { eq, and } from 'drizzle-orm';
import { getDb } from '../src/db';
import { books, concepts, problems, variants } from '../src/db/schema';
import { generateVariants } from '../src/ai/generate-variants';

const BOOK_NAME = '빠작 중등문법';
const REFERENCE_FILE = 'content/ppajak-grammar/01-moeum-chegye.json';
const VARIANT_COUNT = 3;

type ReferenceProblem = {
  number: number;
  type: 'multiple_choice' | 'short_answer' | 'ox';
  questionText: string;
  choices: string[] | null;
  correctAnswer: string;
};

type ReferenceFile = {
  concept: string;
  sourceNote: string;
  referenceProblems: ReferenceProblem[];
};

async function main() {
  const db = getDb();
  const data = JSON.parse(readFileSync(REFERENCE_FILE, 'utf8')) as ReferenceFile;

  const [book] = await db.select().from(books).where(eq(books.name, BOOK_NAME));
  if (!book) throw new Error(`책을 찾을 수 없습니다: "${BOOK_NAME}"`);

  const [concept] = await db
    .select()
    .from(concepts)
    .where(and(eq(concepts.bookId, book.id), eq(concepts.name, data.concept)));
  if (!concept) throw new Error(`개념을 찾을 수 없습니다: "${data.concept}"`);

  let problemsAdded = 0;
  let variantsAdded = 0;

  for (const ref of data.referenceProblems) {
    const [problem] = await db
      .insert(problems)
      .values({
        conceptId: concept.id,
        type: ref.type,
        questionText: ref.questionText,
        choices: ref.choices,
        correctAnswer: ref.correctAnswer,
        sourceNote: `${data.sourceNote} - ${ref.number}번`,
      })
      .returning();
    problemsAdded += 1;

    const generated = await generateVariants({
      conceptName: concept.name,
      originalQuestionText: ref.questionText,
      originalType: ref.type,
      count: VARIANT_COUNT,
    });

    await db.insert(variants).values(
      generated.map((v) => ({
        problemId: problem.id,
        conceptId: concept.id,
        type: v.type,
        questionText: v.questionText,
        choices: v.choices,
        correctAnswer: v.correctAnswer,
      })),
    );
    variantsAdded += generated.length;

    console.log(`  ${ref.number}번 → problem #${problem.id}, variant ${generated.length}개 생성`);
  }

  console.log(`\n완료: problems ${problemsAdded}개, variants ${variantsAdded}개 추가 (개념: "${concept.name}")`);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
