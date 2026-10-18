import { STYLE_RULES } from './testing/style-rules';

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

const HIGHLIGHTED_SELECTORS = STYLE_RULES.flatMap((rule) =>
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
    const paired = STYLE_RULES.flatMap((rule) => {
      if (!rule.selectors.some((selector) => selector.includes(HIGHLIGHTED))) return [];
      return rule.selectors
        .filter((selector) => selector.includes(':hover') && !selector.includes(HIGHLIGHTED))
        .map((selector) => `${rule.path}: ${selector}`);
    });
    expect(paired.filter((entry) => !HOVER_WITHOUT_POINTER_CHANNEL.has(entry))).toEqual([]);
  });

  it('keeps every hover exemption backed by a rule that still pairs the two', () => {
    const paired = new Set(
      STYLE_RULES.flatMap((rule) => rule.selectors.map((selector) => `${rule.path}: ${selector}`)),
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
