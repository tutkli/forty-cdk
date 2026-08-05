import { ChangeDetectionStrategy, Component, signal, type Type } from '@angular/core';

import {
  FOR_ACCORDION_CONTEXT,
  type ForAccordionContext,
  ForAccordionItem,
} from 'forty-cdk/accordion';
import { FOR_CAROUSEL_CONTEXT, ForCarouselPrevious } from 'forty-cdk/carousel';
import {
  FOR_COMBOBOX_CONTEXT,
  ForComboboxClear,
  type ForComboboxContext,
  ForComboboxTrigger,
} from 'forty-cdk/combobox';
import { FOR_NAVIGATION_MENU_CONTEXT, ForNavigationMenuList } from 'forty-cdk/navigation-menu';
import { FOR_RADIO_GROUP_CONTEXT, ForRadio } from 'forty-cdk/radio-group';
import {
  FOR_SELECT_CONTEXT,
  type ForSelectContext,
  ForSelectTrigger,
  ForSelectValue,
} from 'forty-cdk/select';
import type { WritingDirection } from 'forty-cdk/shared';
import { FOR_TABS_CONTEXT, ForTabsList } from 'forty-cdk/tabs';
import { FOR_TOAST_CONTEXT, ForToastTitle } from 'forty-cdk/toast';

import { renderHost } from '../test-utils/render';

/**
 * Meta-guard + behaviour sweep for `assertRootContext`
 * ([#1669](https://github.com/tutkli/forty-cdk/issues/1669)): every split root
 * rejects a `FOR_<PRIMITIVE>_CONTEXT` provider that is not the root, with its
 * own prefixed error naming the provider shape the consumer must write.
 *
 * **The derived property is "this entry point splits its context"** — a source
 * module declaring `interface <X>Context extends For<X>Context`, which is what
 * puts an unchecked cast inside its `inject<Primitive>Context`. It is exact in
 * both directions today: eight modules match, and Table (the one root still
 * carrying a second token, aliased to a separate provider in `forty-cdk/core`)
 * matches neither the pattern nor the hazard. So a ninth split root cannot land
 * without either calling the guard or turning this file red — which the
 * count-per-module case extends to a *second* resolver added to a module that
 * already calls it once.
 *
 * `useValue` is typed `any` by Angular's own `ValueProvider`, so the empty
 * object the sweep provides needs no cast to reach the piece — the compile-time
 * channel is absent, which is the whole reason the check is a runtime one. The
 * accordion case below states the sharper half: a value the public interface
 * accepts *in full*, written as a typed const so the compiler has every chance
 * to object, and it still resolves.
 *
 * The three JSDoc cases gate the *other* half of that precondition — the one a
 * consumer reads before writing the provider. A token's JSDoc lands verbatim in
 * the emitted `.d.ts`, so it is exactly what IntelliSense shows at the
 * `inject(FOR_<X>_CONTEXT)` call site: it must name the `useExisting` shape, and
 * it must not `{@link}` a symbol the entry point does not export — a hidden
 * context resolver ([#626](https://github.com/tutkli/forty-cdk/issues/626)) or an
 * internal `<X>Context` interface, both absent from the emitted types, so the
 * link is dead precisely where it is read. `For`-prefixed context interfaces are
 * the public ones, which is what makes the check a one-line pattern.
 */
const SOURCES = import.meta.glob('../../*/src/**/*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
});

/** Where `assertRootContext` is declared — the one non-caller the scan finds. */
const HELPER_SOURCE = 'core/src/root-context/root-context.ts';

interface GuardedRoot {
  /** Entry-point name, as it appears in the error prefix. */
  readonly entryPoint: string;
  /** The context module whose resolver carries the cast. */
  readonly source: string;
  /** How many resolvers in that module guard themselves. Compared against source. */
  readonly calls: number;
  /** Name of the token the fixture provides with an impostor. */
  readonly token: string;
  /** Root selector the error must name. */
  readonly root: string;
  /** The piece the fixture mounts, as the error names it. */
  readonly piece: string;
  /** Host mounting that piece under an impostor provider. */
  readonly host: Type<unknown>;
}

