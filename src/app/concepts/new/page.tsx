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
