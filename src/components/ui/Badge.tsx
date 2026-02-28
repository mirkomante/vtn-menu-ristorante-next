/**
 * Badge — Atomo UI per etichette e tag
 *
 * Varianti:
 * - default:   sfondo Blu Notte, testo Crema. Per tag generici (es. "Vegano").
 * - highlight: sfondo Arancione Bruciato, testo Crema. Per badge prominenti
 *              (es. "Chef consiglia", "Nuovo").
 * - gold:      sfondo Oro, testo Blu Notte. Per badge premium (es. "Signature").
 * - outline:   bordo Blu Notte, testo Blu Notte. Per tag discreti.
 */

import type { HTMLAttributes } from "react";

type BadgeVariant = "default" | "highlight" | "gold" | "outline";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-text-main text-text-light",
  highlight: "bg-accent-orange text-text-light",
  gold: "bg-accent-gold text-text-main",
  outline: "border border-text-main text-text-main bg-transparent",
};

export function Badge({
  variant = "default",
  className = "",
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center",
        "px-2 py-0.5",
        "text-xs font-sans font-medium",
        "rounded-sm",
        "whitespace-nowrap",
        variantClasses[variant],
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </span>
  );
}
