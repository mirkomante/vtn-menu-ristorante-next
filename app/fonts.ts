/**
 * Configurazione font Google per il brand "Vietnamonamour".
 *
 * - Philosopher: titoli, nomi piatti, heading (serif elegante)
 * - DM Sans: testi correnti, descrizioni, prezzi (sans-serif leggibile)
 *
 * Le variabili CSS vengono applicate nel RootLayout e referenziate
 * da Tailwind via fontFamily.serif e fontFamily.sans.
 */

import { DM_Sans, Philosopher } from "next/font/google";

export const philosopher = Philosopher({
  variable: "--font-philosopher",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "700"],
});

export const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
  // Carica tutti i pesi utili per il design system
  weight: ["300", "400", "500", "600", "700"],
});
