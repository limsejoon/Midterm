'use client';

import { useState } from 'react';
import Link from 'next/link';
import { submitAnswerAction, submitExplanationAction, type SubmitAnswerResult } from './actions';

type Props = {
  variantId: number;
  type: 'multiple_choice' | 'short_answer' | 'ox';
  questionText: string;
  choices: string[] | null;
};

export default function SolveForm({ variantId, type, questionText, choices }: Props) {
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

  if (result) {
    const showsFollowUp = mistakeAnalysis !== null;
    const waitingForExplanation = result.needsExplanation && mistakeAnalysis === null;

    return (
      <div>
        <p className="mb-2">{questionText}</p>
        <p className={result.isCorrect ? 'text-green-600' : 'text-red-600'}>
          {result.isCorrect ? '정답!' : `틀렸어요. 정답: ${result.correctAnswer}`}
        </p>

        {waitingForExplanation && (
          <div className="mt-3 space-y-2">
            <p className="text-sm text-gray-600">왜 이 답이 맞다고 생각했어? (스킵하려면 그냥 제출)</p>
            <textarea
              className="w-full border p-2"
              rows={2}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              disabled={busy}
            />
            <button
              disabled={busy}
              className="rounded bg-blue-600 px-4 py-2 text-white"
              onClick={submitExplanation}
            >
              제출
            </button>
          </div>
        )}

        {showsFollowUp && (
          <div className="mt-3 rounded bg-amber-50 p-3">
            <p className="text-sm">{mistakeAnalysis}</p>
            <p className="mt-2 text-sm text-gray-600">비슷한 문제 2개를 더 준비했어요.</p>
          </div>
        )}

        {!waitingForExplanation && (
          <Link href="/practice" className="mt-4 inline-block rounded bg-blue-600 px-4 py-2 text-white">
            다음 문제
          </Link>
        )}
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
