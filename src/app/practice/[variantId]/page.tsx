import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { variants } from '@/db/schema';
import SolveForm from './solve-form';

export default async function SolvePage({ params }: { params: Promise<{ variantId: string }> }) {
  const { variantId } = await params;
  const db = getDb();
  const [variant] = await db
    .select()
    .from(variants)
    .where(eq(variants.id, Number(variantId)));

  if (!variant) notFound();

  return (
    <main className="mx-auto max-w-xl p-6">
      <SolveForm
        variantId={variant.id}
        type={variant.type}
        questionText={variant.questionText}
        choices={variant.choices}
      />
    </main>
  );
}
