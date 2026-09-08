import { stripText } from '../lib/html.mjs';

/**
 * The markup a fence renders as, read for its identifiers and dropped.
 *
 * A code sample is mostly markup the reader searches *through*, not for:
 * indexing the 245 HTML and 186 TypeScript fences whole adds 182 kB of text and
 * reaches nothing the prose around them does not already say — measured over
 * the terms [#1813](https://github.com/tutkli/forty-cdk/issues/1813) names,
 * where dropping them costs `aria-activedescendant` and `roving tabindex`
 * nothing at all. What a sample *does* hold alone is the names: 50 of the
 * corpus's 269 public identifiers appear in no sentence and no table.
 * Inline code was never at stake — `` `data-state` `` in a sentence is prose.
 */
const CODE_BLOCK = /<pre\b[^>]*>[\s\S]*?<\/pre>/g;

/**
 * What counts as a name worth lifting out of a code sample: the library's own
 * exports and selectors, and the attributes its primitives emit.
 */
const IDENTIFIER = /\b(?:for|For|provideFor|inject|use)[A-Z]\w*|\b(?:aria|data)-[a-z][a-z-]*/g;

/**
 * How much prose one section contributes, in characters.
 *
 * The whole corpus is 613 kB of section text, which is 195 kB gzipped — more
 * than the site's entire initial bundle, for a palette. Clipping the prose at
 * 400 characters and keeping every table row whole brings that to 97 kB, and
 * every term the issue names still resolves: a reader searching `focus trap`
 * reaches 13 sections rather than 26, `data-state` 69 rather than 87. The
 * palette shows 50 results, so what is lost is the tail of an already-ranked
 * list rather than the answer.
 *
 * Table rows are exempt because they carry the identifiers a reference is
 * searched by — an input's name, its type, the `aria-*` attribute a state
 * emits — and they sit *below* the prose that would otherwise clip them away.
 */
const PROSE_LIMIT = 400;

function normalize(text) {
  return text.replace(/\s+/g, ' ').trim();
}

/** Clip at the last word boundary before the limit, marking the cut. */
function clip(text, limit) {
  if (text.length <= limit) {
    return text;
  }
  const cut = text.slice(0, limit);
  const space = cut.lastIndexOf(' ');
  return `${space > limit / 2 ? cut.slice(0, space) : cut}…`;
}

/**
 * A table's data rows as text, header row excluded.
 *
 * "Property", "Type", "Default", "Description" head 300 tables and describe
 * none of them, so indexing them would make every documented member a hit for
 * `default` and rank nothing.
 */
function rowsOf(table) {
  if (table.role === 'plain') {
    return table.rows.map((row) => row.map((cell) => cell.text).join(' '));
  }
  return table.rows.map((row) =>
    [row.property, row.type, row.default, row.description]
      .filter((cell) => cell !== null)
      .map((cell) => cell.text)
      .join(' '),
  );
}

/**
 * The names one section's code samples introduce, each kept once.
 *
 * Deduplicated because a sample repeats `[forAccordionItem]` on every row it
 * shows, and the index needs the name to be *reachable* rather than counted.
 */
function identifiersOf(html) {
  const samples = html.match(CODE_BLOCK);
  if (samples === null) {
    return [];
  }
  return [...new Set(stripText(samples.join(' ')).match(IDENTIFIER) ?? [])];
}

/**
 * The text the `⌘K` palette matches one section on, and cuts its snippet from.
 *
 * Read off the **rendered page** rather than the markdown behind it, which is
 * what keeps the index from being a second traversal of the corpus: every cell
 * already carries the text its labels use, and a paragraph's text is its own
 * markup with the tags taken back off. A section that reaches the reader
 * through a fold ([#1809](https://github.com/tutkli/forty-cdk/issues/1809))
 * therefore reaches the index too, under the anchor its host page emits.
 */
export function searchTextOf(section) {
  const prose = [];
  const rows = [];
  const names = new Set();
  for (const block of section.blocks) {
    if (block.kind === 'prose') {
      prose.push(stripText(block.html.replace(CODE_BLOCK, ' ')));
      for (const name of identifiersOf(block.html)) {
        names.add(name);
      }
    } else {
      rows.push(...rowsOf(block.table));
    }
  }
  const text = `${clip(normalize(prose.join(' ')), PROSE_LIMIT)} ${normalize(rows.join(' '))}`;
  const unsaid = [...names].filter((name) => !text.includes(name));
  return normalize(`${text} ${unsaid.join(' ')}`);
}
