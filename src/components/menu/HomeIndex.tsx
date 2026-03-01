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
// Icona chevron inline — evita dipendenza da librerie icone esterne
// ---------------------------------------------------------------------------

function ChevronRight() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

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
}

function SectionCard({ slug, titolo }: SectionCardProps) {
  return (
    <Link
      href={`/menu/${slug}`}
      className={[
        "group block border-b border-surface-dark/15 py-5",
        "transition-colors duration-150",
        "hover:border-surface-dark/40",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-gold focus-visible:ring-offset-2",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-4">
        <Heading
          level={2}
          className="transition-colors duration-150 group-hover:text-surface-dark"
        >
          {titolo}
        </Heading>

        <span className="shrink-0 text-surface-dark/40 transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-surface-dark/70">
          <ChevronRight />
        </span>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// IndexContent — consuma il context, renderizza le card sezioni
// ---------------------------------------------------------------------------

function IndexContent() {
  const { sections, status, menuConfig } = useMenu();

  return (
    <>
      <MenuHeader menuConfig={menuConfig} />

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
  const { menuConfig, generali, piatti, vini, menuFissi, bevande, birre, liquori, sezioniRisolte } = staticData;

  return (
    <MenuProvider
      menuConfig={menuConfig}
      generali={generali}
      sezioniRisolte={sezioniRisolte}
      piatti={piatti}
      vini={vini}
      menuFissi={menuFissi}
      bevande={bevande}
      birre={birre}
      liquori={liquori}
    >
      <IndexContent />
    </MenuProvider>
  );
}
