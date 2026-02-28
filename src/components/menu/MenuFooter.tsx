/**
 * MenuFooter — Piè di pagina del menu digitale.
 *
 * Mostra:
 * - Nome del ristorante
 * - Testo del footer configurato nel CMS
 * - Indirizzo e telefono (se presenti in MenuConfig)
 * - Link social (Instagram, Facebook) se configurati
 * - Copyright con anno dinamico
 *
 * Sfondo bordeaux (surface-dark), testi crema.
 */

import { Container, Text } from "@/components/ui";
import type { MenuConfig } from "@/types";

export interface MenuFooterProps {
  menuConfig: MenuConfig;
}

export function MenuFooter({ menuConfig }: MenuFooterProps) {
  const year = new Date().getFullYear();
  const hasSocial = menuConfig.instagram ?? menuConfig.facebook;
  const hasContatti = menuConfig.indirizzo ?? menuConfig.telefono;

  return (
    <footer className="bg-surface-dark py-10">
      <Container>
        <div className="flex flex-col items-center gap-4 text-center">
          {/* Nome */}
          <p className="font-serif text-xl font-bold text-text-light">
            {menuConfig.nomeRistorante}
          </p>

          {/* Testo footer CMS */}
          {menuConfig.testoFooter && (
            <Text variant="small" className="max-w-prose text-text-light/70">
              {menuConfig.testoFooter}
            </Text>
          )}

          {/* Indirizzo e telefono */}
          {hasContatti && (
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
              {menuConfig.indirizzo && (
                <Text variant="small" className="text-text-light/60">
                  {menuConfig.indirizzo}
                </Text>
              )}
              {menuConfig.telefono && (
                <a
                  href={`tel:${menuConfig.telefono.replace(/\s/g, "")}`}
                  className="text-sm text-text-light/60 transition-colors hover:text-accent-gold"
                >
                  {menuConfig.telefono}
                </a>
              )}
            </div>
          )}

          {/* Link social */}
          {hasSocial && (
            <div className="flex items-center gap-4">
              {menuConfig.instagram && (
                <a
                  href={menuConfig.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="text-sm font-medium text-text-light/60 transition-colors hover:text-accent-gold"
                >
                  Instagram
                </a>
              )}
              {menuConfig.facebook && (
                <a
                  href={menuConfig.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="text-sm font-medium text-text-light/60 transition-colors hover:text-accent-gold"
                >
                  Facebook
                </a>
              )}
            </div>
          )}

          {/* Copyright */}
          <Text variant="caption" className="text-text-light/30">
            © {year} {menuConfig.nomeRistorante}. Tutti i diritti riservati.
          </Text>
        </div>
      </Container>
    </footer>
  );
}
