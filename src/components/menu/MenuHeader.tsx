/**
 * MenuHeader — Intestazione brand-only del menu digitale.
 *
 * Sfondo: bg-background (Crema #FFEDD7).
 * Mostra solo il nome del ristorante (Philosopher, bordeaux su crema).
 * Orari, slot attivo e banner chiusura sono stati rimossi per massima pulizia visiva.
 */

import { Container } from "@/components/ui";
import type { MenuConfig } from "@/types";

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export interface MenuHeaderProps {
  menuConfig: MenuConfig;
}

export function MenuHeader({ menuConfig }: MenuHeaderProps) {
  return (
    <header className="bg-background py-12 border-b border-surface-dark/10">
      <Container>
        <div className="text-center">
          <p className="font-serif text-4xl font-bold tracking-tight text-surface-dark md:text-5xl">
            {menuConfig.nomeRistorante}
          </p>
        </div>
      </Container>
    </header>
  );
}