@Component({
  imports: [ForAccordionItem],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: FOR_ACCORDION_CONTEXT, useValue: {} }],
  template: `<div forAccordionItem value="a"></div>`,
})
class ImpostorAccordionHost {}

@Component({
  imports: [ForCarouselPrevious],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: FOR_CAROUSEL_CONTEXT, useValue: {} }],
  template: `<button type="button" forCarouselPrevious></button>`,
})
class ImpostorCarouselHost {}

@Component({
  imports: [ForComboboxClear],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: FOR_COMBOBOX_CONTEXT, useValue: {} }],
  template: `<button type="button" forComboboxClear></button>`,
})
class ImpostorComboboxHost {}

@Component({
  imports: [ForNavigationMenuList],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: FOR_NAVIGATION_MENU_CONTEXT, useValue: {} }],
  template: `<ul forNavigationMenuList></ul>`,
})
class ImpostorNavigationMenuHost {}

@Component({
  imports: [ForRadio],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: FOR_RADIO_GROUP_CONTEXT, useValue: {} }],
  template: `<button type="button" forRadio value="a"></button>`,
})
class ImpostorRadioGroupHost {}

@Component({
  imports: [ForSelectValue],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: FOR_SELECT_CONTEXT, useValue: {} }],
  template: `<span forSelectValue></span>`,
})
class ImpostorSelectHost {}

@Component({
  imports: [ForTabsList],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: FOR_TABS_CONTEXT, useValue: {} }],
  template: `<div forTabsList></div>`,
})
class ImpostorTabsHost {}

@Component({
  imports: [ForToastTitle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: FOR_TOAST_CONTEXT, useValue: {} }],
  template: `<div forToastTitle>Saved</div>`,
})
class ImpostorToastHost {}

const GUARDED: readonly GuardedRoot[] = [
  {
    entryPoint: 'accordion',
    source: 'accordion/src/accordion-context.ts',
    calls: 1,
    token: 'FOR_ACCORDION_CONTEXT',
    root: '[forAccordion]',
    piece: 'ForAccordionItem',
    host: ImpostorAccordionHost,
  },
  {
    entryPoint: 'carousel',
    source: 'carousel/src/carousel-context.ts',
    calls: 1,
    token: 'FOR_CAROUSEL_CONTEXT',
    root: '[forCarousel]',
    piece: 'ForCarouselPrevious',
    host: ImpostorCarouselHost,
  },
  {
    entryPoint: 'combobox',
    source: 'combobox/src/combobox-context.ts',
    calls: 2,
    token: 'FOR_COMBOBOX_CONTEXT',
    root: '[forCombobox]',
    piece: 'ForComboboxClear',
    host: ImpostorComboboxHost,
  },
  {
    entryPoint: 'navigation-menu',
    source: 'navigation-menu/src/navigation-menu-context.ts',
    calls: 1,
    token: 'FOR_NAVIGATION_MENU_CONTEXT',
    root: '[forNavigationMenu]',
    piece: 'ForNavigationMenuList',
    host: ImpostorNavigationMenuHost,
  },
  {
    entryPoint: 'radio-group',
    source: 'radio-group/src/radio-group-context.ts',
    calls: 1,
    token: 'FOR_RADIO_GROUP_CONTEXT',
    root: '[forRadioGroup]',
    piece: 'ForRadio',
    host: ImpostorRadioGroupHost,
  },
  {
    entryPoint: 'select',
    source: 'select/src/select-context.ts',
    calls: 2,
    token: 'FOR_SELECT_CONTEXT',
    root: '[forSelect]',
    piece: 'ForSelectValue',
    host: ImpostorSelectHost,
  },
  {
    entryPoint: 'tabs',
    source: 'tabs/src/tabs-context.ts',
    calls: 1,
    token: 'FOR_TABS_CONTEXT',
    root: '[forTabs]',
    piece: 'ForTabsList',
    host: ImpostorTabsHost,
  },
  {
    entryPoint: 'toast',
    source: 'toast/src/toast-context.ts',
    calls: 1,
    token: 'FOR_TOAST_CONTEXT',
    root: '[forToast]',
    piece: 'ForToastTitle',
    host: ImpostorToastHost,
  },
];

