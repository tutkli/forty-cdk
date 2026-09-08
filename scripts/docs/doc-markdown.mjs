import { isFenceLine } from '../lib/readme-slug.mjs';
import { cellsOf } from './doc-model.mjs';

/**
 * One inline markdown link, split so its href can be replaced without
 * reconstructing the rest of it.
 *
 * The three groups are the text and opening paren, the href, and the optional
 * title with the closing paren — so a rewrite keeps the link text and the title
 * byte-identical and touches only the destination. It is deliberately the one
 * definition of "a link in markdown" in the repository: `pnpm check:doc-links`
 * validates what this finds and {@link rewriteMarkdownLinks} rewrites the same
 * set, so a link the emitter would publish is a link the gate has resolved.
 */
const MARKDOWN_LINK = /(\[(?:[^[\]]|\[[^\]]*\])*\]\()([^)\s]+)((?:\s+"[^"]*")?\))/g;

/**
 * Every inline link in a block of markdown, each with the line it was written
 * on.
 *
 * Fenced code is skipped, because a `[label](target)` inside a sample is the
 * sample's own text — CSS selectors and Angular bindings in the corpus read as
 * links to this regex and to no renderer.
 */
export function markdownLinksOf(markdown) {
  const links = [];
  let inFence = false;
  let line = 0;
  for (const text of markdown.split('\n')) {
    line += 1;
    if (isFenceLine(text)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) {
      continue;
    }
    for (const match of text.matchAll(MARKDOWN_LINK)) {
      links.push({ href: match[2], line });
    }
  }
  return links;
}

/**
 * The same markdown with every inline link's href passed through `rewrite`.
 *
 * `rewrite` returning `null` leaves the link exactly as written, which is how
 * an absolute URL and a bare `#fragment` survive: the fragment still names a
 * heading of the document being emitted, and an artifact has no base to resolve
 * a relative href against.
 */
export function rewriteMarkdownLinks(markdown, rewrite) {
  let inFence = false;
  return markdown
    .split('\n')
    .map((text) => {
      if (isFenceLine(text)) {
        inFence = !inFence;
        return text;
      }
      if (inFence) {
        return text;
      }
      return text.replace(MARKDOWN_LINK, (whole, open, href, close) => {
        const target = rewrite(href);
        return target === null ? whole : `${open}${target}${close}`;
      });
    })
    .join('\n');
}

/**
 * A cell as a GFM table cell, with the pipe escaping the lexer resolved away
 * put back.
 *
 * Every cell of a compiled table is the markdown it was written as with `\|`
 * already read as `|`, so re-serialising one has to escape it again — a union
 * type inside backticks included, which is where the corpus writes most of
 * them. Left bare, the pipe would open a column the header does not declare and
 * GFM would drop everything after it.
 */
function cellMarkdown(cell, rewrite) {
  const text = rewriteMarkdownLinks(cell, rewrite).replace(/\|/g, '\\|').trim();
  return text === '' ? ' ' : ` ${text} `;
}

/**
 * A compiled table as a GFM table.
 *
 * Column alignment is not carried by the model and is not restored here: it is
 * presentation, and the cells are what a reader of the markdown is after.
 */
function tableMarkdown(table, rewrite) {
  const { columns, rows } = cellsOf(table);
  const row = (cells) => `|${cells.map((cell) => cellMarkdown(cell, rewrite)).join('|')}|`;
  return [
    row(columns),
    `|${columns.map(() => ' --- ').join('|')}|`,
    ...rows.map((cells) => row(cells)),
  ].join('\n');
}

function blockMarkdown(block, rewrite) {
  return block.kind === 'prose'
    ? rewriteMarkdownLinks(block.markdown, rewrite)
    : tableMarkdown(block.table, rewrite);
}

/**
 * One compiled document as standalone markdown, with every link resolved to an
 * absolute URL ([#1816](https://github.com/tutkli/forty-cdk/issues/1816)).
 *
 * This is the fifth consumer of the document model, beside the pages, the
 * navigation, the `⌘K` index and the guide registry — and it is a serialisation
 * of the same compiled document rather than a second pass over the markdown
 * behind it. That is what keeps it from drifting: resolved links, validated
 * frontmatter and correctly-read tables are inherited, and a document that
 * stops compiling stops being published here too.
 *
 * Three things differ from the source the compiler read. The frontmatter is
 * gone, having become the document's title and its registry entry. The lede is
 * written back above the intro, because a standalone document has no page
 * header to carry it. And every relative link is now absolute, since an
 * artifact served on its own — or pasted into a conversation — has nothing to
 * resolve one against.
 *
 * @param document A document `compileDocument` accepted.
 * @param resolveHref Called with each href and the document's own source path;
 * returns the absolute URL to publish, or `null` to leave the link as written.
 */
export function documentMarkdown(document, resolveHref) {
  const rewrite = (href) => resolveHref(href, document.path);
  const parts = [`# ${rewriteMarkdownLinks(document.title, rewrite)}`];
  if (document.lede !== null) {
    parts.push(rewriteMarkdownLinks(document.lede, rewrite));
  }
  for (const block of document.intro) {
    parts.push(blockMarkdown(block, rewrite));
  }
  for (const section of document.sections) {
    parts.push(`## ${rewriteMarkdownLinks(section.title, rewrite)}`);
    for (const block of section.blocks) {
      parts.push(blockMarkdown(block, rewrite));
    }
  }
  return `${parts.filter((part) => part.trim() !== '').join('\n\n')}\n`;
}
