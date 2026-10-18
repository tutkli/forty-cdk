import type { DocsGroup } from '../primitives';
import type { DocIndexEntry, DocIndexSection } from './doc-model';
import type { ErrorCodeEntry } from './error-codes';
import type { ResolvedGuideGroup } from './guides';
import type { SitePageMeta } from './site-pages';

export type SearchKind = 'primitive' | 'guide' | 'page' | 'section' | 'error';

/**
 * The half of the palette's entries that arrives late, in one chunk request:
 * every document's intro and sections, and every error code the library
 * reports.
 */
export interface SearchIndex {
  readonly documents: readonly DocIndexEntry[];
  readonly errorCodes: readonly ErrorCodeEntry[];
}

/**
 * The fields a query is matched against, lowercased once when the entry is
 * built rather than on every keystroke.
 *
 * They are separate because they rank differently — a document titled *Focus
 * trap* is a better answer to `focus trap` than a paragraph mentioning one —
 * and because a term is allowed to land in any of them: `dialog focus` should
 * find the dialog's focus section, whose title holds one word and whose body
 * holds the other.
 */
interface RankedText {
  readonly document: string;
  readonly section: string;
  readonly group: string;
  readonly body: string;
}

export interface SearchEntry {
  readonly kind: SearchKind;
  /** What the palette shows: a document's title, or `Document › Section`. */
  readonly title: string;
  readonly group: string;
  readonly path: string;
  /** The text a snippet is cut from — a section's content, a document's lede. */
  readonly body: string;
  readonly ranked: RankedText;
}

/** A run of text the palette renders, marked when a query term matched it. */
export interface SearchTextPart {
  readonly text: string;
  readonly match: boolean;
}

export interface SearchResult {
  readonly entry: SearchEntry;
  readonly score: number;
  readonly title: readonly SearchTextPart[];
  /** Empty when the entry carries no body — a document with no description. */
  readonly snippet: readonly SearchTextPart[];
}

/** The group label the palette files the site's own pages under. */
const SITE_GROUP = 'Introduction';

/** The group label the palette files every error code under. */
const ERROR_GROUP = 'Error codes';

/**
 * The two index pages the site serves beside its documents, under the title
 * and rail group the navigation gives them. Neither is compiled from a
 * document, so each states its own description here.
 */
const GUIDES_PAGE = {
  title: 'Guides',
  description:
    'Cross-cutting documentation that spans primitives: how to style a headless library, how to ' +
    'wrap primitives in a design system, and the deeper table and virtualization compositions.',
};
const ERRORS_PAGE = {
  title: 'Error codes',
  description:
    'Every FORCDK-<AREA>-<NNN> code forty-cdk reports, with what causes it and how to fix it.',
};
const REFERENCE_GROUP = 'Reference';

/**
 * What one term is worth in each field, highest first.
 *
 * A term scores in the best field it appears in, and the entry's score is the
 * sum over terms — so a two-word query matching a title and a body outranks one
 * matching two bodies, which is the ordering
 * [#1813](https://github.com/tutkli/forty-cdk/issues/1813) asks for.
 */
const FIELD_SCORE = { document: 8, section: 5, group: 3, body: 1 } as const;

/** A document whose title *starts* with the term is what the reader typed. */
const TITLE_PREFIX_BONUS = 4;

/**
 * Added once per entry, so a document outranks its own sections on a tie.
 *
 * A reader typing "install" wants the installation page, not the first
 * primitive whose README mentions installing
 * ([#1812](https://github.com/tutkli/forty-cdk/issues/1812)).
 */
const KIND_SCORE: Record<SearchKind, number> = {
  page: 3,
  primitive: 2,
  guide: 2,
  section: 0,
  error: 0,
};

/** Characters of body text a result shows, and how much of it precedes the match. */
const SNIPPET_LENGTH = 150;
const SNIPPET_LEAD = 40;

/**
 * The palette's entries, with every section read from the compiled document
 * model ([#1806](https://github.com/tutkli/forty-cdk/issues/1806)).
 *
 * Sections used to come from `gen-search-index.mjs`, which split documents into
 * sections a second time, independently of the parser the pages rendered with.
 * Two traversals of one corpus drift, and when they drift the palette links at
 * anchors the page does not carry — so there is now one.
 *
 * `index` is the half that arrives late: it is loaded on demand
 * ([#1813](https://github.com/tutkli/forty-cdk/issues/1813)), so calling this
 * with an empty one yields the documents alone, which is what the palette shows
 * while the body index is still in flight. Once it arrives, a document also
 * matches on its intro, and every error code is an entry of its own
 * ([#2329](https://github.com/tutkli/forty-cdk/issues/2329)): a code pasted
 * from the console is the most precise query a reader ever types.
 *
 * The site's own pages are indexed first, because insertion order breaks ties
 * between equally-scored entries.
 */
