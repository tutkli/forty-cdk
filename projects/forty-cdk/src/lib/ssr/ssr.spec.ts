import { ɵPLATFORM_SERVER_ID, isPlatformServer } from '@angular/common';
import { PLATFORM_ID, type Type, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  BodyScrollLock,
  DismissibleLayerStack,
  IdGenerator,
  InertSiblingsStack,
} from 'forty-cdk/core';

import * as collectionFixtures from './fixtures/collection';
import * as datetimeFixtures from './fixtures/datetime';
import * as disclosureFixtures from './fixtures/disclosure';
import * as displayFixtures from './fixtures/display';
import * as formFixtures from './fixtures/form';
import * as menuFixtures from './fixtures/menu';
import * as motionFixtures from './fixtures/motion';
import * as overlayFixtures from './fixtures/overlay';
import * as tableFixtures from './fixtures/table';

import {
  StepperServerFixture,
  TabsServerFixture,
  TabsServerRepeatFixture,
} from './fixtures/disclosure';
import { BreadcrumbsFixture, PaginationFixture, VisuallyHiddenFixture } from './fixtures/display';
import { FieldFixture, ToggleGroupFixture } from './fixtures/form';
import { MenuMultiOpenerOpenFixture, NavigationMenuViewportOpenFixture } from './fixtures/menu';
import { CarouselFixture, VirtualViewportFixture, VirtualizerFixture } from './fixtures/motion';
import {
  OPEN_STATE_FIXTURES,
  SSR_FIXTURES,
  type SsrFixture,
  type SsrMarkup,
} from './fixtures/registry';
import {
  TableBodyPlaceholderVariantFixture,
  TableBodyReorderFixture,
  TableBodyRowInteractionFixture,
  TableBodyRowVariantFixture,
  TableBodyVirtualizedFixture,
  TableGridFixture,
  TableTreegridFixture,
  TableVirtualizedFixture,
} from './fixtures/table';

/**
 * SSR smoke tests. Every fixture is registered once in
 * `./fixtures/registry.ts` and the suite is sweep-first: the parameterised
 * cases below run over that registry, so a new primitive owes a fixture and a
 * registry entry, never a new hand-written `it`.
 *
 * The six sweeps, and what each one alone would miss:
 *
 * - **renders without throwing** — the primitive constructs and paints on the
 *   server at all. Blind to markup that renders but says nothing.
 * - **emits the markup hydration matches on** — the `role` / `aria-*` /
 *   `data-state` set is non-empty (or empty, for an entry that declares
 *   `noWiring` and why), plus each fixture's declared per-element markup:
 *   attribute values, required-present attributes, and the id pairings hydration
 *   re-resolves on the client (trigger↔surface `aria-controls`,
 *   label↔control `aria-labelledby`). This is the sweep that fails when a
 *   primitive loses a server-side reference — the failure #1409 (tabs shipped
 *   no trigger↔panel pairing) and #1377 (stepper painted the completed state)
 *   both walked past.
 * - **leaves `<body>` untouched** — no portal appends a node, no scroll lock
 *   writes `style`, and no `InertSiblingsStack` mark on the branch holding the
 *   fixture (asserted beside the snapshot, which structurally cannot see it —
 *   see {@link describeBody}). Blind to a side effect that only subscribes, and
 *   to a re-parent *within* the fixture tree.
 * - **appends nothing to `<head>`** — the second document-level escape, and the
 *   one an `open` state does not gate: `[forScrollAreaViewport]` injects its
 *   global stylesheet from its constructor.
 * - **installs no global listener** / **schedules no timer** — the escapes a
 *   `<body>` snapshot cannot see, since jsdom hands the server render a real
 *   `document` and `window`.
 * - **resolves no floating position** — `@floating-ui/dom` provably never
 *   starts.
 *
 * On top of the sweeps, `providedIn: 'root'` singletons
 * (`DismissibleLayerStack`, `BodyScrollLock`, `InertSiblingsStack`,
 * `IdGenerator`) are asserted to be scoped per bootstrap, so two simulated SSR
 * requests get isolated state.
 *
 * jsdom is still the underlying DOM, so `document` exists; what the suite
 * exercises is the gating. Every overlay side-effect path (`injectPortal`,
 * `DismissibleLayerStack`, `BodyScrollLock`, `InertSiblingsStack`,
 * `FocusTrap.activate`, `injectFloating` / `injectItemAlignedPositioner`,
 * and the NavigationMenu viewport re-parenting) no-ops off-browser, and the
 * open-state fixtures in the registry are the ones that would run them.
 */

const serverModeGlobal = globalThis as unknown as { ngServerMode?: boolean };

