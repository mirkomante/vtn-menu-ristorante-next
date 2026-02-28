/**
 * Pagina dettaglio sezione — Server Component (build-time).
 *
 * Route: /menu/[slug]  (es. /menu/antipasti, /menu/specialita-carne, /menu/vini)
 *
 * IMPORTANTE: il routing è guidato da `menu-config`, non dalla tassonomia del DB.
 * Lo slug corrisponde a una "Sezione Virtuale" configurata nel CMS, che può
 * aggregare più categorie o filtrare i piatti in modo complesso (Query Builder).
 *
 * generateStaticParams pre-renderizza tutte le sezioni configurate in menu-config.
 * La pagina usa i dati già risolti (sezioniRisolte) prodotti da getStaticMenuData().
 */

import { notFound } from "next/navigation";
import { getStaticMenuData } from "@/lib/api";
import { CategoryPage } from "@/components/menu/CategoryPage";

// ---------------------------------------------------------------------------
// generateStaticParams — pre-renderizza tutte le sezioni virtuali a build-time
// ---------------------------------------------------------------------------

export async function generateStaticParams() {
  try {
    const { menuConfig } = await getStaticMenuData();
    // Gli slug vengono da menu-config, non dalle categorie del DB
    return (menuConfig.sezioni ?? []).map((s) => ({ slug: s.slug }));
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
