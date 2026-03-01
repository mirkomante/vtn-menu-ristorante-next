/**
 * LexicalRenderer — Renderer leggero per nodi Lexical Rich Text.
 *
 * Gestisce i nodi standard usati nel campo `annotazione` di MenuConfig:
 * - Testo con formattazione inline (bold, italic, underline, strikethrough)
 * - Paragrafi e heading
 * - Link (con supporto `fields.url` e `url` diretto)
 * - Liste bullet e numerate
 *
 * Non dipende da librerie esterne: parser custom sui nodi JSON di Payload.
 * Compatibile con Server Components (nessun hook, nessun "use client").
 */

import type {
  LexicalBlockNode,
  LexicalInlineNode,
  LexicalListItemNode,
  LexicalRoot,
} from "@/types";

// ---------------------------------------------------------------------------
// Bitmask formattazione testo Lexical
// ---------------------------------------------------------------------------

const FORMAT_BOLD = 1;
const FORMAT_ITALIC = 2;
const FORMAT_UNDERLINE = 8;
const FORMAT_STRIKETHROUGH = 16;

// ---------------------------------------------------------------------------
// Helpers per nodi inline
// ---------------------------------------------------------------------------

function renderTextNode(
  node: Extract<LexicalInlineNode, { type: "text" }>,
  key: string
): React.ReactNode {
  const fmt = node.format ?? 0;
  let content: React.ReactNode = node.text;

  if (fmt & FORMAT_STRIKETHROUGH) content = <s key={`s-${key}`}>{content}</s>;
  if (fmt & FORMAT_UNDERLINE) content = <u key={`u-${key}`}>{content}</u>;
  if (fmt & FORMAT_ITALIC) content = <em key={`em-${key}`}>{content}</em>;
  if (fmt & FORMAT_BOLD) content = <strong key={`b-${key}`}>{content}</strong>;

  return content;
}

function renderInlineNodes(
  children: LexicalInlineNode[],
  keyPrefix: string
): React.ReactNode[] {
  return children.map((child, i) => {
    const key = `${keyPrefix}-${i}`;
    if (child.type === "text") {
      return <span key={key}>{renderTextNode(child, key)}</span>;
    }
    if (child.type === "link") {
      const href = child.fields?.url ?? child.url ?? "#";
      const isExternal = child.fields?.newTab ?? href.startsWith("http");
      return (
        <a
          key={key}
          href={href}
          target={isExternal ? "_blank" : undefined}
          rel={isExternal ? "noopener noreferrer" : undefined}
          className="underline underline-offset-2 transition-colors hover:text-accent-gold"
        >
          {renderInlineNodes(child.children, `${key}-c`)}
        </a>
      );
    }
    return null;
  });
}

// ---------------------------------------------------------------------------
// Helpers per nodi di blocco
// ---------------------------------------------------------------------------

function renderListItem(item: LexicalListItemNode, key: string): React.ReactNode {
  return (
    <li key={key} className="ml-4">
      {renderInlineNodes(item.children, `${key}-c`)}
    </li>
  );
}

function renderBlock(node: LexicalBlockNode, key: string): React.ReactNode {
  if (node.type === "paragraph") {
    const isEmpty = node.children.every(
      (c) => c.type === "text" && c.text === ""
    );
    if (isEmpty) return <br key={key} />;
    return (
      <p key={key} className="leading-relaxed">
        {renderInlineNodes(node.children, `${key}-c`)}
      </p>
    );
  }

  if (node.type === "heading") {
    const Tag = node.tag;
    return (
      <Tag key={key} className="font-serif font-semibold">
        {renderInlineNodes(node.children, `${key}-c`)}
      </Tag>
    );
  }

  if (node.type === "list") {
    const Tag = node.listType === "number" ? "ol" : "ul";
    const listClass =
      node.listType === "number"
        ? "list-decimal space-y-1"
        : "list-disc space-y-1";
    return (
      <Tag key={key} className={listClass}>
        {node.children.map((item, i) =>
          renderListItem(item, `${key}-li-${i}`)
        )}
      </Tag>
    );
  }

  return null;
}

// ---------------------------------------------------------------------------
// Componente pubblico
// ---------------------------------------------------------------------------

export interface LexicalRendererProps {
  /** Documento Lexical serializzato (campo `annotazione` di MenuConfig) */
  content: LexicalRoot;
  /** Classi CSS aggiuntive per il wrapper esterno */
  className?: string;
}

export function LexicalRenderer({ content, className }: LexicalRendererProps) {
  const blocks = content?.root?.children ?? [];

  if (blocks.length === 0) return null;

  return (
    <div className={className}>
      {blocks.map((block, i) => renderBlock(block, `block-${i}`))}
    </div>
  );
}