/**
 * Browser globals a Node server does not have. jsdom supplies all of them, so
 * an ungated access passes here and only fails on a consumer's server — these
 * are stubbed to `undefined` for the suite (restored by the runner's
 * `unstubGlobals` invariant) so the access throws in the fixture's own render
 * case instead. `requestAnimationFrame` is also what made a blanket
 * "no timer scheduled" assertion impossible before: Angular's zoneless
 * scheduler races `setTimeout` against it, and jsdom's shim implements the
 * frame as a ~16.7ms `setTimeout`.
 */
const ABSENT_ON_A_REAL_SERVER = [
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'matchMedia',
  'IntersectionObserver',
  'ResizeObserver',
  'MutationObserver',
] as const;

/**
 * Makes the layout APIs a real server does not have throw, the way they do on a
 * consumer's server.
 *
 * The `ABSENT_ON_A_REAL_SERVER` globals above are the constructors and
 * schedulers; this is the other half of the same gap, and it is worse because
 * the value looks plausible. `getBoundingClientRect` needs a layout engine, and
 * domino — the DOM `@angular/platform-server` bundles — defines it nowhere at
 * all, so an ungated read is a `TypeError` on Angular Universal. jsdom hands the
 * same read a rect full of zeros, which is why the sweeps could not see the two
 * `forty-cdk/navigation-menu` reads that shipped
 * ([#1636](https://github.com/tutkli/forty-cdk/issues/1636)): the indicator and
 * the viewport both measured the *registered* active trigger / panel, so they
 * were protected only by a registry that happened to be empty server-side, and
 * registering synchronously exposed both at once.
 *
 * Which prototype owns the descriptor differs by platform — Linux jsdom defines
 * it on `HTMLElement.prototype`, macOS / Windows only on `Element.prototype`
 * ([#193](https://github.com/tutkli/forty-cdk/issues/193)) — so every rung that
 * owns it is patched, and a run that patched **none** fails here instead of
 * leaving the whole file silently unable to report. `vi.spyOn` is undone by the
 * runner's `restoreMocks` invariant at the test boundary.
 */
function makeLayoutApisAbsent(): void {
  const owners = [Element.prototype, HTMLElement.prototype].filter((proto) =>
    Object.prototype.hasOwnProperty.call(proto, 'getBoundingClientRect'),
  );
  expect(
    owners.length,
    'no prototype owns getBoundingClientRect — this run proves nothing about ungated layout reads',
  ).toBeGreaterThan(0);
  for (const proto of owners) {
    vi.spyOn(proto, 'getBoundingClientRect').mockImplementation(() => {
      throw new TypeError('getBoundingClientRect is not a function');
    });
  }
}

function configureServer(): void {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      { provide: PLATFORM_ID, useValue: ɵPLATFORM_SERVER_ID },
    ],
  });
}

/**
 * Every fixture module, so a fixture that was written but never registered is a
 * failing test rather than dead code the sweeps silently skip. Only the
 * components are audited (see `isFixtureComponent`) — a module may export a
 * shared constant without owing a registry entry.
 */
const FIXTURE_MODULES = {
  collection: collectionFixtures,
  datetime: datetimeFixtures,
  disclosure: disclosureFixtures,
  display: displayFixtures,
  form: formFixtures,
  menu: menuFixtures,
  motion: motionFixtures,
  overlay: overlayFixtures,
  table: tableFixtures,
};

/**
 * Whether a fixture module's export is a component the sweeps could mount.
 * `ɵcmp` is what `@Component` compiles to, so the audit above keys on being a
 * component rather than on a name convention — and a shared constant a fixture
 * module exports is skipped instead of being reported as unregistered.
 */
function isFixtureComponent(value: unknown): value is Type<unknown> {
  return typeof value === 'function' && 'ɵcmp' in value;
}

const HAND_WRITTEN_MARKUP_FIXTURES: readonly string[] = [
  'TableBodyPlaceholderVariantFixture',
  'TabsServerRepeatFixture',
];

function declaresServerMarkup(fixture: SsrFixture): boolean {
  return (fixture.markup?.length ?? 0) > 0 || fixture.noWiring !== undefined;
}

function fixtureExportNames(): ReadonlyMap<unknown, string> {
  return new Map(
    Object.values(FIXTURE_MODULES).flatMap((module) =>
      Object.entries(module)
        .filter(([, value]) => isFixtureComponent(value))
        .map(([name, value]): [unknown, string] => [value, name]),
    ),
  );
}

/**
 * The attributes hydration matches on — a role, a state, or a relationship.
 * `id` is deliberately out: an id alone proves nothing about wiring, and every
 * fixture emits some. What the sweep claims is that the primitive said
 * *something* about semantics server-side.
 */
const WIRING_ATTRIBUTE = /^(?:role|data-state|aria-[a-z-]+)$/;

