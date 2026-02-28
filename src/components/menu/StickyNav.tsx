"use client";

/**
 * StickyNav — Barra di navigazione fissa per le sezioni del menu.
 *
 * Comportamento:
 * - Sticky in cima alla pagina (top-0, z-50).
 * - Sfondo bordeaux (surface-dark) con backdrop-blur per trasparenza elegante.
 * - Scroll orizzontale su mobile per tutte le categorie.
 * - Evidenzia la sezione attiva tramite IntersectionObserver:
 *   osserva gli elementi <section id="slug"> e aggiorna lo stato attivo
 *   quando una sezione entra nel viewport (con soglia al 20%).
 * - Click su un link fa scroll smooth alla sezione corrispondente.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { CategoriaMenu } from "@/types";

// ---------------------------------------------------------------------------
// Tipi
// ---------------------------------------------------------------------------

export interface StickyNavProps {
  categorie: CategoriaMenu[];
  /** Slug della categoria attiva (override esterno, es. da MenuContext) */
  activeSlug?: string | null;
  /** Callback chiamata quando l'utente clicca o lo scroll cambia sezione */
  onCategoryChange?: (slug: string) => void;
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export function StickyNav({
  categorie,
  activeSlug: externalActiveSlug,
  onCategoryChange,
}: StickyNavProps) {
  const [internalActiveSlug, setInternalActiveSlug] = useState<string>(
    categorie[0]?.slug ?? ""
  );
  const navRef = useRef<HTMLElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Usa il valore esterno se fornito, altrimenti quello interno
  const activeSlug = externalActiveSlug ?? internalActiveSlug;

  // ---------------------------------------------------------------------------
  // IntersectionObserver — aggiorna la sezione attiva durante lo scroll
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleIntersect: IntersectionObserverCallback = (entries) => {
      // Trova la sezione più in alto nel viewport tra quelle visibili
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

      if (visible.length > 0) {
        const slug = visible[0].target.id;
        setInternalActiveSlug(slug);
        onCategoryChange?.(slug);
      }
    };

    observerRef.current = new IntersectionObserver(handleIntersect, {
      // Attiva quando il 20% della sezione è visibile, con offset per la navbar
      rootMargin: "-64px 0px -40% 0px",
      threshold: 0.1,
    });

    const sections = categorie
      .map((c) => document.getElementById(c.slug))
      .filter(Boolean) as HTMLElement[];

    sections.forEach((s) => observerRef.current?.observe(s));

    return () => {
      observerRef.current?.disconnect();
    };
  }, [categorie, onCategoryChange]);

  // ---------------------------------------------------------------------------
  // Scroll attivo al link corrente nella navbar
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!navRef.current) return;
    const activeLink = navRef.current.querySelector<HTMLElement>(
      `[data-slug="${activeSlug}"]`
    );
    activeLink?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [activeSlug]);

  // ---------------------------------------------------------------------------
  // Handler click — scroll smooth alla sezione
  // ---------------------------------------------------------------------------
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, slug: string) => {
      e.preventDefault();
      const target = document.getElementById(slug);
      if (!target) return;

      // Offset per la navbar stessa (64px)
      const navHeight = navRef.current?.offsetHeight ?? 64;
      const top =
        target.getBoundingClientRect().top + window.scrollY - navHeight;

      window.scrollTo({ top, behavior: "smooth" });
      setInternalActiveSlug(slug);
      onCategoryChange?.(slug);
    },
    [onCategoryChange]
  );

  if (categorie.length === 0) return null;

  return (
    <nav
      ref={navRef}
      aria-label="Navigazione sezioni menu"
      className="sticky top-0 z-50 bg-surface-dark/95 backdrop-blur-sm"
    >
      {/* Scroll orizzontale su mobile */}
      <div className="flex overflow-x-auto scrollbar-none">
        <ul className="flex min-w-max gap-1 px-4 py-3" role="list">
          {categorie.map((categoria) => {
            const isActive = activeSlug === categoria.slug;
            return (
              <li key={categoria.slug}>
                <a
                  href={`#${categoria.slug}`}
                  data-slug={categoria.slug}
                  onClick={(e) => handleClick(e, categoria.slug)}
                  className={[
                    "inline-block whitespace-nowrap rounded-sm px-3 py-1.5",
                    "font-sans text-sm font-medium",
                    "transition-colors duration-150",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-gold",
                    isActive
                      ? "text-accent-gold underline underline-offset-4 decoration-accent-gold/60"
                      : "text-text-light hover:text-accent-gold",
                  ].join(" ")}
                  aria-current={isActive ? "true" : undefined}
                >
                  {categoria.nome}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
