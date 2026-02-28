/**
 * MenuSection — Componente di dominio per una sezione del menu.
 *
 * Raggruppa i piatti di una categoria con titolo e lista DishCard.
 * Nessun bordo o sfondo esterno: layout completamente aperto sul crema.
 *
 * Logica disponibilità:
 * - Piatti "esaurito" → rimossi dalla lista (invisibili).
 * - Piatti "nascosto"  → rimossi dalla lista (invisibili).
 * - Se dopo il filtro non rimane nessun piatto → restituisce null.
 */

import { Container, Heading, Text } from "@/components/ui";
import type { CategoriaMenu, Piatto } from "@/types";
import type { DisponibilitaResponse } from "@/types/disponibilita";
import { DishCard } from "./DishCard";

// ---------------------------------------------------------------------------
// Tipi
// ---------------------------------------------------------------------------

export interface MenuSectionProps {
  categoria: CategoriaMenu;
  piatti: Piatto[];
  /** Mappa disponibilità real-time da GCS. Se null, tutto è considerato disponibile. */
  availability?: DisponibilitaResponse | null;
  className?: string;
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export function MenuSection({
  categoria,
  piatti,
  availability = null,
  className = "",
}: MenuSectionProps) {
  // Filtra i piatti: esaurito e nascosto → invisibili
  // La chiave nella mappa può essere id numerico o stringa
  const piattiVisibili = piatti.filter((piatto) => {
    const item =
      availability?.piatti[piatto.id] ??
      availability?.piatti[String(piatto.id)];
    if (!item) return true; // nessuna info → disponibile
    return item.stato === "disponibile";
  });

  // Sezione senza piatti visibili → non renderizzare
  if (piattiVisibili.length === 0) return null;

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

        {/* Lista piatti visibili */}
        <div className="flex flex-col">
          {piattiVisibili.map((piatto) => (
            <DishCard key={piatto.id} piatto={piatto} />
          ))}
        </div>
      </Container>
    </section>
  );
}