export function buildSearchEntries(
  groups: readonly DocsGroup[],
  index: SearchIndex,
  guideGroups: readonly ResolvedGuideGroup[],
  sitePages: readonly SitePageMeta[] = [],
): SearchEntry[] {
  const documentEntries = (
    kind: DocIndexEntry['kind'],
    meta: { readonly slug: string; readonly title: string; readonly description: string },
    group: string,
    path: string,
  ): readonly SearchEntry[] => {
    const indexed = index.documents.find(
      (entry) => entry.kind === kind && entry.slug === meta.slug,
    );
    return [
      documentEntry(kind, meta, group, path, indexed?.intro ?? ''),
      ...(indexed?.sections ?? []).map((section) => sectionEntry(meta.title, group, path, section)),
    ];
  };

  const entries: SearchEntry[] = [];
  for (const page of sitePages) {
    entries.push(...documentEntries('page', page, SITE_GROUP, `/${page.slug}`));
  }
  entries.push(documentEntry('page', GUIDES_PAGE, 'Guides', '/guides'));
  for (const group of guideGroups) {
    const label = `Guides · ${group.label}`;
    for (const guide of group.guides) {
      entries.push(...documentEntries('guide', guide, label, `/guides/${guide.slug}`));
    }
  }
  for (const group of groups) {
    for (const primitive of group.primitives) {
      entries.push(...documentEntries('primitive', primitive, group.label, `/${primitive.slug}`));
    }
  }
  entries.push(documentEntry('page', ERRORS_PAGE, REFERENCE_GROUP, '/errors'));
  entries.push(...index.errorCodes.map(errorEntry));
  return entries;
}

/**
 * The body index, as its own chunk.
 *
 * Every section's text is 97 kB gzipped, and the palette is reachable from
 * every route — so importing it statically would put it in the initial bundle,
 * which every reader downloads and most never search from. The
 * dynamic import is the whole mechanism: it is what makes the index a chunk the
 * bundler emits separately and the palette asks for once, when a reader first
 * opens it ([#1813](https://github.com/tutkli/forty-cdk/issues/1813)). The
 * error roster is reached the same way, and is the chunk the `/errors` pages
 * already load.
 */
export async function loadSearchIndex(): Promise<SearchIndex> {
  const [{ DOC_INDEX }, { ERROR_CODE_INDEX }] = await Promise.all([
    import('../../generated/doc-index.generated'),
    import('./error-codes'),
  ]);
  return { documents: DOC_INDEX, errorCodes: ERROR_CODE_INDEX };
}

/**
 * The entries a query matches, best first.
 *
 * Every term has to match *somewhere*, but not in the same field: the old
 * behaviour required every word of a query to appear in one haystack of title
 * and group, which is why a query spanning a title and a body — the normal
 * case — returned nothing at all.
 */
export function searchEntries(entries: readonly SearchEntry[], query: string): SearchResult[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) {
    return entries
      .filter((entry) => entry.kind !== 'section' && entry.kind !== 'error')
      .map((entry) => ({
        entry,
        score: 0,
        title: [{ text: entry.title, match: false }],
        snippet: [],
      }));
  }

  const results: SearchResult[] = [];
  for (const entry of entries) {
    let score = KIND_SCORE[entry.kind];
    for (const term of terms) {
      const termScore = scoreTerm(entry.ranked, term);
      if (termScore === 0) {
        score = 0;
        break;
      }
      score += termScore;
    }
    if (score > 0) {
      results.push({
        entry,
        score,
        title: highlight(entry.title, terms),
        snippet: snippetOf(entry, terms),
      });
    }
  }
  return results.sort((a, b) => b.score - a.score);
}

function documentEntry(
  kind: DocIndexEntry['kind'],
  meta: { readonly title: string; readonly description: string },
  group: string,
  path: string,
  intro = '',
): SearchEntry {
  const body = intro === '' ? meta.description : `${meta.description} ${intro}`;
  return {
    kind,
    title: meta.title,
    group,
    path,
    body,
    ranked: {
      document: meta.title.toLowerCase(),
      section: '',
      group: group.toLowerCase(),
      body: body.toLowerCase(),
    },
  };
}

