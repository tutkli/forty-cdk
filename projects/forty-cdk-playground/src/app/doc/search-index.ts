import type { PlaygroundGroup } from '../primitives';
import type { DocIndexEntry, DocIndexSection } from './doc-model';
import type { ResolvedGuideGroup } from './guides';

export interface SearchEntry {
  readonly kind: 'primitive' | 'guide' | 'section';
  readonly title: string;
  readonly group: string;
  readonly path: string;
  readonly haystack: string;
}

/**
 * The palette's entries, with every section read from the compiled document
 * model ([#1806](https://github.com/tutkli/forty-cdk/issues/1806)).
 *
 * Sections used to come from `gen-search-index.mjs`, which split documents into
 * sections a second time, independently of the parser the pages rendered with.
 * Two traversals of one corpus drift, and when they drift the palette links at
 * anchors the page does not carry — so there is now one.
 */
export function buildSearchEntries(
  groups: readonly PlaygroundGroup[],
  index: readonly DocIndexEntry[],
  guideGroups: readonly ResolvedGuideGroup[],
): SearchEntry[] {
  const sectionsFor = (kind: DocIndexEntry['kind'], slug: string): readonly DocIndexSection[] =>
    index.find((entry) => entry.kind === kind && entry.slug === slug)?.sections ?? [];

  const entries: SearchEntry[] = [];
  for (const group of guideGroups) {
    const label = `Guides · ${group.label}`;
    for (const guide of group.guides) {
      entries.push({
        kind: 'guide',
        title: guide.title,
        group: label,
        path: `/guides/${guide.slug}`,
        haystack: `${guide.title} ${label} ${guide.description}`.toLowerCase(),
      });
      for (const section of sectionsFor('guide', guide.slug)) {
        entries.push({
          kind: 'section',
          title: `${guide.title} › ${section.title}`,
          group: label,
          path: `/guides/${guide.slug}#${section.slug}`,
          haystack: `${guide.title} ${section.title}`.toLowerCase(),
        });
      }
    }
  }
  for (const group of groups) {
    for (const primitive of group.primitives) {
      entries.push({
        kind: 'primitive',
        title: primitive.title,
        group: group.label,
        path: `/${primitive.slug}`,
        haystack: `${primitive.title} ${group.label} ${primitive.description}`.toLowerCase(),
      });
      for (const section of sectionsFor('primitive', primitive.slug)) {
        entries.push({
          kind: 'section',
          title: `${primitive.title} › ${section.title}`,
          group: group.label,
          path: `/${primitive.slug}#${section.slug}`,
          haystack: `${primitive.title} ${section.title}`.toLowerCase(),
        });
      }
    }
  }
  return entries;
}

export function filterSearchEntries(entries: readonly SearchEntry[], query: string): SearchEntry[] {
  const q = query.trim().toLowerCase();
  if (q === '') {
    return entries.filter((entry) => entry.kind !== 'section');
  }
  const terms = q.split(/\s+/);
  return entries.filter((entry) => terms.every((term) => entry.haystack.includes(term)));
}
