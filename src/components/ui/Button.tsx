/**
 * Button — Atomo UI
 *
 * Varianti:
 * - primary:  sfondo Blu Notte (#080f2c), testo Crema. Azione principale.
 * - outline:  bordo e testo Blu Notte, sfondo trasparente. Azione secondaria.
 * - ghost:    solo testo Blu Notte, hover leggero. Navigazione/link.
 *
 * Dimensioni: sm | md (default) | lg
 */

import { forwardRef } from "react";

type ButtonVariant = "primary" | "outline" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Mostra un indicatore di caricamento e disabilita il bottone */
  loading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-text-main text-text-light hover:bg-text-main/85 focus-visible:ring-text-main",
  outline:
    "border border-text-main text-text-main bg-transparent hover:bg-text-main/5 focus-visible:ring-text-main",
  ghost:
    "text-text-main bg-transparent hover:bg-text-main/8 focus-visible:ring-text-main",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1 text-sm",
  md: "px-5 py-1.5 text-base",
  lg: "px-7 py-2 text-lg",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      className = "",
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={[
          "inline-flex items-center justify-center gap-2",
          "font-sans font-medium",
          "rounded-md",
          "transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          variantClasses[variant],
          sizeClasses[size],
          className,
        ].join(" ")}
        {...props}
      >
        {loading && (
          <span
            aria-hidden="true"
            className="size-4 rounded-full border-2 border-current border-t-transparent animate-spin"
          />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
