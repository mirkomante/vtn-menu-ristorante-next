/**
 * DishCard — Smart Component polimorfico per una voce del menu.
 *
 * Accetta qualsiasi `MenuItem` (piatto, vino, bevanda, birra, liquore).
 * Il campo `_type` discrimina il tipo per mostrare badge e info specifiche:
 *
 * - piatto:  Descrizione + Allergeni (Badge allergen) + Dietetici (Badge highlight)
 *            + Prezzo alternativo (es. mezza porzione)
 * - vino:    Descrizione + Info tecniche (Cantina • Annata • Grado) + Prezzo calice
 * - birra:   Descrizione + Info (Tipologia • Grado • Capacità)
 * - liquore: Descrizione + Info (Tipologia • Grado • Capacità • Invecchiamento)
 * - bevanda: Descrizione + Tipologia
 *
 * Stile: Minimal B2 su sfondo crema.
 * Separatore: border-b border-surface-dark/20 (Bordeaux 20%, 1px).
 *
 * Assunzione: riceve solo voci disponibili (il filtro è in MenuSection).
 * Se per sicurezza riceve isAvailable=false, restituisce null.
 */

import { Badge, Heading, Text } from "@/components/ui";
import type { Allergene, Birra, Bevanda, Liquore, MenuItem, Nazione, Piatto, Regione, Vino, Zona } from "@/types";

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

/** Risolve il nome di una relazione embedded (oggetto con .nome) o non popolata (numero) */
function getNome(rel: unknown): string | null {
  if (typeof rel === "object" && rel !== null) {
    return (rel as { nome?: string }).nome ?? null;
  }
  return null;
}

/**
 * Costruisce la stringa di provenienza geografica di un vino.
 * Ordine: Zona, Regione, Nazione — solo i valori popolati (oggetti, non id numerici).
 * Esempio: "Barolo, Piemonte, Italia"
 */
function buildProvenienzaVino(
  zona: Vino["zona"],
  regione: Vino["regione"],
  nazione: Vino["nazione"]
): string {
  const zonaNome = getNome(zona as Zona | number | null);

  // La regione può avere nazione embedded (depth=2)
  let regioneNome: string | null = null;
  let nazioneNome: string | null = null;

  if (typeof regione === "object" && regione !== null) {
    const r = regione as Regione;
    regioneNome = r.nome ?? null;
    // Se nazione non è passata direttamente, prova a ricavarla dalla regione
    nazioneNome = getNome(r.nazione as Nazione | number | undefined);
  }

  // Nazione passata direttamente ha priorità su quella ricavata dalla regione
  const nazioneDirecta = getNome(nazione as Nazione | number | null);
  if (nazioneDirecta) nazioneNome = nazioneDirecta;

  return [zonaNome, regioneNome, nazioneNome].filter(Boolean).join(", ");
}

// ---------------------------------------------------------------------------
// Sub-componenti body (uno per _type)
// ---------------------------------------------------------------------------

function PiattoBody({ item }: { item: Piatto & { _type: "piatto" } }) {
  const dietaryTags: string[] = [];
  if (item.vegan) dietaryTags.push("Vegan");
  if (item.glutenFree) dietaryTags.push("Gluten Free");
  if (item.noLatticini) dietaryTags.push("No Latticini");
  if (item.noUovo) dietaryTags.push("No Uovo");

  const allergeniList = (item.allergeni ?? []).filter(Boolean);
  const hasFooter = dietaryTags.length > 0 || allergeniList.length > 0;

  return (
    <>
      {item.descrizione && (
        <Text variant="body" muted className="mt-1.5">
          {item.descrizione}
        </Text>
      )}
      {hasFooter && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {dietaryTags.map((tag) => (
            <Badge key={tag} variant="highlight">
              {tag}
            </Badge>
          ))}
          {allergeniList.map((a) => {
            const nome = getAllergeneNome(a as Allergene | number);
            return (
              <Badge key={nome} variant="allergen">
                {nome}
              </Badge>
            );
          })}
        </div>
      )}
    </>
  );
}

