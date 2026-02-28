"use client";

/**
 * CategoryPage — Client Component per la pagina dettaglio di una categoria.
 *
 * Riceve i dati statici della categoria dal Server Component e:
 * 1. Inizializza MenuProvider per il polling della disponibilità real-time.
 * 2. Mostra il titolo della categoria e la lista dei piatti con DishCard.
 * 3. Filtra automaticamente i piatti esauriti tramite MenuSection.
 *
 * Il MenuProvider è necessario anche qui per:
 * - Polling disponibilità GCS (piatti esauriti aggiornati in tempo reale)
 * - Stato apertura ristorante (banner chiusura nell'header)
 */

import Link from "next/link";
import { useMenu, MenuProvider } from "@/context/MenuContext";
import { Container, Text } from "@/components/ui";
import { MenuHeader } from "./MenuHeader";
import { MenuFooter } from "./MenuFooter";
import { MenuSection } from "./MenuSection";
import type { CategoriaMenu, Piatto, StaticMenuData } from "@/types";

// ---------------------------------------------------------------------------
// Tipi
// ---------------------------------------------------------------------------

export interface CategoryPageProps {
  /** Tutti i dati statici (necessari per MenuProvider) */
  staticData: StaticMenuData;
  /** La categoria corrente da visualizzare */
  categoria: CategoriaMenu;
  /** I piatti di questa categoria */
  piatti: Piatto[];
}

// ---------------------------------------------------------------------------
// BackButton — tasto "Torna al Menu" sticky in cima al contenuto
// ---------------------------------------------------------------------------

function BackButton() {
  return (
    <div className="sticky top-[48px] z-40 border-b border-surface-dark/10 bg-background/95 backdrop-blur-sm">
      <Container padding="none">
        <div className="px-4 py-2">
          <Link
            href="/"
            className={[
              "inline-flex items-center gap-1.5",
              "font-sans text-sm font-medium text-text-muted",
              "transition-colors duration-150 hover:text-text-main",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-gold",
            ].join(" ")}
          >
            <span aria-hidden="true">←</span>
            Torna al Menu
          </Link>
        </div>
      </Container>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CategoryContent — consuma il context, renderizza la lista piatti
// ---------------------------------------------------------------------------

interface CategoryContentProps {
  categoria: CategoriaMenu;
  piatti: Piatto[];
}

function CategoryContent({ categoria, piatti }: CategoryContentProps) {
  const { availability, status, menuConfig, generali } = useMenu();

  return (
    <>
      <MenuHeader menuConfig={menuConfig} generali={generali} status={status} />
      <BackButton />

      <main className="min-h-screen bg-background">
        <Container as="div" className="py-8">
          {piatti.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Text variant="lead" muted>
                Nessun piatto disponibile in questa sezione.
              </Text>
            </div>
          ) : (
            <MenuSection
              categoria={categoria}
              piatti={piatti}
              availability={availability}
            />
          )}
        </Container>
      </main>

      <MenuFooter menuConfig={menuConfig} />
    </>
  );
}

// ---------------------------------------------------------------------------
// CategoryPage — entry point, inizializza il provider
// ---------------------------------------------------------------------------

export function CategoryPage({ staticData, categoria, piatti }: CategoryPageProps) {
  const { menuConfig, generali, piatti: tuttiPiatti, vini } = staticData;

  return (
    <MenuProvider
      menuConfig={menuConfig}
      generali={generali}
      piatti={tuttiPiatti}
      vini={vini}
    >
      <CategoryContent categoria={categoria} piatti={piatti} />
    </MenuProvider>
  );
}
