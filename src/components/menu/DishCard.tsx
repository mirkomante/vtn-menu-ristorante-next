/**
 * DishCard — Componente di dominio per una voce del menu.
 *
 * Accetta qualsiasi `MenuItem` (piatto, vino, bevanda, birra, liquore).
 * Il campo `_type` discrimina il tipo per mostrare badge e info aggiuntive.
 *
 * Stile: Minimal B2 su sfondo crema.
 * Separatore: border-b border-surface-dark/20 (Bordeaux 20%, 1px).
 *
 * Assunzione: riceve solo voci disponibili (il filtro è in MenuSection).
 * Se per sicurezza riceve isAvailable=false, restituisce null.
 */

import { Badge, Heading, Text } from "@/components/ui";
import type { Allergene, MenuItem, Piatto, Vino } from "@/types";

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
 * Solo i Piatto hanno questi campi — per gli altri tipi restituisce [].
 */
function getDietaryTags(item: MenuItem): string[] {
  if (item._type !== "piatto") return [];
  const tags: string[] = [];
  if (item.vegan) tags.push("Vegan");
  if (item.glutenFree) tags.push("Gluten Free");
  if (item.noLatticini) tags.push("No Latticini");
  if (item.noUovo) tags.push("No Uovo");
  return tags;
}

/**
 * Estrae info aggiuntive da mostrare come badge neutri (grado, capacità, tipologia).
 * Usate per vini, birre, liquori.
 */
function getExtraBadges(item: MenuItem): string[] {
  const badges: string[] = [];

  if (item._type === "vino") {
    const v = item as Vino & { _type: "vino" };
    const tipNome = typeof v.tipologia === "object" ? v.tipologia?.nome : null;
    if (tipNome) badges.push(tipNome);
    if (v.cantina) badges.push(v.cantina);
    if (v.anno) badges.push(v.anno);
    if (v.capacita) badges.push(v.capacita);
    if (v.grado) badges.push(`${v.grado}°`);
  } else if (item._type === "birra" || item._type === "liquore") {
    const b = item as { _type: string; tipologia?: unknown; grado?: string; capacita?: string };
    const tipNome = typeof b.tipologia === "object" && b.tipologia !== null
      ? (b.tipologia as { nome?: string }).nome
      : null;
    if (tipNome) badges.push(tipNome);
    if (b.capacita) badges.push(b.capacita);
    if (b.grado) badges.push(`${b.grado}°`);
  } else if (item._type === "bevanda") {
    const b = item as { _type: string; tipologia?: unknown };
    const tipNome = typeof b.tipologia === "object" && b.tipologia !== null
      ? (b.tipologia as { nome?: string }).nome
      : null;
    if (tipNome) badges.push(tipNome);
  }

  return badges.filter(Boolean);
}

// ---------------------------------------------------------------------------
// Tipi
// ---------------------------------------------------------------------------

export interface DishCardProps {
  item: MenuItem;
  /**
   * Fail-safe: se false il componente restituisce null.
   * In produzione il filtro avviene in MenuSection prima di passare la voce.
   */
  isAvailable?: boolean;
  /** Classe CSS aggiuntiva per il wrapper esterno */
  className?: string;
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export function DishCard({
  item,
  isAvailable = true,
  className = "",
}: DishCardProps) {
  if (!isAvailable) return null;

  const { nome, descrizione, prezzo } = item;

  // Prezzo alternativo solo per i piatti
  const prezzoAlternativo = item._type === "piatto"
    ? (item as Piatto & { _type: "piatto" }).prezzoAlternativo
    : undefined;
  const etichettaPrezzoAlternativo = item._type === "piatto"
    ? (item as Piatto & { _type: "piatto" }).etichettaPrezzoAlternativo
    : undefined;

  // Prezzo al calice solo per i vini
  const prezzoCalice = item._type === "vino"
    ? (item as Vino & { _type: "vino" }).prezzoCalice
    : undefined;

  const dietaryTags = getDietaryTags(item);
  const extraBadges = getExtraBadges(item);
  const allergeniList = item._type === "piatto"
    ? ((item as Piatto & { _type: "piatto" }).allergeni ?? []).filter(Boolean)
    : [];
  const hasFooter = dietaryTags.length > 0 || allergeniList.length > 0 || extraBadges.length > 0;

  return (
    <div
      className={[
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
          {prezzoCalice != null && (
            <Text variant="caption" as="span" muted className="font-medium">
              Calice {formatPrice(prezzoCalice)}
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

      {/* Footer: tag dietetici, extra info, allergeni */}
      {hasFooter && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {dietaryTags.map((tag) => (
            <Badge key={tag} variant="highlight">
              {tag}
            </Badge>
          ))}

          {extraBadges.map((badge) => (
            <Badge key={badge} variant="default">
              {badge}
            </Badge>
          ))}

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
