/**
 * MenuSection — Componente di dominio per una sezione del menu.
 *
 * Accetta sia `groups: MenuItemGroup[]` (piatti, vini, bevande, birre, liquori
 * già raggruppati secondo OrdinamentoMenu) che `menuFissi: MenuFisso[]` (menu a
 * prezzo fisso). I menu fissi vengono mostrati prima, poi i gruppi di item.
 *
 * Rendering gerarchico:
 * - Se un gruppo ha `title`, viene renderizzato un sottotitolo h3 sticky.
 * - Lista piatta = un singolo gruppo senza titolo (nessun sottotitolo).
 *
 * Logica disponibilità (solo per piatti):
 * - Piatti "esaurito" → rimossi dalla lista (invisibili).
 * - Piatti "nascosto"  → rimossi dalla lista (invisibili).
 * - Vini/bevande/liquori/menu fissi: sempre visibili.
 * - Se dopo il filtro non rimane nessuna voce → restituisce null.
 */

import { Container, Heading, Text } from "@/components/ui";
import type { CategoriaMenu, MenuFisso, MenuItemGroup } from "@/types";
import type { DisponibilitaResponse } from "@/types/disponibilita";
import { DishCard } from "./DishCard";
import { MenuFissoCard } from "./MenuFissoCard";

// ---------------------------------------------------------------------------
// Tipi
// ---------------------------------------------------------------------------

export interface MenuSectionProps {
  categoria: Pick<CategoriaMenu, "slug" | "nome" | "descrizione">;
  /**
   * Item raggruppati e ordinati secondo OrdinamentoMenu.
   * Lista piatta = `[{ items: [...] }]` (un gruppo senza titolo).
   * Raggruppata = `[{ title: "Toscana", items: [...] }, ...]`.
   */
  groups?: MenuItemGroup[];
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
  groups = [],
  menuFissi = [],
  availability = null,
  className = "",
}: MenuSectionProps) {
  // Filtra gli item di ogni gruppo applicando la logica disponibilità (solo piatti)
  const groupsVisibili: MenuItemGroup[] = groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (item._type !== "piatto") return true;
        const entry =
          availability?.piatti[item.id] ??
          availability?.piatti[String(item.id)];
        if (!entry) return true;
        return entry.stato === "disponibile";
      }),
    }))
    .filter((group) => group.items.length > 0);

  const hasMenuFissi = menuFissi.length > 0;
  const hasGroups = groupsVisibili.length > 0;

  if (!hasMenuFissi && !hasGroups) return null;

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

        {/* Gruppi di item: piatti, vini, bevande, birre, liquori */}
        {hasGroups && (
          <div className={["space-y-8", hasMenuFissi ? "mt-6" : ""].filter(Boolean).join(" ")}>
            {groupsVisibili.map((group, idx) => (
              <div key={group.title ?? `group-${idx}`}>
                {group.title && (
                  <div className="sticky top-14 z-10 -mx-4 px-4 py-2 mb-4 bg-background/90 backdrop-blur-sm border-b border-border/40">
                    <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                      {group.title}
                    </h3>
                  </div>
                )}
                <div className="flex flex-col">
                  {group.items.map((item) => (
                    <DishCard key={`${item._type}-${item.id}`} item={item} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Container>
    </section>
  );
}
