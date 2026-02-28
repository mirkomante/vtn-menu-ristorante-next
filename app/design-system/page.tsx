/**
 * Pagina di preview del Design System — solo per sviluppo.
 * Accessibile a /design-system.
 * Mostra palette, tipografia, bottoni e badge del tema "Warm & Elegant".
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
  id: "cat-1",
  nome: "Antipasti",
  slug: "antipasti",
  descrizione: "Piccoli assaggi per iniziare il pasto nel segno della freschezza.",
  attiva: true,
  createdAt: "",
  updatedAt: "",
};

const DUMMY_PIATTI: Piatto[] = [
  {
    id: "piatto-1",
    nome: "Phở Bò",
    slug: "pho-bo",
    tipo: "cibo",
    descrizione:
      "Zuppa tradizionale di manzo con noodles di riso, erbe aromatiche e spezie (anice stellato, cannella, cardamomo).",
    prezzo: 14,
    categoria: "cat-1",
    allergeni: [{ id: "a1", nome: "Glutine", createdAt: "", updatedAt: "" }],
    tag: ["chef consiglia"],
    attivo: true,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "piatto-2",
    nome: "Gỏi Cuốn",
    slug: "goi-cuon",
    tipo: "cibo",
    descrizione:
      "Involtini freschi in carta di riso con gamberi, maiale, vermicelli e erbe. Serviti con salsa di arachidi.",
    prezzo: 8,
    prezzoAlternativo: 14,
    etichettaPrezzoAlternativo: "2 pz",
    categoria: "cat-1",
    allergeni: [
      { id: "a2", nome: "Arachidi", createdAt: "", updatedAt: "" },
      { id: "a3", nome: "Crostacei", createdAt: "", updatedAt: "" },
    ],
    tag: ["vegano"],
    attivo: true,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "piatto-3",
    nome: "Chả Giò",
    slug: "cha-gio",
    tipo: "cibo",
    descrizione:
      "Involtini croccanti fritti ripieni di maiale, funghi e vermicelli. Serviti con salsa nước chấm.",
    prezzo: 9,
    categoria: "cat-1",
    allergeni: [{ id: "a1", nome: "Glutine", createdAt: "", updatedAt: "" }],
    tag: ["piccante"],
    attivo: true,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "piatto-4",
    nome: "Bún Bò Huế",
    slug: "bun-bo-hue",
    tipo: "cibo",
    descrizione:
      "Zuppa speziata di manzo e maiale con noodles di riso spessi, tipica di Huế.",
    prezzo: 15,
    categoria: "cat-1",
    attivo: true,
    createdAt: "",
    updatedAt: "",
  },
];

const DUMMY_AVAILABILITY = {
  aggiornatoAl: new Date().toISOString(),
  piatti: {
    "piatto-3": { id: "piatto-3", stato: "esaurito" as const },
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
            <Badge variant="outline">h3 bordeaux</Badge>
            <Heading level={3} color="bordeaux">
              Sezione Speciale
            </Heading>
          </div>
        </div>

        {/* Text — DM Sans su sfondo crema (bg-background, senza card) */}
        <div className="mb-2 flex items-center gap-2">
          <Badge variant="gold">su bg-background</Badge>
          <Text variant="caption" muted className="font-medium">
            testo direttamente sul crema, senza card
          </Text>
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
        </div>

        {/* Text — DM Sans su bg-surface (card bianca) */}
        <div className="mb-2 flex items-center gap-2">
          <Badge variant="outline">su bg-surface</Badge>
          <Text variant="caption" muted className="font-medium">
            stessa tipografia su card bianca
          </Text>
        </div>
        <div className="flex flex-col gap-4 rounded-md border border-text-main/10 bg-surface p-6">
          <div className="flex items-start gap-3">
            <Badge variant="outline" className="mt-1 shrink-0">
              lead
            </Badge>
            <Text variant="lead">
              Zuppa tradizionale vietnamita con brodo di manzo cotto 12 ore,
              noodles di riso, fettine di manzo e spezie aromatiche.
            </Text>
          </div>
          <div className="flex items-start gap-3">
            <Badge variant="outline" className="mt-0.5 shrink-0">
              body
            </Badge>
            <Text variant="body">
              Servito con germogli di soia freschi, foglie di basilico thai,
              lime e peperoncino. Personalizzabile su richiesta.
            </Text>
          </div>
          <div className="flex items-start gap-3">
            <Badge variant="outline" className="mt-0.5 shrink-0">
              body muted
            </Badge>
            <Text variant="body" muted>
              Contiene: glutine, soia. Può contenere tracce di arachidi.
            </Text>
          </div>
          <div className="flex items-start gap-3">
            <Badge variant="outline" className="mt-0.5 shrink-0">
              small
            </Badge>
            <Text variant="small" className="font-medium">
              Disponibile a pranzo e cena. Porzione singola.
            </Text>
          </div>
          <div className="flex items-start gap-3">
            <Badge variant="outline" className="mt-0.5 shrink-0">
              caption
            </Badge>
            <Text variant="caption" muted className="font-medium">
              * I prezzi includono IVA. Informare il personale di eventuali
              allergie.
            </Text>
          </div>
          {/* Prezzo con accent-gold */}
          <div className="flex items-start gap-3">
            <Badge variant="outline" className="mt-0.5 shrink-0">
              prezzo
            </Badge>
            <Text variant="body" className="font-medium text-accent-gold">
              € 14,00
            </Text>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* SEZIONE BOTTONI                                                     */}
        {/* ------------------------------------------------------------------ */}
        <SectionDivider title="Bottoni" />

        {/* Varianti */}
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

        {/* Bottoni su sfondo scuro */}
        <div className="flex flex-wrap items-center gap-4 rounded-md bg-surface-dark p-6">
          <Text variant="small" className="w-full font-medium text-text-light">
            Su sfondo scuro (surface-dark) — usa text-light o accent-gold, mai text-main:
          </Text>
          {/* Gold su scuro: massimo contrasto, CTA principale */}
          <button className="inline-flex items-center justify-center rounded-md bg-accent-gold px-5 py-1.5 font-sans text-base font-medium text-text-main transition-colors hover:bg-accent-gold/90">
            Prenota un tavolo
          </button>
          {/* Outline crema su scuro: azione secondaria */}
          <button className="inline-flex items-center justify-center rounded-md border border-text-light px-5 py-1.5 font-sans text-base font-medium text-text-light transition-colors hover:bg-text-light/10">
            Scopri il menu
          </button>
          {/* Ghost crema su scuro: azione terziaria/link */}
          <button className="inline-flex items-center justify-center rounded-md px-5 py-1.5 font-sans text-base font-medium text-text-light transition-colors hover:bg-text-light/10">
            Torna su
          </button>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* SEZIONE BADGE                                                       */}
        {/* ------------------------------------------------------------------ */}
        <SectionDivider title="Badge" />

        <div className="flex flex-col gap-6">
          {/* Varianti */}
          <div className="flex flex-wrap gap-3">
            <Badge variant="default">Vegano</Badge>
            <Badge variant="default">Piccante</Badge>
            <Badge variant="default">Senza glutine</Badge>
            <Badge variant="highlight">Chef consiglia</Badge>
            <Badge variant="highlight">Novità</Badge>
            <Badge variant="highlight">Esaurito</Badge>
            <Badge variant="gold">Signature</Badge>
            <Badge variant="gold">Stagionale</Badge>
            <Badge variant="outline">Contiene glutine</Badge>
            <Badge variant="outline">Contiene lattosio</Badge>
          </div>

          {/* Esempio contestuale: card piatto */}
          <div className="rounded-md border border-text-main/10 bg-surface p-5">
            <div className="mb-1 flex items-start justify-between gap-4">
              <Heading level={3}>Phở Bò Đặc Biệt</Heading>
              <Text variant="body" className="shrink-0 font-semibold text-accent-gold">
                € 16,00
              </Text>
            </div>
            <Text variant="body" muted className="mb-3">
              Versione speciale con filetto di manzo, tendine e polpette.
              Brodo di manzo cotto 24 ore.
            </Text>
            <div className="flex flex-wrap gap-2">
              <Badge variant="highlight">Chef consiglia</Badge>
              <Badge variant="gold">Signature</Badge>
              <Badge variant="outline">Contiene glutine</Badge>
              <Badge variant="default">Piccante</Badge>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* SEZIONE MENU EXAMPLE                                               */}
        {/* ------------------------------------------------------------------ */}
        <SectionDivider title="Menu Example (Test Leggibilità)" />

        <Text variant="body" muted className="mb-8">
          Confronto tra due stili di presentazione dei piatti sullo stesso
          sfondo crema. Valuta quale risulta più leggibile e coerente col brand.
        </Text>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">

          {/* ---- Colonna 1: Stile Card ---- */}
          <div>
            <div className="mb-4 flex items-center gap-2">
              <Badge variant="default">Stile A</Badge>
              <Text variant="small" className="font-medium">Card su crema</Text>
            </div>
            <div className="flex flex-col gap-3">

              <div className="rounded-md bg-surface p-4 shadow-sm">
                <div className="mb-1 flex items-start justify-between gap-4">
                  <Heading level={3}>Phở Bò</Heading>
                  <Text variant="body" className="shrink-0 font-semibold text-accent-gold">
                    € 14
                  </Text>
                </div>
                <Text variant="body" muted>
                  Zuppa tradizionale di manzo con noodles di riso, erbe
                  aromatiche e spezie (anice stellato, cannella, cardamomo).
                </Text>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge variant="outline">Contiene glutine</Badge>
                  <Badge variant="default">Piccante</Badge>
                </div>
              </div>

              <div className="rounded-md bg-surface p-4 shadow-sm">
                <div className="mb-1 flex items-start justify-between gap-4">
                  <Heading level={3}>Gỏi Cuốn</Heading>
                  <Text variant="body" className="shrink-0 font-semibold text-accent-gold">
                    € 8
                  </Text>
                </div>
                <Text variant="body" muted>
                  Involtini freschi in carta di riso con gamberi, maiale,
                  vermicelli e erbe. Serviti con salsa di arachidi.
                </Text>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge variant="highlight">Chef consiglia</Badge>
                  <Badge variant="outline">Contiene arachidi</Badge>
                </div>
              </div>

            </div>
          </div>

          {/* ---- Colonna 2: Stile Minimal — 3 varianti separatore ---- */}
          <div className="flex flex-col gap-8">

            {/* Variante B1 — Oro (originale, poco visibile) */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Badge variant="outline">B1</Badge>
                <Text variant="small" className="font-medium">
                  Oro 20% — <span className="text-text-muted font-normal">border-accent-gold/20</span>
                </Text>
              </div>
              <div className="flex flex-col">
                <div className="border-b border-accent-gold/20 py-3 first:pt-0">
                  <div className="flex items-start justify-between gap-4">
                    <Heading level={3}>Phở Bò</Heading>
                    <Text variant="body" className="shrink-0 font-semibold text-accent-gold">€ 14</Text>
                  </div>
                  <Text variant="body" muted>Zuppa tradizionale di manzo con noodles di riso, erbe aromatiche e spezie.</Text>
                </div>
                <div className="border-b border-accent-gold/20 py-3">
                  <div className="flex items-start justify-between gap-4">
                    <Heading level={3}>Gỏi Cuốn</Heading>
                    <Text variant="body" className="shrink-0 font-semibold text-accent-gold">€ 8</Text>
                  </div>
                  <Text variant="body" muted>Involtini freschi in carta di riso con gamberi, maiale e erbe.</Text>
                </div>
              </div>
            </div>

            {/* Variante B2 — Bordeaux 20% */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Badge variant="default">B2</Badge>
                <Text variant="small" className="font-medium">
                  Bordeaux 20% — <span className="text-text-muted font-normal">border-surface-dark/20</span>
                </Text>
              </div>
              <div className="flex flex-col">
                <div className="border-b border-surface-dark/20 py-3 first:pt-0">
                  <div className="flex items-start justify-between gap-4">
                    <Heading level={3}>Phở Bò</Heading>
                    <Text variant="body" className="shrink-0 font-semibold text-accent-gold">€ 14</Text>
                  </div>
                  <Text variant="body" muted>Zuppa tradizionale di manzo con noodles di riso, erbe aromatiche e spezie.</Text>
                </div>
                <div className="border-b border-surface-dark/20 py-3">
                  <div className="flex items-start justify-between gap-4">
                    <Heading level={3}>Gỏi Cuốn</Heading>
                    <Text variant="body" className="shrink-0 font-semibold text-accent-gold">€ 8</Text>
                  </div>
                  <Text variant="body" muted>Involtini freschi in carta di riso con gamberi, maiale e erbe.</Text>
                </div>
              </div>
            </div>

            {/* Variante B3 — Arancio 30%, 2px */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Badge variant="highlight">B3</Badge>
                <Text variant="small" className="font-medium">
                  Arancio 30% 2px — <span className="text-text-muted font-normal">border-b-2 border-accent-orange/30</span>
                </Text>
              </div>
              <div className="flex flex-col">
                <div className="border-b-2 border-accent-orange/30 py-3 first:pt-0">
                  <div className="flex items-start justify-between gap-4">
                    <Heading level={3}>Phở Bò</Heading>
                    <Text variant="body" className="shrink-0 font-semibold text-accent-gold">€ 14</Text>
                  </div>
                  <Text variant="body" muted>Zuppa tradizionale di manzo con noodles di riso, erbe aromatiche e spezie.</Text>
                </div>
                <div className="border-b-2 border-accent-orange/30 py-3">
                  <div className="flex items-start justify-between gap-4">
                    <Heading level={3}>Gỏi Cuốn</Heading>
                    <Text variant="body" className="shrink-0 font-semibold text-accent-gold">€ 8</Text>
                  </div>
                  <Text variant="body" muted>Involtini freschi in carta di riso con gamberi, maiale e erbe.</Text>
                </div>
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
          Verifica DishCard (disponibile / esaurito) e MenuSection.
        </Text>

        {/* DishCard — singole */}
        <Heading level={3} className="mb-4">
          DishCard — varianti
        </Heading>

        <div className="mb-10">
          <DishCard piatto={DUMMY_PIATTI[0]} isAvailable={true} />
          <DishCard piatto={DUMMY_PIATTI[1]} isAvailable={true} />
          <DishCard piatto={DUMMY_PIATTI[2]} isAvailable={false} />
          <DishCard piatto={DUMMY_PIATTI[3]} isAvailable={true} />
        </div>

        {/* MenuSection completa */}
        <Heading level={3} className="mb-4">
          MenuSection — sezione completa
        </Heading>

        <div className="rounded-md border border-text-main/10 bg-background p-6">
          <MenuSection
            categoria={DUMMY_CATEGORIA}
            piatti={DUMMY_PIATTI}
            availability={DUMMY_AVAILABILITY}
          />
        </div>

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
