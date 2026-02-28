/**
 * DishCard — Componente di dominio per un singolo piatto.
 *
 * Stile: Minimal su sfondo crema, separatore arancio inferiore.
 * Nessun sfondo card (bg-transparent): il testo poggia direttamente sul crema.
 *
 * Gestisce:
 * - Piatti con prezzo singolo o prezzo alternativo (es. mezza porzione)
 * - Stato "esaurito" con opacità ridotta e badge
 * - Lista allergeni (testo discreto)
 * - Tag liberi (vegano, piccante, chef consiglia, ecc.)
 */

import { Badge, Heading, Text } from "@/components/ui";
import type { Allergene, Piatto } from "@/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Formatta un prezzo in euro (es. 14 → "€ 14,00") */
function formatPrice(price: number): string {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(price);
}

/** Risolve il nome di un allergene che può essere oggetto o stringa ID */
function getAllergeneNome(a: Allergene | string): string {
  return typeof a === "string" ? a : a.nome;
}

// ---------------------------------------------------------------------------
// Tipi
// ---------------------------------------------------------------------------

export interface DishCardProps {
  piatto: Piatto;
  /** Se false mostra il badge "Esaurito" e riduce l'opacità */
  isAvailable?: boolean;
  /** Classe CSS aggiuntiva per il wrapper esterno */
  className?: string;
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export function DishCard({
  piatto,
  isAvailable = true,
  className = "",
}: DishCardProps) {
  const {
    nome,
    descrizione,
    prezzo,
    prezzoAlternativo,
    etichettaPrezzoAlternativo,
    allergeni,
    tag,
  } = piatto;

  // Tag speciali che diventano badge visibili
  const tagBadges = tag?.filter(Boolean) ?? [];

  return (
    <div
      className={[
        "border-b-2 border-accent-orange/30 py-5",
        !isAvailable ? "opacity-50" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Riga principale: nome + prezzo */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <Heading level={3} className="leading-snug">
            {nome}
          </Heading>
          {!isAvailable && (
            <Badge
              variant="default"
              className="mt-1 shrink-0 bg-surface-dark text-text-light"
            >
              Esaurito
            </Badge>
          )}
        </div>

        {/* Prezzi */}
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <Text
            variant="body"
            as="span"
            className="font-bold text-accent-gold"
          >
            {formatPrice(prezzo)}
          </Text>
          {prezzoAlternativo != null && (
            <Text variant="caption" as="span" muted className="font-medium">
              {etichettaPrezzoAlternativo ?? "Alt."}{" "}
              {formatPrice(prezzoAlternativo)}
            </Text>
          )}
        </div>
      </div>

      {/* Descrizione */}
      {descrizione && (
        <Text variant="body" muted className="mt-1.5">
          {descrizione}
        </Text>
      )}

      {/* Footer: tag + allergeni */}
      {(tagBadges.length > 0 || (allergeni && allergeni.length > 0)) && (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {/* Tag come badge */}
          {tagBadges.map((t) => (
            <Badge
              key={t}
              variant={t === "chef consiglia" ? "highlight" : "default"}
            >
              {t}
            </Badge>
          ))}

          {/* Allergeni come testo discreto */}
          {allergeni && allergeni.length > 0 && (
            <Text variant="caption" muted as="span" className="font-medium">
              Allergeni:{" "}
              {allergeni.map((a) => getAllergeneNome(a)).join(", ")}
            </Text>
          )}
        </div>
      )}
    </div>
  );
}
