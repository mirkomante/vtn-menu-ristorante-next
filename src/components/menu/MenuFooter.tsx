/**
 * MenuFooter — Piè di pagina del menu digitale.
 *
 * Mostra:
 * - Nome del ristorante
 * - Testo del footer configurato nel CMS
 * - Annotazione Rich Text (Lexical) se presente — supporta link e liste
 * - Indirizzo e telefono (se presenti in MenuConfig)
 * - Link social (Instagram, Facebook) se configurati
 * - Copyright con anno dinamico
 *
 * Sfondo Blu Notte (bg-text-main), testi crema (text-text-light) e oro (text-accent-gold).
 * NON usare text-text-main o text-text-muted su questo sfondo — contrasto insufficiente.
 */

import { Container } from "@/components/ui";
import type { MenuConfig } from "@/types";
import { LexicalRenderer } from "./LexicalRenderer";

export interface MenuFooterProps {
  menuConfig: MenuConfig;
}

export function MenuFooter({ menuConfig }: MenuFooterProps) {
  const year = new Date().getFullYear();
  const hasSocial = menuConfig.instagram ?? menuConfig.facebook;
  const hasContatti = menuConfig.indirizzo ?? menuConfig.telefono;

  return (
    <footer className="bg-text-main py-10">
      <Container>
        <div className="flex flex-col items-center gap-4 text-center">
          {/* Nome */}
          <p className="font-serif text-xl font-bold text-text-light">
            {menuConfig.nomeRistorante}
          </p>

          {/* Testo footer CMS (plain text) */}
          {menuConfig.testoFooter && (
            <p className="max-w-prose font-sans text-sm text-text-light/70">
              {menuConfig.testoFooter}
            </p>
          )}

          {/* Annotazione Rich Text (Lexical) — supporta link, liste, bold/italic */}
          {menuConfig.annotazione && (
            <LexicalRenderer
              content={menuConfig.annotazione}
              className="max-w-prose font-sans text-sm text-text-light/70 space-y-2 text-center"
            />
          )}

          {/* Indirizzo e telefono */}
          {hasContatti && (
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
              {menuConfig.indirizzo && (
                <span className="font-sans text-sm text-text-light/60">
                  {menuConfig.indirizzo}
                </span>
              )}
              {menuConfig.telefono && (
                <a
                  href={`tel:${menuConfig.telefono.replace(/\s/g, "")}`}
                  className="font-sans text-sm text-text-light/60 transition-colors hover:text-accent-gold"
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
                  className="font-sans text-sm font-medium text-text-light/60 transition-colors hover:text-accent-gold"
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
                  className="font-sans text-sm font-medium text-text-light/60 transition-colors hover:text-accent-gold"
                >
                  Facebook
                </a>
              )}
            </div>
          )}

          {/* Copyright */}
          <p className="font-sans text-xs text-text-light/30">
            © {year} {menuConfig.nomeRistorante}. Tutti i diritti riservati.
          </p>
        </div>
      </Container>
    </footer>
  );
}
