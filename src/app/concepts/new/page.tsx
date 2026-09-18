'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBooksAction, createBookAction, getConceptsForBookAction } from '@/app/books/actions';
import { extractConceptsFromImageAction, saveConceptsAction } from './actions';

type Book = { id: number; name: string };
type ExistingConcept = { id: number; name: string; orderIndex: number };

export default function NewConceptsPage() {
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [bookId, setBookId] = useState<number | null>(null);
  const [newBookName, setNewBookName] = useState('');
  const [existingConcepts, setExistingConcepts] = useState<ExistingConcept[]>([]);
  const [names, setNames] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getBooksAction().then((loaded) => {
      setBooks(loaded);
      if (loaded.length > 0) setBookId(loaded[0].id);
    });
  }, []);

  useEffect(() => {
    if (bookId === null) return;
    getConceptsForBookAction(bookId).then(setExistingConcepts);
  }, [bookId]);

  async function handleCreateBook() {
    const name = newBookName.trim();
    if (!name) return;
    setBusy(true);
    try {
      const book = await createBookAction(name);
      setBooks((prev) => [...prev, book]);
      setBookId(book.id);
      setNewBookName('');
    } finally {
      setBusy(false);
    }
  }

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
    if (bookId === null) return;
    setBusy(true);
    try {
      await saveConceptsAction(bookId, names);
      router.push('/new-problem');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="mb-4 text-xl font-bold">문제집 목차 등록</h1>

      <label className="block">
        <span className="text-sm">문제집</span>
        {bookId !== null && books.length > 0 && (
          <select
            className="mt-1 w-full border p-2"
            value={bookId}
            onChange={(e) => setBookId(Number(e.target.value))}
          >
            {books.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}
      </label>

      <div className="mt-2 flex gap-2">
        <input
          className="flex-1 border p-2"
          placeholder="새 문제집 이름 (예: 빠작 중등문법)"
          value={newBookName}
          onChange={(e) => setNewBookName(e.target.value)}
        />
        <button className="rounded border px-3" onClick={handleCreateBook} disabled={busy || !newBookName.trim()}>
          + 새 문제집 추가
        </button>
      </div>

      {bookId !== null && (
        <>
          {existingConcepts.length > 0 && (
            <div className="mt-6">
              <h2 className="mb-2 font-semibold">이미 등록된 목차</h2>
              <ul className="space-y-1 text-sm text-gray-700">
                {existingConcepts.map((c) => (
                  <li key={c.id}>{c.name}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6">
            <h2 className="mb-2 font-semibold">새로 추가할 항목</h2>
            <p className="mb-2 text-sm text-gray-500">
              목차 사진을 한 장씩 올려보세요. 여러 장을 올리면 목록에 계속 추가됩니다.
            </p>

            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              disabled={busy}
            />
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            {busy && <p className="mt-2 text-sm text-gray-500">처리 중...</p>}

            <ul className="mt-4 space-y-2">
              {names.map((name, i) => (
                <li key={i} className="flex gap-2">
                  <input
                    className="flex-1 border p-2"
                    value={name}
                    onChange={(e) => updateName(i, e.target.value)}
                  />
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
          </div>
        </>
      )}
    </main>
  );
}
