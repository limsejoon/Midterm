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
