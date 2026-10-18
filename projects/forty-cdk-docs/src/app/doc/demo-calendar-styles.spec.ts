import { provideZonelessChangeDetection } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { flush } from '../../../../forty-cdk/src/test-utils/flush';
import { DEMO_EXAMPLES } from './testing/demo-examples.generated';
import { EXAMPLE_SOURCES, STYLE_RULES } from './testing/style-rules';

const NAV_BUTTON = /<button\b[^>]*\bforCalendar(?:Prev|Next)Button\b[^>]*>/g;

const CLASS_LIST = /\bclass="([^"]*)"/;

const NAV_EXAMPLE_FLOOR = 10;

const OUTSIDE_MONTH = '[data-outside-month]';

const NOT_SELECTED = ':not([data-selected])';

const FADE = /(?:^|;)\s*(?:opacity|color)\s*:/;

const OUTSIDE_MONTH_FADE_FLOOR = 10;

interface NavClass {
  readonly path: string;
  readonly className: string;
}

function navClassesOf(path: string, source: string): NavClass[] {
  const classes = [...source.matchAll(NAV_BUTTON)].flatMap(
    ([tag]) => CLASS_LIST.exec(tag)?.[1]!.split(/\s+/).filter(Boolean) ?? [],
  );
  return [...new Set(classes)].map((className) => ({ path, className }));
}

function keysOn(selector: string, className: string, attribute: string): boolean {
  return new RegExp(`\\.${className}(?![\\w-])[^\\s>+~]*\\[${attribute}\\]`).test(selector);
}

function selectorsOf(path: string): readonly string[] {
  return STYLE_RULES.filter((rule) => rule.path === path).flatMap((rule) => rule.selectors);
}

const NAV_CLASSES: readonly NavClass[] = EXAMPLE_SOURCES.flatMap(({ path, source }) =>
  navClassesOf(path, source),
);

const OUTSIDE_MONTH_FADES = STYLE_RULES.filter((rule) => FADE.test(rule.declarations)).flatMap(
  (rule) =>
    rule.selectors
      .filter((selector) => selector.includes(OUTSIDE_MONTH))
      .map((selector) => ({ path: rule.path, selector })),
);

async function render(
  path: string,
): Promise<{ host: HTMLElement; fixture: ComponentFixture<unknown> }> {
  const example = DEMO_EXAMPLES.find((candidate) => candidate.path === path)!;
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  const fixture = TestBed.createComponent(example.component);
  await flush(fixture);
  return { host: fixture.nativeElement as HTMLElement, fixture };
}

describe('the calendar and date-picker demos style the states their pieces emit', () => {
  it('finds the prev / next buttons of every example that renders them', () => {
    expect(new Set(NAV_CLASSES.map(({ path }) => path)).size).toBeGreaterThanOrEqual(
      NAV_EXAMPLE_FLOOR,
    );
  });

  it('never keys the prev / next buttons on the native disabled attribute they never emit', () => {
    const native = NAV_CLASSES.flatMap(({ path, className }) =>
      selectorsOf(path)
        .filter((selector) => keysOn(selector, className, 'disabled'))
        .map((selector) => `${path}: ${selector}`),
    );
    expect(native).toEqual([]);
  });

  it('paints the bound a prev / next button reaches through data-disabled', () => {
    const unstyled = NAV_CLASSES.filter(
      ({ path, className }) =>
        !selectorsOf(path).some((selector) => keysOn(selector, className, 'data-disabled')),
    ).map(({ path, className }) => `${path}: .${className}`);
    expect(unstyled).toEqual([]);
  });

  it('finds the outside-month fade in the examples and the README styling fences', () => {
    expect(OUTSIDE_MONTH_FADES.length).toBeGreaterThanOrEqual(OUTSIDE_MONTH_FADE_FLOOR);
    expect(OUTSIDE_MONTH_FADES.some(({ path }) => path.endsWith('/README.md'))).toBe(true);
  });

  it('never fades an outside-month day that is selected, so the filled cell keeps its contrast', () => {
    const stacked = OUTSIDE_MONTH_FADES.filter(
      ({ selector }) => !selector.includes(NOT_SELECTED),
    ).map(({ path, selector }) => `${path}: ${selector}`);
    expect(stacked).toEqual([]);
  });

  it('dims the Constraints demo Previous button at its min bound', async () => {
    const { host } = await render('calendar/examples/constraints.example.ts');
    const previous = host.querySelector<HTMLElement>('[forCalendarPrevButton]')!;
    expect({
      ariaDisabled: previous.getAttribute('aria-disabled'),
      dataDisabled: previous.hasAttribute('data-disabled'),
      nativeDisabled: previous.hasAttribute('disabled'),
      opacity: getComputedStyle(previous).opacity,
      cursor: getComputedStyle(previous).cursor,
    }).toEqual({
      ariaDisabled: 'true',
      dataDisabled: true,
      nativeDisabled: false,
      opacity: '0.4',
      cursor: 'not-allowed',
    });
  });

  it('keeps the hero demo selected day opaque once it pads the next month', async () => {
    const { host, fixture } = await render('calendar/examples/default.example.ts');
    let padded: HTMLElement | null = null;
    for (let month = 0; month < 3 && padded === null; month++) {
      const inMonth = host.querySelectorAll<HTMLElement>(
        '[forCalendarCell]:not([data-outside-month])',
      );
      inMonth[inMonth.length - 1]!.click();
      await flush(fixture);
      host.querySelector<HTMLElement>('[forCalendarNextButton]')!.click();
      await flush(fixture);
      padded = host.querySelector<HTMLElement>('[data-selected][data-outside-month]');
    }
    expect(getComputedStyle(padded!).opacity).toBe('1');
  });
});
