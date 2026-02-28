/**
 * Homepage — Server Component (build-time).
 *
 * Funge da Indice delle Sezioni del menu.
 * Recupera i dati statici a build-time e li passa a HomeIndex (Client Component)
 * che applica la logica temporale per mostrare solo le sezioni disponibili ora.
 *
 * Routing: Home (Indice) → /menu/[slug] (Dettaglio categoria)
 */

import { getStaticMenuData } from "@/lib/api";
import { HomeIndex } from "@/components/menu/HomeIndex";

export default async function HomePage() {
  let staticData;

  try {
    staticData = await getStaticMenuData();
  } catch (err) {
    console.error("[HomePage] Errore nel recupero dati menu:", err);
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <p className="font-serif text-2xl font-bold text-surface-dark">
            Vietnamonamour
          </p>
          <p className="mt-4 font-sans text-base text-text-muted">
            Il menu non è al momento disponibile.
            <br />
            Riprova tra qualche minuto o contattaci direttamente.
          </p>
        </div>
      </main>
    );
  }

  return <HomeIndex staticData={staticData} />;
}
