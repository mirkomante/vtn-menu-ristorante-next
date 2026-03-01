/**
 * MenuHeader — Intestazione brand-only del menu digitale.
 *
 * Sfondo: bg-background (Crema #FFEDD7).
 * Mostra il titolo del menu: usa `menuConfig.title` se presente,
 * altrimenti `menuConfig.nomeRistorante` come fallback.
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
  const titolo = menuConfig.title?.trim() || menuConfig.nomeRistorante;

  return (
    <header className="bg-background py-12 border-b border-surface-dark/10">
      <Container>
        <div className="text-center">
          <h1 className="font-serif text-4xl font-bold tracking-tight text-surface-dark md:text-5xl">
            {titolo}
          </h1>
        </div>
      </Container>
    </header>
  );
}
