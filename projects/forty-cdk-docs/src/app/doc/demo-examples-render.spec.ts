import { ErrorHandler, provideZonelessChangeDetection, reflectComponentType } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ForHoverCard } from 'forty-cdk/hover-card';
import { installObserverPolyfills, pressKey } from 'forty-cdk/testing';

import { flush } from '../../../../forty-cdk/src/test-utils/flush';
import { afterEachOverlayCleanup } from '../../../../forty-cdk/src/test-utils/overlay-cleanup';
import {
  accessibleName,
  AUTHOR_SOURCES,
  isExposed,
  labelText,
  namesFromContent,
  roleOf,
  visibleText,
} from './testing/accessible-name';
import { DEMO_EXAMPLES } from './testing/demo-examples.generated';

const EXAMPLE_FILES = import.meta.glob('/projects/forty-cdk-docs/src/app/demos/**/*.example.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const EXAMPLE_FLOOR = 170;

const DEMOS_ROOT = '/projects/forty-cdk-docs/src/app/demos/';

const NAME_REQUIRED: ReadonlySet<string> = new Set([
  'checkbox',
  'combobox',
  'img',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'meter',
  'progressbar',
  'radio',
  'region',
  'searchbox',
  'slider',
  'spinbutton',
  'switch',
  'textbox',
]);

const IMPLICIT_LANDMARKS: Readonly<Record<string, string>> = {
  main: 'main',
  aside: 'complementary',
  nav: 'navigation',
};

const PAGE_LEVEL_LANDMARKS: ReadonlySet<string> = new Set([
  'main',
  'complementary',
  'banner',
  'contentinfo',
]);

const FOCUSABLE =
  'a[href], button, input, select, textarea, summary, [tabindex], [contenteditable]';

type Example = (typeof DEMO_EXAMPLES)[number];

type Drive = (host: HTMLElement, fixture: ComponentFixture<unknown>) => Promise<void>;

const EXAMPLES: readonly Example[] = [...DEMO_EXAMPLES].sort((a, b) =>
  a.path.localeCompare(b.path),
);

function query<T extends Element>(host: HTMLElement, selector: string): T {
  const el = host.querySelector<T>(selector);
  if (el === null) {
    throw new Error(`no element matches ${selector}`);
  }
  return el;
}

async function type(
  input: HTMLInputElement,
  value: string,
  fixture: ComponentFixture<unknown>,
): Promise<void> {
  input.focus();
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await flush(fixture);
}

const DRIVES: Readonly<Record<string, Drive>> = {
  'combobox/examples/create-action.example.ts': async (host, fixture) => {
    await type(query(host, '[forComboboxInput]'), 'ops', fixture);
  },
  'combobox/examples/picker.example.ts': async (host, fixture) => {
    query<HTMLButtonElement>(host, '[forComboboxTrigger]').click();
    await flush(fixture);
  },
  'search/examples/field.example.ts': async (host, fixture) => {
    await type(query(host, '[forSearch]'), 'ab', fixture);
  },
  'avatar/examples/fallback.example.ts': async (host, fixture) => {
    query(host, '[forAvatarImage]').dispatchEvent(new Event('error'));
    await flush(fixture);
  },
  'menubar/examples/default.example.ts': async (host, fixture) => {
    query<HTMLButtonElement>(host, '[forMenubarTrigger][value="edit"]').click();
    await flush(fixture);
  },
  'dropdown-menu/examples/default.example.ts': async (host, fixture) => {
    query<HTMLButtonElement>(host, '[forDropdownMenuTrigger]').click();
    await flush(fixture);
  },
};

function describeElement(el: Element): string {
  const clone = el.cloneNode(false) as Element;
  return clone.outerHTML.replace(/\s_ng[a-z]+-[a-z0-9-]+(="")?/g, '');
}

function exposedWithRole(): { el: Element; role: string }[] {
  return [...document.body.querySelectorAll('*')]
    .map((el) => ({ el, role: roleOf(el) }))
    .filter((entry): entry is { el: Element; role: string } => entry.role !== null)
    .filter(({ el }) => isExposed(el));
}

interface Report {
  readonly errors: readonly unknown[];
  readonly unnamed: readonly string[];
  readonly comboboxesWithoutAuthorName: readonly string[];
  readonly ariaLabelsHidingVisibleLabel: readonly string[];
  readonly nativeDisabledBesideAriaDisabled: readonly string[];
  readonly landmarksNestedInPageMain: readonly string[];
}

function unnamed(): string[] {
  return exposedWithRole()
    .filter(({ role }) => NAME_REQUIRED.has(role))
    .filter(({ el }) => accessibleName(el).name === '')
    .map(({ el, role }) => `${role}: ${describeElement(el)}`);
}

function comboboxesWithoutAuthorName(): string[] {
  return exposedWithRole()
    .filter(({ role }) => role === 'combobox')
    .map(({ el }) => ({ el, name: accessibleName(el) }))
    .filter(({ name }) => name.source === null || !AUTHOR_SOURCES.has(name.source))
    .map(({ el, name }) => `${name.source ?? 'no name'} "${name.name}": ${describeElement(el)}`);
}

function ariaLabelsHidingVisibleLabel(): string[] {
  return exposedWithRole()
    .map(({ el, role }) => ({
      el,
      name: accessibleName(el),
      visible: labelText(el) || (namesFromContent(role) ? visibleText(el) : ''),
    }))
    .filter(({ name }) => name.source === 'aria-label')
    .filter(({ visible }) => /\p{L}/u.test(visible))
    .filter(({ name, visible }) => !name.name.toLowerCase().includes(visible.toLowerCase()))
    .map(({ el, name, visible }) => `"${name.name}" hides "${visible}": ${describeElement(el)}`);
}

function nativeDisabledBesideAriaDisabled(): string[] {
  return [...document.body.querySelectorAll('[aria-disabled="true"][disabled]')].map(
    describeElement,
  );
}

function landmarkRole(el: Element): string | null {
  const explicit = el.getAttribute('role')?.trim().split(/\s+/)[0];
  return explicit || (IMPLICIT_LANDMARKS[el.localName] ?? null);
}

function landmarksNestedInPageMain(): string[] {
  return [...document.body.querySelectorAll('*')]
    .map((el) => ({ el, role: landmarkRole(el) }))
    .filter(({ el }) => isExposed(el))
    .filter(
      ({ el, role }) =>
        (role !== null && PAGE_LEVEL_LANDMARKS.has(role)) ||
        (role === 'navigation' && accessibleName(el).name === ''),
    )
    .map(({ el, role }) => `${role}: ${describeElement(el)}`);
}

function matchMediaAt(width: number): (query: string) => MediaQueryList {
  return (query) => {
    const min = /min-width:\s*([\d.]+)px/.exec(query);
    const max = /max-width:\s*([\d.]+)px/.exec(query);
    const matches =
      (!min || width >= Number.parseFloat(min[1]!)) &&
      (!max || width <= Number.parseFloat(max[1]!));
    return {
      matches,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    } as unknown as MediaQueryList;
  };
}

async function render(
  path: string,
): Promise<{ host: HTMLElement; fixture: ComponentFixture<unknown>; errors: unknown[] }> {
  const example = EXAMPLES.find((candidate) => candidate.path === path);
  if (example === undefined) {
    throw new Error(`no example is registered at ${path}`);
  }
  const errors: unknown[] = [];
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    errors.push(args);
  });
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      { provide: ErrorHandler, useValue: { handleError: (error: unknown) => errors.push(error) } },
    ],
  });
  const fixture = TestBed.createComponent(example.component);
  await flush(fixture);
  const host = fixture.nativeElement as HTMLElement;
  await DRIVES[path]?.(host, fixture);
  return { host, fixture, errors };
}

