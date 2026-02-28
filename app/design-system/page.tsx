/**
 * Pagina di preview del Design System — solo per sviluppo.
 * Accessibile a /design-system.
 *
 * REGOLA: questa pagina mostra SOLO pattern approvati.
 * Nessun esempio di codice "scartato" o "da evitare" nel markup —
 * solo la sezione "Contrasto" mostra esplicitamente cosa NON fare.
 */

import { Badge, Button, Container, Heading, Text } from "@/components/ui";
import { DishCard, MenuSection } from "@/components/menu";
import type { CategoriaMenu, Piatto } from "@/types";

// ---------------------------------------------------------------------------
// Dati palette
// ---------------------------------------------------------------------------

const palette = [
  {
    name: "background",
    label: "Background",
    hex: "#FFEDD7",
    bg: "bg-background",
    border: true,
    textDark: true,
  },
  {
    name: "surface",
    label: "Surface",
    hex: "#FFFFFF",
    bg: "bg-surface",
    border: true,
    textDark: true,
  },
  {
    name: "surface-dark",
    label: "Surface Dark",
    hex: "#460112",
    bg: "bg-surface-dark",
    border: false,
    textDark: false,
  },
  {
    name: "text-main",
    label: "Text Main",
    hex: "#080F2C",
    bg: "bg-text-main",
    border: false,
    textDark: false,
  },
  {
    name: "text-light",
    label: "Text Light",
    hex: "#FFEDD7",
    bg: "bg-text-light",
    border: true,
    textDark: true,
  },
  {
    name: "text-muted",
    label: "Text Muted",
    hex: "rgba(8,15,44,.7)",
    bg: "bg-text-muted",
    border: false,
    textDark: false,
  },
  {
    name: "accent-gold",
    label: "Accent Gold",
    hex: "#F8B624",
    bg: "bg-accent-gold",
    border: false,
    textDark: true,
  },
  {
    name: "accent-orange",
    label: "Accent Orange",
    hex: "#EF5808",
    bg: "bg-accent-orange",
    border: false,
    textDark: false,
  },
];

// ---------------------------------------------------------------------------
// Dati dummy per test componenti di dominio
// ---------------------------------------------------------------------------

const DUMMY_CATEGORIA: CategoriaMenu = {
  id: 1,
  nome: "Antipasti",
  slug: "antipasti",
  descrizione: "Piccoli assaggi per iniziare il pasto nel segno della freschezza.",
  attiva: true,
  createdAt: "",
  updatedAt: "",
};

const DUMMY_PIATTI: Piatto[] = [
  {
    id: 1,
    nome: "Phở Bò",
    slug: "pho-bo",
    descrizione:
      "Zuppa tradizionale di manzo con noodles di riso, erbe aromatiche e spezie (anice stellato, cannella, cardamomo).",
    prezzo: 14,
    categoria: 1,
    allergeni: [{ id: 1, nome: "Glutine", createdAt: "", updatedAt: "" }],
    inLista: true,
    soloMenuFissi: false,
    glutenFree: false,
    noUovo: false,
    noLatticini: false,
    vegan: false,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: 2,
    nome: "Gỏi Cuốn",
    slug: "goi-cuon",
    descrizione:
      "Involtini freschi in carta di riso con gamberi, maiale, vermicelli e erbe. Serviti con salsa di arachidi.",
    prezzo: 8,
    prezzoAlternativo: 14,
    etichettaPrezzoAlternativo: "2 pz",
    categoria: 1,
    allergeni: [
      { id: 2, nome: "Arachidi", createdAt: "", updatedAt: "" },
      { id: 3, nome: "Crostacei", createdAt: "", updatedAt: "" },
    ],
    inLista: true,
    soloMenuFissi: false,
    glutenFree: false,
    noUovo: true,
    noLatticini: true,
    vegan: true,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: 3,
    nome: "Chả Giò",
    slug: "cha-gio",
    descrizione:
      "Involtini croccanti fritti ripieni di maiale, funghi e vermicelli. Serviti con salsa nước chấm.",
    prezzo: 9,
    categoria: 1,
    allergeni: [{ id: 1, nome: "Glutine", createdAt: "", updatedAt: "" }],
    inLista: true,
    soloMenuFissi: false,
    glutenFree: false,
    noUovo: false,
    noLatticini: false,
    vegan: false,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: 4,
    nome: "Bún Bò Huế",
    slug: "bun-bo-hue",
    descrizione:
      "Zuppa speziata di manzo e maiale con noodles di riso spessi, tipica di Huế.",
    prezzo: 15,
    categoria: 1,
    inLista: true,
    soloMenuFissi: false,
    glutenFree: true,
    noUovo: false,
    noLatticini: false,
    vegan: false,
    createdAt: "",
    updatedAt: "",
  },
];

