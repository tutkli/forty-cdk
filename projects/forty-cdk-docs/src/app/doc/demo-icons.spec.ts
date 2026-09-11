import { PRIMITIVE_DOCS } from './testing/doc-corpus';

const EXAMPLE_FILES = import.meta.glob('/projects/forty-cdk-docs/src/app/demos/**/*.example.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
});

interface IconSource {
  readonly path: string;
  readonly source: string;
}

const EXAMPLES: readonly IconSource[] = Object.entries(EXAMPLE_FILES)
  .map(([key, source]) => ({ path: key.slice(1), source }))
  .sort((a, b) => a.path.localeCompare(b.path));

const READMES: readonly IconSource[] = PRIMITIVE_DOCS.map((doc) => ({
  path: doc.path,
  source: doc.markdown,
}));

const EXAMPLE_FLOOR = 170;

const SUBSTITUTING_GLYPHS: readonly string[] = ['‹', '›', '▶', '⏸'];

const SVG_TAG = /<svg\b[^>]*>/g;

function drawnWithSubstitutedGlyph(sources: readonly IconSource[]): readonly string[] {
  return sources
    .filter((entry) => SUBSTITUTING_GLYPHS.some((glyph) => entry.source.includes(glyph)))
    .map((entry) => entry.path);
}

function iconsExposedToAssistiveTechnology(sources: readonly IconSource[]): readonly string[] {
  return sources.flatMap((entry) =>
    [...entry.source.matchAll(SVG_TAG)]
      .map((match) => match[0])
      .filter((tag) => !tag.includes('xmlns='))
      .filter((tag) => !tag.includes('aria-hidden="true"'))
      .map(() => entry.path),
  );
}

describe('the marks a demo example draws inside a control', () => {
  it('reads every example the site publishes, not a fraction of them', () => {
    expect(EXAMPLES.length).toBeGreaterThanOrEqual(EXAMPLE_FLOOR);
  });

  it('draws none of them with a character the site font carries no cut for', () => {
    expect(drawnWithSubstitutedGlyph(EXAMPLES)).toEqual([]);
  });

  it('hides every inline icon it draws instead, so the control keeps its own name', () => {
    expect(iconsExposedToAssistiveTechnology(EXAMPLES)).toEqual([]);
  });
});

describe('the marks an entry point README draws inside a control', () => {
  it('draws none of them with a character the site font carries no cut for', () => {
    expect(drawnWithSubstitutedGlyph(READMES)).toEqual([]);
  });

  it('hides every inline icon it draws instead, so the control keeps its own name', () => {
    expect(iconsExposedToAssistiveTechnology(READMES)).toEqual([]);
  });
});
