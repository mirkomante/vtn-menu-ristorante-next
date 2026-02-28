"use client";

/**
 * CategoryPage — Client Component per la pagina dettaglio di una sezione virtuale.
 *
 * Riceve una SezioneRisolta (già risolta dal Query Builder a build-time) e:
 * 1. Inizializza MenuProvider per il polling della disponibilità real-time.
 * 2. Mostra il titolo della sezione e la lista dei piatti con DishCard.
 * 3. Filtra automaticamente i piatti esauriti tramite MenuSection.
 *
 * La sezione può contenere piatti da più categorie (aggregazione virtuale)
 * o un sottoinsieme filtrato per inclusione/esclusione — tutto già risolto
 * a build-time da resolveMenuSection() in api.ts.
 */

import Link from "next/link";
import { useMenu, MenuProvider } from "@/context/MenuContext";
import { Container, Heading, Text } from "@/components/ui";
import { MenuHeader } from "./MenuHeader";
import { MenuFooter } from "./MenuFooter";
import { MenuSection } from "./MenuSection";
import type { SezioneRisolta, StaticMenuData } from "@/types";

// ---------------------------------------------------------------------------
// Tipi
// ---------------------------------------------------------------------------

export interface CategoryPageProps {
  /** Tutti i dati statici (necessari per MenuProvider) */
  staticData: StaticMenuData;
  /** La sezione virtuale risolta dal Query Builder */
  sezione: SezioneRisolta;
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
  sezione: SezioneRisolta;
}

function CategoryContent({ sezione }: CategoryContentProps) {
  const { availability, status, menuConfig, generali } = useMenu();

  // Costruisce una CategoriaMenu sintetica per MenuSection
  // (necessaria per il titolo e l'anchor id della sezione)
  const categoriaVirtuale = {
    id: 0,
    nome: sezione.titolo,
    slug: sezione.slug,
    attiva: true,
    createdAt: "",
    updatedAt: "",
  };

  return (
    <>
      <MenuHeader menuConfig={menuConfig} generali={generali} status={status} />
      <BackButton />

      <main className="min-h-screen bg-background">
        <Container as="div" className="py-8">
          {sezione.piatti.length === 0 && sezione.vini.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Text variant="lead" muted>
                Nessun piatto disponibile in questa sezione.
              </Text>
            </div>
          ) : (
            <>
              {sezione.piatti.length > 0 && (
                <MenuSection
                  categoria={categoriaVirtuale}
                  piatti={sezione.piatti}
                  availability={availability}
                />
              )}

              {sezione.vini.length > 0 && (
                <section className="py-10">
                  <Heading level={2} color="bordeaux" className="mb-6">
                    {sezione.titolo}
                  </Heading>
                  {/* Placeholder: WineCard da implementare */}
                  <Text variant="body" muted>
                    {sezione.vini.length} vini disponibili.
                  </Text>
                </section>
              )}
            </>
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

export function CategoryPage({ staticData, sezione }: CategoryPageProps) {
  const { menuConfig, generali, piatti, vini } = staticData;

  return (
    <MenuProvider
      menuConfig={menuConfig}
      generali={generali}
      piatti={piatti}
      vini={vini}
    >
      <CategoryContent sezione={sezione} />
    </MenuProvider>
  );
}