function wiringAttributes(host: HTMLElement): readonly string[] {
  const names = new Set<string>();
  for (const el of Array.from(host.querySelectorAll<HTMLElement>('*'))) {
    for (const name of el.getAttributeNames()) {
      if (WIRING_ATTRIBUTE.test(name)) names.add(name);
    }
  }
  return [...names].sort();
}

function queryFixture(host: HTMLElement, select: string): HTMLElement {
  const el = host.querySelector<HTMLElement>(select);
  if (el === null) {
    throw new Error(`[forty-cdk/ssr] no element matches \`${select}\` in the server render`);
  }
  return el;
}

function assertMarkup(host: HTMLElement, expectation: SsrMarkup): void {
  const el = queryFixture(host, expectation.select);

  for (const [name, value] of Object.entries(expectation.attributes ?? {})) {
    expect(el.getAttribute(name), `${expectation.select} [${name}]`).toBe(value);
  }

  for (const name of expectation.present ?? []) {
    expect(el.getAttribute(name), `${expectation.select} [${name}]`).toBeTruthy();
  }

  for (const [name, target] of Object.entries(expectation.pairs ?? {})) {
    const id = queryFixture(host, target).getAttribute('id');
    expect(id, `${target} has no id for ${expectation.select} [${name}] to pair with`).toBeTruthy();
    expect(el.getAttribute(name), `${expectation.select} [${name}] pairs with ${target}`).toBe(id);
  }

  if (expectation.within !== undefined) {
    const container = queryFixture(host, expectation.within);
    expect(container.contains(el), `${expectation.select} escaped ${expectation.within}`).toBe(
      true,
    );
  }
}

/**
 * Everything a server render must leave alone on `<body>`: its own attributes,
 * plus the identity and attribute set of each child. That covers two of the
 * three escapes — a portal appends a child, and the scroll lock writes `style`.
 *
 * `exclude` drops the branch holding the fixture host, which `TestBed` appends
 * itself. That is what lets the baseline be taken _before_ `createComponent`, so
 * a mutation from a directive constructor — which runs in the template's
 * creation pass, before any `detectChanges()` — is inside the window too.
 *
 * The exclusion is also this snapshot's blind spot, and it is exactly the third
 * escape: `InertSiblingsStack` marks the portal root's **siblings**, which in
 * this suite means either the `TestBed` branch (dropped here) or — for a
 * `[container]`-scoped modal — a node inside the fixture host, which is not a
 * `<body>` child at all. So the `inert` channel is asserted separately by
 * {@link inertAncestry}, and only reaches this snapshot transitively, through
 * the portal append that would have preceded it.
 */
function describeBody(exclude?: Element): readonly string[] {
  return [
    `body[style=${document.body.getAttribute('style') ?? ''}]`,
    `body[class=${document.body.getAttribute('class') ?? ''}]`,
    ...Array.from(document.body.children)
      .filter((child) => exclude === undefined || !child.contains(exclude))
      .map(
        (child) =>
          `${child.tagName.toLowerCase()}#${child.id}[${child.getAttributeNames().sort().join(' ')}]`,
      ),
  ];
}

/**
 * The fixture host and every ancestor of it carrying `inert` — the channel
 * {@link describeBody}'s `exclude` drops. A server render must mark none of
 * them: `InertSiblingsStack` inerts the siblings of the element a modal portals
 * into, and in this suite the `TestBed` branch holding the host is the sibling
 * it would reach.
 *
 * The walk stops at the ancestry on purpose. `inert` **inside** the host is
 * legitimate — the always-mounted panel family reflects `aria-hidden` + `inert`
 * while closed, and an open-state fixture renders it (`CarouselAutoplayFixture`
 * inerts its off-view slides) — so a blanket `[inert]` count would report the
 * convention. A `[container]`-scoped modal whose container has siblings is
 * therefore still uncovered; no registered fixture has that shape.
 */
function inertAncestry(host: HTMLElement): readonly string[] {
  const marked: string[] = [];
  for (let el: Element | null = host; el !== null; el = el.parentElement) {
    if (el.hasAttribute('inert')) marked.push(el.tagName.toLowerCase());
  }
  return marked;
}

/**
 * The identity and attribute set of every `<head>` child. `<body>` is not the
 * only document-level escape: `[forScrollAreaViewport]` is the library's one
 * sanctioned global-CSS injector and appends a `<style>` to `<head>` from its
 * constructor, so nothing about `open` state gates it and no `<body>` snapshot
 * can see it.
 */
function describeHead(): readonly string[] {
  return Array.from(document.head.children).map(
    (child) =>
      `${child.tagName.toLowerCase()}#${child.id}[${child.getAttributeNames().sort().join(' ')}]`,
  );
}

