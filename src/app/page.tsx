import Link from 'next/link';

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 p-14">
      <h1 className="font-serif text-2xl font-bold text-ink">빠작 학습노트</h1>
      <nav className="flex flex-col gap-3">
        <Link
          href="/concepts/new"
          className="rounded-2xl border border-line bg-surface p-4 font-semibold text-ink hover:border-accent"
        >
          문제집 목차 등록
        </Link>
        <Link
          href="/new-problem"
          className="rounded-2xl border border-line bg-surface p-4 font-semibold text-ink hover:border-accent"
        >
          새 문제 등록
        </Link>
        <Link
          href="/practice"
          className="rounded-2xl border border-line bg-surface p-4 font-semibold text-ink hover:border-accent"
        >
          문제 풀기
        </Link>
        <Link
          href="/history"
          className="rounded-2xl border border-line bg-surface p-4 font-semibold text-ink hover:border-accent"
        >
          학습 기록
        </Link>
      </nav>
    </main>
  );
}
