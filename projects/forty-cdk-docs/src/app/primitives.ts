import { PRIMITIVES, UTILITIES } from '../generated/primitives.generated';

export interface DocsPrimitive {
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly apgUrl?: string;
}

export interface DocsGroup {
  readonly label: string;
  readonly primitives: readonly DocsPrimitive[];
}

/**
 * The navigation registry, generated from the frontmatter each entry point's
 * README declares ([#1808](https://github.com/tutkli/forty-cdk/issues/1808)).
 *
 * Nothing here is authored: a primitive appears because its README says which
 * group it belongs to, and its description is that README's own lede. Adding an
 * entry point to the site is therefore a frontmatter block, and there is no
 * second copy of a title or a description to fall out of step.
 */
export const DOCS_GROUPS: readonly DocsGroup[] = [
  { label: 'Primitives', primitives: PRIMITIVES },
  { label: 'Utilities', primitives: UTILITIES },
];

export function primitiveBySlug(slug: string): DocsPrimitive {
  for (const group of DOCS_GROUPS) {
    const found = group.primitives.find((primitive) => primitive.slug === slug);
    if (found) {
      return found;
    }
  }
  throw new Error(`[docs] unknown primitive slug: ${slug}`);
}
