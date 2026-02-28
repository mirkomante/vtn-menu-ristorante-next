/**
 * MenuSection — Componente di dominio per una sezione del menu.
 *
 * Raggruppa i piatti di una categoria con titolo, descrizione opzionale
 * e lista DishCard in stile Minimal.
 *
 * Logica: se la lista piatti è vuota, non renderizza nulla.
 * L'id dell'elemento corrisponde allo slug della categoria per il deep-link
 * dalla StickyNav (es. <section id="antipasti">).
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
  // Sezione vuota → non renderizzare
  if (piatti.length === 0) return null;

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
            className="relative inline-block pb-2 after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-accent-orange/40 after:content-['']"
          >
            {categoria.nome}
          </Heading>

          {categoria.descrizione && (
            <Text variant="body" muted className="mt-2 max-w-prose">
              {categoria.descrizione}
            </Text>
          )}
        </div>

        {/* Lista piatti */}
        <div className="flex flex-col">
          {piatti.map((piatto) => {
            const disponibilitaItem = availability?.piatti[piatto.id];
            const isAvailable =
              disponibilitaItem == null ||
              disponibilitaItem.stato === "disponibile";

            // I piatti con stato "nascosto" non vengono renderizzati
            if (disponibilitaItem?.stato === "nascosto") return null;

            return (
              <DishCard
                key={piatto.id}
                piatto={piatto}
                isAvailable={isAvailable}
              />
            );
          })}
        </div>
      </Container>
    </section>
  );
}
