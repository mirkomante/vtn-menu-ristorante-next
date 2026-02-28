/**
 * MenuHeader — Intestazione del menu digitale.
 *
 * Mostra il nome del ristorante, il messaggio di benvenuto e il banner
 * "Ristorante chiuso" quando applicabile.
 * Sfondo bordeaux (surface-dark), testi crema/oro.
 */

import { Container, Text } from "@/components/ui";
import type { MenuConfig } from "@/types";
import type { MenuStatus } from "@/context/MenuContext";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SLOT_LABEL: Record<string, string> = {
  lunch: "Pranzo",
  dinner: "Cena",
};

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export interface MenuHeaderProps {
  menuConfig: MenuConfig;
  status: MenuStatus;
}

export function MenuHeader({ menuConfig, status }: MenuHeaderProps) {
  const { isOpen, activeSlot, isHoliday, closureMessage } = status;

  return (
    <header className="bg-surface-dark py-8">
      <Container>
        {/* Nome ristorante */}
        <div className="text-center">
          <p className="font-serif text-4xl font-bold tracking-tight text-text-light md:text-5xl">
            {menuConfig.nomeRistorante}
          </p>

          {/* Messaggio di benvenuto */}
          {menuConfig.messaggioBenvenuto && (
            <Text
              variant="body"
              className="mt-2 text-text-light/80"
            >
              {menuConfig.messaggioBenvenuto}
            </Text>
          )}

          {/* Indicatore slot attivo */}
          {isOpen && activeSlot && (
            <div className="mt-3 inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-accent-gold" />
              <Text variant="small" className="font-medium text-accent-gold">
                Servizio {SLOT_LABEL[activeSlot]} in corso
              </Text>
            </div>
          )}
        </div>
      </Container>

      {/* Banner chiusura — discreto, non blocca la consultazione del menu */}
      {(!isOpen || isHoliday) && (
        <div className="mt-4 border-t border-text-light/10">
          <Container>
            <div className="flex items-center justify-center gap-2 pt-4">
              <span className="size-2 rounded-full bg-accent-orange" />
              <Text
                variant="small"
                className="font-medium text-text-light/70"
              >
                {closureMessage ??
                  (isHoliday
                    ? "Oggi siamo chiusi per festività — puoi comunque consultare il menu"
                    : "Al momento siamo chiusi — puoi comunque consultare il menu")}
              </Text>
            </div>
          </Container>
        </div>
      )}
    </header>
  );
}
