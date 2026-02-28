/**
 * Container — Atomo UI per il layout
 *
 * Wrapper centrato con larghezza massima ottimizzata per la leggibilità del menu.
 * Usa max-w-4xl (896px) per mantenere le righe di testo a lunghezza confortevole.
 *
 * Varianti di padding:
 * - default: px-4 (mobile) → px-6 (tablet) → px-8 (desktop)
 * - tight:   px-4 fisso (per sezioni a piena larghezza con sfondo)
 * - none:    nessun padding orizzontale (gestito dal figlio)
 */

import type { HTMLAttributes } from "react";

type ContainerPadding = "default" | "tight" | "none";

export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  padding?: ContainerPadding;
  as?: "div" | "section" | "main" | "article" | "header" | "footer" | "nav";
}

const paddingClasses: Record<ContainerPadding, string> = {
  default: "px-4 sm:px-6 lg:px-8",
  tight: "px-4",
  none: "",
};

export function Container({
  padding = "default",
  as: Tag = "div",
  className = "",
  children,
  ...props
}: ContainerProps) {
  return (
    <Tag
      className={[
        "mx-auto w-full max-w-4xl",
        paddingClasses[padding],
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </Tag>
  );
}
