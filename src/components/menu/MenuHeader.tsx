/**
 * MenuHeader — Intestazione del menu digitale.
 *
 * Sfondo: bg-background (Crema #FFEDD7) → testi text-main (Blu Notte) e accent-gold.
 * NON usa bg-surface-dark per evitare la combinazione vietata text-main/surface-dark.
 *
 * Mostra:
 * - Nome del ristorante (Philosopher, grande, text-surface-dark = bordeaux)
 * - Messaggio di benvenuto (opzionale, text-muted)
 * - Orari di apertura della settimana (da Generali)
 * - Indicatore slot attivo (pranzo/cena)
 * - Banner "Ristorante chiuso" quando applicabile
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

/** Mappa day inglese → abbreviazione italiana */
const GIORNO_LABEL: Record<GiornoSettimana, string> = {
  monday:    "Lun",
  tuesday:   "Mar",
  wednesday: "Mer",
  thursday:  "Gio",
  friday:    "Ven",
  saturday:  "Sab",
  sunday:    "Dom",
};

/**
 * Raggruppa i giorni con lo stesso orario per compattare la visualizzazione.
 * Usa la struttura reale del backend: scheduleWeekly con day/isOpen/hours[].
 */
function formatOrari(scheduleWeekly: OrarioGiorno[]): { giorni: string; fasce: string }[] {
  const result: { giorni: string; fasce: string }[] = [];

  for (const orario of scheduleWeekly) {
    const giornoLabel = GIORNO_LABEL[orario.day] ?? orario.day;

    if (!orario.isOpen || !orario.hours || orario.hours.length === 0) {
      result.push({ giorni: giornoLabel, fasce: "Chiuso" });
      continue;
    }

    const fasceStr = orario.hours
      .map((f) => `${f.start}–${f.end}`)
      .join(", ");

    const last = result[result.length - 1];
    if (last && last.fasce === fasceStr && last.fasce !== "Chiuso") {
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
  const orariFormatted = generali.scheduleWeekly ? formatOrari(generali.scheduleWeekly) : [];

  return (
    <header className="bg-background py-10 border-b border-surface-dark/10">
      <Container>
        {/* Nome ristorante — bordeaux su crema: contrasto eccellente */}
        <div className="text-center">
          <p className="font-serif text-4xl font-bold tracking-tight text-surface-dark md:text-5xl">
            {menuConfig.nomeRistorante}
          </p>

          {/* Messaggio di benvenuto */}
          {menuConfig.messaggioBenvenuto && (
            <Text variant="body" muted className="mt-3">
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
          <div className="mt-8 border-t border-surface-dark/10 pt-6">
            <Text
              variant="small"
              className="mb-3 text-center font-semibold uppercase tracking-widest text-text-muted"
            >
              Orari
            </Text>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-1">
              {orariFormatted.map(({ giorni, fasce }) => (
                <div key={giorni} className="flex items-baseline gap-1.5">
                  <Text variant="small" className="font-semibold text-text-main">
                    {giorni}
                  </Text>
                  <Text variant="small" muted>
                    {fasce}
                  </Text>
                </div>
              ))}
            </div>
          </div>
        )}
      </Container>

      {/* Banner chiusura */}
      {(!isOpen || isHoliday) && (
        <div className="mt-6 border-t border-surface-dark/10">
          <Container>
            <div className="flex items-center justify-center gap-2 pt-4">
              <span className="size-2 shrink-0 rounded-full bg-accent-orange" />
              <Text variant="small" className="font-medium text-text-muted">
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
