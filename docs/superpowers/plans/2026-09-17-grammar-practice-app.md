# 중등 국어 문법 대체 문제 학습 앱 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a home-use Next.js web app where a parent registers a workbook's concept list from its table of contents, then photographs individual grammar problems, has an AI extract and generate concept-matched variant problems, and the child solves them on screen with grading and history tracked in Postgres.

**Architecture:** Next.js App Router on Vercel, using Server Actions for all mutations (no separate API routes). AI calls go through the Vercel AI Gateway via the `ai` package (`generateText` + `Output.object`/`Output.array`, not the deprecated `generateObject`). Data persists in Neon Postgres via Drizzle ORM. No auth, no image storage — only extracted structured data is kept. The workbook's concept list is registered once (from its table of contents) so that every problem's grammar concept is picked from that fixed list instead of being freely reworded each time.

**Tech Stack:** Next.js 16 (App Router, TypeScript, src dir), `ai` (AI SDK, v7, via Vercel AI Gateway), `drizzle-orm` + `drizzle-kit` + `@neondatabase/serverless` (Neon Postgres, `neon-http` driver), Vitest for unit tests, Tailwind CSS for styling.

**Spec:** `docs/superpowers/specs/2026-09-17-grammar-practice-app-design.md`

## Global Constraints

- No login / multi-user support — single, unauthenticated access (per spec "범위 밖").
- Do not store the original photographed image anywhere — only the AI-extracted structured fields are persisted (spec "데이터 모델" note).
- Models are called through the Vercel AI Gateway using plain `"provider/model"` strings (e.g. `anthropic/claude-sonnet-5`), not a provider-specific SDK package.
- Problem types are exactly one of `multiple_choice | short_answer | ox` everywhere (spec "데이터 모델").
- Short-answer grading: normalized exact match first; only call the AI judge on mismatch; if the AI judge call fails, fall back to the exact-match result only (spec "에러 처리").
- Concept names come from the pre-registered `concepts` list whenever possible — problem extraction is given the existing list and asked to reuse a matching name rather than invent a new one (spec "0. 목차로 개념 목록 미리 등록").

---

## File Structure

```
drizzle.config.ts
vitest.config.ts
src/
  db/
    schema.ts              -- concepts, problems, variants, attempts tables
    index.ts                -- getDb() lazy Drizzle client
  ai/
    models.ts                -- model id constants
    extract-concepts.ts       -- extractConceptsFromImage()
    extract-concepts.test.ts
    extract-problem.ts         -- extractProblemFromImage()
    extract-problem.test.ts
    generate-variants.ts        -- generateVariants()
    generate-variants.test.ts
    grade-short-answer.ts        -- aiJudgeShortAnswer()
    grade-short-answer.test.ts
  lib/
    grading.ts                -- normalizeAnswerText(), isExactMatch(), shuffleChoices()
    grading.test.ts
    grade-attempt.ts            -- gradeAttempt() orchestration
    grade-attempt.test.ts
    stats.ts                     -- computeConceptAccuracy()
    stats.test.ts
  app/
    page.tsx                     -- home page with nav links
    concepts/
      new/
        page.tsx                  -- client: upload TOC photo(s) -> editable list -> save
        actions.ts                 -- extractConceptsFromImageAction, saveConceptsAction
    new-problem/
      page.tsx                    -- client: upload -> confirm (concept dropdown) -> generating flow
      actions.ts                   -- getConceptNamesAction, extractFromImageAction, saveProblemAction, generateVariantsForProblemAction
    practice/
      page.tsx                     -- list of unsolved variants
      [variantId]/
        page.tsx                    -- solve UI
        actions.ts                   -- submitAnswerAction
    history/
      page.tsx                     -- recent attempts + accuracy by concept
```

---

### Task 1: Scaffold Next.js app + Vitest

**Files:**
- Create: entire Next.js scaffold (via `create-next-app`) in the repo root
- Create: `vitest.config.ts`
- Create: `src/lib/sanity.test.ts` (deleted at the end of the task, only used to prove the test runner works)

**Interfaces:**
- Produces: a working `npm run dev`, `npm run build`, `npm test` in this repo, with `@/*` resolving to `src/*` in both TypeScript and Vitest.

- [ ] **Step 1: Scaffold the app**

Run from the repo root (`/Users/limsejoon/my-workspace/Chloe`, which already has `.git` and `docs/`):

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --disable-git --yes
```

`--disable-git` is required because the repo is already a git repo (created during brainstorming) — `create-next-app` would otherwise fail trying to re-init it.

- [ ] **Step 2: Install Vitest**

```bash
npm install -D vitest
```

- [ ] **Step 3: Add the Vitest config**

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

- [ ] **Step 4: Add the `test` script**

In `package.json`, add to `"scripts"`:

```json
"test": "vitest run"
```

- [ ] **Step 5: Prove the test runner works**

```ts
// src/lib/sanity.test.ts
import { describe, it, expect } from 'vitest';

