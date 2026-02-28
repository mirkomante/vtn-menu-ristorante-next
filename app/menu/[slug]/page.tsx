/**
 * Pagina dettaglio sezione — Server Component (build-time).
 *
 * Route: /menu/[slug]  (es. /menu/il-menu-alla-carta, /menu/i-nostri-vini)
 *
 * IMPORTANTE: il routing è guidato da `menu-config.standardItems`, non dalla
 * tassonomia del DB. Gli slug NON esistono nel backend — vengono generati a
 * build-time da slugify(label) in normalizeStandardItems().
 *
 * generateStaticParams è OBBLIGATORIO con output: 'export' (SSG puro): senza di
 * esso Next.js non sa quali pagine HTML generare e lancia l'errore
 * "Page is missing param in generateStaticParams()".
 *
 * Usa sezioniRisolte (già filtrate dal Query Builder) come fonte di verità per
 * gli slug — garantisce che ogni slug generato corrisponda a una sezione reale.
 */

import { notFound } from "next/navigation";
import { getStaticMenuData } from "@/lib/api";
import { CategoryPage } from "@/components/menu/CategoryPage";

// ---------------------------------------------------------------------------
// generateStaticParams — pre-renderizza tutte le sezioni virtuali a build-time
// ---------------------------------------------------------------------------

export async function generateStaticParams() {
  try {
    const { sezioniRisolte } = await getStaticMenuData();
    return sezioniRisolte
      .filter((s) => Boolean(s.slug))
      .map((s) => ({ slug: s.slug }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Pagina
// ---------------------------------------------------------------------------

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function SectionDetailPage({ params }: PageProps) {
  const { slug } = await params;

  let staticData;
  try {
    staticData = await getStaticMenuData();
  } catch (err) {
    console.error(`[SectionDetailPage/${slug}] Errore nel recupero dati:`, err);
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <p className="font-serif text-2xl font-bold text-surface-dark">
            Vietnamonamour
          </p>
          <p className="mt-4 font-sans text-base text-text-muted">
            Il menu non è al momento disponibile.
          </p>
        </div>
      </main>
    );
  }

  // Cerca la sezione virtuale per slug in sezioniRisolte (già filtrate dal Query Builder)
  const sezione = staticData.sezioniRisolte.find((s) => s.slug === slug);
  if (!sezione) {
    notFound();
  }

  return (
    <CategoryPage
      staticData={staticData}
      sezione={sezione}
    />
  );
}
