const EXAMPLE_FILES = import.meta.glob('/projects/forty-cdk-docs/src/app/demos/**/*.example.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const README_FILES = import.meta.glob('/projects/forty-cdk/*/README.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const DEMOS_ROOT = 'projects/forty-cdk-docs/src/app/demos/';

const LIBRARY_ROOT = 'projects/forty-cdk/';

const STYLES_BLOCK = /styles:\s*`([^`]*)`/g;

const CSS_FENCE = /^```css\n([\s\S]*?)^```/gm;

const RULE = /([^{}]+)\{[^{}]*\}/g;

const HIGHLIGHTED = '[data-highlighted]';

const HIGHLIGHTED_SELECTOR_FLOOR = 60;

const README_HIGHLIGHTED_SELECTOR_FLOOR = 6;

const CLOSES_ON_BLUR: ReadonlyMap<string, string> = new Map([
  ['combobox', 'the listbox is an overlay that closes when focus leaves the combobox'],
  ['context-menu', 'the menu is an overlay that closes when focus leaves it'],
  ['dropdown-menu', 'the menu is an overlay that closes when focus leaves it'],
  ['menu', 'the menu is an overlay that closes when focus leaves it'],
  ['menubar', 'every bar menu is an overlay that closes when focus leaves it'],
  ['select', 'the listbox is an overlay that closes when focus leaves the select'],
  ['time-picker', 'the slot list is an overlay that closes when focus leaves the picker'],
]);

const HOVER_WITHOUT_POINTER_CHANNEL: ReadonlyMap<string, string> = new Map([
  [
    'combobox/examples/create-action.example.ts: .ca-combobox-action:hover',
    '[forComboboxAction] reflects data-highlighted from DOM focus only, so hover is its one pointer cue',
  ],
]);

interface StyleRule {
  readonly path: string;
  readonly selectors: readonly string[];
}

function splitSelectorList(list: string): string[] {
  const selectors: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < list.length; i++) {
    const char = list[i];
    if (char === '(') depth++;
    else if (char === ')') depth--;
    else if (char === ',' && depth === 0) {
      selectors.push(list.slice(start, i));
      start = i + 1;
    }
  }
  selectors.push(list.slice(start));
  return selectors.map((selector) => selector.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

function rulesOf(path: string, source: string, block: RegExp): StyleRule[] {
  const rules: StyleRule[] = [];
  for (const match of source.replace(/\r\n/g, '\n').matchAll(block)) {
    const css = match[1]!.replace(/\/\*[\s\S]*?\*\//g, '');
    for (const rule of css.matchAll(RULE)) {
      const prelude = rule[1]!.trim();
      if (prelude.startsWith('@')) continue;
      rules.push({ path, selectors: splitSelectorList(prelude) });
    }
  }
  return rules;
}

function rulesFrom(
  files: Record<string, string>,
  base: string,
  block: RegExp,
): readonly StyleRule[] {
  return Object.entries(files)
    .map(([key, source]) => ({ path: key.slice(1 + base.length), source }))
    .sort((a, b) => a.path.localeCompare(b.path))
    .flatMap(({ path, source }) => rulesOf(path, source, block));
}

const RULES: readonly StyleRule[] = [
  ...rulesFrom(EXAMPLE_FILES, DEMOS_ROOT, STYLES_BLOCK),
  ...rulesFrom(README_FILES, LIBRARY_ROOT, CSS_FENCE),
];

const HIGHLIGHTED_SELECTORS = RULES.flatMap((rule) =>
  rule.selectors
    .filter((selector) => selector.includes(HIGHLIGHTED))
    .map((selector) => ({ path: rule.path, selector })),
);

function demoOf(path: string): string {
  return path.slice(0, path.indexOf('/'));
}

describe('the docs demos and README styling fences style data-highlighted as the highlight it is', () => {
  it('scans every example rule and README fence that styles the attribute', () => {
    const fromReadmes = HIGHLIGHTED_SELECTORS.filter(({ path }) => path.endsWith('/README.md'));
    expect(HIGHLIGHTED_SELECTORS.length - fromReadmes.length).toBeGreaterThan(
      HIGHLIGHTED_SELECTOR_FLOOR,
    );
    expect(fromReadmes.length).toBeGreaterThan(README_HIGHLIGHTED_SELECTOR_FLOOR);
  });

  it('never pairs the attribute with a :hover rule, since the pointer already moves it', () => {
    const paired = RULES.flatMap((rule) => {
      if (!rule.selectors.some((selector) => selector.includes(HIGHLIGHTED))) return [];
      return rule.selectors
        .filter((selector) => selector.includes(':hover') && !selector.includes(HIGHLIGHTED))
        .map((selector) => `${rule.path}: ${selector}`);
    });
    expect(paired.filter((entry) => !HOVER_WITHOUT_POINTER_CHANNEL.has(entry))).toEqual([]);
  });

  it('keeps every hover exemption backed by a rule that still pairs the two', () => {
    const paired = new Set(
      RULES.flatMap((rule) => rule.selectors.map((selector) => `${rule.path}: ${selector}`)),
    );
    expect([...HOVER_WITHOUT_POINTER_CHANNEL.keys()].filter((entry) => !paired.has(entry))).toEqual(
      [],
    );
  });

  it('scopes the attribute to :focus-within wherever it outlives the focus that set it', () => {
    const unscoped = HIGHLIGHTED_SELECTORS.filter(({ path, selector }) => {
      if (CLOSES_ON_BLUR.has(demoOf(path))) return false;
      const scope = selector.indexOf(':focus-within');
      return scope === -1 || scope > selector.indexOf(HIGHLIGHTED);
    }).map(({ path, selector }) => `${path}: ${selector}`);
    expect(unscoped).toEqual([]);
  });

  it('exempts only demos that still style the attribute', () => {
    const demos = new Set(HIGHLIGHTED_SELECTORS.map(({ path }) => demoOf(path)));
    expect([...CLOSES_ON_BLUR.keys()].filter((demo) => !demos.has(demo))).toEqual([]);
  });
});
