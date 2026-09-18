import { readFileSync } from 'fs';
import { eq, and } from 'drizzle-orm';
import { getDb } from '../src/db';
import { books, concepts, problems, variants } from '../src/db/schema';

const BOOK_NAME = '빠작 중등문법';
const REFERENCE_FILE = process.argv[2] ?? 'content/ppajak-grammar/01-moeum-chegye.json';

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

// Inserts the verified reference problems as `problems` rows, and also as
// their own `variants` row (identical content) so they're solvable right
// away. AI-generated variants are a separate, later step — see
// scripts/seed-variants.ts.
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

  let added = 0;
  let skipped = 0;

  for (const ref of data.referenceProblems) {
    if (ref.type === 'multiple_choice' && !ref.choices) {
      console.log(`  ${ref.number}번 → 건너뜀 (객관식인데 choices가 비어있음, 원본 확인 필요)`);
      skipped += 1;
      continue;
    }

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

    await db.insert(variants).values({
      problemId: problem.id,
      conceptId: concept.id,
      type: problem.type,
      questionText: problem.questionText,
      choices: problem.choices,
      correctAnswer: problem.correctAnswer,
    });

    added += 1;
    console.log(`  ${ref.number}번 → problem #${problem.id} (바로 풀 수 있음)`);
  }

  console.log(
    `\n완료: 기본 문제 ${added}개 추가 (개념: "${concept.name}")${skipped > 0 ? `, ${skipped}개 건너뜀` : ''}. 변형 문제는 scripts/seed-variants.ts로 나중에 추가.`,
  );
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
