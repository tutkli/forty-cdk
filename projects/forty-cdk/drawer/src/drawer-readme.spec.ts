import { README_SOURCES } from '../../src/test-utils/source-scan';

const SNAP_ARRAY = /(?:\[snapPoints\]="|snapPoints: |ForDrawerSnapPoint> = )\[([^\]]+)\]/g;
const SNAP_SELECTOR = /data-active-snap-point='([^']*)'/g;

function reflectedSnapValues(markdown: string): ReadonlySet<string> {
  const values = new Set<string>();
  for (const match of markdown.matchAll(SNAP_ARRAY)) {
    for (const entry of match[1]!.split(',')) {
      const literal = entry.trim();
      values.add(
        literal.startsWith("'") ? literal.slice(1, -1) : String(Number.parseFloat(literal)),
      );
    }
  }
  return values;
}

describe('drawer README', () => {
  const markdown = README_SOURCES.get('drawer/README.md')!;

  it('styles every snap through a data-active-snap-point value its own snapPoints reflect', () => {
    const reflected = reflectedSnapValues(markdown);
    const selectors = [...markdown.matchAll(SNAP_SELECTOR)].map((match) => match[1]!);

    expect(reflected.size).toBeGreaterThanOrEqual(3);
    expect(selectors.length).toBeGreaterThanOrEqual(3);
    for (const selector of selectors) {
      expect(reflected, `data-active-snap-point='${selector}'`).toContain(selector);
    }
  });
});