/**
 * A value satisfying `ForAccordionContext` in full, declared with the type so
 * the compiler checks it: the read surface is all the token's declared type
 * promises, and none of it is the registration protocol a piece reaches for.
 */
const READ_SURFACE_ONLY: ForAccordionContext = {
  multiple: signal(false),
  collapsible: signal(false),
  disabled: signal(false),
  orientation: signal<'horizontal' | 'vertical'>('vertical'),
  dir: signal<WritingDirection>('ltr'),
  isExpanded: () => false,
  toggle: () => undefined,
  canCollapse: () => false,
  focusByOffset: () => undefined,
};

@Component({
  imports: [ForAccordionItem],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: FOR_ACCORDION_CONTEXT, useValue: READ_SURFACE_ONLY }],
  template: `<div forAccordionItem value="a"></div>`,
})
class ReadSurfaceAccordionHost {}

@Component({
  imports: [ForSelectTrigger],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<button type="button" [forSelectTrigger]="impostor()"></button>`,
})
class ExplicitSelectTriggerHost {
  readonly impostor = signal({} as ForSelectContext);
}

@Component({
  imports: [ForComboboxTrigger],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<button type="button" [forComboboxTrigger]="impostor()"></button>`,
})
class ExplicitComboboxTriggerHost {
  readonly impostor = signal({} as ForComboboxContext);
}

const pathOf = (key: string): string => key.replace(/^(?:\.\.\/)+/, '');

const stripComments = (text: string): string =>
  text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

const LIBRARY_SOURCES: ReadonlyArray<readonly [string, string]> = Object.entries(SOURCES)
  .filter(([key]) => !key.endsWith('.spec.ts'))
  .map(([key, source]) => [pathOf(key), stripComments(source as string)] as const);

/** The same sources with their comments intact, for the JSDoc claims below. */
const DOCUMENTED_SOURCES: ReadonlyMap<string, string> = new Map(
  Object.entries(SOURCES).map(([key, source]) => [pathOf(key), source as string] as const),
);

const escaped = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * The JSDoc block immediately above a token's declaration, or `null` when the
 * declaration or an adjacent block is missing. Adjacency is required: a block
 * separated by anything but whitespace documents something else.
 */
function tokenDoc(entry: GuardedRoot): string | null {
  const source = DOCUMENTED_SOURCES.get(entry.source);
  if (source === undefined) {
    return null;
  }
  const declaration = source.indexOf(`export const ${entry.token} = new InjectionToken`);
  if (declaration === -1) {
    return null;
  }
  const close = source.lastIndexOf('*/', declaration);
  const open = source.lastIndexOf('/**', close);
  if (close === -1 || open === -1 || source.slice(close + 2, declaration).trim() !== '') {
    return null;
  }
  return source.slice(open, close + 2);
}

/** Source paths declaring an internal `<X>Context extends For<X>Context`. */
function splitContextSources(): Set<string> {
  const sources = new Set<string>();
  for (const [path, source] of LIBRARY_SOURCES) {
    if (/export interface \w+Context(?:<[^>]*>)?\s+extends\s+For\w+Context/.test(source)) {
      sources.add(path);
    }
  }
  return sources;
}

