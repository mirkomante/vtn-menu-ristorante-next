"use client";

/**
 * HomeIndex — Client Component per la Home Indice delle Sezioni.
 *
 * Riceve i dati statici dal Server Component (app/page.tsx) e:
 * 1. Inizializza MenuProvider (logica temporale + disponibilità real-time).
 * 2. Mostra le sezioni disponibili per lo slot corrente come card cliccabili.
 * 3. Ogni card porta a /menu/[slug] per il dettaglio della categoria.
 *
 * Le sezioni fuori orario (es. "Pranzo" di sera) vengono nascoste automaticamente
 * grazie a useMenuStructure che filtra per visibility/activeSlot.
 */

import Link from "next/link";
import { useMenu, MenuProvider } from "@/context/MenuContext";
import { Container, Heading, Text } from "@/components/ui";
import { MenuHeader } from "./MenuHeader";
import { MenuFooter } from "./MenuFooter";
import type { StaticMenuData } from "@/types";

// ---------------------------------------------------------------------------
// Tipi
// ---------------------------------------------------------------------------

export interface HomeIndexProps {
  staticData: StaticMenuData;
}

// ---------------------------------------------------------------------------
// SectionCard — card cliccabile per una sezione del menu
// ---------------------------------------------------------------------------

interface SectionCardProps {
  slug: string;
  titolo: string;
  numeroPiatti: number;
}

function SectionCard({ slug, titolo, numeroPiatti }: SectionCardProps) {
  return (
    <Link
      href={`/menu/${slug}`}
      className={[
        "group block border-b border-surface-dark/20 py-5",
        "transition-colors duration-150",
        "hover:border-accent-orange/60",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-gold focus-visible:ring-offset-2",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-4">
        <Heading
          level={2}
          className="transition-colors duration-150 group-hover:text-accent-orange"
        >
          {titolo}
        </Heading>

        {/* Freccia + conteggio piatti */}
        <div className="flex shrink-0 items-center gap-3">
          <Text variant="small" muted className="tabular-nums">
            {numeroPiatti} {numeroPiatti === 1 ? "piatto" : "piatti"}
          </Text>
          <span
            className="text-text-muted transition-transform duration-150 group-hover:translate-x-1 group-hover:text-accent-orange"
            aria-hidden="true"
          >
            →
          </span>
        </div>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// IndexContent — consuma il context, renderizza le card sezioni
// ---------------------------------------------------------------------------

function IndexContent() {
  const { sections, status, menuConfig, generali } = useMenu();

  return (
    <>
      <MenuHeader menuConfig={menuConfig} generali={generali} status={status} />

      <main className="min-h-screen bg-background">
        <Container as="div" className="py-10">
          {sections.length === 0 ? (
            <EmptyIndex isOpen={status.isOpen} />
          ) : (
            <nav aria-label="Sezioni del menu">
              <div className="flex flex-col">
                {sections.map((sezione) => (
                  <SectionCard
                    key={sezione.slug}
                    slug={sezione.slug}
                    titolo={sezione.titolo}
                    numeroPiatti={sezione.piatti.length}
                  />
                ))}
              </div>
            </nav>
          )}
        </Container>
      </main>

      <MenuFooter menuConfig={menuConfig} />
    </>
  );
}

// ---------------------------------------------------------------------------
// EmptyIndex — nessuna sezione disponibile per lo slot corrente
// ---------------------------------------------------------------------------

function EmptyIndex({ isOpen }: { isOpen: boolean }) {
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
// HomeIndex — entry point, inizializza il provider
// ---------------------------------------------------------------------------

export function HomeIndex({ staticData }: HomeIndexProps) {
  const { menuConfig, generali, piatti, vini } = staticData;

  return (
    <MenuProvider
      menuConfig={menuConfig}
      generali={generali}
      piatti={piatti}
      vini={vini}
    >
      <IndexContent />
    </MenuProvider>
  );
}
