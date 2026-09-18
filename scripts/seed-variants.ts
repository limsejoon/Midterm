import { eq } from 'drizzle-orm';
import { getDb } from '../src/db';
import { concepts, problems, variants } from '../src/db/schema';
import { generateVariants } from '../src/ai/generate-variants';

const CONCEPT_NAME = process.argv[2];
const VARIANT_COUNT = Number(process.argv[3] ?? 3);

if (!CONCEPT_NAME) {
  console.error('사용법: npx dotenv -e .env.local -- npx tsx scripts/seed-variants.ts "<개념 이름>" [개당 변형 수]');
  process.exit(1);
}

// Generates AI variants for every base problem under a concept. Run this
// only after the base problems (scripts/seed-problems.ts) have been
// reviewed and confirmed solvable on their own.
async function main() {
  const db = getDb();
  const [concept] = await db.select().from(concepts).where(eq(concepts.name, CONCEPT_NAME));
  if (!concept) throw new Error(`개념을 찾을 수 없습니다: "${CONCEPT_NAME}"`);

  const problemRows = await db.select().from(problems).where(eq(problems.conceptId, concept.id));
  console.log(`"${concept.name}" 개념의 기본 문제 ${problemRows.length}개, 각 ${VARIANT_COUNT}개씩 변형 생성`);

  let totalAdded = 0;

  for (const problem of problemRows) {
    const generated = await generateVariants({
      conceptName: concept.name,
      originalQuestionText: problem.questionText,
      originalType: problem.type,
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

    totalAdded += generated.length;
    console.log(`  problem #${problem.id} → 변형 ${generated.length}개 생성`);
  }

  console.log(`\n완료: 변형 문제 ${totalAdded}개 추가 (개념: "${concept.name}")`);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
