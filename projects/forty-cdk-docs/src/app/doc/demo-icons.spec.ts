const EXAMPLE_FILES = import.meta.glob('/projects/forty-cdk-docs/src/app/demos/**/*.example.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
});

interface Example {
  readonly path: string;
  readonly source: string;
}

const EXAMPLES: readonly Example[] = Object.entries(EXAMPLE_FILES)
  .map(([key, source]) => ({ path: key.slice(1), source }))
  .sort((a, b) => a.path.localeCompare(b.path));

const EXAMPLE_FLOOR = 170;

const SUBSTITUTING_GLYPHS: readonly string[] = ['‹', '›', '▶', '⏸'];

const SVG_TAG = /<svg\b[^>]*>/g;

describe('the marks a demo example draws inside a control', () => {
  it('reads every example the site publishes, not a fraction of them', () => {
    expect(EXAMPLES.length).toBeGreaterThanOrEqual(EXAMPLE_FLOOR);
  });

  it('draws none of them with a character the site font carries no cut for', () => {
    const drawn = EXAMPLES.filter((example) =>
      SUBSTITUTING_GLYPHS.some((glyph) => example.source.includes(glyph)),
    ).map((example) => example.path);

    expect(drawn).toEqual([]);
  });

  it('hides every inline icon it draws instead, so the control keeps its own name', () => {
    const exposed = EXAMPLES.flatMap((example) =>
      [...example.source.matchAll(SVG_TAG)]
        .map((match) => match[0])
        .filter((tag) => !tag.includes('xmlns='))
        .filter((tag) => !tag.includes('aria-hidden="true"'))
        .map(() => example.path),
    );

    expect(exposed).toEqual([]);
  });
});
