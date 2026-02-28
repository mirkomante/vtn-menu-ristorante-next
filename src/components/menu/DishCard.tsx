/**
 * DishCard — Componente di dominio per un singolo piatto.
 *
 * Stile: Minimal B2 su sfondo crema.
 * Separatore: border-b border-surface-dark/20 (Bordeaux 20%, 1px).
 * Nessun sfondo card: il testo poggia direttamente sul crema.
 *
 * Assunzione: riceve solo piatti disponibili (il filtro è in MenuSection).
 * Se per sicurezza riceve isAvailable=false, restituisce null.
 *
 * Struttura dati reale del backend:
 * - Campi dietetici booleani: glutenFree, noUovo, noLatticini, vegan
 * - Allergeni: array di oggetti Allergene o id numerici
 * - Nessun campo tag[] — i tag vengono derivati dai booleani
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

/** Risolve il nome di un allergene che può essere oggetto o id numerico */
function getAllergeneNome(a: Allergene | number): string {
  return typeof a === "number" ? `Allergene #${a}` : a.nome;
}

/**
 * Deriva i badge dietetici dai campi booleani del piatto.
 * Restituisce un array di etichette da mostrare come Badge `highlight`.
 */
function getDietaryTags(piatto: Piatto): string[] {
  const tags: string[] = [];
  if (piatto.vegan) tags.push("Vegan");
  if (piatto.glutenFree) tags.push("Gluten Free");
  if (piatto.noLatticini) tags.push("No Latticini");
  if (piatto.noUovo) tags.push("No Uovo");
  return tags;
}

// ---------------------------------------------------------------------------
// Tipi
// ---------------------------------------------------------------------------

export interface DishCardProps {
  piatto: Piatto;
  /**
   * Fail-safe: se false il componente restituisce null.
   * In produzione il filtro avviene in MenuSection prima di passare il piatto.
   */
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
  // Fail-safe: se il padre non ha filtrato, nascondi silenziosamente
  if (!isAvailable) return null;

  const {
    nome,
    descrizione,
    prezzo,
    prezzoAlternativo,
    etichettaPrezzoAlternativo,
    allergeni,
  } = piatto;

  const dietaryTags = getDietaryTags(piatto);
  const allergeniList = (allergeni ?? []).filter(Boolean);
  const hasFooter = dietaryTags.length > 0 || allergeniList.length > 0;

  return (
    <div
      className={[
        // Separatore B2: Bordeaux 20%, 1px
        "border-b border-surface-dark/20 py-5",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Riga principale: nome + prezzo */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1">
          <Heading level={3} className="leading-snug">
            {nome}
          </Heading>
        </div>

        {/* Prezzi */}
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <Text variant="body" as="span" className="font-bold text-accent-gold">
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

      {/* Footer: tag dietetici + allergeni */}
      {hasFooter && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {/* Tag dietetici (da booleani) → highlight (arancio) */}
          {dietaryTags.map((tag) => (
            <Badge key={tag} variant="highlight">
              {tag}
            </Badge>
          ))}

          {/* Allergeni → allergen (bordo bordeaux sottile) */}
          {allergeniList.map((a) => {
            const nomeAllergene = getAllergeneNome(a as Allergene | number);
            return (
              <Badge key={nomeAllergene} variant="allergen">
                {nomeAllergene}
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
