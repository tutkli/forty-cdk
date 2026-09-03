import { Marked } from 'marked';

import { readDocMeta, ringOf } from '../lib/doc-contract.mjs';
import { Slugger, slugify } from '../lib/readme-slug.mjs';

const gfm = new Marked({ gfm: true });

const API_TYPE_COLUMN = 'type';
const API_DEFAULT_COLUMN = 'default';

/**
 * A document the compiler refused, with every problem it found.
 *
 * Problems are collected per document rather than thrown at the first one, so a
 * contributor fixing a page sees the whole list in one run.
 */
export class DocCompileError extends Error {
  constructor(problems) {
    super(
      `${problems.length} content problem(s):\n` +
        problems
          .map((problem) => `  ${problem.path}:${problem.line} — ${problem.message}`)
          .join('\n'),
    );
    this.name = 'DocCompileError';
    this.problems = problems;
  }
}

/**
 * `marked` reports a token's `raw` with `\r\n` already collapsed to `\n`, so a
 * CRLF checkout would slide every offset computed from it. Normalising first
 * keeps the offsets exact and the line numbers true: the two forms hold the
 * same number of newlines, so a line counted here is the line in the file.
 */
function normalize(markdown) {
  return markdown.replace(/\r\n/g, '\n');
}

function lineIndexOf(markdown) {
  const starts = [0];
  for (let i = 0; i < markdown.length; i += 1) {
    if (markdown[i] === '\n') {
      starts.push(i + 1);
    }
  }
  return starts;
}

function lineAt(starts, offset) {
  let low = 0;
  let high = starts.length - 1;
  while (low < high) {
    const mid = (low + high + 1) >> 1;
    if (starts[mid] <= offset) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }
  return low + 1;
}

/** Every token in the tree, each with the source offset it was written at. */
function walk(tokens, offset, visit) {
  let cursor = offset;
  for (const token of tokens ?? []) {
    visit(token, cursor);
    if (token.type === 'list') {
      let inner = cursor;
      for (const item of token.items ?? []) {
        walk([item], inner, visit);
        inner += item.raw.length;
      }
    } else if (token.type === 'list_item' || token.type === 'blockquote') {
      walk(token.tokens, cursor, visit);
    }
    cursor += token.raw.length;
  }
}

/**
 * A line with its blockquote markers taken off.
 *
 * The scan below has to see a table written inside a blockquote, which the
 * lexer reads as a table the page cannot render. Left as written, the `>` keeps
 * the delimiter row from matching and the whole shape passes unnoticed.
 */
function unquote(line) {
  return line.replace(/^\s*(?:>\s?)+/, '');
}

function looksLikeTableDelimiter(line) {
  if (line === undefined) {
    return false;
  }
  const bare = unquote(line);
  return /^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/.test(bare) && bare.includes('-');
}

function splitRawCells(row) {
  return row
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split(/(?<!\\)\|/);
}

