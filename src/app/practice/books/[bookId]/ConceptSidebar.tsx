'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Concept = { id: number; name: string; total: number; unsolved: number };

export default function ConceptSidebar({ bookId, concepts }: { bookId: number; concepts: Concept[] }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-1">
      {concepts.map((c) => {
        const href = `/practice/books/${bookId}/concepts/${c.id}`;
        const active = pathname.startsWith(href);
        return (
          <Link
            key={c.id}
            href={href}
            className={`flex items-center justify-between gap-2 rounded-xl px-3.5 py-3 text-left ${
              active ? 'bg-accent/10 text-[#1D453A]' : 'text-ink-soft hover:bg-black/5'
            }`}
          >
            <span className="text-[15px] font-semibold">{c.name}</span>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                active ? 'bg-surface text-accent' : 'bg-black/5 text-muted'
              }`}
            >
              {c.total - c.unsolved}/{c.total}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
