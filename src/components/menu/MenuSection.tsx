/**
 * MenuSection — Componente di dominio per una sezione del menu.
 *
 * Raggruppa voci di menu (piatti, vini, bevande, ecc.) con titolo e lista DishCard.
 * Nessun bordo o sfondo esterno: layout completamente aperto sul crema.
 *
 * Logica disponibilità (solo per piatti):
 * - Piatti "esaurito" → rimossi dalla lista (invisibili).
 * - Piatti "nascosto"  → rimossi dalla lista (invisibili).
 * - Vini/bevande/liquori: sempre visibili (nessuna logica di disponibilità).
 * - Se dopo il filtro non rimane nessuna voce → restituisce null.
 */

import { Container, Heading, Text } from "@/components/ui";
import type { CategoriaMenu, MenuItem } from "@/types";
import type { DisponibilitaResponse } from "@/types/disponibilita";
import { DishCard } from "./DishCard";

// ---------------------------------------------------------------------------
// Tipi
// ---------------------------------------------------------------------------

export interface MenuSectionProps {
  categoria: Pick<CategoriaMenu, "slug" | "nome" | "descrizione">;
  items: MenuItem[];
  /** Mappa disponibilità real-time da GCS. Se null, tutto è considerato disponibile. */
  availability?: DisponibilitaResponse | null;
  className?: string;
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export function MenuSection({
  categoria,
  items,
  availability = null,
  className = "",
}: MenuSectionProps) {
  // Filtra le voci: per i piatti applica la logica disponibilità; gli altri sempre visibili
  const itemsVisibili = items.filter((item) => {
    if (item._type !== "piatto") return true;
    const entry =
      availability?.piatti[item.id] ??
      availability?.piatti[String(item.id)];
    if (!entry) return true;
    return entry.stato === "disponibile";
  });

  if (itemsVisibili.length === 0) return null;

  return (
    <section
      id={categoria.slug}
      aria-labelledby={`section-title-${categoria.slug}`}
      className={["py-10 scroll-mt-16", className].filter(Boolean).join(" ")}
    >
      <Container padding="none">
        {/* Intestazione sezione */}
        <div className="mb-6">
          <Heading
            level={2}
            id={`section-title-${categoria.slug}`}
            color="bordeaux"
          >
            {categoria.nome}
          </Heading>

          {categoria.descrizione && (
            <Text variant="body" muted className="mt-2 max-w-prose">
              {categoria.descrizione}
            </Text>
          )}
        </div>

        {/* Lista voci visibili */}
        <div className="flex flex-col">
          {itemsVisibili.map((item) => (
            <DishCard key={`${item._type}-${item.id}`} item={item} />
          ))}
        </div>
      </Container>
    </section>
  );
}