function VinoBody({ item }: { item: Vino & { _type: "vino" } }) {
  const tipNome = getNome(item.tipologia);

  // Riga tecnica: Cantina · Annata · Grado
  const infoTecnica = [item.cantina, item.anno, item.grado ? `${item.grado}°` : null]
    .filter(Boolean)
    .join(" · ");

  // Riga provenienza: Zona, Regione, Nazione
  const provenienza = buildProvenienzaVino(item.zona, item.regione, item.nazione);

  const badges: string[] = [];
  if (tipNome) badges.push(tipNome);
  if (item.capacita) badges.push(item.capacita);
  if (item.certificazione) badges.push(item.certificazione);

  return (
    <>
      {item.descrizione && (
        <Text variant="body" muted className="mt-1.5">
          {item.descrizione}
        </Text>
      )}
      {infoTecnica && (
        <Text variant="small" muted className="mt-1">
          {infoTecnica}
        </Text>
      )}
      {provenienza && (
        <Text variant="small" muted className="mt-0.5">
          {provenienza}
        </Text>
      )}
      {badges.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {badges.map((b) => (
            <Badge key={b} variant="default">
              {b}
            </Badge>
          ))}
        </div>
      )}
    </>
  );
}

function BirraBody({ item }: { item: Birra & { _type: "birra" } }) {
  const tipNome = getNome(item.tipologia);
  const nazioneNome = getNome(item.nazione);

  // Riga tecnica: Grado · Capacità
  const infoTecnica = [item.grado ? `${item.grado}°` : null, item.capacita]
    .filter(Boolean)
    .join(" · ");

  const badges: string[] = [];
  if (tipNome) badges.push(tipNome);
  if (nazioneNome) badges.push(nazioneNome);

  return (
    <>
      {item.descrizione && (
        <Text variant="body" muted className="mt-1.5">
          {item.descrizione}
        </Text>
      )}
      {infoTecnica && (
        <Text variant="small" muted className="mt-1">
          {infoTecnica}
        </Text>
      )}
      {badges.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {badges.map((b) => (
            <Badge key={b} variant="default">
              {b}
            </Badge>
          ))}
        </div>
      )}
    </>
  );
}

function LiquoreBody({ item }: { item: Liquore & { _type: "liquore" } }) {
  const tipNome = getNome(item.tipologia);
  const nazioneNome = getNome(item.nazione);

  // Riga tecnica: Grado · Capacità · Invecchiamento
  const infoTecnica = [
    item.grado ? `${item.grado}°` : null,
    item.capacita,
    item.invecchiamento,
  ]
    .filter(Boolean)
    .join(" · ");

  const badges: string[] = [];
  if (tipNome) badges.push(tipNome);
  if (nazioneNome) badges.push(nazioneNome);

  return (
    <>
      {item.descrizione && (
        <Text variant="body" muted className="mt-1.5">
          {item.descrizione}
        </Text>
      )}
      {infoTecnica && (
        <Text variant="small" muted className="mt-1">
          {infoTecnica}
        </Text>
      )}
      {badges.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {badges.map((b) => (
            <Badge key={b} variant="default">
              {b}
            </Badge>
          ))}
        </div>
      )}
    </>
  );
}

function BevandaBody({ item }: { item: Bevanda & { _type: "bevanda" } }) {
  const tipNome = getNome(item.tipologia);
  const nazioneNome = getNome(item.nazione);

  const badges: string[] = [];
  if (tipNome) badges.push(tipNome);
  if (nazioneNome) badges.push(nazioneNome);

  return (
    <>
      {item.descrizione && (
        <Text variant="body" muted className="mt-1.5">
          {item.descrizione}
        </Text>
      )}
      {badges.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {badges.map((b) => (
            <Badge key={b} variant="default">
              {b}
            </Badge>
          ))}
        </div>
      )}
    </>
  );
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
// Componente principale
// ---------------------------------------------------------------------------

export function DishCard({
  item,
  isAvailable = true,
  className = "",
}: DishCardProps) {
  if (!isAvailable) return null;

  // Prezzo alternativo (solo piatti)
  const prezzoAlternativo =
    item._type === "piatto" ? item.prezzoAlternativo : undefined;
  const etichettaPrezzoAlternativo =
    item._type === "piatto" ? item.etichettaPrezzoAlternativo : undefined;

  // Prezzo al calice (solo vini)
  const prezzoCalice =
    item._type === "vino" ? item.prezzoCalice : undefined;

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
        <div className="min-w-0 flex-1">
          <Heading level={3} className="leading-snug">
            {item.nome}
          </Heading>
        </div>

        {/* Colonna prezzi */}
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <Text variant="body" as="span" className="font-bold text-accent-gold">
            {formatPrice(item.prezzo)}
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

      {/* Body variabile per tipo */}
      {item._type === "piatto"   && <PiattoBody  item={item} />}
      {item._type === "vino"     && <VinoBody    item={item} />}
      {item._type === "birra"    && <BirraBody   item={item} />}
      {item._type === "liquore"  && <LiquoreBody item={item} />}
      {item._type === "bevanda"  && <BevandaBody item={item} />}
    </div>
  );
}
