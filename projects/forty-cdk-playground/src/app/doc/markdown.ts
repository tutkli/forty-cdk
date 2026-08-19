import { Marked, type Tokens } from 'marked';

import { escapeHtml } from '../../../../../scripts/lib/html.mjs';
import type { DocProseBlock } from './doc-model';
import { highlightCodeBlock } from './highlighter';

/** A link the site resolved, and the route it navigates to in-app if any. */
export interface DocLinkTarget {
  readonly href: string;
  readonly route: string | null;
}

export type DocLinkResolver = (href: string, sourcePath: string) => DocLinkTarget | null;

/** What a rendered document needs beyond its own content to resolve links. */
export interface DocRenderContext {
  readonly sourcePath: string;
  readonly resolveLink: DocLinkResolver;
}

/** A table cell rendered once: markup to bind, and text for labels. */
export interface DocRenderedCell {
  readonly html: string;
  readonly text: string;
}

interface RenderState {
  readonly context: DocRenderContext | null;
  readonly headingSlugs: readonly string[];
  consumed: number;
}

let state: RenderState | null = null;

function nextHeadingSlug(text: string): string {
  if (state === null) {
    throw new Error(`[playground] heading rendered outside a document block: ${text}`);
  }
  const slug = state.headingSlugs[state.consumed];
  state.consumed += 1;
  if (slug === undefined) {
    throw new Error(
      `[playground] the compiled model carries ${state.headingSlugs.length} heading anchor(s) ` +
        `for a block holding more — no anchor for ${JSON.stringify(text)}`,
    );
  }
  return slug;
}

function renderLink(href: string, title: string | null, inner: string): string {
  const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
  const context = state?.context ?? null;
  const target = context?.resolveLink(href, context.sourcePath) ?? null;
  if (target === null) {
    return `<a href="${escapeHtml(href)}"${titleAttr}>${inner}</a>`;
  }
  if (target.route === null) {
    return `<a href="${escapeHtml(target.href)}"${titleAttr} target="_blank" rel="noreferrer noopener">${inner}</a>`;
  }
  return `<a href="${escapeHtml(target.href)}"${titleAttr} data-doc-route="${escapeHtml(target.route)}">${inner}</a>`;
}

const marked = new Marked({ gfm: true });
marked.use({
  renderer: {
    heading(token: Tokens.Heading) {
      const id = nextHeadingSlug(token.text);
      return `<h${token.depth} id="${id}">${renderInline(token.text)}</h${token.depth}>\n`;
    },
    code(token: Tokens.Code) {
      const highlighted = highlightCodeBlock(token.text, token.lang);
      return highlighted
        ? `${highlighted}\n`
        : `<pre><code>${escapeHtml(token.text)}</code></pre>\n`;
    },
    link(token: Tokens.Link) {
      return renderLink(token.href, token.title ?? null, renderInline(token.text));
    },
  },
});

function renderInline(md: string): string {
  return marked.parseInline(md, { async: false });
}

/**
 * Render one prose block of a compiled document.
 *
 * Heading anchors are **read from the block**, in document order, rather than
 * derived here: the compiler minted them once, against the whole document, so a
 * page's anchors are a function of its content and of nothing this renderer has
 * been handed before it.
 */
export function renderDocProse(block: DocProseBlock, context: DocRenderContext | null): string {
  state = { context, headingSlugs: block.headingSlugs, consumed: 0 };
  try {
    const html = marked.parse(block.markdown, { async: false });
    if (state.consumed !== block.headingSlugs.length) {
      throw new Error(
        `[playground] the compiled model carries ${block.headingSlugs.length} heading anchor(s) ` +
          `for a block rendering ${state.consumed}`,
      );
    }
    return html;
  } finally {
    state = null;
  }
}

/** Render an inline fragment — a table cell, a heading, a demo subtitle. */
export function renderInlineMarkdown(md: string, context?: DocRenderContext): string {
  state = { context: context ?? null, headingSlugs: [], consumed: 0 };
  try {
    return renderInline(md);
  } finally {
    state = null;
  }
}

/**
 * A heading's text with its inline markup resolved away — what the table of
 * contents shows, where `` `ForButton` `` reads as ForButton.
 */
export function headingText(markdown: string): string {
  return stripText(renderInlineMarkdown(markdown));
}

/** Render a table cell once, keeping the text its labels and popovers need. */
export function renderDocCell(md: string, context?: DocRenderContext): DocRenderedCell {
  const html = renderInlineMarkdown(md, context);
  return { html, text: stripText(html) };
}

export function stripText(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}
