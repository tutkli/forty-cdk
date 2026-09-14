import { headingText } from '../../../../../scripts/docs/doc-render.mjs';
import { LIBRARY } from '../../generated/primitives.generated';
import { compile } from '../doc/testing/compile';
import { PRIMITIVE_DOCS } from '../doc/testing/doc-corpus';
import { DOCS_GROUPS, primitiveBySlug } from '../primitives';

/**
 * The landing page's catalogue, CTA and maturity line
 * ([#1919](https://github.com/tutkli/forty-cdk/issues/1919)).
 *
 * The site's unit target cannot mount a component, so the page is read as text
 * the way `theme-bootstrap.spec.ts` reads `index.html`, and the rendered HTML is
 * held to the registry by `scripts/check-prerender-output.mjs`. What this file
 * states is the half the emit cannot: that the data the page renders is the data
 * the rail and the page headers render, and that the manifest is its source.
 */
const HOME_PAGE = import.meta.glob('/projects/forty-cdk-docs/src/app/pages/home.page.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const LANDING_INDEX = import.meta.glob('/projects/forty-cdk-docs/src/app/ui/landing-index.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const APP_NAV = import.meta.glob('/projects/forty-cdk-docs/src/app/ui/app-nav.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const LIBRARY_MANIFEST = import.meta.glob('/projects/forty-cdk/package.json', {
  query: '?raw',
  import: 'default',
  eager: true,
});

function source(files: Record<string, string>, path: string): string {
  const text = files[path];
  if (text === undefined || text.length === 0) {
    throw new Error(`${path} read back empty — the landing page cannot be asserted`);
  }
  return text;
}

const home = source(HOME_PAGE, '/projects/forty-cdk-docs/src/app/pages/home.page.ts');
const index = source(LANDING_INDEX, '/projects/forty-cdk-docs/src/app/ui/landing-index.ts');
const nav = source(APP_NAV, '/projects/forty-cdk-docs/src/app/ui/app-nav.ts');
const manifest = JSON.parse(source(LIBRARY_MANIFEST, '/projects/forty-cdk/package.json')) as {
  readonly version: string;
  readonly license: string;
  readonly peerDependencies: Record<string, string>;
};

/**
 * Spelled in two halves: the unit-test builder's compiler plugin reads a spec's
 * raw text, and a file naming the Angular core package is one it insists on
 * compiling as component metadata.
 */
const ANGULAR_CORE = ['@angular', 'core'].join('/');

function compiledDescription(slug: string): string {
  const doc = PRIMITIVE_DOCS.find((candidate) => candidate.slug === slug);
  if (doc === undefined) {
    throw new Error(`no README for ${slug} — the description cannot be compared`);
  }
  const { lede } = compile(doc);
  if (lede === null) {
    throw new Error(`${doc.path} compiles with no lede`);
  }
  return headingText(lede).replace(/\s+/g, ' ').trim();
}

const REGISTRY_IMPORT = /import \{[^}]*\bDOCS_GROUPS\b[^}]*\} from '\.\.\/primitives';/;

describe('the landing catalogue', () => {
  it('iterates the groups the rail iterates, read from the one registry both import', () => {
    expect(index).toMatch(REGISTRY_IMPORT);
    expect(nav).toMatch(REGISTRY_IMPORT);
    expect(index).toContain('@for (group of groups; track group.id)');
    expect(index).toContain('{{ group.label }}');
    expect(index).toContain('@for (item of group.primitives; track item.slug)');
  });

  it('describes each entry, in a tooltip on its link, with the lede its own page header shows', () => {
    expect(index).toMatch(
      /<a forTooltipTrigger \[routerLink\]="\['\/', item\.slug\]">\{\{ item\.title \}\}<\/a>/,
    );
    expect(index).toMatch(/<div forTooltipContent[^>]*>\s*\{\{ item\.description \}\}/);

    const accordion = primitiveBySlug('accordion');
    const breakpoints = primitiveBySlug('breakpoints');
    expect(accordion.description).toBe(compiledDescription('accordion'));
    expect(breakpoints.description).toBe(compiledDescription('breakpoints'));
  });

  it('groups a utility apart from the primitives, under the label the rail uses', () => {
    const labelOf = (slug: string) =>
      DOCS_GROUPS.find((group) => group.primitives.some((item) => item.slug === slug))?.label;

    expect(DOCS_GROUPS.map((group) => group.label)).toEqual(['Primitives', 'Utilities']);
    expect(labelOf('accordion')).toBe('Primitives');
    expect(labelOf('breakpoints')).toBe('Utilities');
  });

  it('is what "Browse all" resolves to, on the same page', () => {
    const cta = /<a class="btn" \[routerLink\]="\[\]" fragment="index-heading">\s*Browse all/;

    expect(home).toMatch(cta);
    expect(home).toContain('injectFragmentScroll();');
    expect(home).not.toContain('firstPrimitive');
    expect(index).toContain('<h2 id="index-heading">');
  });
});

describe('the maturity line', () => {
  it('reads the version, the Angular range and the licence the package manifest states', () => {
    expect(LIBRARY.version).toBe(manifest.version);
    expect(LIBRARY.angular).toBe(manifest.peerDependencies[ANGULAR_CORE]);
    expect(LIBRARY.license).toBe(manifest.license);
  });

  it('renders all three from the registry and links pre-1.0 to the changelog', () => {
    expect(home).toContain('v{{ library.version }}');
    expect(home).toContain('Angular {{ library.angular }}');
    expect(home).toContain('{{ library.license }}');
    expect(home).toContain('@if (preRelease) {');
    expect(home).toContain("readonly preRelease = LIBRARY.version.startsWith('0.')");
    expect(home).toContain('${GITHUB_BLOB_BASE}CHANGELOG.md');
  });
});

describe('the Why grid', () => {
  const grid = /<div class="why-grid">([\s\S]*?)<\/section>/.exec(home);
  const titles = [...(grid?.[1] ?? '').matchAll(/<h3>([^<]+)<\/h3>/g)].map((match) =>
    match[1]!.trim(),
  );

  it('leads with the three consumer-facing items', () => {
    expect(titles.slice(0, 3)).toEqual([
      'Styleless by design',
      'Composed, not configured',
      'Accessibility is the API',
    ]);
  });

  it('keeps six items, none added and none removed', () => {
    expect(titles).toHaveLength(6);
    expect(new Set(titles).size).toBe(6);
  });
});