function headerLabel(markdown) {
  return markdown.trim().replace(/`/g, '').toLowerCase();
}

/**
 * Which columns an API table carries, or `null` for any other table.
 *
 * The shape is the one the site has recognised since
 * [#1803](https://github.com/tutkli/forty-cdk/issues/1803): a second column
 * labelled Type, and either three columns or four whose third is Default. The
 * first column's own label varies across the corpus — Property, Member, Input,
 * Attribute — and is carried through rather than matched on.
 */
function apiColumnsOf(columns) {
  if (headerLabel(columns[1] ?? '') !== API_TYPE_COLUMN) {
    return null;
  }
  if (columns.length === 3) {
    return { property: 0, type: 1, default: null, description: 2 };
  }
  if (columns.length === 4 && headerLabel(columns[2] ?? '') === API_DEFAULT_COLUMN) {
    return { property: 0, type: 1, default: 2, description: 3 };
  }
  return null;
}

function tableOf(token) {
  const columns = token.header.map((cell) => cell.text);
  const rows = token.rows.map((row) => row.map((cell) => cell.text));
  const api = apiColumnsOf(columns);
  if (api === null) {
    return { role: 'plain', columns, rows };
  }
  const pick = (cells, index) => (index === null ? null : (cells[index] ?? ''));
  return {
    role: 'api',
    columns: {
      property: columns[api.property] ?? '',
      type: columns[api.type] ?? '',
      default: pick(columns, api.default),
      description: columns[api.description] ?? '',
    },
    rows: rows.map((cells) => ({
      property: cells[api.property] ?? '',
      type: cells[api.type] ?? '',
      default: pick(cells, api.default),
      description: cells[api.description] ?? '',
    })),
  };
}

/**
 * The markdown a run of tokens was written as, sliced back out of their `raw`.
 *
 * Contiguous top-level tokens reconstruct the source exactly, so prose reaches
 * the renderer as the author wrote it rather than re-serialised from the tree.
 * A markdown feature the model does not model — a footnote, a definition list —
 * therefore still renders, instead of being silently dropped by a round trip.
 */
function proseOf(run) {
  return run
    .map((entry) => entry.token.raw)
    .join('')
    .replace(/^\n+/, '')
    .replace(/\s+$/, '');
}

/**
 * The tables the source *looks* like it declares, found by the same line scan
 * the browser-side parser used to build pages with.
 *
 * The model never reads this. It exists to be compared against the token tree:
 * where the scan sees a table GFM does not, the author and every other GFM
 * renderer — GitHub included — disagree about what the document says, and the
 * compiler stops rather than publishing whichever reading happens to win.
 */
function scanNearTables(markdown, fenceRanges) {
  const lines = markdown.split('\n');
  const found = [];
  for (let i = 0; i < lines.length; i += 1) {
    const number = i + 1;
    if (fenceRanges.some(([from, to]) => number >= from && number <= to)) {
      continue;
    }
    const line = unquote(lines[i]);
    if (line.includes('|') && line.trim() !== '' && looksLikeTableDelimiter(lines[i + 1])) {
      found.push({ line: number, text: line.trim() });
    }
  }
  return found;
}

function rangeOf(entry) {
  return [entry.line, entry.line + entry.token.raw.replace(/\s+$/, '').split('\n').length - 1];
}

function fenceRangesOf(entries) {
  return entries.filter((entry) => entry.token.type === 'code').map(rangeOf);
}

function checkTableRows(entries, report) {
  for (const { token, line } of entries) {
    if (token.type !== 'table') {
      continue;
    }
    const rows = token.raw.split('\n').filter((candidate) => candidate.trim() !== '');
    const columns = token.header.length;
    rows.slice(2).forEach((row, index) => {
      const cells = splitRawCells(row).length;
      if (cells === columns) {
        return;
      }
      report(
        line + 2 + index,
        `this row declares ${cells} cell(s) against a header of ${columns} column(s) — ` +
          (cells > columns
            ? 'GFM drops the extra one, so its content never reaches the page. A literal pipe needs escaping as \\|, a union type inside backticks included'
            : 'GFM pads the row with an empty cell. Write every column out'),
      );
    });
  }
}

/**
 * Every table shape the page would not render, each named at its own line.
 *
 * Two guards would otherwise see one broken table from two angles and report it
 * twice — the token tree knows a table indented into a list item as a *nested*
 * table, the line scan knows it as a table the top level does not hold. The
 * scan supplies the line either way, because a nested token's offset resolves
 * to its container's first line and `marked` reports no offset of its own; the
 * tree supplies the diagnosis, since only it can tell "GFM reads a table here
 * and the site cannot show it" from "GFM reads no table here at all".
 *
 * A container the corpus does not hold — a table inside a blockquote — is
 * therefore still named at the row it was written on.
 */
function checkTablePlacement(markdown, top, entries, report) {
  const topLevel = new Set(top);
  const topLines = new Set(
    entries
      .filter((entry) => entry.token.type === 'table' && topLevel.has(entry.token))
      .map((entry) => entry.line),
  );
  const topRanges = entries.filter((entry) => topLevel.has(entry.token)).map(rangeOf);
  const nested = entries
    .filter((entry) => !topLevel.has(entry.token) && entry.token.type === 'table')
    .map((entry) => ({
      range:
        topRanges.find(([from, to]) => entry.line >= from && entry.line <= to) ?? rangeOf(entry),
      reported: false,
    }));

  const NESTED = 'a table nested in a list item or blockquote is not rendered — lift it out';

  for (const near of scanNearTables(markdown, fenceRangesOf(entries))) {
    if (topLines.has(near.line)) {
      continue;
    }
    const container = nested.find(({ range: [from, to] }) => near.line >= from && near.line <= to);
    if (container !== undefined) {
      container.reported = true;
      report(near.line, NESTED);
      continue;
    }
    report(
      near.line,
      'this reads as a table here but not to GFM, so the site and GitHub would render it ' +
        'differently — a table indented into a list item is no table, and a line of dashes ' +
        `under prose containing a pipe is a setext heading: ${JSON.stringify(near.text)}`,
    );
  }

  for (const { range, reported } of nested) {
    if (!reported) {
      report(range[0], NESTED);
    }
  }
}

/**
 * A heading the site would render without an anchor, because it sits inside a
 * list item or a blockquote rather than at the top level. The corpus holds
 * none; the line named is the container's, which is as close as `marked` allows.
 */
function checkNestedHeadings(top, entries, report) {
  const topLevel = new Set(top);
  for (const { token, line } of entries) {
    if (!topLevel.has(token) && token.type === 'heading') {
      report(
        line,
        `a heading nested in a list item or blockquote carries no anchor — lift ${JSON.stringify(token.text)} out`,
      );
    }
  }
}

function checkHeadingSlugs(headings, report) {
  for (const heading of headings) {
    if (slugify(heading.text) === '') {
      report(
        heading.line,
        `heading ${JSON.stringify(heading.text)} slugifies to an empty string, so it can carry no anchor`,
      );
    }
  }
}

/**
 * The fence languages the site publishes, each mapped to the grammar that
 * highlights it.
 *
 * A fence outside this map fails the compile rather than publishing plain: a
 * page where one sample is highlighted and the next is not reads as a rendering
 * bug, and the corpus reached that state twice without anyone noticing
 * ([#1807](https://github.com/tutkli/forty-cdk/issues/1807)). Absence of a
 * language is not an unknown language — a bare fence is plain text on purpose,
 * and is highlighted as such so it keeps the same frame as its neighbours.
 */
const FENCE_LANGUAGES = new Map([
  ['', 'text'],
  ['text', 'text'],
  ['txt', 'text'],
  ['plaintext', 'text'],
  ['ts', 'angular-ts'],
  ['typescript', 'angular-ts'],
  ['angular-ts', 'angular-ts'],
  ['html', 'html'],
  ['css', 'css'],
  ['bash', 'bash'],
  ['sh', 'bash'],
  ['shell', 'bash'],
  ['md', 'markdown'],
  ['markdown', 'markdown'],
]);

/** The info strings a fence may carry, a bare fence aside. */
export const FENCE_LANGUAGE_NAMES = [...FENCE_LANGUAGES.keys()].filter((name) => name !== '');

/** The grammar a fence's info string selects, or `null` if the site has none. */
export function resolveFenceLanguage(lang) {
  return FENCE_LANGUAGES.get((lang ?? '').trim().toLowerCase()) ?? null;
}

function checkFenceLanguages(entries, report) {
  for (const { token, line } of entries) {
    if (token.type !== 'code' || resolveFenceLanguage(token.lang) !== null) {
      continue;
    }
    report(
      line,
      `this fence is marked ${JSON.stringify((token.lang ?? '').trim())}, which the site has no grammar ` +
        'for — it would publish unhighlighted beside fences that are highlighted. Write it as one ' +
        `of ${FENCE_LANGUAGE_NAMES.join(', ')}, or load the grammar in scripts/docs/doc-highlight.mjs`,
    );
  }
}

function blocksOf(run) {
  const blocks = [];
  let prose = [];

  const flushProse = () => {
    const markdown = proseOf(prose);
    if (markdown !== '') {
      blocks.push({
        kind: 'prose',
        markdown,
        headingSlugs: prose
          .filter((entry) => entry.token.type === 'heading')
          .map((entry) => entry.slug),
      });
    }
    prose = [];
  };

  for (const entry of run) {
    if (entry.token.type === 'table') {
      flushProse();
      blocks.push({ kind: 'table', table: tableOf(entry.token) });
      continue;
    }
    prose.push(entry);
  }
  flushProse();
  return blocks;
}

/**
 * Compile one markdown document into the model the documentation site renders.
 *
 * Structure comes from `marked.lexer()` and nothing else: sections are the
 * level-2 headings of the token tree, tables are `table` tokens read as
 * records, and every heading below the title is slugged once, here, by a
 * slugger that lives no longer than the call — so an anchor is a function of
 * the document and of nothing that was compiled before it.
 *
 * Every document's lede paragraph is lifted out of the intro rather than left
 * in it: the site's navigation, search and page header read that one paragraph,
 * so the body it renders below the header cannot also hold it. An entry point's
 * README additionally declares its registry metadata as frontmatter; a guide
 * and a site page declare none, their registries owning the group and the
 * reading order a document cannot state about itself.
 *
 * A frontmatter problem is reported on its own rather than alongside the body's,
 * which is the one place this function does not collect everything it finds: a
 * block that never closes leaves every line below it counted from the wrong
 * place, so pairing the two would name lines the file does not hold.
 *
 * @param source Raw markdown, in either line ending.
 * @param location `path` is the repository-relative path the link resolver and
 * every error message name; `slug` is the route the site publishes the document
 * under; `kind` is `primitive` for an entry point's README, which declares
 * frontmatter, and `guide` or `page` for the prose that declares none. It
 * decides how the document's metadata is read and nothing else — every kind is
 * compiled the same way, the lede lift included.
 * @throws {DocCompileError} when the document is ambiguous rather than merely
 * unusual — invalid or missing frontmatter, a row whose cell count disagrees
 * with its header, a table GFM would not recognise, a table or heading nested
 * where the site cannot render it, a heading that slugifies to nothing, a fence
 * in a language the site cannot highlight, a missing title, or a document with
 * no lede.
 */
export function compileDocument(source, { path, slug, kind }) {
  const normalized = normalize(source);
  const {
    meta,
    body,
    problems: metaProblems,
  } = kind === 'primitive'
    ? readDocMeta(normalized, path)
    : { meta: null, body: normalized, problems: [] };
  if (metaProblems.length > 0) {
    throw new DocCompileError(metaProblems);
  }

  const markdown = body;
  const starts = lineIndexOf(markdown);
  const problems = [];
  const report = (line, message) => {
    problems.push({ path, line, message });
  };

  const top = gfm.lexer(markdown);
  const entries = [];
  walk(top, 0, (token, offset) => {
    entries.push({ token, line: lineAt(starts, offset) });
  });

  /**
   * Only the top level builds the model. The walk above descends into lists and
   * blockquotes so the guards can see what is nested there, but a nested
   * token's `raw` is *also* part of its container's — concatenating both would
   * emit the same prose twice.
   */
  const topLevel = new Set(top);
  const trunk = entries.filter((entry) => topLevel.has(entry.token));

  const title = trunk.find((entry) => entry.token.type === 'heading');
  if (title === undefined || title.token.depth !== 1) {
    report(
      title?.line ?? 1,
      'the document must open with a level-1 heading — its title is read from it',
    );
    throw new DocCompileError(problems);
  }

  const slugger = new Slugger();
  const headings = [];
  for (const entry of trunk) {
    if (entry.token.type !== 'heading' || entry.token === title.token) {
      continue;
    }
    entry.slug = slugger.unique(slugify(entry.token.text));
    headings.push({ ...entry, depth: entry.token.depth, text: entry.token.text });
  }

  checkHeadingSlugs(headings, report);
  checkFenceLanguages(entries, report);
  checkNestedHeadings(top, entries, report);
  checkTableRows(entries, report);
  checkTablePlacement(markdown, top, entries, report);

  const introRun = [];
  const sectionRuns = [];
  for (const entry of trunk) {
    if (entry.token === title.token) {
      continue;
    }
    if (entry.token.type === 'heading' && entry.token.depth === 2) {
      sectionRuns.push({ heading: entry, run: [] });
      continue;
    }
    (sectionRuns.at(-1)?.run ?? introRun).push(entry);
  }

  for (const entry of introRun) {
    if (entry.token.type === 'table') {
      report(
        entry.line,
        'a table above the first section is not published — the intro renders as prose only. ' +
          'Move it under a heading',
      );
    }
  }

  /**
   * Every document has its opening paragraph lifted out as its description.
   *
   * The lift is what keeps a page from publishing the same sentence twice: the
   * header renders the description and the body renders the intro, so a lede
   * left in both is the duplication
   * [#1808](https://github.com/tutkli/forty-cdk/issues/1808) found in four
   * README pages in production.
   *
   * It is one rule for the whole corpus because the exemption was the defect:
   * a guide kept its intro whole, its registry summarised that intro a second
   * time through a line scan of its own, and all eleven guide pages published
   * the same sentence twice — the header's copy clipped mid-word, the body's
   * whole. A kind whose intro keeps its lede is a kind whose header has to
   * quote its body, so there is no such kind.
   */
  const ledeIndex = introRun.findIndex((entry) => entry.token.type === 'paragraph');
  if (ledeIndex === -1) {
    report(
      title.line,
      'the document has no lede paragraph above its first section — the site reads the navigation ' +
        'and search description from it, so it cannot be left out',
    );
  }

  if (problems.length > 0) {
    throw new DocCompileError(problems);
  }

  const headingsOf = (run) =>
    run
      .filter((entry) => entry.token.type === 'heading')
      .map((entry) => ({ depth: entry.token.depth, text: entry.token.text, slug: entry.slug }));

  return {
    path,
    slug,
    kind,
    meta,
    title: title.token.text,
    lede: ledeIndex === -1 ? null : introRun[ledeIndex].token.text,
    intro: blocksOf(introRun.filter((_, index) => index !== ledeIndex)),
    introHeadings: headingsOf(introRun),
    sections: sectionRuns.map(({ heading, run }) => ({
      title: heading.token.text,
      slug: heading.slug,
      ring: ringOf(heading.token.text),
      headings: headingsOf(run),
      blocks: blocksOf(run),
    })),
  };
}

/** Every anchor a compiled document lands on, in document order. */
export function anchorsOf(document) {
  return [
    ...document.introHeadings.map((heading) => heading.slug),
    ...document.sections.flatMap((section) => [
      section.slug,
      ...section.headings.map((heading) => heading.slug),
    ]),
  ];
}

/**
 * A table's cells as a header row and data rows, whatever role it was read
 * under — the shape the GFM lexer reports, for code that compares the two.
 */
export function cellsOf(table) {
  if (table.role === 'plain') {
    return { columns: table.columns, rows: table.rows };
  }
  const { property, type, description } = table.columns;
  const fallback = table.columns.default;
  return {
    columns:
      fallback === null ? [property, type, description] : [property, type, fallback, description],
    rows: table.rows.map((row) =>
      fallback === null
        ? [row.property, row.type, row.description]
        : [row.property, row.type, row.default ?? '', row.description],
    ),
  };
}
