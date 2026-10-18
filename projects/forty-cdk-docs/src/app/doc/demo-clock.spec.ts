import { EXAMPLE_SOURCES } from './testing/style-rules';

const PAGE_FILES = import.meta.glob('/projects/forty-cdk-docs/src/app/demos/*/*.page.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const DEMO_BLOCK = /<demo-layout\b[^>]*\bsourcePath="([^"]+)"[^>]*>([\s\S]*?)<\/demo-layout>/g;

const CLOCK = /\btoday\(|\bnow\(|\bnew Date\(\s*\)|\bDate\.now\(/;

const CLIENT_ONLY = /^\s*@defer\s*\(\s*on immediate\s*\)\s*\{/;

const CLOCK_DEMO_FLOOR = 8;

const DEMOS = Object.values(PAGE_FILES).flatMap((page) =>
  [...page.replace(/\r\n/g, '\n').matchAll(DEMO_BLOCK)].map(([, path, body]) => ({
    path: path!,
    body: body!,
  })),
);

const CLOCK_DEMOS = DEMOS.filter(({ path }) =>
  CLOCK.test(EXAMPLE_SOURCES.find((example) => example.path === path)?.source ?? ''),
);

describe('the docs pages render a demo that reads the clock in the browser only', () => {
  it('resolves every demo block to its example source', () => {
    const known = new Set(EXAMPLE_SOURCES.map(({ path }) => path));
    expect(DEMOS.filter(({ path }) => !known.has(path)).map(({ path }) => path)).toEqual([]);
  });

  it('finds the demos that read the current date', () => {
    expect(CLOCK_DEMOS.length).toBeGreaterThanOrEqual(CLOCK_DEMO_FLOOR);
  });

  it('defers each of them, so no prerendered page ships the build day as today', () => {
    expect(
      CLOCK_DEMOS.filter(({ body }) => !CLIENT_ONLY.test(body)).map(({ path }) => path),
    ).toEqual([]);
  });
});
