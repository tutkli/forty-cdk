import type { PlaygroundGroup } from '../primitives';
import type { ResolvedGuideGroup } from './guides';

export interface ReadmeSection {
  readonly title: string;
  readonly anchor: string;
}

export type ReadmeSections = Record<string, readonly ReadmeSection[]>;

export interface SearchEntry {
  readonly kind: 'primitive' | 'guide' | 'section';
  readonly title: string;
  readonly group: string;
  readonly path: string;
  readonly haystack: string;
}

export function buildSearchEntries(
  groups: readonly PlaygroundGroup[],
  sections: ReadmeSections,
  guideGroups: readonly ResolvedGuideGroup[],
): SearchEntry[] {
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
      for (const section of guide.sections) {
        entries.push({
          kind: 'section',
          title: `${guide.title} › ${section.title}`,
          group: label,
          path: `/guides/${guide.slug}#${section.anchor}`,
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
      for (const section of sections[primitive.slug] ?? []) {
        entries.push({
          kind: 'section',
          title: `${primitive.title} › ${section.title}`,
          group: group.label,
          path: `/${primitive.slug}#${section.anchor}`,
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
