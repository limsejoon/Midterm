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