function errorEntry(entry: ErrorCodeEntry): SearchEntry {
  const body = entry.cause === null ? entry.message : `${entry.message} ${entry.cause}`;
  return {
    kind: 'error',
    title: entry.code,
    group: ERROR_GROUP,
    path: `/errors/${entry.code}`,
    body,
    ranked: {
      document: entry.code.toLowerCase(),
      section: '',
      group: ERROR_GROUP.toLowerCase(),
      body: body.toLowerCase(),
    },
  };
}

function sectionEntry(
  title: string,
  group: string,
  path: string,
  section: DocIndexSection,
): SearchEntry {
  return {
    kind: 'section',
    title: `${title} › ${section.title}`,
    group,
    path: `${path}#${section.slug}`,
    body: section.text,
    ranked: {
      document: title.toLowerCase(),
      section: section.title.toLowerCase(),
      group: group.toLowerCase(),
      body: section.text.toLowerCase(),
    },
  };
}

function scoreTerm(ranked: RankedText, term: string): number {
  if (ranked.document.includes(term)) {
    return FIELD_SCORE.document + (ranked.document.startsWith(term) ? TITLE_PREFIX_BONUS : 0);
  }
  if (ranked.section.includes(term)) {
    return FIELD_SCORE.section;
  }
  if (ranked.group.includes(term)) {
    return FIELD_SCORE.group;
  }
  return ranked.body.includes(term) ? FIELD_SCORE.body : 0;
}

/**
 * The body around the first term that matched, cut at word boundaries.
 *
 * A body match is only legible if the reader can see it, which is what the
 * ellipses on either side say: this is the middle of a paragraph, and the run
 * marked `match` is the words you typed.
 */
function snippetOf(entry: SearchEntry, terms: readonly string[]): readonly SearchTextPart[] {
  if (entry.body === '') {
    return [];
  }
  const at = firstMatch(entry.ranked.body, terms);
  const from = at <= SNIPPET_LEAD ? 0 : wordStart(entry.body, at - SNIPPET_LEAD);
  const to =
    from + SNIPPET_LENGTH >= entry.body.length
      ? entry.body.length
      : wordEnd(entry.body, from + SNIPPET_LENGTH);
  return [
    ...(from > 0 ? [{ text: '…', match: false }] : []),
    ...highlight(entry.body.slice(from, to), terms),
    ...(to < entry.body.length ? [{ text: '…', match: false }] : []),
  ];
}

function firstMatch(haystack: string, terms: readonly string[]): number {
  let found = -1;
  for (const term of terms) {
    const at = haystack.indexOf(term);
    if (at !== -1 && (found === -1 || at < found)) {
      found = at;
    }
  }
  return found === -1 ? 0 : found;
}

function wordStart(text: string, at: number): number {
  const space = text.lastIndexOf(' ', at);
  return space === -1 ? 0 : space + 1;
}

function wordEnd(text: string, at: number): number {
  const space = text.indexOf(' ', at);
  return space === -1 ? text.length : space;
}

/** Split text into runs, marking every occurrence of any query term. */
function highlight(text: string, terms: readonly string[]): readonly SearchTextPart[] {
  const lower = text.toLowerCase();
  const found: { start: number; end: number }[] = [];
  for (const term of terms) {
    for (let at = lower.indexOf(term); at !== -1; at = lower.indexOf(term, at + term.length)) {
      found.push({ start: at, end: at + term.length });
    }
  }
  if (found.length === 0) {
    return [{ text, match: false }];
  }

  const merged: { start: number; end: number }[] = [];
  for (const range of found.sort((a, b) => a.start - b.start)) {
    const last = merged.at(-1);
    if (last !== undefined && range.start <= last.end) {
      last.end = Math.max(last.end, range.end);
    } else {
      merged.push({ ...range });
    }
  }

  const parts: SearchTextPart[] = [];
  let at = 0;
  for (const range of merged) {
    if (range.start > at) {
      parts.push({ text: text.slice(at, range.start), match: false });
    }
    parts.push({ text: text.slice(range.start, range.end), match: true });
    at = range.end;
  }
  if (at < text.length) {
    parts.push({ text: text.slice(at), match: false });
  }
  return parts;
}
