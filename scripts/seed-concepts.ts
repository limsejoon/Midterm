import { eq } from 'drizzle-orm';
import { getDb } from '../src/db';
import { books, concepts } from '../src/db/schema';

const BOOK_NAME = '빠작 중등문법';

const CONCEPT_NAMES = [
  '음운 체계 - 모음 체계',
  '음운 체계 - 자음 체계',
  // not in the table of contents — this is a "3단계 실력 향상 문제" combined
  // review section that follows 01+02 in the book itself
  '음운 체계 - 실력 향상 문제',
  '음운 변동 - 음절의 끝소리 규칙',
  // also not in the table of contents by this name — the book's own page
  // header says "04 음운 동화" (비음화/유음화/구개음화), contradicting the
  // TOC reading below for 04/05. Order/names past this point are unverified
  // until confirmed against the actual pages.
  '음운 변동 - 음운 동화',
  '음운 변동 - 자음군 단순화',
  '음운 변동 - 음운 축약, 탈락, 첨가',
  '품사 - 체언',
  '품사 - 용언',
  '품사 - 수식언',
  '품사 - 관계언과 독립언',
  '단어의 짜임 - 어근과 접사',
  '단어의 짜임 - 파생어와 합성어',
  '어휘의 체계와 양상',
  '어휘의 의미 관계 - 반의 관계',
  '어휘의 의미 관계 - 상하 관계, 다의 관계, 동음이의 관계',
  '문장 성분 - 주성분',
  '문장 성분 - 부속 성분과 독립 성분',
  '문장 구조 - 이어진문장',
  '문장 구조 - 안은문장',
  '문법 요소 - 종결 표현, 높임 표현, 시간 표현',
  '문법 요소 - 피동 표현, 사동 표현',
  '문법 요소 - 부정 표현, 인용 표현',
  '언어의 본질과 기능',
  '언어 규범과 표준어 규정',
  '단어의 발음',
  '한글의 창제 원리와 가치',
  '실력 완성 문제 - I단원 종합',
  '실력 완성 문제 - II단원 종합',
  '실력 완성 문제 - III단원 종합',
  '실력 완성 문제 - IV단원 종합',
];

async function main() {
  const db = getDb();

  const [book] = await db.select().from(books).where(eq(books.name, BOOK_NAME));
  if (!book) {
    throw new Error(`책을 찾을 수 없습니다: "${BOOK_NAME}". 먼저 books 테이블에 등록해주세요.`);
  }

  const existing = await db.select({ name: concepts.name }).from(concepts).where(eq(concepts.bookId, book.id));
  const existingNames = new Set(existing.map((r) => r.name));
  let nextOrderIndex = existing.length;
  let added = 0;

  for (const name of CONCEPT_NAMES) {
    if (existingNames.has(name)) continue;
    await db.insert(concepts).values({ bookId: book.id, name, orderIndex: nextOrderIndex });
    existingNames.add(name);
    nextOrderIndex += 1;
    added += 1;
  }

  console.log(`책: "${BOOK_NAME}" (id=${book.id})`);
  console.log(`새로 추가된 개념: ${added}개`);
  console.log(`전체 개념 수: ${existingNames.size}개`);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
