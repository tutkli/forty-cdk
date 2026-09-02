import { Marked } from 'marked';

import { behaviorGroupOf } from '../lib/doc-contract.mjs';
import { DOC_BASE_TOKEN, GITHUB_BLOB_BASE, resolveDocLink } from '../lib/doc-links.mjs';
import { escapeHtml, stripText } from '../lib/html.mjs';
import { highlightCode } from './doc-highlight.mjs';

let state = null;

function nextHeadingSlug(text) {
  if (state === null) {
    throw new Error(`[gen-doc-model] heading rendered outside a document block: ${text}`);
  }
  const slug = state.headingSlugs[state.consumed];
  state.consumed += 1;
  if (slug === undefined) {
    throw new Error(
      `[gen-doc-model] the compiled model carries ${state.headingSlugs.length} heading anchor(s) ` +
        `for a block holding more — no anchor for ${JSON.stringify(text)}`,
    );
  }
  return slug;
}

function renderLink(href, title, inner) {
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
    heading(token) {
      const id = nextHeadingSlug(token.text);
      return `<h${token.depth} id="${id}">${renderInline(token.text)}</h${token.depth}>\n`;
    },
    code(token) {
      return `${highlightCode(token.text, token.lang)}\n`;
    },
    link(token) {
      return renderLink(token.href, token.title ?? null, renderInline(token.text));
    },
  },
});

function renderInline(md) {
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
export function renderDocProse(block, context) {
  state = { context, headingSlugs: block.headingSlugs, consumed: 0 };
  try {
    const html = marked.parse(block.markdown, { async: false });
    if (state.consumed !== block.headingSlugs.length) {
      throw new Error(
        `[gen-doc-model] the compiled model carries ${block.headingSlugs.length} heading anchor(s) ` +
          `for a block rendering ${state.consumed}`,
      );
    }
    return html;
  } finally {
    state = null;
  }
}

/** Render an inline fragment — a table cell, a heading, a section title. */
export function renderInlineMarkdown(md, context) {
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
export function headingText(markdown) {
  return stripText(renderInlineMarkdown(markdown));
}

/** Render a table cell once, keeping the text its labels and popovers need. */
export function renderDocCell(md, context) {
  const html = renderInlineMarkdown(md, context);
  return { html, text: stripText(html) };
}

/**
 * The link resolver a document is rendered under.
 *
 * `prepareUrl` is where the site's base href would go, and at build time there
 * is none to put there — so it writes the token the page substitutes instead.
 * Everything else is the resolution `pnpm check:doc-links` gates the sources on,
 * called here so a published href is decided once rather than per page view.
 */
function resolverFor(routes, blobBase) {
  return (href, sourcePath) => {
    const link = resolveDocLink(href, {
      sourcePath,
      routes,
      blobBase,
      prepareUrl: (url) => `${DOC_BASE_TOKEN}${url.slice(1)}`,
    });
    return link === null ? null : { href: link.href, route: link.route };
  };
}

function renderCells(markdown, context) {
  return markdown === null ? null : renderDocCell(markdown, context);
}

function renderTable(table, context) {
  if (table.role === 'plain') {
    return {
      role: 'plain',
      columns: table.columns.map((column) => renderDocCell(column, context)),
      rows: table.rows.map((row) => row.map((cell) => renderDocCell(cell, context))),
    };
  }
  return {
    role: 'api',
    columns: {
      property: headingText(table.columns.property),
      type: headingText(table.columns.type),
      default: table.columns.default === null ? null : headingText(table.columns.default),
      description: headingText(table.columns.description),
    },
    rows: table.rows.map((row) => ({
      property: renderDocCell(row.property, context),
      type: renderDocCell(row.type, context),
      default: renderCells(row.default, context),
      description: renderDocCell(row.description, context),
    })),
  };
}

function renderProseBlock(block, context) {
  return { kind: 'prose', html: renderDocProse(block, context) };
}

function renderBlock(block, context) {
  return block.kind === 'prose'
    ? renderProseBlock(block, context)
    : { kind: 'table', table: renderTable(block.table, context) };
}

/**
 * Turn a compiled document into the markup its page binds.
 *
 * This is the whole of what the site publishes, and the reason neither `marked`
 * nor a syntax highlighter reaches the browser
 * ([#1807](https://github.com/tutkli/forty-cdk/issues/1807)): every fence, every
 * heading anchor, every table cell and every resolved href is decided here, over
 * content that cannot change after the build.
 *
 * The result carries markup and the plain text a label needs, and nothing a page
 * does not read — no source path, no title, no markdown. The document those come
 * from stays available to build-time work that needs the prose as authored,
 * which is what a generated README will be derived from (D2).
 */
export function renderDocument(document, { routes, blobBase = GITHUB_BLOB_BASE }) {
  const context = { sourcePath: document.path, resolveLink: resolverFor(routes, blobBase) };
  const group = behaviorGroupOf(document);
  return {
    intro: document.intro.map((block) => renderProseBlock(block, context)),
    behaviorGroup: group === null ? null : { title: headingText(group.title), slug: group.slug },
    sections: document.sections.map((section) => ({
      title: headingText(section.title),
      slug: section.slug,
      ring: section.ring,
      headings: section.headings.map((heading) => ({
        depth: heading.depth,
        text: headingText(heading.text),
        slug: heading.slug,
      })),
      blocks: section.blocks.map((block) => renderBlock(block, context)),
    })),
  };
}
