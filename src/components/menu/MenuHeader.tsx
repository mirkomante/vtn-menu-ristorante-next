/**
 * MenuHeader — Intestazione del menu digitale.
 *
 * Mostra:
 * - Nome del ristorante (Philosopher, grande)
 * - Messaggio di benvenuto (opzionale)
 * - Orari di apertura della settimana (da Generali)
 * - Indicatore slot attivo (pranzo/cena)
 * - Banner "Ristorante chiuso" quando applicabile (discreto, non blocca la consultazione)
 *
 * Sfondo bordeaux (surface-dark), testi crema/oro.
 */

import { Container, Text } from "@/components/ui";
import type { Generali, GiornoSettimana, MenuConfig, OrarioGiorno } from "@/types";
import type { MenuStatus } from "@/context/MenuContext";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SLOT_LABEL: Record<string, string> = {
  lunch: "Pranzo",
  dinner: "Cena",
};

const GIORNO_LABEL: Record<GiornoSettimana, string> = {
  lunedi: "Lun",
  martedi: "Mar",
  mercoledi: "Mer",
  giovedi: "Gio",
  venerdi: "Ven",
  sabato: "Sab",
  domenica: "Dom",
};

/** Raggruppa i giorni con lo stesso orario per compattare la visualizzazione */
function formatOrari(orari: OrarioGiorno[]): { giorni: string; fasce: string }[] {
  const result: { giorni: string; fasce: string }[] = [];

  for (const orario of orari) {
    const giornoLabel = GIORNO_LABEL[orario.giorno] ?? orario.giorno;

    if (!orario.aperto || !orario.fasce || orario.fasce.length === 0) {
      result.push({ giorni: giornoLabel, fasce: "Chiuso" });
      continue;
    }

    const fasceStr = orario.fasce
      .map((f) => `${f.apertura}–${f.chiusura}`)
      .join(", ");

    // Prova a raggruppare con la voce precedente se stesso orario
    const last = result[result.length - 1];
    if (last && last.fasce === fasceStr && last.fasce !== "Chiuso") {
      // Estendi il range giorni (es. "Lun–Mer")
      const parts = last.giorni.split("–");
      last.giorni = `${parts[0]}–${giornoLabel}`;
    } else {
      result.push({ giorni: giornoLabel, fasce: fasceStr });
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export interface MenuHeaderProps {
  menuConfig: MenuConfig;
  generali: Generali;
  status: MenuStatus;
}

export function MenuHeader({ menuConfig, generali, status }: MenuHeaderProps) {
  const { isOpen, activeSlot, isHoliday, closureMessage } = status;
  const orariFormatted = generali.orari ? formatOrari(generali.orari) : [];

  return (
    <header className="bg-surface-dark py-10">
      <Container>
        {/* Nome ristorante */}
        <div className="text-center">
          <p className="font-serif text-4xl font-bold tracking-tight text-text-light md:text-5xl">
            {menuConfig.nomeRistorante}
          </p>

          {/* Messaggio di benvenuto */}
          {menuConfig.messaggioBenvenuto && (
            <Text variant="body" className="mt-3 text-text-light/80">
              {menuConfig.messaggioBenvenuto}
            </Text>
          )}

          {/* Indicatore slot attivo */}
          {isOpen && activeSlot && (
            <div className="mt-4 inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-accent-gold" />
              <Text variant="small" className="font-medium text-accent-gold">
                Servizio {SLOT_LABEL[activeSlot]} in corso
              </Text>
            </div>
          )}
        </div>

        {/* Orari di apertura */}
        {orariFormatted.length > 0 && (
          <div className="mt-8 border-t border-text-light/10 pt-6">
            <Text
              variant="small"
              className="mb-3 text-center font-semibold uppercase tracking-widest text-accent-gold/80"
            >
              Orari
            </Text>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-1">
              {orariFormatted.map(({ giorni, fasce }) => (
                <div key={giorni} className="flex items-baseline gap-1.5">
                  <Text variant="small" className="font-semibold text-text-light">
                    {giorni}
                  </Text>
                  <Text variant="small" className="text-text-light/60">
                    {fasce}
                  </Text>
                </div>
              ))}
            </div>
          </div>
        )}
      </Container>

      {/* Banner chiusura — discreto, non blocca la consultazione del menu */}
      {(!isOpen || isHoliday) && (
        <div className="mt-6 border-t border-text-light/10">
          <Container>
            <div className="flex items-center justify-center gap-2 pt-4">
              <span className="size-2 shrink-0 rounded-full bg-accent-orange" />
              <Text variant="small" className="font-medium text-text-light/70">
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