const DUMMY_AVAILABILITY = {
  aggiornatoAl: new Date().toISOString(),
  piatti: {
    3: { id: 3, stato: "esaurito" as const },
  },
  vini: {},
};

// ---------------------------------------------------------------------------
// Componenti di sezione
// ---------------------------------------------------------------------------

function SectionDivider({ title }: { title: string }) {
  return (
    <div className="border-t border-text-main/10 pt-10">
      <Heading level={2} className="mb-8">
        {title}
      </Heading>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pagina
// ---------------------------------------------------------------------------

export default function DesignSystemPage() {
  return (
    <main className="min-h-screen bg-background py-12">
      <Container>
        {/* Header */}
        <div className="mb-12">
          <Heading level={1}>Design System</Heading>
          <Text variant="lead" muted className="mt-2">
            Vietnamonamour — tema "Warm &amp; Elegant"
          </Text>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* SEZIONE COLORI                                                      */}
        {/* ------------------------------------------------------------------ */}
        <SectionDivider title="Palette Colori" />

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {palette.map((color) => (
            <div key={color.name} className="flex flex-col gap-2">
              <div
                className={[
                  color.bg,
                  "h-20 w-full rounded-md",
                  color.border ? "border border-text-main/15" : "",
                ].join(" ")}
              />
              <div>
                <Text variant="small" className="font-medium">
                  {color.label}
                </Text>
                <Text variant="caption" muted>
                  {color.hex}
                </Text>
                <Text variant="caption" muted>
                  bg-{color.name}
                </Text>
              </div>
            </div>
          ))}
        </div>

        {/* Regole di contrasto */}
        <div className="mt-8 flex flex-col gap-3">
          <Heading level={3} className="mb-2">
            Regole di Contrasto
          </Heading>

          {/* ✅ Combinazioni consentite */}
          <Text variant="small" className="font-semibold uppercase tracking-widest text-text-muted">
            ✅ Consentite
          </Text>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 rounded-md bg-background px-4 py-2 border border-text-main/10">
              <span className="text-sm font-medium text-text-main">text-main</span>
              <span className="text-xs text-text-muted">su bg-background</span>
            </div>
            <div className="flex items-center gap-2 rounded-md bg-background px-4 py-2 border border-text-main/10">
              <span className="text-sm font-medium text-surface-dark">text-surface-dark</span>
              <span className="text-xs text-text-muted">su bg-background (titoli)</span>
            </div>
            <div className="flex items-center gap-2 rounded-md bg-surface px-4 py-2 border border-text-main/10">
              <span className="text-sm font-medium text-text-main">text-main</span>
              <span className="text-xs text-text-muted">su bg-surface</span>
            </div>
            <div className="flex items-center gap-2 rounded-md bg-text-main px-4 py-2">
              <span className="text-sm font-medium text-text-light">text-light</span>
              <span className="text-xs text-text-light/60">su bg-text-main ✓ (footer/navbar)</span>
            </div>
            <div className="flex items-center gap-2 rounded-md bg-text-main px-4 py-2">
              <span className="text-sm font-medium text-accent-gold">accent-gold</span>
              <span className="text-xs text-text-light/60">su bg-text-main ✓</span>
            </div>
          </div>

          {/* ❌ Combinazioni vietate */}
          <Text variant="small" className="mt-2 font-semibold uppercase tracking-widest text-text-muted">
            ❌ Vietate — non copiare questo codice
          </Text>
          <div className="flex flex-wrap gap-3">
            <div className="relative flex items-center gap-2 rounded-md bg-text-main px-4 py-2 ring-2 ring-accent-orange">
              <span className="text-sm font-medium text-text-main line-through opacity-50">
                text-main
              </span>
              <span className="text-xs font-semibold text-accent-orange">su bg-text-main — VIETATO</span>
            </div>
            <div className="relative flex items-center gap-2 rounded-md bg-surface-dark px-4 py-2 ring-2 ring-accent-orange">
              <span className="text-sm font-medium text-text-main line-through opacity-50">
                text-main
              </span>
              <span className="text-xs font-semibold text-accent-orange">su bg-surface-dark — VIETATO</span>
            </div>
          </div>
          <Text variant="caption" className="font-medium text-accent-orange">
            ⚠ Sfondo scuro → testo SEMPRE chiaro (text-light o accent-gold).
            Sfondo chiaro → testo SEMPRE scuro (text-main, text-muted, text-surface-dark).
            surface-dark è riservato a footer e navbar sticky — mai per header o contenuto.
          </Text>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* SEZIONE TIPOGRAFIA                                                  */}
        {/* ------------------------------------------------------------------ */}
        <SectionDivider title="Tipografia" />

        {/* Heading — Philosopher */}
        <div className="mb-8 flex flex-col gap-4">
          <div className="flex items-baseline gap-3">
            <Badge variant="outline">h1</Badge>
            <Heading level={1}>Phở Bò</Heading>
          </div>
          <div className="flex items-baseline gap-3">
            <Badge variant="outline">h2</Badge>
            <Heading level={2}>Antipasti Vietnamiti</Heading>
          </div>
          <div className="flex items-baseline gap-3">
            <Badge variant="outline">h3</Badge>
            <Heading level={3}>Gỏi Cuốn — Involtini Freschi</Heading>
          </div>
          <div className="flex items-baseline gap-3">
            <Badge variant="outline">h4</Badge>
            <Heading level={4}>Ingredienti e Allergeni</Heading>
          </div>
          <div className="flex items-baseline gap-3">
            <Badge variant="outline">h2 bordeaux</Badge>
            <Heading level={2} color="bordeaux">
              Antipasti
            </Heading>
          </div>
        </div>

        {/* Text — DM Sans su bg-background (unico sfondo consentito per il menu) */}
        <div className="mb-2 flex items-center gap-2">
          <Badge variant="gold">su bg-background — stile approvato</Badge>
        </div>
        <div className="mb-6 flex flex-col gap-3 px-1">
          <Text variant="lead">
            Zuppa tradizionale vietnamita con brodo di manzo cotto 12 ore,
            noodles di riso, fettine di manzo e spezie aromatiche.
          </Text>
          <Text variant="body">
            Servito con germogli di soia freschi, foglie di basilico thai,
            lime e peperoncino. Personalizzabile su richiesta.
          </Text>
          <Text variant="body" muted>
            Contiene: glutine, soia. Può contenere tracce di arachidi.
          </Text>
          <Text variant="body" className="font-semibold text-accent-gold">
            € 14,00
          </Text>
          <Text variant="small" muted>
            Disponibile a pranzo e cena. Porzione singola.
          </Text>
          <Text variant="caption" muted>
            * I prezzi includono IVA. Informare il personale di eventuali allergie.
          </Text>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* SEZIONE BOTTONI                                                     */}
        {/* ------------------------------------------------------------------ */}
        <SectionDivider title="Bottoni" />

        {/* Varianti su sfondo crema (uso standard) */}
        <div className="mb-6 flex flex-col gap-6">
          {(["primary", "outline", "ghost"] as const).map((variant) => (
            <div key={variant} className="flex flex-wrap items-center gap-4">
              <Badge variant="outline" className="w-20 justify-center">
                {variant}
              </Badge>
              <Button variant={variant} size="sm">
                Piccolo
              </Button>
              <Button variant={variant} size="md">
                Medio
              </Button>
              <Button variant={variant} size="lg">
                Grande
              </Button>
              <Button variant={variant} disabled>
                Disabilitato
              </Button>
              <Button variant={variant} loading>
                Caricamento
              </Button>
            </div>
          ))}
        </div>

        {/* Bottoni su sfondo scuro — footer/navbar usa bg-text-main (Blu Notte) */}
        <div className="flex flex-wrap items-center gap-4 rounded-md bg-text-main p-6">
          <p className="w-full font-sans text-sm font-medium text-text-light">
            Su sfondo scuro (footer/navbar — bg-text-main) — testo SEMPRE text-light o accent-gold:
          </p>
          <button className="inline-flex items-center justify-center rounded-md bg-accent-gold px-5 py-1.5 font-sans text-base font-medium text-text-main transition-colors hover:bg-accent-gold/90">
            Prenota un tavolo
          </button>
          <button className="inline-flex items-center justify-center rounded-md border border-text-light px-5 py-1.5 font-sans text-base font-medium text-text-light transition-colors hover:bg-text-light/10">
            Scopri il menu
          </button>
          <button className="inline-flex items-center justify-center rounded-md px-5 py-1.5 font-sans text-base font-medium text-text-light transition-colors hover:bg-text-light/10">
            Torna su
          </button>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* SEZIONE BADGE                                                       */}
        {/* ------------------------------------------------------------------ */}
        <SectionDivider title="Badge" />

        <div className="flex flex-col gap-6">
          {/* Tutte le varianti */}
          <div>
            <Text variant="small" muted className="mb-3 font-medium">
              Varianti disponibili
            </Text>
            <div className="flex flex-wrap gap-3">
              <Badge variant="default">Tag neutro</Badge>
              <Badge variant="default">Piccante</Badge>
              <Badge variant="highlight">Vegan</Badge>
              <Badge variant="highlight">Gluten Free</Badge>
              <Badge variant="highlight">Chef consiglia</Badge>
              <Badge variant="gold">Signature</Badge>
              <Badge variant="gold">Stagionale</Badge>
              <Badge variant="outline">Tag outline</Badge>
              <Badge variant="allergen">Contiene glutine</Badge>
              <Badge variant="allergen">Contiene arachidi</Badge>
            </div>
          </div>

          {/* Regola semantica */}
          <div className="rounded-md border border-text-main/10 bg-surface p-4">
            <Text variant="small" className="mb-2 font-semibold text-text-main">
              Regola semantica badge:
            </Text>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <Badge variant="allergen">Contiene glutine</Badge>
                <Text variant="caption" muted>→ <code>allergen</code> — SOLO per allergeni (avvisi)</Text>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="highlight">Vegan</Badge>
                <Text variant="caption" muted>→ <code>highlight</code> — vantaggi dietetici e tag promozionali</Text>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default">Piccante</Badge>
                <Text variant="caption" muted>→ <code>default</code> — tag informativi neutri</Text>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="gold">Signature</Badge>
                <Text variant="caption" muted>→ <code>gold</code> — badge premium/speciali</Text>
              </div>
            </div>
          </div>

          {/* Esempio contestuale: piatto con badge — stile Minimal B2 */}
          <div>
            <Text variant="small" muted className="mb-3 font-medium">
              Badge in contesto (stile Minimal B2 approvato)
            </Text>
            <div className="border-b border-surface-dark/20 py-5">
              <div className="flex items-start justify-between gap-4">
                <Heading level={3}>Phở Bò Đặc Biệt</Heading>
                <Text variant="body" as="span" className="shrink-0 font-bold text-accent-gold">
                  € 16,00
                </Text>
              </div>
              <Text variant="body" muted className="mt-1.5">
                Versione speciale con filetto di manzo, tendine e polpette.
                Brodo di manzo cotto 24 ore.
              </Text>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge variant="highlight">Chef consiglia</Badge>
                <Badge variant="gold">Signature</Badge>
                <Badge variant="allergen">Contiene glutine</Badge>
              </div>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* SEZIONE MENU EXAMPLE — SOLO STILE APPROVATO                        */}
        {/* ------------------------------------------------------------------ */}
        <SectionDivider title="Stile Lista Piatti — Minimal B2 (approvato)" />

        <Text variant="body" muted className="mb-2">
          Unico stile approvato per la lista piatti: nessun sfondo, separatore bordeaux 20% 1px.
        </Text>
        <Text variant="caption" className="mb-8 font-medium text-accent-orange">
          ⚠ Non usare card bianche (bg-surface) né bordi arancioni spessi (border-b-2 border-accent-orange).
        </Text>

        {/* Stile Minimal B2 — l'unico approvato */}
        <div className="max-w-2xl">
          <div className="mb-3 flex items-center gap-2">
            <Badge variant="highlight">✓ Approvato</Badge>
            <Text variant="small" className="font-medium">
              Minimal B2 —{" "}
              <code className="rounded bg-text-main/8 px-1 py-0.5 text-xs">
                border-b border-surface-dark/20
              </code>
            </Text>
          </div>

          <div className="flex flex-col">
            {/* Piatto 1 — con allergene */}
            <div className="border-b border-surface-dark/20 py-5">
              <div className="flex items-start justify-between gap-4">
                <Heading level={3}>Phở Bò</Heading>
                <Text variant="body" as="span" className="shrink-0 font-bold text-accent-gold">
                  € 14,00
                </Text>
              </div>
              <Text variant="body" muted className="mt-1.5">
                Zuppa tradizionale di manzo con noodles di riso, erbe aromatiche e spezie.
              </Text>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge variant="allergen">Contiene glutine</Badge>
              </div>
            </div>

            {/* Piatto 2 — con prezzo alternativo e badge dietetici */}
            <div className="border-b border-surface-dark/20 py-5">
              <div className="flex items-start justify-between gap-4">
                <Heading level={3}>Gỏi Cuốn</Heading>
                <div className="flex shrink-0 flex-col items-end gap-0.5">
                  <Text variant="body" as="span" className="font-bold text-accent-gold">
                    € 8,00
                  </Text>
                  <Text variant="caption" as="span" muted className="font-medium">
                    2 pz € 14,00
                  </Text>
                </div>
              </div>
              <Text variant="body" muted className="mt-1.5">
                Involtini freschi in carta di riso con gamberi, maiale e erbe.
              </Text>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge variant="highlight">Vegan</Badge>
                <Badge variant="highlight">No Latticini</Badge>
                <Badge variant="allergen">Contiene arachidi</Badge>
                <Badge variant="allergen">Contiene crostacei</Badge>
              </div>
            </div>

            {/* Piatto 3 — solo prezzo, gluten free */}
            <div className="border-b border-surface-dark/20 py-5">
              <div className="flex items-start justify-between gap-4">
                <Heading level={3}>Bún Bò Huế</Heading>
                <Text variant="body" as="span" className="shrink-0 font-bold text-accent-gold">
                  € 15,00
                </Text>
              </div>
              <Text variant="body" muted className="mt-1.5">
                Zuppa speziata di manzo e maiale con noodles di riso spessi, tipica di Huế.
              </Text>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge variant="highlight">Gluten Free</Badge>
              </div>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* SEZIONE COMPONENTI DI DOMINIO                                      */}
        {/* ------------------------------------------------------------------ */}
        <SectionDivider title="Componenti di Dominio (Dati Reali)" />

        <Text variant="body" muted className="mb-8">
          Test con dati dummy che simulano la struttura reale di PayloadCMS.
          Chả Giò (id 3) è marcato esaurito → non viene renderizzato.
        </Text>

        {/* DishCard — singole */}
        <Heading level={3} className="mb-4">
          DishCard — singole
        </Heading>

        <div className="mb-10">
          <DishCard piatto={DUMMY_PIATTI[0]} />
          <DishCard piatto={DUMMY_PIATTI[1]} />
          <DishCard piatto={DUMMY_PIATTI[3]} />
        </div>

        {/* MenuSection — layout aperto, nessun bordo esterno */}
        <Heading level={3} className="mb-4">
          MenuSection — sezione completa (Chả Giò esaurito → nascosto)
        </Heading>

        <MenuSection
          categoria={DUMMY_CATEGORIA}
          piatti={DUMMY_PIATTI}
          availability={DUMMY_AVAILABILITY}
        />

        {/* Footer pagina */}
        <div className="mt-16 border-t border-text-main/10 py-8 text-center">
          <Text variant="caption" muted>
            Questa pagina è solo per sviluppo — non inclusa nel bundle di
            produzione finale.
          </Text>
        </div>
      </Container>
    </main>
  );
}
