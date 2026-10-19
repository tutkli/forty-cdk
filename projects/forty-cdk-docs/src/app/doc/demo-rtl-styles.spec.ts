import { EXAMPLE_SOURCES, STYLE_RULES } from './testing/style-rules';

const RTL_TEMPLATE = /\bdir="rtl"|\[dir\]="'rtl'"/;

const PHYSICAL_TEXT_ALIGN = /\btext-align:\s*(left|right)\b/;

const RTL_EXAMPLE_FLOOR = 1;

const RTL_EXAMPLES = new Set(
  EXAMPLE_SOURCES.filter(({ source }) => RTL_TEMPLATE.test(source)).map(({ path }) => path),
);

describe('the docs demos that render right to left align text by its logical edge', () => {
  it('finds the examples that render a right-to-left surface', () => {
    expect(RTL_EXAMPLES.size).toBeGreaterThanOrEqual(RTL_EXAMPLE_FLOOR);
  });

  it('never aligns their text with a physical left or right', () => {
    const physical = STYLE_RULES.filter(
      ({ path, declarations }) => RTL_EXAMPLES.has(path) && PHYSICAL_TEXT_ALIGN.test(declarations),
    ).map(({ path, selectors }) => `${path}: ${selectors.join(', ')}`);
    expect(physical).toEqual([]);
  });
});
