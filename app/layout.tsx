import type { Metadata } from "next";
import { dmSans, philosopher } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vietnamonamour — Menu",
  description: "Scopri il nostro menu: cucina vietnamita autentica a Roma.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body
        className={`${philosopher.variable} ${dmSans.variable} bg-background text-text-main antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
