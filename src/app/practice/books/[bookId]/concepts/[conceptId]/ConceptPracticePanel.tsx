'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import SolveForm from '@/app/practice/SolveForm';

type Row = {
  variantId: number;
  questionText: string;
  type: 'multiple_choice' | 'short_answer' | 'ox';
  choices: string[] | null;
  correctAnswer: string;
  isCorrect: boolean | null;
  submittedAnswer: string | null;
  mistakeAnalysis: string | null;
};

export default function ConceptPracticePanel({ conceptName, rows }: { conceptName: string; rows: Row[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<number | null>(null);

  function backToList() {
    setSelected(null);
    router.refresh();
  }

  const active = rows.find((r) => r.variantId === selected);

  if (active) {
    const alreadySolved =
      active.isCorrect !== null && active.submittedAnswer !== null
        ? {
            submittedAnswer: active.submittedAnswer,
            isCorrect: active.isCorrect,
            correctAnswer: active.correctAnswer,
            mistakeAnalysis: active.mistakeAnalysis,
          }
        : null;

    return (
      <div className="flex flex-col gap-4 p-14">
        <button onClick={backToList} className="flex w-fit items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-ink">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          목록
        </button>
        <SolveForm
          key={active.variantId}
          variantId={active.variantId}
          type={active.type}
          questionText={active.questionText}
          choices={active.choices}
          onDone={backToList}
          initial={alreadySolved}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-14">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-ink">{conceptName}</h1>
        <span className="rounded-full bg-accent-soft px-3 py-1.5 text-xs font-bold text-accent">
          {rows.filter((r) => r.isCorrect !== null).length}/{rows.length}
        </span>
      </div>

      {rows.length === 0 && <p className="text-sm text-muted">등록된 문제가 없어요.</p>}

      <div className="flex flex-col gap-2.5">
        {rows.map((r, i) => (
          <button
            key={r.variantId}
            onClick={() => setSelected(r.variantId)}
            className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-surface px-5 py-4 text-left hover:border-accent"
          >
            <span className="text-[15px] font-semibold text-ink">문제 {i + 1}</span>
            <span
              className={`shrink-0 text-xs font-bold ${
                r.isCorrect === null ? 'text-muted' : r.isCorrect ? 'text-ok' : 'text-danger'
              }`}
            >
              {r.isCorrect === null ? '안 풀었음' : r.isCorrect ? '정답' : '오답'}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