describe('SSR smoke tests', () => {
  // A `<head>` injection is document-level and idempotent by id, so it survives
  // `resetTestingModule()` — leaving it in place would make the `<head>` sweep a
  // false negative for every fixture after the first one that injected.
  let headBaseline: readonly Element[] = [];

  beforeEach(() => {
    serverModeGlobal.ngServerMode = true;
    for (const name of ABSENT_ON_A_REAL_SERVER) {
      vi.stubGlobal(name, undefined);
    }
    headBaseline = Array.from(document.head.children);
    makeLayoutApisAbsent();
    configureServer();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    for (const child of Array.from(document.head.children)) {
      if (!headBaseline.includes(child)) child.remove();
    }
    delete serverModeGlobal.ngServerMode;
  });

  it('reports the server platform', () => {
    expect(isPlatformServer(TestBed.inject(PLATFORM_ID))).toBe(true);
  });

  it('runs under real server mode with the browser-only globals absent', () => {
    const globals = globalThis as unknown as Record<string, unknown>;
    expect(serverModeGlobal.ngServerMode).toBe(true);
    for (const name of ABSENT_ON_A_REAL_SERVER) {
      expect(globals[name]).toBeUndefined();
    }
  });

  it('registers every fixture component the fixture modules export', () => {
    const registered: ReadonlySet<unknown> = new Set(
      SSR_FIXTURES.map(({ component }) => component),
    );
    const unregistered = Object.entries(FIXTURE_MODULES).flatMap(([group, module]) =>
      Object.entries(module)
        .filter(([, value]) => isFixtureComponent(value) && !registered.has(value))
        .map(([name]) => `${group}: ${name}`),
    );

    expect(unregistered).toEqual([]);
  });

  it('declares markup or noWiring for every entry no hand-written case covers', () => {
    const names = fixtureExportNames();
    const undeclared = SSR_FIXTURES.filter((fixture) => !declaresServerMarkup(fixture))
      .map(({ component }) => names.get(component) ?? component.name)
      .sort();

    expect(
      undeclared,
      'an entry declaring neither `markup` nor `noWiring` only proves it rendered — declare what it emits, or add it here with the hand-written case that asserts it',
    ).toEqual([...HAND_WRITTEN_MARKUP_FIXTURES]);
  });

  for (const { component } of SSR_FIXTURES) {
    it(`renders ${component.name} without throwing on the server`, () => {
      expect(() => {
        const f = TestBed.createComponent(component);
        f.detectChanges();
      }).not.toThrow();
    });
  }

  describe('server render emits the markup hydration matches on', () => {
    for (const fixture of SSR_FIXTURES) {
      const claim =
        fixture.noWiring === undefined
          ? 'ARIA wiring plus its declared markup'
          : `no ARIA wiring — ${fixture.noWiring}`;

      it(`${fixture.component.name} emits ${claim}`, () => {
        const f = TestBed.createComponent(fixture.component);
        f.detectChanges();
        const host = f.nativeElement as HTMLElement;

        const wiring = wiringAttributes(host);
        if (fixture.noWiring === undefined) {
          expect(wiring).not.toEqual([]);
        } else {
          expect(wiring).toEqual([]);
        }

        for (const expectation of fixture.markup ?? []) {
          assertMarkup(host, expectation);
        }
      });
    }
  });

  // One parameterised case replaces the twenty hand-written "does not portal or
  // mutate <body>" ones, which all passed for the same reason: under
  // `ngServerMode` every `afterNextRender` is inert by construction, so none of
  // them could fail independently of the others.
  describe('server render leaves <body> untouched', () => {
    for (const fixture of OPEN_STATE_FIXTURES) {
      it(`${fixture.name} appends no node and mutates no <body> state`, () => {
        const before = describeBody();
        const f = TestBed.createComponent(fixture);
        f.detectChanges();
        const host = f.nativeElement as HTMLElement;

        expect(describeBody(host)).toEqual(before);
        expect(inertAncestry(host)).toEqual([]);
      });
    }
  });

  // The `<body>` sweep's sibling, over every fixture rather than the open ones:
  // `[forScrollAreaViewport]` injects its native-scrollbar-hiding `<style>` from
  // its constructor, so an open state is irrelevant and a `<body>` snapshot
  // cannot see it. It is the library's only sanctioned global-CSS injection, and
  // an ungated one would ship a `<style>` per Universal request.
  describe('server render appends nothing to <head>', () => {
    for (const { component } of SSR_FIXTURES) {
      it(`${component.name} injects no document-level stylesheet`, () => {
        const before = describeHead();
        const f = TestBed.createComponent(component);
        f.detectChanges();

        expect(describeHead()).toEqual(before);
      });
    }
  });

  it('Field composes both the description and the error id into aria-describedby server-side', () => {
    const f = TestBed.createComponent(FieldFixture);
    f.detectChanges();
    const control = f.nativeElement.querySelector('[forFieldControl]') as HTMLElement;
    const description = f.nativeElement.querySelector('[forFieldDescription]') as HTMLElement;
    const error = f.nativeElement.querySelector('[forFieldError]') as HTMLElement;
    const descriptionId = description.getAttribute('id');
    const errorId = error.getAttribute('id');
    expect(descriptionId).toBeTruthy();
    expect(errorId).toBeTruthy();
    expect(control.getAttribute('aria-describedby')).toContain(descriptionId);
    expect(control.getAttribute('aria-describedby')).toContain(errorId);
  });

  it('IdGenerator is salted with APP_ID — identical render orders produce identical ids across requests', () => {
    const a = TestBed.inject(IdGenerator).next();
    TestBed.resetTestingModule();
    configureServer();
    const b = TestBed.inject(IdGenerator).next();
    // Both bootstraps share APP_ID's default value, so the salted
    // counters reset to 1 in both — that's the property hydration
    // relies on (server and client renders of the same app produce the
    // same ids in the same order).
    expect(a).toBe(b);
  });

  it('overlay singletons are isolated across simulated SSR requests', () => {
    const stack1 = TestBed.inject(DismissibleLayerStack);
    const lock1 = TestBed.inject(BodyScrollLock);
    const inert1 = TestBed.inject(InertSiblingsStack);

    TestBed.resetTestingModule();
    configureServer();

    const stack2 = TestBed.inject(DismissibleLayerStack);
    const lock2 = TestBed.inject(BodyScrollLock);
    const inert2 = TestBed.inject(InertSiblingsStack);

    expect(stack2).not.toBe(stack1);
    expect(lock2).not.toBe(lock1);
    expect(inert2).not.toBe(inert1);
  });

  // The `<body>`-untouched sweep catches a side effect that appends a node; it
  // says nothing about one that only *subscribes*. jsdom hands the server
  // render a real `document` and `window`, so a primitive that forgot its
  // `isPlatformBrowser` gate installs its global listener here and passes every
  // other assertion in this file — then leaks that listener into every
  // subsequent Universal request. Sweeping both targets across every open-state
  // fixture is what closes that gap.
  describe('server render installs no global listener', () => {
    for (const fixture of OPEN_STATE_FIXTURES) {
      it(`${fixture.name} adds no document or window listener`, () => {
        const documentSpy = vi.spyOn(document, 'addEventListener');
        const windowSpy = vi.spyOn(window, 'addEventListener');

        const f = TestBed.createComponent(fixture);
        f.detectChanges();

        expect(documentSpy.mock.calls.map(([type]) => type)).toEqual([]);
        expect(windowSpy.mock.calls.map(([type]) => type)).toEqual([]);
      });
    }
  });

  describe('server render schedules no timer', () => {
    for (const fixture of OPEN_STATE_FIXTURES) {
      it(`${fixture.name} schedules no timer`, () => {
        const timeoutSpy = vi.spyOn(globalThis, 'setTimeout');
        const intervalSpy = vi.spyOn(globalThis, 'setInterval');

        const f = TestBed.createComponent(fixture);
        f.detectChanges();

        const delays = timeoutSpy.mock.calls
          .map(([, delay]) => delay)
          .filter((delay) => delay !== undefined);

        expect(delays).toEqual([]);
        expect(intervalSpy.mock.calls.map(([, delay]) => delay)).toEqual([]);
      });
    }
  });

  describe('server render resolves no floating position', () => {
    const POSITIONER_PROPERTIES = [
      'translate',
      'clip-path',
      '--for-floating-anchor-width',
      '--for-floating-anchor-height',
      '--for-floating-available-width',
      '--for-floating-available-height',
      '--for-floating-content-transform-origin',
    ];

    for (const fixture of OPEN_STATE_FIXTURES) {
      it(`${fixture.name} leaves every surface unpositioned`, () => {
        const f = TestBed.createComponent(fixture);
        f.detectChanges();

        const written = Array.from(
          (f.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('[style]'),
        ).flatMap((el) =>
          POSITIONER_PROPERTIES.filter(
            (property) => el.style.getPropertyValue(property) !== '',
          ).map((property) => `${el.tagName.toLowerCase()}: ${property}`),
        );

        expect(written).toEqual([]);
      });
    }
  });

  it('Carousel renders aria-roledescription on every slide server-side', () => {
    const f = TestBed.createComponent(CarouselFixture);
    f.detectChanges();
    const slides = f.nativeElement.querySelectorAll(
      '[forCarouselSlide]',
    ) as NodeListOf<HTMLElement>;
    expect(slides.length).toBe(2);
    slides.forEach((s) => {
      expect(s.getAttribute('aria-roledescription')).toBe('slide');
    });
  });

  it('BodyScrollLock is a no-op on the server', () => {
    const lock = TestBed.inject(BodyScrollLock);
    document.body.style.overflow = 'auto';
    lock.lock();
    // Server gating prevents any mutation to <body>.
    expect(document.body.style.overflow).toBe('auto');
    lock.unlock();
    expect(document.body.style.overflow).toBe('auto');
    document.body.style.overflow = '';
  });

  // The one open-state claim the sweeps structurally cannot make. Re-parenting
  // `[forNavigationMenuContent]` into `[forNavigationMenuViewport]` is a move
  // *within* the fixture tree: `<body>` is untouched either way, no listener is
  // installed and no position resolves, so all four sweeps stay green whether
  // the browser-only re-parent ran or not. Only the content's parent chain
  // tells them apart.
  it('an open NavigationMenu does not re-parent its content into the viewport server-side', () => {
    const f = TestBed.createComponent(NavigationMenuViewportOpenFixture);
    f.detectChanges();
    const root = f.nativeElement as HTMLElement;
    const item = root.querySelector('[forNavigationMenuItem]') as HTMLElement;
    const viewport = root.querySelector('[forNavigationMenuViewport]') as HTMLElement;
    const content = root.querySelector('[forNavigationMenuContent]') as HTMLElement;

    expect(item.contains(content)).toBe(true);
    expect(viewport.contains(content)).toBe(false);
    expect(viewport.children.length).toBe(0);
  });

  it('gives each [forMenu] opener its own id server-side', () => {
    const f = TestBed.createComponent(MenuMultiOpenerOpenFixture);
    f.detectChanges();
    const root = f.nativeElement as HTMLElement;
    const region = root.querySelector('[data-opener="region"]') as HTMLElement;
    const button = root.querySelector('[data-opener="kebab"]') as HTMLElement;
    const content = root.querySelector('[forMenuContent]') as HTMLElement;

    expect(region.getAttribute('id')).toBeTruthy();
    expect(button.getAttribute('id')).toBeTruthy();
    expect(region.getAttribute('id')).not.toBe(button.getAttribute('id'));
    expect(button.getAttribute('aria-controls')).toBe(content.getAttribute('id'));
    expect(content.getAttribute('aria-label')).toBe('Row actions');
    expect(content.getAttribute('aria-labelledby')).toBeNull();
  });

  it('Virtualizer renders an empty window with the estimate total server-side', () => {
    const f = TestBed.createComponent(VirtualizerFixture);
    f.detectChanges();
    const spacer = f.nativeElement.querySelector('[style*="position: relative"]') as HTMLElement;
    expect(f.nativeElement.querySelectorAll('[data-index]').length).toBe(0);
    expect(spacer.style.height).toBe('40000px');
  });

  it('VirtualViewport renders the sizer with the estimate total and no rows server-side', () => {
    const f = TestBed.createComponent(VirtualViewportFixture);
    f.detectChanges();
    const host = f.nativeElement.querySelector('[forVirtualViewport]') as HTMLElement;
    const sizer = host.firstElementChild as HTMLElement;
    expect(f.nativeElement.querySelectorAll('[data-index]').length).toBe(0);
    expect(sizer.style.height).toBe('40000px');
  });

  it('Table treegrid mode renders the child and leaf rows hierarchy ARIA server-side', () => {
    const f = TestBed.createComponent(TableTreegridFixture);
    f.detectChanges();
    const rows = Array.from(f.nativeElement.querySelectorAll('[forTableRow]')) as HTMLElement[];
    expect(rows.length).toBe(3);
    const childRow = rows[1]!;
    const leafRow = rows[2]!;
    expect(childRow.getAttribute('aria-level')).toBe('2');
    expect(childRow.getAttribute('aria-posinset')).toBe('1');
    expect(childRow.getAttribute('aria-setsize')).toBe('1');
    expect(leafRow.getAttribute('aria-level')).toBe('1');
    expect(leafRow.getAttribute('aria-posinset')).toBe('2');
    expect(leafRow.getAttribute('aria-setsize')).toBe('2');
    expect(leafRow.hasAttribute('aria-expanded')).toBe(false);
    expect(leafRow.hasAttribute('data-state')).toBe(false);
  });

  it('Table grid mode reports a width only for the seeded column resizer, with no drag preview in <body>', () => {
    const f = TestBed.createComponent(TableGridFixture);
    f.detectChanges();
    const resizer = f.nativeElement.querySelector(
      '[forTableColumnResizer][column="role"]',
    ) as HTMLElement;
    expect(resizer.getAttribute('role')).toBe('separator');
    expect(resizer.getAttribute('aria-orientation')).toBe('vertical');
    expect(resizer.getAttribute('tabindex')).toBe('-1');
    expect(resizer.getAttribute('aria-valuenow')).toBe('120');
    const unseededResizer = f.nativeElement.querySelector(
      '[forTableColumnResizer][column="name"]',
    ) as HTMLElement;
    expect(unseededResizer.hasAttribute('aria-valuenow')).toBe(false);
    expect(document.body.querySelector('[data-drag-preview]')).toBeNull();
  });

  it('virtualized Table renders an empty window sized to the estimate total server-side', () => {
    const f = TestBed.createComponent(TableVirtualizedFixture);
    f.detectChanges();
    expect(f.nativeElement.querySelectorAll('[forTableRow]').length).toBe(0);
    const body = f.nativeElement.querySelector('[role="rowgroup"]') as HTMLElement;
    expect(body.style.height).toBe('44000px');
  });

  it('virtualized <for-table-body> renders an empty window sized to the estimate total server-side', () => {
    const f = TestBed.createComponent(TableBodyVirtualizedFixture);
    f.detectChanges();
    expect(f.nativeElement.querySelectorAll('[forTableRow]').length).toBe(0);
    const body = f.nativeElement.querySelector('[role="rowgroup"]') as HTMLElement;
    expect(body.style.height).toBe('44000px');
  });

  it('<for-table-body> stamps a full-span row variant server-side', () => {
    const f = TestBed.createComponent(TableBodyRowVariantFixture);
    f.detectChanges();
    const rows = Array.from(f.nativeElement.querySelectorAll('[forTableRow]')) as HTMLElement[];
    expect(rows.length).toBe(3);
    const variantCell = rows[0]!.querySelector('[data-row-variant]') as HTMLElement;
    expect(variantCell.textContent?.trim()).toBe('Group: Engineers');
    expect(rows[1]!.querySelectorAll('[forTableCell]').length).toBe(2);
  });

  it('<for-table-body> stamps a placeholder-cell row variant server-side', () => {
    const f = TestBed.createComponent(TableBodyPlaceholderVariantFixture);
    f.detectChanges();
    const rows = Array.from(f.nativeElement.querySelectorAll('[forTableRow]')) as HTMLElement[];
    expect(rows.length).toBe(2);
    const placeholder = rows[1]!;
    expect(placeholder.querySelector('[data-row-variant]')).toBeNull();
    const cells = Array.from(placeholder.querySelectorAll('[forTableCell]'));
    expect(cells.length).toBe(2);
    expect(cells[0]!.getAttribute('aria-disabled')).toBe('true');
    expect(cells[0]!.querySelector('.skeleton')).not.toBeNull();
    expect(cells[1]!.querySelector('.skeleton-default')).not.toBeNull();
  });

  it('<for-table-body> stamps draggable reorder header cells server-side without a drag preview in <body>', () => {
    const f = TestBed.createComponent(TableBodyReorderFixture);
    f.detectChanges();
    const draggables = Array.from(
      f.nativeElement.querySelectorAll('[forTableHeaderCell][forDraggable]'),
    ) as HTMLElement[];
    expect(draggables.map((h) => h.getAttribute('data-column'))).toEqual(['name', 'role']);
    expect(document.body.querySelector('[data-drag-preview]')).toBeNull();
  });

  it('<for-table-body> stamps per-row rowClass + rowAttrs server-side', () => {
    const f = TestBed.createComponent(TableBodyRowInteractionFixture);
    f.detectChanges();
    const rows = Array.from(f.nativeElement.querySelectorAll('[forTableRow]')) as HTMLElement[];
    expect(rows.length).toBe(2);
    expect(rows[0]!.classList.contains('active')).toBe(true);
    expect(rows[1]!.classList.contains('idle')).toBe(true);
    expect(rows[1]!.hasAttribute('data-open')).toBe(false);
  });

  it('Pagination renders exactly one aria-current="page" server-side', () => {
    const f = TestBed.createComponent(PaginationFixture);
    f.detectChanges();
    const currentButtons = Array.from(
      f.nativeElement.querySelectorAll('[aria-current="page"]'),
    ) as HTMLElement[];
    expect(currentButtons.length).toBe(1);
  });

  it('Breadcrumbs renders one aria-current="page" link and hides every separator server-side', () => {
    const f = TestBed.createComponent(BreadcrumbsFixture);
    f.detectChanges();
    const current = Array.from(
      f.nativeElement.querySelectorAll('[forBreadcrumbItem][aria-current="page"]'),
    ) as HTMLElement[];
    expect(current.length).toBe(1);
    const separators = f.nativeElement.querySelectorAll(
      '[forBreadcrumbSeparator]',
    ) as NodeListOf<HTMLElement>;
    expect(separators.length).toBe(2);
    separators.forEach((sep) => expect(sep.getAttribute('aria-hidden')).toBe('true'));
  });

  it('VisuallyHidden clips its host inline server-side (hydration-stable markup)', () => {
    const f = TestBed.createComponent(VisuallyHiddenFixture);
    f.detectChanges();
    const hosts = Array.from(
      f.nativeElement.querySelectorAll('[forVisuallyHidden]'),
    ) as HTMLElement[];
    expect(hosts.length).toBe(2);
    hosts.forEach((host) => {
      expect(host.style.position).toBe('absolute');
      expect(host.style.width).toBe('1px');
      expect(host.hasAttribute('hidden')).toBe(false);
    });
  });

  it('Toggle group renders aria-pressed on every toggle button server-side', () => {
    const f = TestBed.createComponent(ToggleGroupFixture);
    f.detectChanges();
    const items = Array.from(
      f.nativeElement.querySelectorAll('[forToggleGroupItem]'),
    ) as HTMLElement[];
    expect(items.length).toBe(2);
    items.forEach((item) => expect(item.getAttribute('aria-pressed')).toBe('false'));
  });

  describe('ForStepper server markup', () => {
    it('renders step 1 active — not the completed state — when item registration never flushes', () => {
      const f = TestBed.createComponent(StepperServerFixture);
      f.detectChanges();
      const root = f.nativeElement as HTMLElement;

      const panels = Array.from(root.querySelectorAll<HTMLElement>('[forStepperContent]'));
      const completed = root.querySelector<HTMLElement>('[forStepperCompletedContent]')!;
      const next = root.querySelector<HTMLElement>('[forStepperNext]')!;
      const progress = root.querySelector<HTMLElement>('[forStepperProgress]')!;
      const items = Array.from(root.querySelectorAll<HTMLElement>('[forStepperItem]'));

      expect(panels[0]!.hasAttribute('aria-hidden')).toBe(false);
      expect(panels[0]!.hasAttribute('inert')).toBe(false);
      expect(panels[0]!.getAttribute('data-state')).toBe('active');
      expect(panels[1]!.getAttribute('data-state')).toBe('inactive');

      expect(items[0]!.getAttribute('data-state')).toBe('active');

      expect(completed.getAttribute('data-state')).toBe('inactive');
      expect(completed.getAttribute('aria-hidden')).toBe('true');
      expect(next.hasAttribute('aria-disabled')).toBe(false);

      expect(progress.getAttribute('aria-valuetext')).toBe('Step 1 of 2');
    });
  });

  describe('ForTabs server markup', () => {
    it('wires every trigger/panel aria pairing server-side (aria-labelledby / aria-controls)', () => {
      const f = TestBed.createComponent(TabsServerFixture);
      f.detectChanges();
      const root = f.nativeElement as HTMLElement;

      const triggers = Array.from(root.querySelectorAll<HTMLElement>('[forTabsTrigger]'));
      const panels = Array.from(root.querySelectorAll<HTMLElement>('[forTabsContent]'));

      expect(triggers[1]!.getAttribute('aria-selected')).toBe('false');

      for (const [i, panel] of panels.entries()) {
        const trigger = triggers[i]!;
        expect(panel.getAttribute('aria-labelledby')).toBe(trigger.getAttribute('id'));
        expect(trigger.getAttribute('aria-controls')).toBe(panel.getAttribute('id'));
      }
    });

    it('pairs a consumer-set static id instead of a generated one server-side', () => {
      const f = TestBed.createComponent(TabsServerFixture);
      f.detectChanges();
      const root = f.nativeElement as HTMLElement;

      const trigger = root.querySelectorAll<HTMLElement>('[forTabsTrigger]')[1]!;
      const panel = root.querySelectorAll<HTMLElement>('[forTabsContent]')[1]!;

      expect(trigger.getAttribute('id')).toBe('static-tab-b');
      expect(panel.getAttribute('id')).toBe('static-panel-b');
      expect(panel.getAttribute('aria-labelledby')).toBe('static-tab-b');
      expect(trigger.getAttribute('aria-controls')).toBe('static-panel-b');
    });

    it('pairs triggers and panels rendered by sibling @for blocks server-side, without throwing', () => {
      const f = TestBed.createComponent(TabsServerRepeatFixture);
      expect(() => f.detectChanges()).not.toThrow();
      const root = f.nativeElement as HTMLElement;

      for (const tab of ['a', 'b']) {
        const trigger = root.querySelector<HTMLElement>(`[data-tab="${tab}"]`)!;
        const panel = root.querySelector<HTMLElement>(`[data-panel="${tab}"]`)!;
        expect(panel.getAttribute('aria-labelledby')).toBe(trigger.getAttribute('id'));
        expect(trigger.getAttribute('aria-controls')).toBe(panel.getAttribute('id'));
      }
    });
  });
});
