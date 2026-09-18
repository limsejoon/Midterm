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
  unique,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';

export const problemTypeEnum = pgEnum('problem_type', [
  'multiple_choice',
  'short_answer',
  'ox',
]);

export const gradedByEnum = pgEnum('graded_by', ['exact', 'ai_judged']);

export const books = pgTable('books', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const concepts = pgTable(
  'concepts',
  {
    id: serial('id').primaryKey(),
    bookId: integer('book_id')
      .notNull()
      .references(() => books.id),
    name: varchar('name', { length: 255 }).notNull(),
    orderIndex: integer('order_index').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [unique('concepts_book_id_name_unique').on(table.bookId, table.name)],
);

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
  // set only for follow-up variants generated after a wrong attempt; null for the initial batch
  sourceAttemptId: integer('source_attempt_id').references((): AnyPgColumn => attempts.id),
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
  // child's explanation of why they thought their (wrong) answer was correct; null when not asked
  mistakeExplanation: text('mistake_explanation'),
  // AI's analysis of why the answer was likely wrong; null when correct
  mistakeAnalysis: text('mistake_analysis'),
  solvedAt: timestamp('solved_at').notNull().defaultNow(),
});
