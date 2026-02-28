/**
 * Pagina dettaglio categoria — Server Component (build-time).
 *
 * Route: /menu/[slug]  (es. /menu/antipasti, /menu/specialita-carne)
 *
 * generateStaticParams pre-renderizza tutte le pagine categoria a build-time,
 * producendo HTML statico per ogni slug presente nei dati Payload.
 *
 * La pagina recupera i dati statici, trova la categoria corrispondente allo slug
 * e passa i piatti filtrati al CategoryPage (Client Component).
 */

import { notFound } from "next/navigation";
import { getStaticMenuData } from "@/lib/api";
import { CategoryPage } from "@/components/menu/CategoryPage";

// ---------------------------------------------------------------------------
// generateStaticParams — pre-renderizza tutte le categorie a build-time
// ---------------------------------------------------------------------------

export async function generateStaticParams() {
  try {
    const { categorie } = await getStaticMenuData();
    return categorie.map((cat) => ({ slug: cat.slug }));
  } catch {
    // Se il backend non è raggiungibile durante la build, non genera pagine
    return [];
  }
}

// ---------------------------------------------------------------------------
// Pagina
// ---------------------------------------------------------------------------

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function CategoryDetailPage({ params }: PageProps) {
  const { slug } = await params;

  let staticData;
  try {
    staticData = await getStaticMenuData();
  } catch (err) {
    console.error(`[CategoryDetailPage/${slug}] Errore nel recupero dati:`, err);
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

  // Trova la categoria corrispondente allo slug
  const categoria = staticData.categorie.find((c) => c.slug === slug);
  if (!categoria) {
    notFound();
  }

  // Filtra i piatti della categoria (categoria può essere oggetto o id numerico)
  const piatti = staticData.piatti.filter((p) => {
    const catId =
      typeof p.categoria === "object" ? p.categoria.id : p.categoria;
    return catId === categoria.id;
  });

  return (
    <CategoryPage
      staticData={staticData}
      categoria={categoria}
      piatti={piatti}
    />
  );
}
