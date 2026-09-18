'use client';

import { useState } from 'react';
import { submitAnswerAction, submitExplanationAction, type SubmitAnswerResult } from './actions';

type Props = {
  variantId: number;
  type: 'multiple_choice' | 'short_answer' | 'ox';
  questionText: string;
  choices: string[] | null;
  onDone: () => void;
};

const LETTERS = ['①', '②', '③', '④', '⑤', '⑥'];

export default function SolveForm({ variantId, type, questionText, choices, onDone }: Props) {
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<SubmitAnswerResult | null>(null);
  const [explanation, setExplanation] = useState('');
  const [mistakeAnalysis, setMistakeAnalysis] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(value: string) {
    setBusy(true);
    setAnswer(value);
    try {
      const res = await submitAnswerAction(variantId, value);
      setResult(res);
      if (res.mistakeAnalysis) setMistakeAnalysis(res.mistakeAnalysis);
    } finally {
      setBusy(false);
    }
  }

  async function submitExplanation() {
    if (!result) return;
    setBusy(true);
    try {
      const res = await submitExplanationAction(variantId, result.attemptId, explanation);
      setMistakeAnalysis(res.mistakeAnalysis);
    } finally {
      setBusy(false);
    }
  }

  const answered = result !== null;
  const waitingForExplanation = answered && result.needsExplanation && mistakeAnalysis === null;
  const showsFollowUp = mistakeAnalysis !== null;

  return (
    <div className="flex max-w-[620px] flex-col gap-6 rounded-[22px] border border-line bg-surface p-10 shadow-sm">
      <p className="font-serif text-[23px] leading-[1.55] font-bold text-ink">{questionText}</p>

      {!answered && type === 'multiple_choice' && (
        <div className="flex flex-col gap-2.5">
          {(choices ?? []).map((choice, i) => (
            <button
              key={choice}
              disabled={busy}
              className="flex w-full items-center gap-3.5 rounded-xl border-[1.5px] border-line px-4.5 py-3.5 text-left hover:border-accent disabled:opacity-60"
              onClick={() => submit(choice)}
            >
              <span className="text-sm font-bold text-muted">{LETTERS[i] ?? i + 1}</span>
              <span className="text-base text-ink">{choice}</span>
            </button>
          ))}
        </div>
      )}

      {answered && type === 'multiple_choice' && (
        <div className="flex flex-col gap-2.5">
          {(choices ?? []).map((choice, i) => {
            const isPicked = choice === answer;
            const isCorrectChoice = choice === result.correctAnswer;
            const state =
              isCorrectChoice ? 'correct' : isPicked && !isCorrectChoice ? 'wrong' : 'neutral';
            const styles = {
              correct: 'border-accent bg-ok-soft text-ok',
              wrong: 'border-danger bg-danger-soft text-danger',
              neutral: 'border-line bg-surface text-ink',
            } as const;
            return (
              <div
                key={choice}
                className={`flex w-full items-center gap-3.5 rounded-xl border-[1.5px] px-4.5 py-3.5 ${styles[state]}`}
              >
                <span className="text-sm font-bold">{LETTERS[i] ?? i + 1}</span>
                <span className="text-base">{choice}</span>
              </div>
            );
          })}
        </div>
      )}

      {!answered && type === 'ox' && (
        <div className="flex gap-3">
          <button
            disabled={busy}
            className="rounded-xl border-[1.5px] border-line px-8 py-3 text-lg font-bold hover:border-accent disabled:opacity-60"
            onClick={() => submit('O')}
          >
            O
          </button>
          <button
            disabled={busy}
            className="rounded-xl border-[1.5px] border-line px-8 py-3 text-lg font-bold hover:border-accent disabled:opacity-60"
            onClick={() => submit('X')}
          >
            X
          </button>
        </div>
      )}

      {!answered && type === 'short_answer' && (
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-xl border-[1.5px] border-line px-4 py-2.5 text-base focus:border-accent focus:outline-none"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={busy}
          />
          <button
            disabled={busy || !answer}
            className="rounded-xl bg-accent px-5 py-2.5 font-semibold text-white disabled:opacity-50"
            onClick={() => submit(answer)}
          >
            제출
          </button>
        </div>
      )}

      {answered && (type === 'ox' || type === 'short_answer') && (
        <p className="text-base font-semibold text-ink">
          제출한 답: <span className="text-ink-soft">{answer}</span>
        </p>
      )}

      {waitingForExplanation && (
        <div className="flex flex-col gap-2.5 rounded-2xl bg-danger-soft p-5">
          <p className="text-sm font-bold text-danger">
            {type === 'multiple_choice' ? '아쉬워요, 정답이 아니에요.' : `정답은 '${result.correctAnswer}'이에요.`}
          </p>
          <p className="text-sm text-ink-soft">왜 이 답이 맞다고 생각했어? (스킵하려면 그냥 제출)</p>
          <textarea
            className="w-full rounded-xl border border-line bg-surface p-3 text-sm focus:border-accent focus:outline-none"
            rows={2}
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            disabled={busy}
          />
          <button
            disabled={busy}
            className="self-start rounded-xl bg-ink px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            onClick={submitExplanation}
          >
            제출
          </button>
        </div>
      )}

      {answered && result.isCorrect && (
        <div className="flex flex-col gap-3.5 rounded-2xl bg-ok-soft p-5">
          <p className="text-[15px] font-bold text-ok">정답이에요! 잘했어요.</p>
          <button
            className="self-start rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-white"
            onClick={onDone}
          >
            다음 문제
          </button>
        </div>
      )}

      {showsFollowUp && (
        <div className="flex flex-col gap-3 rounded-2xl bg-danger-soft p-5">
          <p className="text-[15px] font-bold text-danger">정답은 &apos;{result?.correctAnswer}&apos;이에요.</p>
          <p className="text-sm leading-[1.75] text-ink-soft">{mistakeAnalysis}</p>
          <p className="text-xs text-muted">비슷한 문제 2개를 더 준비했어요.</p>
          <button
            className="mt-1 self-start rounded-xl bg-ink px-5 py-2.5 text-sm font-bold text-white"
            onClick={onDone}
          >
            다음 문제 풀기
          </button>
        </div>
      )}
    </div>
  );
}
