/**
 * Typography — Atomi UI per testi
 *
 * Heading:
 *   - Font Philosopher (serif elegante)
 *   - Livelli h1–h4 con scala tipografica coerente
 *   - Colore: text-main (default) o surface-dark (Bordeaux, per sezioni scure)
 *
 * Text:
 *   - Font DM Sans (sans-serif leggibile)
 *   - Varianti: body (default), lead, small, caption
 *   - Colore: text-main (default) o text-muted (descrizioni secondarie)
 *
 * Uso consigliato:
 *   - Nomi piatti → <Heading level={3}>
 *   - Descrizioni piatti → <Text variant="body" muted>
 *   - Prezzi → <Text variant="body"> con classe text-accent-gold
 *   - Titoli sezione → <Heading level={2}>
 */

import React from "react";
import type { HTMLAttributes } from "react";

// ---------------------------------------------------------------------------
// Heading
// ---------------------------------------------------------------------------

type HeadingLevel = 1 | 2 | 3 | 4;
type HeadingColor = "default" | "bordeaux";

export interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  level?: HeadingLevel;
  color?: HeadingColor;
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span";
}

const headingSizeClasses: Record<HeadingLevel, string> = {
  1: "text-4xl md:text-5xl leading-tight tracking-tight",
  2: "text-3xl md:text-4xl leading-snug tracking-tight",
  3: "text-xl md:text-2xl leading-snug",
  4: "text-lg md:text-xl leading-normal",
};

const headingColorClasses: Record<HeadingColor, string> = {
  default: "text-text-main",
  bordeaux: "text-surface-dark",
};

export function Heading({
  level = 2,
  color = "default",
  as,
  className = "",
  children,
  ...props
}: HeadingProps) {
  const Tag = as ?? (`h${level}` as "h1" | "h2" | "h3" | "h4");

  return (
    <Tag
      className={[
        "font-serif font-bold",
        headingSizeClasses[level],
        headingColorClasses[color],
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </Tag>
  );
}

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

type TextVariant = "lead" | "body" | "small" | "caption";
type TextAs = "p" | "span" | "div" | "li" | "label";

export interface TextProps extends HTMLAttributes<HTMLElement> {
  variant?: TextVariant;
  muted?: boolean;
  as?: TextAs;
}

const textVariantClasses: Record<TextVariant, string> = {
  lead: "text-lg md:text-xl leading-relaxed",
  body: "text-base leading-relaxed",
  small: "text-sm leading-normal",
  caption: "text-xs leading-normal",
};

export function Text({
  variant = "body",
  muted = false,
  as = "p",
  className = "",
  children,
  ...props
}: TextProps) {
  // Assegniamo a una variabile con iniziale maiuscola per JSX dinamico valido
  const Tag = as as React.ElementType;

  return (
    <Tag
      className={[
        "font-sans",
        textVariantClasses[variant],
        muted ? "text-text-muted" : "text-text-main",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </Tag>
  );
}
