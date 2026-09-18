import Link from 'next/link';

export default function Home() {
  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="mb-6 text-2xl font-bold">국어 문법 대체 문제</h1>
      <nav className="flex flex-col gap-3">
        <Link href="/concepts/new" className="rounded border p-4 hover:bg-gray-50">
          문제집 목차 등록
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
