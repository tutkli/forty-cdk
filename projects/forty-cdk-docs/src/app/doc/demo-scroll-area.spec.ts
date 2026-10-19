import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { installObserverPolyfills } from 'forty-cdk/testing';

import { flush } from '../../../../forty-cdk/src/test-utils/flush';
import { accessibleName, roleOf } from './testing/accessible-name';
import { DEMO_EXAMPLES } from './testing/demo-examples.generated';
import { README_SOURCES, STYLE_RULES } from './testing/style-rules';

const SCROLL_AREA_DEMOS = DEMO_EXAMPLES.filter((example) =>
  example.path.startsWith('scroll-area/'),
);

const POSITIONED = /(?:^|;)\s*position\s*:\s*(?:relative|absolute|fixed|sticky)\b/;

const INSET_RING = /(?:^|;)\s*(?:outline-offset\s*:\s*-|box-shadow\s*:[^;]*\binset\b)/;

const GRID_PLACEMENT = /(?:^|;)\s*grid-(?:column|row)\s*:/;

const INDENTED_CSS_FENCE = /^[ \t]*```css\n([\s\S]*?)^[ \t]*```/gm;

const RULE = /([^{}]+)\{([^{}]*)\}/g;

interface Rule {
  readonly selectors: readonly string[];
  readonly declarations: string;
}

async function render(path: string): Promise<HTMLElement> {
  const example = DEMO_EXAMPLES.find((candidate) => candidate.path === path)!;
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  const fixture = TestBed.createComponent(example.component);
  await flush(fixture);
  return fixture.nativeElement as HTMLElement;
}

function matches(el: Element, selector: string): boolean {
  try {
    return el.matches(selector);
  } catch {
    return false;
  }
}

function declarationsFor(el: Element, rules: readonly Rule[]): string[] {
  return rules
    .filter((rule) => rule.selectors.some((selector) => matches(el, selector)))
    .map((rule) => rule.declarations);
}

function focusVisibleDeclarationsFor(el: Element, rules: readonly Rule[]): string[] {
  return rules
    .filter((rule) =>
      rule.selectors.some(
        (selector) =>
          selector.endsWith(':focus-visible') &&
          matches(el, selector.slice(0, -':focus-visible'.length)),
      ),
    )
    .map((rule) => rule.declarations);
}

function rulesOfCss(css: string): Rule[] {
  return [...css.matchAll(RULE)].map((rule) => ({
    selectors: rule[1]!.split(',').map((selector) => selector.trim()),
    declarations: rule[2]!,
  }));
}

function scrollbar(orientation: 'vertical' | 'horizontal'): HTMLElement {
  const el = document.createElement('div');
  el.className = 'sa-scrollbar';
  el.setAttribute('data-orientation', orientation);
  return el;
}

const README_FENCES: readonly (readonly Rule[])[] = [
  ...README_SOURCES.find((file) => file.path === 'scroll-area/README.md')!.source.matchAll(
    INDENTED_CSS_FENCE,
  ),
].map((fence) => rulesOfCss(fence[1]!.replace(/\/\*[\s\S]*?\*\//g, '')));

const IN_FLOW_SCROLLBAR_FENCES = README_FENCES.filter((rules) =>
  rules.some(
    (rule) =>
      rule.selectors.some((selector) => selector.includes('scrollbar')) &&
      GRID_PLACEMENT.test(rule.declarations),
  ),
);

describe('the docs scroll-area demos', () => {
  let restoreObservers: () => void;

  beforeEach(() => {
    restoreObservers = installObserverPolyfills();
  });

  afterEach(() => {
    restoreObservers();
  });

  it('are all found, past a floor that catches an empty filter', () => {
    expect(SCROLL_AREA_DEMOS.length).toBeGreaterThanOrEqual(3);
  });

  it.each(SCROLL_AREA_DEMOS.map((example) => example.path))(
    '%s names the focusable viewport as a region',
    async (path) => {
      const host = await render(path);
      const viewports = [...host.querySelectorAll('[forScrollAreaViewport]')];
      expect(viewports.length).toBeGreaterThan(0);

      expect(
        viewports.map((viewport) => ({
          tabindex: viewport.getAttribute('tabindex'),
          role: roleOf(viewport),
          named: accessibleName(viewport).name !== '',
        })),
      ).toEqual(viewports.map(() => ({ tabindex: '0', role: 'region', named: true })));
    },
  );

  it.each(SCROLL_AREA_DEMOS.map((example) => example.path))(
    '%s positions every scrollbar so the absolutely positioned thumb anchors to its track',
    async (path) => {
      const host = await render(path);
      const rules = STYLE_RULES.filter((rule) => rule.path === path);
      const scrollbars = [...host.querySelectorAll('[forScrollAreaScrollbar]')];
      expect(scrollbars.length).toBeGreaterThan(0);

      const unpositioned = scrollbars
        .filter((el) => !declarationsFor(el, rules).some((css) => POSITIONED.test(css)))
        .map((el) => el.getAttribute('class'));
      expect(unpositioned).toEqual([]);
    },
  );

  it.each(SCROLL_AREA_DEMOS.map((example) => example.path))(
    '%s insets the viewport focus ring so the clipping root cannot cut it away',
    async (path) => {
      const host = await render(path);
      const rules = STYLE_RULES.filter((rule) => rule.path === path);
      const viewports = [...host.querySelectorAll('[forScrollAreaViewport]')];
      expect(viewports.length).toBeGreaterThan(0);

      const clipped = viewports
        .filter((el) => !focusVisibleDeclarationsFor(el, rules).some((css) => INSET_RING.test(css)))
        .map((el) => el.getAttribute('class'));
      expect(clipped).toEqual([]);
    },
  );
});

describe('the scroll-area README gutter snippet', () => {
  it('is found', () => {
    expect(IN_FLOW_SCROLLBAR_FENCES.length).toBeGreaterThanOrEqual(1);
  });

  it('positions both in-flow tracks so the absolutely positioned thumb anchors to them', () => {
    const unpositioned = IN_FLOW_SCROLLBAR_FENCES.flatMap((rules) =>
      (['vertical', 'horizontal'] as const).filter(
        (orientation) =>
          !declarationsFor(scrollbar(orientation), rules).some((css) => POSITIONED.test(css)),
      ),
    );
    expect(unpositioned).toEqual([]);
  });
});
