"use client";

/**
 * MenuOrchestrator — Client Component radice del menu.
 *
 * Riceve i dati statici dal Server Component (page.tsx) e:
 * 1. Inizializza il MenuProvider (logica temporale + disponibilità real-time).
 * 2. Renderizza Header, StickyNav, contenuto sezioni e Footer.
 *
 * La separazione Server/Client garantisce:
 * - HTML statico pre-renderizzato (SEO, performance)
 * - Idratazione client per orari, disponibilità e navigazione
 */

import { useMenu, MenuProvider } from "@/context/MenuContext";
import { Container, Text } from "@/components/ui";
import { MenuHeader } from "./MenuHeader";
import { MenuFooter } from "./MenuFooter";
import { MenuSection } from "./MenuSection";
import { StickyNav } from "./StickyNav";
import type { CategoriaMenu, StaticMenuData } from "@/types";

// ---------------------------------------------------------------------------
// Tipi
// ---------------------------------------------------------------------------

export interface MenuOrchestratorProps {
  staticData: StaticMenuData;
}

// Mappa slug → CategoriaMenu per lookup O(1) in MenuContent
type CategorieMap = Map<string, CategoriaMenu>;

// ---------------------------------------------------------------------------
// MenuContent — consuma il context, renderizza le sezioni
// ---------------------------------------------------------------------------

function MenuContent({ categorieMap }: { categorieMap: CategorieMap }) {
  const { sections, availability, status, activeCategory, setActiveCategory, menuConfig } =
    useMenu();

  // Categorie attive nell'ordine delle sezioni risolte (per StickyNav)
  const categorieAttive: CategoriaMenu[] = sections.map((s) =>
    categorieMap.get(s.slug) ?? {
      id: s.slug,
      nome: s.titolo,
      slug: s.slug,
      attiva: true,
      createdAt: "",
      updatedAt: "",
    }
  );

  return (
    <>
      <MenuHeader menuConfig={menuConfig} status={status} />

      {categorieAttive.length > 0 && (
        <StickyNav
          categorie={categorieAttive}
          activeSlug={activeCategory}
          onCategoryChange={setActiveCategory}
        />
      )}

      <main className="min-h-screen bg-background">
        <Container as="div" className="py-8">
          {sections.length === 0 ? (
            <EmptyMenu isOpen={status.isOpen} />
          ) : (
            sections.map((sezione) => {
              const categoria =
                categorieMap.get(sezione.slug) ?? {
                  id: sezione.slug,
                  nome: sezione.titolo,
                  slug: sezione.slug,
                  attiva: true,
                  createdAt: "",
                  updatedAt: "",
                };
              return (
                <MenuSection
                  key={sezione.slug}
                  categoria={categoria}
                  piatti={sezione.piatti}
                  availability={availability}
                />
              );
            })
          )}
        </Container>
      </main>

      <MenuFooter menuConfig={menuConfig} />
    </>
  );
}

// ---------------------------------------------------------------------------
// EmptyMenu — stato vuoto (nessuna sezione visibile per lo slot corrente)
// ---------------------------------------------------------------------------

function EmptyMenu({ isOpen }: { isOpen: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <Text variant="lead" muted>
        {isOpen
          ? "Nessuna sezione disponibile per questo orario."
          : "Il ristorante è attualmente chiuso."}
      </Text>
      <Text variant="body" muted className="mt-2">
        Torna a trovarci durante gli orari di servizio.
      </Text>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MenuOrchestrator — entry point, inizializza il provider
// ---------------------------------------------------------------------------

export function MenuOrchestrator({ staticData }: MenuOrchestratorProps) {
  const { menuConfig, generali, piatti, vini, categorie } = staticData;

  // Mappa slug → CategoriaMenu costruita una volta sola (stabile tra i render)
  const categorieMap: CategorieMap = new Map(
    categorie.map((c) => [c.slug, c])
  );

  return (
    <MenuProvider
      menuConfig={menuConfig}
      generali={generali}
      piatti={piatti}
      vini={vini}
    >
      <MenuContent categorieMap={categorieMap} />
    </MenuProvider>
  );
}
