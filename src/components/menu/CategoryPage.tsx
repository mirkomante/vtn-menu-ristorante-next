"use client";

/**
 * CategoryPage — Client Component per la pagina dettaglio di una sezione virtuale.
 *
 * Riceve una SezioneRisolta (già risolta dal Query Builder a build-time) e:
 * 1. Inizializza MenuProvider per il polling della disponibilità real-time.
 * 2. Mostra il titolo della sezione e la lista items con DishCard (piatti, vini, bevande…).
 * 3. Filtra automaticamente i piatti esauriti tramite MenuSection.
 * 4. Mostra i menu fissi (pranzo, degustazione) con layout dedicato.
 *
 * La sezione può contenere voci da più categorie (aggregazione virtuale)
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
  const { availability, menuConfig } = useMenu();

  // Categoria sintetica per MenuSection (titolo + anchor id)
  const categoriaVirtuale = {
    nome: sezione.titolo,
    slug: sezione.slug,
  };

  const hasItems = sezione.items.length > 0;
  const hasMenuFissi = sezione.menuFissi.length > 0;

  return (
    <>
      <MenuHeader menuConfig={menuConfig} />
      <BackButton />

      <main className="min-h-screen bg-background">
        <Container as="div" className="py-8">
          {!hasItems && !hasMenuFissi ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Text variant="lead" muted>
                Nessun contenuto disponibile in questa sezione.
              </Text>
            </div>
          ) : (
            <>
              {/* Voci generiche: piatti, vini, bevande, birre, liquori */}
              {hasItems && (
                <MenuSection
                  categoria={categoriaVirtuale}
                  items={sezione.items}
                  availability={availability}
                />
              )}

              {/* Menu a prezzo fisso (pranzo, degustazione) */}
              {hasMenuFissi && (
                <section className="py-10">
                  <Heading level={2} color="bordeaux" className="mb-6">
                    {sezione.titolo}
                  </Heading>
                  <div className="space-y-4">
                    {sezione.menuFissi.map((mf) => (
                      <div key={mf.id} className="rounded-lg border border-surface-dark/10 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <Text variant="body" className="font-medium">
                              {mf.nome}
                            </Text>
                            {mf.descrizione && (
                              <Text variant="small" muted className="mt-1">
                                {mf.descrizione}
                              </Text>
                            )}
                          </div>
                          <Text variant="body" className="shrink-0 font-medium">
                            €{mf.prezzo.toFixed(2)}
                          </Text>
                        </div>
                      </div>
                    ))}
                  </div>
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
  const { menuConfig, generali, piatti, vini, menuFissi, bevande, birre, liquori } = staticData;

  return (
    <MenuProvider
      menuConfig={menuConfig}
      generali={generali}
      piatti={piatti}
      vini={vini}
      menuFissi={menuFissi}
      bevande={bevande}
      birre={birre}
      liquori={liquori}
    >
      <CategoryContent sezione={sezione} />
    </MenuProvider>
  );
}