describe('the docs examples', () => {
  let restoreObservers: () => void;

  beforeEach(() => {
    restoreObservers = installObserverPolyfills();
  });

  afterEach(() => {
    restoreObservers();
    vi.restoreAllMocks();
  });

  afterEachOverlayCleanup();

  it('are all registered for rendering, past a floor that catches an empty glob', () => {
    const files = Object.keys(EXAMPLE_FILES)
      .map((key) => key.slice(DEMOS_ROOT.length))
      .sort((a, b) => a.localeCompare(b));
    expect(files.length).toBeGreaterThanOrEqual(EXAMPLE_FLOOR);
    expect(EXAMPLES.map((example) => example.path)).toEqual(files);
    expect(EXAMPLES.filter((example) => reflectComponentType(example.component) === null)).toEqual(
      [],
    );
  });

  it('declare drive steps only for examples that exist', () => {
    const paths = new Set(EXAMPLES.map((example) => example.path));
    expect(Object.keys(DRIVES).filter((path) => !paths.has(path))).toEqual([]);
  });

  it.each(EXAMPLES.map((example) => example.path))(
    '%s mounts without an error, names every control by its visible label, keeps disabled controls off the native attribute and nests no page-level landmark in the page main',
    async (path) => {
      const { errors } = await render(path);
      expect<Report>({
        errors,
        unnamed: unnamed(),
        comboboxesWithoutAuthorName: comboboxesWithoutAuthorName(),
        ariaLabelsHidingVisibleLabel: ariaLabelsHidingVisibleLabel(),
        nativeDisabledBesideAriaDisabled: nativeDisabledBesideAriaDisabled(),
        landmarksNestedInPageMain: landmarksNestedInPageMain(),
      }).toEqual({
        errors: [],
        unnamed: [],
        comboboxesWithoutAuthorName: [],
        ariaLabelsHidingVisibleLabel: [],
        nativeDisabledBesideAriaDisabled: [],
        landmarksNestedInPageMain: [],
      });
    },
  );

  it('state in text which breakpoints match, not by colour alone', async () => {
    vi.stubGlobal('matchMedia', matchMediaAt(800));
    const { host } = await render('breakpoints/examples/active.example.ts');
    const rows = [...host.querySelectorAll('li')].map(visibleText);
    expect(rows).toEqual([
      'sm ≥ 640px up matches only does not match',
      'md ≥ 768px up matches only matches',
      'lg ≥ 1024px up does not match only does not match',
      'xl ≥ 1280px up does not match only does not match',
      '2xl ≥ 1536px up does not match only does not match',
    ]);
  });

  it('promise to restore the size the collapsible pane resizer brings back', async () => {
    const { host, fixture } = await render('pane-resizer/examples/collapsible.example.ts');
    const resizer = query<HTMLElement>(host, '[forPaneResizer]');
    const hint = () => visibleText(query(host, 'p'));
    resizer.focus();

    pressKey(resizer, 'ArrowRight');
    pressKey(resizer, 'ArrowRight', { type: 'keyup' });
    await flush(fixture);
    expect(hint()).toContain('bring it back to 228px');

    pressKey(resizer, 'Enter');
    await flush(fixture);
    expect(resizer.getAttribute('aria-valuenow')).toBe('0');
    expect(hint()).toContain('bring it back to 228px');

    pressKey(resizer, 'Enter');
    await flush(fixture);
    expect(resizer.getAttribute('aria-valuenow')).toBe('228');
  });

  it('keep the search clear button out of the searchbox name once text is typed', async () => {
    const { host } = await render('search/examples/field.example.ts');
    expect(query<HTMLButtonElement>(host, '[forSearchClear]').hidden).toBe(false);
    expect(accessibleName(query(host, '[forSearch]')).name).toBe('Search the docs');
  });

  it('name the Signal Forms switch by the text shown beside it', async () => {
    const { host } = await render('switch/examples/form-field.example.ts');
    const text = query(host, '[forSwitch]').parentElement!.textContent!.trim();
    expect(accessibleName(query(host, '[forSwitch]')).name).toBe(text);
  });

  it('keep the avatar named after its person once the image fails', async () => {
    const { host } = await render('avatar/examples/fallback.example.ts');
    const named = exposedWithRole()
      .filter(({ role }) => role === 'img')
      .map(({ el }) => accessibleName(el).name);
    expect(named).toEqual(['Grace Hopper']);
    expect(query(host, '[forAvatarFallback]').textContent!.trim()).toBe('GH');
  });

  it('keep the hover card hero a preview, with nothing in the card a keyboard user would have to reach', async () => {
    const { fixture } = await render('hover-card/examples/default.example.ts');
    fixture.debugElement
      .query(By.directive(ForHoverCard))
      .injector.get(ForHoverCard)
      .open.set(true);
    await flush(fixture);
    const content = query(document.body, '[forHoverCardContent]');
    expect([...content.querySelectorAll(FOCUSABLE)].map(describeElement)).toEqual([]);
  });

  it('reopen the virtualized combobox at the top of its list', async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const example = EXAMPLES.find(
      (candidate) => candidate.path === 'combobox/examples/virtualized.example.ts',
    )!;
    const fixture = TestBed.createComponent(example.component);
    await flush(fixture);
    const host = fixture.nativeElement as HTMLElement;
    const input = query<HTMLInputElement>(host, '[forComboboxInput]');
    input.focus();
    pressKey(input, 'ArrowDown');
    await flush(fixture);
    const content = query(document.body, '[forComboboxContent]');
    content.scrollTop = 18000;
    content.dispatchEvent(new Event('scroll'));
    await flush(fixture);
    expect(query(document.body, '[forComboboxOption]').textContent!.trim()).not.toBe('Item 0001');

    pressKey(input, 'Escape');
    await flush(fixture);
    expect(document.body.querySelector('[forComboboxContent]')).toBeNull();
    pressKey(input, 'ArrowDown');
    await flush(fixture);

    expect(query(document.body, '[forComboboxOption]').textContent!.trim()).toBe('Item 0001');
  });
});
