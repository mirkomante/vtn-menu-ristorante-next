/**
 * Homepage — Server Component (build-time).
 *
 * Recupera tutti i dati statici da PayloadCMS a build-time tramite
 * getStaticMenuData() e li passa al MenuOrchestrator (Client Component)
 * per la logica di visualizzazione real-time.
 */

import { getStaticMenuData } from "@/lib/api";
import { MenuOrchestrator } from "@/components/menu/MenuOrchestrator";

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

  return <MenuOrchestrator staticData={staticData} />;
}
