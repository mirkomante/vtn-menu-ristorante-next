/**
 * MenuFooter — Piè di pagina del menu digitale.
 *
 * Mostra il testo del footer configurato nel CMS.
 * Sfondo bordeaux (surface-dark), testi crema.
 */

import { Container, Text } from "@/components/ui";
import type { MenuConfig } from "@/types";

export interface MenuFooterProps {
  menuConfig: MenuConfig;
}

export function MenuFooter({ menuConfig }: MenuFooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-surface-dark py-8">
      <Container>
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="font-serif text-xl font-bold text-text-light">
            {menuConfig.nomeRistorante}
          </p>

          {menuConfig.testoFooter && (
            <Text variant="small" className="max-w-prose text-text-light/70">
              {menuConfig.testoFooter}
            </Text>
          )}

          <Text variant="caption" className="text-text-light/40">
            © {year} {menuConfig.nomeRistorante}. Tutti i diritti riservati.
          </Text>
        </div>
      </Container>
    </footer>
  );
}
