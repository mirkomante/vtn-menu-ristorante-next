/**
 * MenuSection — Componente di dominio per una sezione del menu.
 *
 * Accetta sia `items: MenuItem[]` (piatti, vini, bevande, birre, liquori)
 * che `menuFissi: MenuFisso[]` (menu a prezzo fisso). Può gestire entrambi
 * contemporaneamente: i menu fissi vengono mostrati prima, poi gli item sciolti.
 *
 * Logica disponibilità (solo per piatti):
 * - Piatti "esaurito" → rimossi dalla lista (invisibili).
 * - Piatti "nascosto"  → rimossi dalla lista (invisibili).
 * - Vini/bevande/liquori/menu fissi: sempre visibili.
 * - Se dopo il filtro non rimane nessuna voce → restituisce null.
 */

import { Container, Heading, Text } from "@/components/ui";
import type { CategoriaMenu, MenuFisso, MenuItem } from "@/types";
import type { DisponibilitaResponse } from "@/types/disponibilita";
import { DishCard } from "./DishCard";
import { MenuFissoCard } from "./MenuFissoCard";

// ---------------------------------------------------------------------------
// Tipi
// ---------------------------------------------------------------------------

export interface MenuSectionProps {
  categoria: Pick<CategoriaMenu, "slug" | "nome" | "descrizione">;
  /** Voci generiche: piatti, vini, bevande, birre, liquori */
  items?: MenuItem[];
  /** Menu a prezzo fisso (struttura diversa, renderizzati con MenuFissoCard) */
  menuFissi?: MenuFisso[];
  /** Mappa disponibilità real-time da GCS. Se null, tutto è considerato disponibile. */
  availability?: DisponibilitaResponse | null;
  className?: string;
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export function MenuSection({
  categoria,
  items = [],
  menuFissi = [],
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

  const hasMenuFissi = menuFissi.length > 0;
  const hasItems = itemsVisibili.length > 0;

  if (!hasMenuFissi && !hasItems) return null;

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

        {/* Menu fissi (in cima, struttura dedicata) */}
        {hasMenuFissi && (
          <div className="flex flex-col">
            {menuFissi.map((mf) => (
              <MenuFissoCard key={`menu-fisso-${mf.id}`} menu={mf} />
            ))}
          </div>
        )}

        {/* Item sciolti: piatti, vini, bevande, birre, liquori */}
        {hasItems && (
          <div className={["flex flex-col", hasMenuFissi ? "mt-6" : ""].filter(Boolean).join(" ")}>
            {itemsVisibili.map((item) => (
              <DishCard key={`${item._type}-${item.id}`} item={item} />
            ))}
          </div>
        )}
      </Container>
    </section>
  );
}