describe('sanity', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run: `npm test`
Expected: 1 passed.

Delete `src/lib/sanity.test.ts` after confirming (it was only there to prove the harness works — real tests start in Task 3).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Scaffold Next.js app with Vitest"
```

---

### Task 2: Provision Neon Postgres + Drizzle schema

**Files:**
- Create: `drizzle.config.ts`
- Create: `src/db/schema.ts`
- Create: `src/db/index.ts`
- Modify: `package.json` (add `db:push`, `db:generate` scripts)

**Interfaces:**
- Produces: `getDb()` from `@/db` returning a Drizzle client typed with the schema; tables `concepts`, `problems`, `variants`, `attempts` and enums `problemTypeEnum`, `gradedByEnum` exported from `@/db/schema`.

- [ ] **Step 1: Link the Vercel project and provision Neon**

```bash
vercel link --yes
vercel integration add neon
```

Follow the prompts to create a new Neon project through the Marketplace (this auto-injects `DATABASE_URL` into the linked Vercel project's environment variables).

- [ ] **Step 2: Pull env vars locally**

```bash
vercel env pull .env.local
```

Confirm `.env.local` now contains `DATABASE_URL`. This file is already gitignored by the Next.js scaffold — do not commit it.

- [ ] **Step 3: Install DB packages**

```bash
npm install drizzle-orm @neondatabase/serverless
npm install -D drizzle-kit dotenv-cli
```

- [ ] **Step 4: Write the schema**

```ts
// src/db/schema.ts
import {
  pgTable,
  pgEnum,
  serial,
  integer,
  text,
  varchar,
  jsonb,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core';

export const problemTypeEnum = pgEnum('problem_type', [
  'multiple_choice',
  'short_answer',
  'ox',
]);

export const gradedByEnum = pgEnum('graded_by', ['exact', 'ai_judged']);

export const concepts = pgTable('concepts', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const problems = pgTable('problems', {
  id: serial('id').primaryKey(),
  conceptId: integer('concept_id')
    .notNull()
    .references(() => concepts.id),
  type: problemTypeEnum('type').notNull(),
  questionText: text('question_text').notNull(),
  choices: jsonb('choices').$type<string[] | null>(),
  correctAnswer: text('correct_answer').notNull(),
  sourceNote: varchar('source_note', { length: 255 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const variants = pgTable('variants', {
  id: serial('id').primaryKey(),
  problemId: integer('problem_id')
    .notNull()
    .references(() => problems.id),
  conceptId: integer('concept_id')
    .notNull()
    .references(() => concepts.id),
  type: problemTypeEnum('type').notNull(),
  questionText: text('question_text').notNull(),
  choices: jsonb('choices').$type<string[] | null>(),
  correctAnswer: text('correct_answer').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const attempts = pgTable('attempts', {
  id: serial('id').primaryKey(),
  variantId: integer('variant_id')
    .notNull()
    .references(() => variants.id),
  submittedAnswer: text('submitted_answer').notNull(),
  isCorrect: boolean('is_correct').notNull(),
  gradedBy: gradedByEnum('graded_by').notNull(),
  solvedAt: timestamp('solved_at').notNull().defaultNow(),
});
```

- [ ] **Step 5: Write the lazy DB client**

```ts
// src/db/index.ts
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

function createDb() {
  const sql = neon(process.env.DATABASE_URL!);
  return drizzle(sql, { schema });
}

let _db: ReturnType<typeof createDb> | null = null;

export function getDb() {
  if (!_db) _db = createDb();
  return _db;
}
```

Lazy init is required so `next build` doesn't crash when `DATABASE_URL` isn't set at build time (see Vercel storage guidance). Do not wrap this in a `Proxy`.

- [ ] **Step 6: Write the Drizzle config**

```ts
// drizzle.config.ts
import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

- [ ] **Step 7: Add DB scripts and push the schema**

In `package.json` `"scripts"`:

```json
"db:push": "dotenv -e .env.local -- drizzle-kit push",
"db:generate": "dotenv -e .env.local -- drizzle-kit generate"
```

Run: `npm run db:push`
Expected: drizzle-kit reports the 4 tables (and 2 enums) created with no errors.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "Add Neon Postgres + Drizzle schema"
```

(`.env.local` stays untracked — verify with `git status` that it's not staged.)

---

### Task 3: Core grading logic (TDD)

**Files:**
- Create: `src/lib/grading.ts`
- Create: `src/lib/grading.test.ts`

**Interfaces:**
- Produces: `normalizeAnswerText(text: string): string`, `isExactMatch(correctAnswer: string, submittedAnswer: string): boolean`, `shuffleChoices<T>(items: T[]): T[]` — used by Task 8 (variant generation) and Task 9 (grade orchestration).

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/grading.test.ts
import { describe, it, expect } from 'vitest';
import { normalizeAnswerText, isExactMatch, shuffleChoices } from './grading';

describe('normalizeAnswerText', () => {
  it('trims and collapses whitespace', () => {
    expect(normalizeAnswerText('  형용사 이다  ')).toBe('형용사이다');
  });

  it('strips trailing punctuation', () => {
    expect(normalizeAnswerText('형용사.')).toBe('형용사');
    expect(normalizeAnswerText('형용사!')).toBe('형용사');
  });
});

describe('isExactMatch', () => {
  it('matches after normalization', () => {
    expect(isExactMatch('형용사', ' 형용사 ')).toBe(true);
    expect(isExactMatch('형용사.', '형용사')).toBe(true);
  });

  it('rejects different answers', () => {
    expect(isExactMatch('형용사', '동사')).toBe(false);
  });
});

describe('shuffleChoices', () => {
  it('returns the same elements in some order', () => {
    const input = ['a', 'b', 'c', 'd'];
    const result = shuffleChoices(input);
    expect(result).toHaveLength(4);
    expect([...result].sort()).toEqual([...input].sort());
  });

  it('does not mutate the input array', () => {
    const input = ['a', 'b', 'c', 'd'];
    shuffleChoices(input);
    expect(input).toEqual(['a', 'b', 'c', 'd']);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- grading`
Expected: FAIL with "Cannot find module './grading'"

- [ ] **Step 3: Implement**

```ts
// src/lib/grading.ts
export function normalizeAnswerText(text: string): string {
  return text.trim().replace(/\s+/g, '').replace(/[.,!?。、]/g, '');
}

export function isExactMatch(correctAnswer: string, submittedAnswer: string): boolean {
  return normalizeAnswerText(correctAnswer) === normalizeAnswerText(submittedAnswer);
}

export function shuffleChoices<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- grading`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/grading.ts src/lib/grading.test.ts
git commit -m "Add core answer normalization and shuffle logic"
```

---

### Task 4: AI Gateway model constants

**Files:**
- Create: `src/ai/models.ts`

**Interfaces:**
- Produces: `EXTRACTION_MODEL`, `GENERATION_MODEL`, `GRADING_MODEL` string constants, consumed by Tasks 5, 7, 8, 9.

- [ ] **Step 1: Install the `ai` package**

```bash
npm install ai zod
```

- [ ] **Step 2: Add the AI Gateway API key**

Add to `.env.local` (get the key from the Vercel dashboard → AI Gateway → API Keys, or rely on OIDC if deploying on Vercel):

```
AI_GATEWAY_API_KEY=your_api_key_here
```

- [ ] **Step 3: Confirm current model ids**

```bash
curl -s https://ai-gateway.vercel.sh/v1/models | jq -r '[.data[] | select(.id | startswith("anthropic/")) | .id] | reverse | .[]'
```

Use the highest-numbered `claude-sonnet-*` for extraction/generation and the highest-numbered `claude-haiku-*` for grading (cheaper, simple yes/no judgment). As of this plan being written, that's `anthropic/claude-sonnet-5` and `anthropic/claude-haiku-4.5` — re-check and update the values below if newer versions exist by the time this task runs.

- [ ] **Step 4: Write the constants**

```ts
// src/ai/models.ts
export const EXTRACTION_MODEL = 'anthropic/claude-sonnet-5';
export const GENERATION_MODEL = 'anthropic/claude-sonnet-5';
export const GRADING_MODEL = 'anthropic/claude-haiku-4.5';
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Add AI Gateway model constants"
```

(`.env.local` stays untracked.)

---

### Task 5: Table-of-contents concept extraction (TDD)

**Files:**
- Create: `src/ai/extract-concepts.ts`
- Create: `src/ai/extract-concepts.test.ts`

**Interfaces:**
- Consumes: `EXTRACTION_MODEL` from `@/ai/models`.
- Produces: `extractConceptsFromImage(imageBase64: string, mediaType: string): Promise<string[]>` — consumed by Task 6.

- [ ] **Step 1: Write the failing test**

```ts
// src/ai/extract-concepts.test.ts
import { describe, it, expect, vi } from 'vitest';

vi.mock('ai', () => ({
  generateText: vi.fn(),
  Output: { array: vi.fn((config: unknown) => config) },
}));

import { generateText } from 'ai';
import { extractConceptsFromImage } from './extract-concepts';

describe('extractConceptsFromImage', () => {
  it('returns the concept names extracted from the image', async () => {
    vi.mocked(generateText).mockResolvedValue({
      output: ['품사의 종류', '부사와 관형사 구분', '높임법'],
    } as never);

    const result = await extractConceptsFromImage('base64data', 'image/jpeg');

    expect(result).toEqual(['품사의 종류', '부사와 관형사 구분', '높임법']);
  });

  it('sends the image as an image content part to the extraction model', async () => {
    vi.mocked(generateText).mockResolvedValue({ output: [] } as never);

    await extractConceptsFromImage('base64data', 'image/jpeg');

    const call = vi.mocked(generateText).mock.calls[0][0] as {
      model: string;
      messages: Array<{ content: Array<{ type: string; image?: string; mediaType?: string }> }>;
    };
    expect(call.model).toBe('anthropic/claude-sonnet-5');
    const imagePart = call.messages[0].content.find((p) => p.type === 'image');
    expect(imagePart?.image).toBe('base64data');
    expect(imagePart?.mediaType).toBe('image/jpeg');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- extract-concepts`
Expected: FAIL with "Cannot find module './extract-concepts'"

- [ ] **Step 3: Implement**

```ts
// src/ai/extract-concepts.ts
import { generateText, Output } from 'ai';
import { z } from 'zod';
import { EXTRACTION_MODEL } from './models';

export async function extractConceptsFromImage(
  imageBase64: string,
  mediaType: string,
): Promise<string[]> {
  const { output } = await generateText({
    model: EXTRACTION_MODEL,
    output: Output.array({ element: z.string() }),
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: '이 이미지는 중학교 국어 문법 문제집의 목차입니다. 목차에 나온 단원/문법 개념 이름을 순서대로 배열로 추출해줘. 페이지 번호나 "제1장" 같은 장 번호는 빼고 개념 이름만 적어줘.',
          },
          { type: 'image', image: imageBase64, mediaType },
        ],
      },
    ],
  });
  return output;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- extract-concepts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/ai/extract-concepts.ts src/ai/extract-concepts.test.ts
git commit -m "Add AI-based concept list extraction from table of contents"
```

---

### Task 6: Concept registration flow (목차 등록)

**Files:**
- Create: `src/app/concepts/new/actions.ts`
- Create: `src/app/concepts/new/page.tsx`

**Interfaces:**
- Consumes: `extractConceptsFromImage` from `@/ai/extract-concepts`; `getDb` from `@/db`; `concepts` from `@/db/schema`.
- Produces: page at `/concepts/new`. After this task, a parent can photograph a table of contents (across multiple photos if needed) and end up with a reviewed, de-duplicated concept list in the `concepts` table.

- [ ] **Step 1: Write the server actions**

```ts
// src/app/concepts/new/actions.ts
'use server';

import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { concepts } from '@/db/schema';
import { extractConceptsFromImage } from '@/ai/extract-concepts';

export async function extractConceptsFromImageAction(formData: FormData): Promise<string[]> {
  const file = formData.get('image');
  if (!(file instanceof File)) {
    throw new Error('이미지 파일이 필요합니다.');
  }
  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  return extractConceptsFromImage(base64, file.type);
}

export async function saveConceptsAction(names: string[]): Promise<{ added: number }> {
  const db = getDb();
  let added = 0;
  for (const rawName of names) {
    const name = rawName.trim();
    if (!name) continue;
    const [existing] = await db.select().from(concepts).where(eq(concepts.name, name));
    if (existing) continue;
    await db.insert(concepts).values({ name });
    added += 1;
  }
  return { added };
}
```

- [ ] **Step 2: Write the page**

```tsx
// src/app/concepts/new/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { extractConceptsFromImageAction, saveConceptsAction } from './actions';

export default function NewConceptsPage() {
  const router = useRouter();
  const [names, setNames] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    const formData = new FormData();
    formData.set('image', file);
    try {
      const extracted = await extractConceptsFromImageAction(formData);
      setNames((prev) => [...prev, ...extracted]);
    } catch {
      setError('인식에 실패했어요. 아래에서 직접 추가해주세요.');
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  }

  function updateName(index: number, value: string) {
    setNames((prev) => prev.map((n, i) => (i === index ? value : n)));
  }

  function removeName(index: number) {
    setNames((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setBusy(true);
    try {
      await saveConceptsAction(names);
      router.push('/new-problem');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="mb-4 text-xl font-bold">목차로 개념 목록 등록</h1>
      <p className="mb-4 text-sm text-gray-500">
        목차 사진을 한 장씩 올려보세요. 여러 장을 올리면 목록에 계속 추가됩니다.
      </p>

      <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} disabled={busy} />
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {busy && <p className="mt-2 text-sm text-gray-500">처리 중...</p>}

      <ul className="mt-4 space-y-2">
        {names.map((name, i) => (
          <li key={i} className="flex gap-2">
            <input className="flex-1 border p-2" value={name} onChange={(e) => updateName(i, e.target.value)} />
            <button className="rounded border px-3" onClick={() => removeName(i)}>
              삭제
            </button>
          </li>
        ))}
      </ul>

      <button className="mt-3 rounded border px-3 py-1" onClick={() => setNames((prev) => [...prev, ''])}>
        + 직접 추가
      </button>

      <div className="mt-6">
        <button
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
          onClick={handleSave}
          disabled={busy || names.every((n) => !n.trim())}
        >
          저장
        </button>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Manual verification**

```bash
npm run dev
```

Visit `http://localhost:3000/concepts/new`, upload a real photo of the workbook's table of contents, edit/remove/add entries as needed, save, and check in a DB client (or a quick `npm run db:push`-adjacent query) that the rows landed in `concepts` with no duplicates when saving twice.

- [ ] **Step 4: Commit**

```bash
git add src/app/concepts
git commit -m "Add table-of-contents concept registration flow"
```

---

### Task 7: Problem extraction from image (TDD)

**Files:**
- Create: `src/ai/extract-problem.ts`
- Create: `src/ai/extract-problem.test.ts`

**Interfaces:**
- Consumes: `EXTRACTION_MODEL` from `@/ai/models`.
- Produces: `ExtractedProblem` type `{ conceptName: string; type: 'multiple_choice' | 'short_answer' | 'ox'; questionText: string; choices: string[] | null; correctAnswer: string }` and `extractProblemFromImage(imageBase64: string, mediaType: string, existingConcepts?: string[]): Promise<ExtractedProblem>` — consumed by Task 10.

- [ ] **Step 1: Write the failing test**

```ts
// src/ai/extract-problem.test.ts
import { describe, it, expect, vi } from 'vitest';

vi.mock('ai', () => ({
  generateText: vi.fn(),
  Output: { object: vi.fn((config: unknown) => config) },
}));

import { generateText } from 'ai';
import { extractProblemFromImage } from './extract-problem';

describe('extractProblemFromImage', () => {
  it('returns the structured object extracted by the model', async () => {
    vi.mocked(generateText).mockResolvedValue({
      output: {
        conceptName: '부사와 관형사 구분',
        type: 'multiple_choice',
        questionText: '다음 중 부사인 것은?',
        choices: ['새', '새로운', '매우', '파란'],
        correctAnswer: '매우',
      },
    } as never);

    const result = await extractProblemFromImage('base64data', 'image/jpeg');

    expect(result.conceptName).toBe('부사와 관형사 구분');
    expect(result.correctAnswer).toBe('매우');
  });

  it('sends the image as an image content part to the extraction model', async () => {
    vi.mocked(generateText).mockResolvedValue({
      output: {
        conceptName: 'x',
        type: 'ox',
        questionText: 'x',
        choices: null,
        correctAnswer: 'O',
      },
    } as never);

    await extractProblemFromImage('base64data', 'image/jpeg');

    const call = vi.mocked(generateText).mock.calls[0][0] as {
      model: string;
      messages: Array<{ content: Array<{ type: string; image?: string; mediaType?: string }> }>;
    };
    expect(call.model).toBe('anthropic/claude-sonnet-5');
    const imagePart = call.messages[0].content.find((p) => p.type === 'image');
    expect(imagePart?.image).toBe('base64data');
    expect(imagePart?.mediaType).toBe('image/jpeg');
  });

  it('includes the existing concept list in the prompt when provided', async () => {
    vi.mocked(generateText).mockResolvedValue({
      output: {
        conceptName: '높임법',
        type: 'ox',
        questionText: 'x',
        choices: null,
        correctAnswer: 'O',
      },
    } as never);

    await extractProblemFromImage('base64data', 'image/jpeg', ['품사의 종류', '높임법']);

    const call = vi.mocked(generateText).mock.calls[0][0] as {
      messages: Array<{ content: Array<{ type: string; text?: string }> }>;
    };
    const textPart = call.messages[0].content.find((p) => p.type === 'text');
    expect(textPart?.text).toContain('품사의 종류');
    expect(textPart?.text).toContain('높임법');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- extract-problem`
Expected: FAIL with "Cannot find module './extract-problem'"

- [ ] **Step 3: Implement**

```ts
// src/ai/extract-problem.ts
import { generateText, Output } from 'ai';
import { z } from 'zod';
import { EXTRACTION_MODEL } from './models';

export const extractedProblemSchema = z.object({
  conceptName: z
    .string()
    .describe('이 문제가 테스트하는 문법 개념. 등록된 개념 목록 중 하나와 맞으면 그 이름을 정확히 그대로 사용'),
  type: z.enum(['multiple_choice', 'short_answer', 'ox']),
  questionText: z.string(),
  choices: z.array(z.string()).nullable().describe('객관식일 때만 보기 배열, 아니면 null'),
  correctAnswer: z.string(),
});

export type ExtractedProblem = z.infer<typeof extractedProblemSchema>;

export async function extractProblemFromImage(
  imageBase64: string,
  mediaType: string,
  existingConcepts: string[] = [],
): Promise<ExtractedProblem> {
  const conceptListText =
    existingConcepts.length > 0
      ? `\n\n이미 등록된 문법 개념 목록: ${existingConcepts.join(', ')}\n이 문제가 목록 중 하나에 해당하면 그 이름을 정확히 그대로 사용하고, 맞는 게 없을 때만 새로운 이름을 만들어줘.`
      : '';

  const { output } = await generateText({
    model: EXTRACTION_MODEL,
    output: Output.object({ schema: extractedProblemSchema }),
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `이 이미지는 중학교 국어 문법 문제집의 한 문제입니다. 문제 텍스트, 보기(있다면), 정답, 이 문제가 테스트하는 문법 개념을 추출해줘.${conceptListText}`,
          },
          { type: 'image', image: imageBase64, mediaType },
        ],
      },
    ],
  });
  return output;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- extract-problem`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/ai/extract-problem.ts src/ai/extract-problem.test.ts
git commit -m "Add AI-based problem extraction from photographed workbook page"
```

---

### Task 8: Variant generation (TDD)

**Files:**
- Create: `src/ai/generate-variants.ts`
- Create: `src/ai/generate-variants.test.ts`

**Interfaces:**
- Consumes: `GENERATION_MODEL` from `@/ai/models`, `shuffleChoices` from `@/lib/grading`.
- Produces: `GeneratedVariant` type `{ type: 'multiple_choice' | 'short_answer' | 'ox'; questionText: string; choices: string[] | null; correctAnswer: string }` and `generateVariants(params: { conceptName: string; originalQuestionText: string; originalType: 'multiple_choice' | 'short_answer' | 'ox'; count: number }): Promise<GeneratedVariant[]>` — consumed by Task 10.

- [ ] **Step 1: Write the failing test**

```ts
// src/ai/generate-variants.test.ts
import { describe, it, expect, vi } from 'vitest';

vi.mock('ai', () => ({
  generateText: vi.fn(),
  Output: { array: vi.fn((config: unknown) => config) },
}));

import { generateText } from 'ai';
import { generateVariants } from './generate-variants';

const sampleVariants = [
  {
    type: 'multiple_choice' as const,
    questionText: '다음 중 관형사인 것은?',
    choices: ['새', '매우', '뛰다', '예쁘게'],
    correctAnswer: '새',
  },
  {
    type: 'short_answer' as const,
    questionText: '"파란 하늘"에서 관형사를 쓰시오.',
    choices: null,
    correctAnswer: '파란',
  },
];

describe('generateVariants', () => {
  it('shuffles multiple_choice choices and returns all variants unchanged otherwise', async () => {
    vi.mocked(generateText).mockResolvedValue({ output: sampleVariants } as never);

    const result = await generateVariants({
      conceptName: '부사와 관형사 구분',
      originalQuestionText: '다음 중 부사인 것은?',
      originalType: 'multiple_choice',
      count: 2,
    });

    expect(result).toHaveLength(2);
    expect(result[0].choices?.slice().sort()).toEqual(sampleVariants[0].choices.slice().sort());
    expect(result[0].correctAnswer).toBe('새');
    expect(result[1].choices).toBeNull();
  });

  it('requests exactly `count` variants from the model with the right minItems/maxItems', async () => {
    vi.mocked(generateText).mockResolvedValue({ output: sampleVariants } as never);

    await generateVariants({
      conceptName: '부사와 관형사 구분',
      originalQuestionText: '다음 중 부사인 것은?',
      originalType: 'multiple_choice',
      count: 2,
    });

    const call = vi.mocked(generateText).mock.calls[0][0] as {
      model: string;
      output: { element: unknown; minItems: number; maxItems: number };
    };
    expect(call.model).toBe('anthropic/claude-sonnet-5');
    expect(call.output.minItems).toBe(2);
    expect(call.output.maxItems).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- generate-variants`
Expected: FAIL with "Cannot find module './generate-variants'"

- [ ] **Step 3: Implement**

```ts
// src/ai/generate-variants.ts
import { generateText, Output } from 'ai';
import { z } from 'zod';
import { GENERATION_MODEL } from './models';
import { shuffleChoices } from '@/lib/grading';

export const variantSchema = z.object({
  type: z.enum(['multiple_choice', 'short_answer', 'ox']),
  questionText: z.string(),
  choices: z.array(z.string()).nullable(),
  correctAnswer: z.string(),
});

export type GeneratedVariant = z.infer<typeof variantSchema>;

export async function generateVariants(params: {
  conceptName: string;
  originalQuestionText: string;
  originalType: 'multiple_choice' | 'short_answer' | 'ox';
  count: number;
}): Promise<GeneratedVariant[]> {
  const { output } = await generateText({
    model: GENERATION_MODEL,
    output: Output.array({
      element: variantSchema,
      minItems: params.count,
      maxItems: params.count,
    }),
    prompt: `다음은 중학교 국어 문법 문제집의 원본 문제입니다.

문법 개념: ${params.conceptName}
원본 문제: ${params.originalQuestionText}
원본 형식: ${params.originalType}

이 문제와 같은 문법 개념을 테스트하지만, 지문/예시 문장과 보기는 다른 새로운 문제를 ${params.count}개 만들어줘.
각 문제는 객관식(4지선다)/단답형/OX 중 이 개념을 테스트하기에 가장 적합한 형식을 자유롭게 골라도 돼.
객관식이면 반드시 보기(choices)를 4개 배열로 채우고, 단답형/OX면 choices는 null로 둬.
정답(correctAnswer)은 객관식이면 정답 보기의 텍스트 그대로, 단답형이면 정답 단어/구, OX면 "O" 또는 "X"로 적어줘.`,
  });

  return output.map((variant) => ({
    ...variant,
    choices: variant.choices ? shuffleChoices(variant.choices) : null,
  }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- generate-variants`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/ai/generate-variants.ts src/ai/generate-variants.test.ts
git commit -m "Add AI-based variant problem generation"
```

---

### Task 9: AI-judged short-answer grading + orchestration (TDD)

**Files:**
- Create: `src/ai/grade-short-answer.ts`
- Create: `src/ai/grade-short-answer.test.ts`
- Create: `src/lib/grade-attempt.ts`
- Create: `src/lib/grade-attempt.test.ts`

**Interfaces:**
- Consumes: `GRADING_MODEL` from `@/ai/models`, `isExactMatch` from `@/lib/grading`.
- Produces: `aiJudgeShortAnswer(params: { conceptName: string; questionText: string; correctAnswer: string; submittedAnswer: string }): Promise<boolean>`; `GradeResult` type `{ isCorrect: boolean; gradedBy: 'exact' | 'ai_judged' }` and `gradeAttempt(params: { type: 'multiple_choice' | 'short_answer' | 'ox'; conceptName: string; questionText: string; correctAnswer: string; submittedAnswer: string }): Promise<GradeResult>` — consumed by Task 11.

- [ ] **Step 1: Write the failing test for the AI judge**

```ts
// src/ai/grade-short-answer.test.ts
import { describe, it, expect, vi } from 'vitest';

vi.mock('ai', () => ({
  generateText: vi.fn(),
  Output: { object: vi.fn((config: unknown) => config) },
}));

import { generateText } from 'ai';
import { aiJudgeShortAnswer } from './grade-short-answer';

describe('aiJudgeShortAnswer', () => {
  it('returns the model isCorrect judgment', async () => {
    vi.mocked(generateText).mockResolvedValue({ output: { isCorrect: true } } as never);

    const result = await aiJudgeShortAnswer({
      conceptName: '품사',
      questionText: '"파랗다"의 품사는?',
      correctAnswer: '형용사',
      submittedAnswer: '형용사이다',
    });

    expect(result).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- grade-short-answer`
Expected: FAIL with "Cannot find module './grade-short-answer'"

- [ ] **Step 3: Implement the AI judge**

```ts
// src/ai/grade-short-answer.ts
import { generateText, Output } from 'ai';
import { z } from 'zod';
import { GRADING_MODEL } from './models';

const judgeSchema = z.object({
  isCorrect: z.boolean(),
});

export async function aiJudgeShortAnswer(params: {
  conceptName: string;
  questionText: string;
  correctAnswer: string;
  submittedAnswer: string;
}): Promise<boolean> {
  const { output } = await generateText({
    model: GRADING_MODEL,
    output: Output.object({ schema: judgeSchema }),
    prompt: `중학교 국어 문법 단답형 문제 채점을 도와줘.

문법 개념: ${params.conceptName}
문제: ${params.questionText}
정답: ${params.correctAnswer}
학생이 제출한 답: ${params.submittedAnswer}

학생의 답이 표현은 다르더라도 의미상 정답과 같은 내용이면 true, 아니면 false를 반환해줘.`,
  });
  return output.isCorrect;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- grade-short-answer`
Expected: PASS (1 test)

- [ ] **Step 5: Write the failing tests for grade orchestration**

```ts
// src/lib/grade-attempt.test.ts
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/ai/grade-short-answer', () => ({
  aiJudgeShortAnswer: vi.fn(),
}));

import { aiJudgeShortAnswer } from '@/ai/grade-short-answer';
import { gradeAttempt } from './grade-attempt';

describe('gradeAttempt', () => {
  it('grades multiple_choice by exact match without calling the AI judge', async () => {
    const result = await gradeAttempt({
      type: 'multiple_choice',
      conceptName: '품사',
      questionText: 'q',
      correctAnswer: '매우',
      submittedAnswer: '매우',
    });
    expect(result).toEqual({ isCorrect: true, gradedBy: 'exact' });
    expect(aiJudgeShortAnswer).not.toHaveBeenCalled();
  });

  it('grades short_answer as exact when normalized text matches', async () => {
    const result = await gradeAttempt({
      type: 'short_answer',
      conceptName: '품사',
      questionText: 'q',
      correctAnswer: '형용사',
      submittedAnswer: ' 형용사 ',
    });
    expect(result).toEqual({ isCorrect: true, gradedBy: 'exact' });
    expect(aiJudgeShortAnswer).not.toHaveBeenCalled();
  });

  it('falls back to the AI judge for short_answer when exact match fails', async () => {
    vi.mocked(aiJudgeShortAnswer).mockResolvedValue(true);

    const result = await gradeAttempt({
      type: 'short_answer',
      conceptName: '품사',
      questionText: 'q',
      correctAnswer: '형용사',
      submittedAnswer: '형용사이다',
    });

    expect(result).toEqual({ isCorrect: true, gradedBy: 'ai_judged' });
    expect(aiJudgeShortAnswer).toHaveBeenCalledWith({
      conceptName: '품사',
      questionText: 'q',
      correctAnswer: '형용사',
      submittedAnswer: '형용사이다',
    });
  });

  it('falls back to exact-only (incorrect) when the AI judge call fails', async () => {
    vi.mocked(aiJudgeShortAnswer).mockRejectedValue(new Error('gateway down'));

    const result = await gradeAttempt({
      type: 'short_answer',
      conceptName: '품사',
      questionText: 'q',
      correctAnswer: '형용사',
      submittedAnswer: '동사',
    });

    expect(result).toEqual({ isCorrect: false, gradedBy: 'exact' });
  });
});
```

- [ ] **Step 6: Run tests to verify they fail**

Run: `npm test -- grade-attempt`
Expected: FAIL with "Cannot find module './grade-attempt'"

- [ ] **Step 7: Implement orchestration**

```ts
// src/lib/grade-attempt.ts
import { isExactMatch } from './grading';
import { aiJudgeShortAnswer } from '@/ai/grade-short-answer';

export type GradeResult = { isCorrect: boolean; gradedBy: 'exact' | 'ai_judged' };

export async function gradeAttempt(params: {
  type: 'multiple_choice' | 'short_answer' | 'ox';
  conceptName: string;
  questionText: string;
  correctAnswer: string;
  submittedAnswer: string;
}): Promise<GradeResult> {
  if (params.type !== 'short_answer') {
    return {
      isCorrect: isExactMatch(params.correctAnswer, params.submittedAnswer),
      gradedBy: 'exact',
    };
  }

  if (isExactMatch(params.correctAnswer, params.submittedAnswer)) {
    return { isCorrect: true, gradedBy: 'exact' };
  }

  try {
    const isCorrect = await aiJudgeShortAnswer({
      conceptName: params.conceptName,
      questionText: params.questionText,
      correctAnswer: params.correctAnswer,
      submittedAnswer: params.submittedAnswer,
    });
    return { isCorrect, gradedBy: 'ai_judged' };
  } catch {
    return { isCorrect: false, gradedBy: 'exact' };
  }
}
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `npm test -- grade-attempt`
Expected: PASS (4 tests)

- [ ] **Step 9: Commit**

```bash
git add src/ai/grade-short-answer.ts src/ai/grade-short-answer.test.ts src/lib/grade-attempt.ts src/lib/grade-attempt.test.ts
git commit -m "Add AI-judged short-answer grading and grade orchestration"
```

---

### Task 10: New-problem flow (upload → confirm → generate)

**Files:**
- Create: `src/app/new-problem/actions.ts`
- Create: `src/app/new-problem/page.tsx`

**Interfaces:**
- Consumes: `extractProblemFromImage`, `ExtractedProblem` from `@/ai/extract-problem`; `generateVariants` from `@/ai/generate-variants`; `getDb` from `@/db`; `concepts`, `problems`, `variants` from `@/db/schema`.
- Produces: page at `/new-problem`. After this task, a parent can go from a photo to saved variants in the DB, picking the grammar concept from the list registered in Task 6.

- [ ] **Step 1: Write the server actions**

```ts
// src/app/new-problem/actions.ts
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
```

- [ ] **Step 2: Write the page (client component, 3-step flow with a concept dropdown)**

```tsx
// src/app/new-problem/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getConceptNamesAction,
  extractFromImageAction,
  saveProblemAction,
  generateVariantsForProblemAction,
} from './actions';
import type { ExtractedProblem } from '@/ai/extract-problem';

type Step = 'upload' | 'confirm' | 'generating';

const emptyDraft: ExtractedProblem = {
  conceptName: '',
  type: 'multiple_choice',
  questionText: '',
  choices: ['', '', '', ''],
  correctAnswer: '',
};

export default function NewProblemPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('upload');
  const [draft, setDraft] = useState<ExtractedProblem>(emptyDraft);
  const [sourceNote, setSourceNote] = useState('');
  const [extractError, setExtractError] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [problemId, setProblemId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [conceptOptions, setConceptOptions] = useState<string[]>([]);
  const [useNewConceptInput, setUseNewConceptInput] = useState(false);

  useEffect(() => {
    getConceptNamesAction().then(setConceptOptions);
  }, []);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setExtractError(null);
    const formData = new FormData();
    formData.set('image', file);
    try {
      const extracted = await extractFromImageAction(formData);
      setDraft(extracted);
      setUseNewConceptInput(!conceptOptions.includes(extracted.conceptName));
    } catch {
      setExtractError('인식에 실패했어요. 아래 폼에 직접 입력해주세요.');
      setDraft(emptyDraft);
      setUseNewConceptInput(true);
    } finally {
      setStep('confirm');
      setBusy(false);
    }
  }

  async function handleConfirm() {
    setBusy(true);
    try {
      const { problemId: id } = await saveProblemAction({ ...draft, sourceNote });
      setProblemId(id);
      setStep('generating');
      await runGeneration(id);
    } finally {
      setBusy(false);
    }
  }

  async function runGeneration(id: number) {
    setGenerateError(null);
    try {
      await generateVariantsForProblemAction(id);
      router.push('/practice');
    } catch {
      setGenerateError('대체 문제 생성에 실패했어요.');
    }
  }

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="mb-4 text-xl font-bold">새 문제 등록</h1>

      {step === 'upload' && (
        <div>
          <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} disabled={busy} />
          {busy && <p className="mt-2 text-sm text-gray-500">인식 중...</p>}
        </div>
      )}

      {step === 'confirm' && (
        <div className="space-y-3">
          {extractError && <p className="text-sm text-red-600">{extractError}</p>}

          <label className="block">
            <span className="text-sm">문법 개념</span>
            {useNewConceptInput ? (
              <div className="flex gap-2">
                <input
                  className="flex-1 border p-2"
                  value={draft.conceptName}
                  onChange={(e) => setDraft({ ...draft, conceptName: e.target.value })}
                />
                {conceptOptions.length > 0 && (
                  <button type="button" className="rounded border px-3" onClick={() => setUseNewConceptInput(false)}>
                    목록에서 선택
                  </button>
                )}
              </div>
            ) : (
              <select
                className="w-full border p-2"
                value={draft.conceptName}
                onChange={(e) => {
                  if (e.target.value === '__new__') {
                    setUseNewConceptInput(true);
                    setDraft({ ...draft, conceptName: '' });
                  } else {
                    setDraft({ ...draft, conceptName: e.target.value });
                  }
                }}
              >
                <option value="">선택하세요</option>
                {conceptOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
                <option value="__new__">+ 새 개념 추가</option>
              </select>
            )}
          </label>

          <label className="block">
            <span className="text-sm">형식</span>
            <select
              className="w-full border p-2"
              value={draft.type}
              onChange={(e) => setDraft({ ...draft, type: e.target.value as ExtractedProblem['type'] })}
            >
              <option value="multiple_choice">객관식</option>
              <option value="short_answer">단답형</option>
              <option value="ox">OX</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm">문제</span>
            <textarea
              className="w-full border p-2"
              value={draft.questionText}
              onChange={(e) => setDraft({ ...draft, questionText: e.target.value })}
            />
          </label>

          {draft.type === 'multiple_choice' && (
            <div>
              <span className="text-sm">보기</span>
              {(draft.choices ?? ['', '', '', '']).map((choice, i) => (
                <input
                  key={i}
                  className="mb-1 w-full border p-2"
                  value={choice}
                  onChange={(e) => {
                    const choices = [...(draft.choices ?? ['', '', '', ''])];
                    choices[i] = e.target.value;
                    setDraft({ ...draft, choices });
                  }}
                />
              ))}
            </div>
          )}

          <label className="block">
            <span className="text-sm">정답</span>
            <input
              className="w-full border p-2"
              value={draft.correctAnswer}
              onChange={(e) => setDraft({ ...draft, correctAnswer: e.target.value })}
            />
          </label>

          <label className="block">
            <span className="text-sm">출처 (선택, 예: 3단원 12번)</span>
            <input className="w-full border p-2" value={sourceNote} onChange={(e) => setSourceNote(e.target.value)} />
          </label>

          <button
            className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
            onClick={handleConfirm}
            disabled={busy || !draft.conceptName || !draft.questionText || !draft.correctAnswer}
          >
            저장하고 대체 문제 만들기
          </button>
        </div>
      )}

      {step === 'generating' && (
        <div>
          <p>대체 문제를 만드는 중...</p>
          {generateError && (
            <div className="mt-2">
              <p className="text-sm text-red-600">{generateError}</p>
              <button
                className="mt-2 rounded bg-blue-600 px-4 py-2 text-white"
                onClick={() => problemId && runGeneration(problemId)}
              >
                다시 시도
              </button>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 3: Manual verification**

```bash
npm run dev
```

Visit `http://localhost:3000/new-problem`, upload a real photo of a workbook problem, confirm the concept dropdown is pre-filled with a matching registered concept when there is one (from Task 6), edit any other fields, save, and confirm it redirects to `/practice` once variants finish generating (built in Task 11 — until then it will 404, which is expected at this point).

- [ ] **Step 4: Commit**

```bash
git add src/app/new-problem
git commit -m "Add new-problem upload/confirm/generate flow with concept matching"
```

---

### Task 11: Practice list + solve page

**Files:**
- Create: `src/app/practice/page.tsx`
- Create: `src/app/practice/[variantId]/actions.ts`
- Create: `src/app/practice/[variantId]/page.tsx`
- Create: `src/app/practice/[variantId]/solve-form.tsx`

**Interfaces:**
- Consumes: `getDb` from `@/db`; `variants`, `attempts`, `concepts` from `@/db/schema`; `gradeAttempt` from `@/lib/grade-attempt`.
- Produces: `/practice` (list) and `/practice/[variantId]` (solve) pages.

- [ ] **Step 1: Write the practice list page**

```tsx
// src/app/practice/page.tsx
import Link from 'next/link';
import { getDb } from '@/db';
import { variants, attempts, concepts } from '@/db/schema';
import { eq } from 'drizzle-orm';

export default async function PracticePage() {
  const db = getDb();

  const solvedRows = await db.select({ variantId: attempts.variantId }).from(attempts);
  const solvedIds = new Set(solvedRows.map((r) => r.variantId));

  const allVariants = await db
    .select({
      id: variants.id,
      questionText: variants.questionText,
      conceptName: concepts.name,
    })
    .from(variants)
    .innerJoin(concepts, eq(variants.conceptId, concepts.id));

  const unsolved = allVariants.filter((v) => !solvedIds.has(v.id));

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="mb-4 text-xl font-bold">풀 문제 ({unsolved.length}개)</h1>
      {unsolved.length === 0 && <p>풀 문제가 없어요. 새 문제를 등록해보세요.</p>}
      <ul className="space-y-2">
        {unsolved.map((v) => (
          <li key={v.id}>
            <Link href={`/practice/${v.id}`} className="block rounded border p-3 hover:bg-gray-50">
              <div className="text-sm text-gray-500">{v.conceptName}</div>
              <div>{v.questionText}</div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
```

- [ ] **Step 2: Write the submit-answer server action**

```ts
// src/app/practice/[variantId]/actions.ts
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
```

- [ ] **Step 3: Write the solve page and its form**

```tsx
// src/app/practice/[variantId]/page.tsx
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { variants } from '@/db/schema';
import SolveForm from './solve-form';

export default async function SolvePage({ params }: { params: Promise<{ variantId: string }> }) {
  const { variantId } = await params;
  const db = getDb();
  const [variant] = await db
    .select()
    .from(variants)
    .where(eq(variants.id, Number(variantId)));

  if (!variant) notFound();

  return (
    <main className="mx-auto max-w-xl p-6">
      <SolveForm
        variantId={variant.id}
        type={variant.type}
        questionText={variant.questionText}
        choices={variant.choices}
      />
    </main>
  );
}
```

```tsx
// src/app/practice/[variantId]/solve-form.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { submitAnswerAction } from './actions';

type Props = {
  variantId: number;
  type: 'multiple_choice' | 'short_answer' | 'ox';
  questionText: string;
  choices: string[] | null;
};

export default function SolveForm({ variantId, type, questionText, choices }: Props) {
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<{ isCorrect: boolean; correctAnswer: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(value: string) {
    setBusy(true);
    setAnswer(value);
    try {
      const res = await submitAnswerAction(variantId, value);
      setResult(res);
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <div>
        <p className="mb-2">{questionText}</p>
        <p className={result.isCorrect ? 'text-green-600' : 'text-red-600'}>
          {result.isCorrect ? '정답!' : `틀렸어요. 정답: ${result.correctAnswer}`}
        </p>
        <Link href="/practice" className="mt-4 inline-block rounded bg-blue-600 px-4 py-2 text-white">
          다음 문제
        </Link>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-4">{questionText}</p>

      {type === 'multiple_choice' && (
        <div className="space-y-2">
          {(choices ?? []).map((choice) => (
            <button
              key={choice}
              disabled={busy}
              className="block w-full rounded border p-2 text-left hover:bg-gray-50"
              onClick={() => submit(choice)}
            >
              {choice}
            </button>
          ))}
        </div>
      )}

      {type === 'ox' && (
        <div className="flex gap-2">
          <button disabled={busy} className="rounded border px-6 py-2" onClick={() => submit('O')}>
            O
          </button>
          <button disabled={busy} className="rounded border px-6 py-2" onClick={() => submit('X')}>
            X
          </button>
        </div>
      )}

      {type === 'short_answer' && (
        <div className="flex gap-2">
          <input
            className="flex-1 border p-2"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={busy}
          />
          <button
            disabled={busy || !answer}
            className="rounded bg-blue-600 px-4 py-2 text-white"
            onClick={() => submit(answer)}
          >
            제출
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Manual verification**

```bash
npm run dev
```

Go through `/new-problem` → confirm the redirect to `/practice` now works and shows the generated variants → click one, solve it for each of the three problem types (may require registering more than one original problem to see all three types since the AI picks the type), confirm grading and the "다음 문제" link work.

- [ ] **Step 5: Commit**

```bash
git add src/app/practice
git commit -m "Add practice list and solve pages"
```

---

### Task 12: History / stats page (TDD for the aggregation logic)

**Files:**
- Create: `src/lib/stats.ts`
- Create: `src/lib/stats.test.ts`
- Create: `src/app/history/page.tsx`

**Interfaces:**
- Produces: `ConceptAccuracy` type `{ conceptName: string; total: number; correct: number }` and `computeConceptAccuracy(rows: { conceptName: string; isCorrect: boolean }[]): ConceptAccuracy[]`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/stats.test.ts
import { describe, it, expect } from 'vitest';
import { computeConceptAccuracy } from './stats';

describe('computeConceptAccuracy', () => {
  it('aggregates total and correct counts per concept', () => {
    const result = computeConceptAccuracy([
      { conceptName: '품사', isCorrect: true },
      { conceptName: '품사', isCorrect: false },
      { conceptName: '높임법', isCorrect: true },
    ]);

    expect(result).toEqual([
      { conceptName: '품사', total: 2, correct: 1 },
      { conceptName: '높임법', total: 1, correct: 1 },
    ]);
  });

  it('returns an empty array for no rows', () => {
    expect(computeConceptAccuracy([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- stats`
Expected: FAIL with "Cannot find module './stats'"

- [ ] **Step 3: Implement**

```ts
// src/lib/stats.ts
export type ConceptAccuracy = { conceptName: string; total: number; correct: number };

export function computeConceptAccuracy(
  rows: { conceptName: string; isCorrect: boolean }[],
): ConceptAccuracy[] {
  const map = new Map<string, ConceptAccuracy>();
  for (const row of rows) {
    const entry = map.get(row.conceptName) ?? { conceptName: row.conceptName, total: 0, correct: 0 };
    entry.total += 1;
    if (row.isCorrect) entry.correct += 1;
    map.set(row.conceptName, entry);
  }
  return [...map.values()];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- stats`
Expected: PASS (2 tests)

- [ ] **Step 5: Write the history page**

```tsx
// src/app/history/page.tsx
import { desc, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { attempts, variants, concepts } from '@/db/schema';
import { computeConceptAccuracy } from '@/lib/stats';

export default async function HistoryPage() {
  const db = getDb();

  const rows = await db
    .select({
      attemptId: attempts.id,
      isCorrect: attempts.isCorrect,
      gradedBy: attempts.gradedBy,
      solvedAt: attempts.solvedAt,
      questionText: variants.questionText,
      conceptName: concepts.name,
    })
    .from(attempts)
    .innerJoin(variants, eq(attempts.variantId, variants.id))
    .innerJoin(concepts, eq(variants.conceptId, concepts.id))
    .orderBy(desc(attempts.solvedAt));

  const accuracy = computeConceptAccuracy(rows);

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="mb-4 text-xl font-bold">학습 기록</h1>

      <h2 className="mb-2 font-semibold">개념별 정답률</h2>
      <table className="mb-6 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="py-1">개념</th>
            <th className="py-1">정답률</th>
          </tr>
        </thead>
        <tbody>
          {accuracy.map((a) => (
            <tr key={a.conceptName} className="border-b">
              <td className="py-1">{a.conceptName}</td>
              <td className="py-1">
                {a.correct}/{a.total} ({Math.round((a.correct / a.total) * 100)}%)
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="mb-2 font-semibold">최근 풀이</h2>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.attemptId} className="rounded border p-2 text-sm">
            <div className="text-gray-500">
              {r.conceptName} · {new Date(r.solvedAt).toLocaleString('ko-KR')}
            </div>
            <div>{r.questionText}</div>
            <div className={r.isCorrect ? 'text-green-600' : 'text-red-600'}>
              {r.isCorrect ? '정답' : '오답'}
              {r.gradedBy === 'ai_judged' ? ' (AI 채점)' : ''}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
```

- [ ] **Step 6: Manual verification**

```bash
npm run dev
```

Solve a few problems via `/practice`, then visit `/history` and confirm the accuracy table and recent-attempts list reflect them correctly.

- [ ] **Step 7: Commit**

```bash
git add src/lib/stats.ts src/lib/stats.test.ts src/app/history
git commit -m "Add history and concept-accuracy stats page"
```

---

### Task 13: Home page + navigation

**Files:**
- Modify: `src/app/page.tsx` (replace the default scaffold content)

**Interfaces:**
- Produces: `/` with links to `/concepts/new`, `/new-problem`, `/practice`, `/history`.

- [ ] **Step 1: Replace the home page**

```tsx
// src/app/page.tsx
import Link from 'next/link';

export default function Home() {
  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="mb-6 text-2xl font-bold">국어 문법 대체 문제</h1>
      <nav className="flex flex-col gap-3">
        <Link href="/concepts/new" className="rounded border p-4 hover:bg-gray-50">
          목차로 개념 목록 등록
        </Link>
        <Link href="/new-problem" className="rounded border p-4 hover:bg-gray-50">
          새 문제 등록
        </Link>
        <Link href="/practice" className="rounded border p-4 hover:bg-gray-50">
          문제 풀기
        </Link>
        <Link href="/history" className="rounded border p-4 hover:bg-gray-50">
          학습 기록
        </Link>
      </nav>
    </main>
  );
}
```

- [ ] **Step 2: Manual verification**

```bash
npm run dev
```

Visit `http://localhost:3000/`, confirm all four links work.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "Add home page navigation"
```

---

### Task 14: Deploy to Vercel + full end-to-end check

**Files:** none (deployment + verification only)

- [ ] **Step 1: Push env vars used only locally so far**

```bash
vercel env add AI_GATEWAY_API_KEY
```

(Paste the same value that's in `.env.local` when prompted, for the Production and Preview environments. Skip this if deploying on Vercel and relying on OIDC instead of an API key.)

- [ ] **Step 2: Deploy**

```bash
vercel deploy --prod
```

- [ ] **Step 3: Full manual walkthrough on the deployed URL**

From a phone, using the deployed URL, with the actual workbook the app is built around:
1. Go to `목차로 개념 목록 등록`, photograph the workbook's table of contents (one or more pages), review/edit the extracted concept list, and save.
2. Go to `새 문제 등록`, photograph a real problem page. Confirm the extracted concept/question/choices/answer are correct, and that the concept dropdown picked (or closely matches) one of the concepts registered in step 1 — edit if the AI misread anything or the concept doesn't match.
3. Save, wait for variant generation to finish, confirm it lands on `/practice` with new problems listed.
4. Solve at least one of each type that appears (객관식/단답형/OX) and confirm grading looks right, including a deliberately "close but not exact" short-answer to confirm the AI judge kicks in.
5. Check `/history` shows the attempts and a sensible accuracy percentage, grouped under the concept names from step 1.

- [ ] **Step 4: Commit any fixes found during the walkthrough, then stop**

If the walkthrough surfaces bugs, fix them with normal small commits; otherwise this task ends the plan.