/** Source path → how many times it calls `assertRootContext`. */
function guardCalls(): Map<string, number> {
  const calls = new Map<string, number>();
  for (const [path, source] of LIBRARY_SOURCES) {
    const count = (source.match(/assertRootContext\(/g) ?? []).length;
    if (count > 0) {
      calls.set(path, count);
    }
  }
  return calls;
}

const sorted = (values: Iterable<string>): string[] => [...values].sort();

const claimedSources = new Set(GUARDED.map((entry) => entry.source));

const entryFor = (entryPoint: string): GuardedRoot => {
  const entry = GUARDED.find((candidate) => candidate.entryPoint === entryPoint);
  if (!entry) {
    throw new Error(`no guarded root declared for ${entryPoint}`);
  }
  return entry;
};

const expectedFailure = (entry: GuardedRoot): RegExp =>
  new RegExp(
    `${escaped(`[forty-cdk/${entry.entryPoint}]`)} ${entry.piece} resolved a ${entry.token} ` +
      `provider that is not the ${escaped(entry.root)} root.*` +
      `\\{ provide: ${entry.token}, useExisting: MyRoot \\}`,
    's',
  );

describe('split-root context guard (meta-guard)', () => {
  it('finds the library sources through the glob', () => {
    expect(Object.keys(SOURCES).length).toBeGreaterThan(100);
  });

  it('names the module that still declares the helper', () => {
    const helper = LIBRARY_SOURCES.find(([path]) => path === HELPER_SOURCE);

    expect(helper?.[1]).toMatch(/export function assertRootContext\(/);
  });

  it('has an entry for every module that splits its context', () => {
    const missing = [...splitContextSources()].filter((path) => !claimedSources.has(path));

    expect(sorted(missing)).toEqual([]);
  });

  it('claims no module that no longer splits its context', () => {
    const split = splitContextSources();
    const stale = [...claimedSources].filter((path) => !split.has(path));

    expect(sorted(stale)).toEqual([]);
  });

  it('is called from every module that splits its context, and nowhere else', () => {
    const callers = new Set(guardCalls().keys());
    callers.delete(HELPER_SOURCE);

    expect(sorted(callers)).toEqual(sorted(splitContextSources()));
  });

  it('resolves the JSDoc block above every guarded token', () => {
    const undocumented = GUARDED.filter((entry) => tokenDoc(entry) === null).map(
      (entry) => entry.token,
    );

    expect(sorted(undocumented)).toEqual([]);
  });

  it('documents the `useExisting` precondition on every guarded token', () => {
    const silent = GUARDED.filter((entry) => !(tokenDoc(entry) ?? '').includes('useExisting')).map(
      (entry) => entry.token,
    );

    expect(sorted(silent)).toEqual([]);
  });

  it('links no internal symbol from a guarded token', () => {
    const leaked = GUARDED.filter((entry) =>
      /\{@link (?!For)\w+Context\}/.test(tokenDoc(entry) ?? ''),
    ).map((entry) => entry.token);

    expect(sorted(leaked)).toEqual([]);
  });

  it('declares the number of guarded resolvers each module has', () => {
    const calls = guardCalls();
    const mismatched = GUARDED.filter((entry) => calls.get(entry.source) !== entry.calls).map(
      (entry) =>
        `${entry.source}: declares ${entry.calls}, source calls ${calls.get(entry.source) ?? 0}`,
    );

    expect(sorted(mismatched)).toEqual([]);
  });
});

describe('split-root context guard', () => {
  for (const entry of GUARDED) {
    it(`fails ${entry.piece} when ${entry.token} resolves to something other than the root`, () => {
      expect(() => renderHost(entry.host)).toThrow(expectedFailure(entry));
    });
  }

  it('fails a value satisfying the public read surface in full', () => {
    expect(() => renderHost(ReadSurfaceAccordionHost)).toThrow(
      /\[forty-cdk\/accordion\] ForAccordionItem resolved a FOR_ACCORDION_CONTEXT provider that is not the \[forAccordion\] root/,
    );
  });

  it('fails ForSelectTrigger on its explicit-root path', () => {
    expect(() => renderHost(ExplicitSelectTriggerHost)).toThrow(
      expectedFailure({ ...entryFor('select'), piece: 'ForSelectTrigger' }),
    );
  });

  it('fails ForComboboxTrigger on its explicit-root path', () => {
    expect(() => renderHost(ExplicitComboboxTriggerHost)).toThrow(
      expectedFailure({ ...entryFor('combobox'), piece: 'ForComboboxTrigger' }),
    );
  });
});
