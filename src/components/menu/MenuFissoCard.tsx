/**
 * MenuFissoCard — Componente per un menu a prezzo fisso (pranzo, degustazione, ecc.).
 *
 * `MenuFisso` ha struttura diversa da `MenuItem`: include una lista di piatti
 * e servizi aggiuntivi (es. coperto). Non passa per DishCard.
 *
 * Layout:
 * - Intestazione: nome (Heading Philosopher) + prezzo totale (Accent Gold)
 * - Descrizione (italic, text-muted)
 * - Lista piatti inclusi (rientrata, con bullet elegante)
 * - Servizi aggiuntivi (Badge default in fondo)
 *
 * Stile: Minimal B2 — nessun sfondo, separatore border-b bordeaux 20%.
 */

import { Badge, Heading, Text } from "@/components/ui";
import type { MenuFisso, Piatto, ServizioMenuFisso } from "@/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Formatta un prezzo in euro (es. 18 → "€ 18,00") */
function formatPrice(price: number): string {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(price);
}

/** Risolve il nome di un piatto che può essere oggetto popolato o id numerico */
function getPiattoNome(p: Piatto | number): string | null {
  if (typeof p === "number") return null;
  return p.nome;
}

/** Risolve il nome di un servizio che può essere oggetto popolato o id numerico */
function getServizioNome(s: ServizioMenuFisso | number): string | null {
  if (typeof s === "number") return null;
  return s.nome;
}

// ---------------------------------------------------------------------------
// Tipi
// ---------------------------------------------------------------------------

export interface MenuFissoCardProps {
  menu: MenuFisso;
  /** Classe CSS aggiuntiva per il wrapper esterno */
  className?: string;
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export function MenuFissoCard({ menu, className = "" }: MenuFissoCardProps) {
  const piattiNomi = (menu.piatti ?? [])
    .map(getPiattoNome)
    .filter((n): n is string => n !== null);

  const serviziNomi = (menu.servizi ?? [])
    .map(getServizioNome)
    .filter((n): n is string => n !== null);

  return (
    <div
      className={[
        "border-b border-surface-dark/20 py-6",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Intestazione: nome + prezzo */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Heading level={3} className="leading-snug">
            {menu.nome}
          </Heading>
        </div>
        <Text variant="body" as="span" className="shrink-0 font-bold text-accent-gold">
          {formatPrice(menu.prezzo)}
        </Text>
      </div>

      {/* Descrizione */}
      {menu.descrizione && (
        <Text variant="body" muted className="mt-1.5 italic">
          {menu.descrizione}
        </Text>
      )}

      {/* Lista piatti inclusi */}
      {piattiNomi.length > 0 && (
        <ul className="mt-4 space-y-1.5 border-l-2 border-surface-dark/20 pl-4">
          {piattiNomi.map((nome) => (
            <li key={nome}>
              <Text variant="small" className="text-text-main">
                {nome}
              </Text>
            </li>
          ))}
        </ul>
      )}

      {/* Servizi aggiuntivi */}
      {serviziNomi.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {serviziNomi.map((nome) => (
            <Badge key={nome} variant="default">
              {nome}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
