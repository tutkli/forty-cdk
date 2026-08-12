import {
  Component,
  type Provider,
  provideZonelessChangeDetection,
  type Signal,
  type Type,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { provideNativeDateAdapter } from 'forty-cdk/calendar';
import { ForCombobox, provideForComboboxDefaults } from 'forty-cdk/combobox';
import { ForContextMenu, provideForContextMenuDefaults } from 'forty-cdk/context-menu';
import {
  ForDatePicker,
  ForDateRangePicker,
  provideForDatePickerDefaults,
  provideForDateRangePickerDefaults,
} from 'forty-cdk/date-picker';
import { ForDropdownMenu, provideForDropdownMenuDefaults } from 'forty-cdk/dropdown-menu';
import { ForHoverCard, provideForHoverCardDefaults } from 'forty-cdk/hover-card';
import { ForMenu, ForMenuSub, provideForMenuDefaults } from 'forty-cdk/menu';
import { ForMenubar, ForMenubarTrigger, provideForMenubarDefaults } from 'forty-cdk/menubar';
import { ForPopover, provideForPopoverDefaults } from 'forty-cdk/popover';
import { ForSelect, provideForSelectDefaults } from 'forty-cdk/select';
import { ForTimePicker, provideForTimePickerDefaults } from 'forty-cdk/time-picker';
import { ForTooltip, provideForTooltipDefaults } from 'forty-cdk/tooltip';

import {
  ANCHORED_POSITIONING_BOUND_PROBE,
  type AnchoredPositioningReadout,
  type AnchoredPositioningSeeds,
  assertAnchoredPositioningContract,
} from '../test-utils/contract';

/**
 * Meta-guard **and** sweep for the positioning-input family: every
 * trigger-anchored overlay root inherits the nine floating-ui positioning inputs
 * from one of the two twin bases, and resolves them the same way.
 *
 * The family is derived from library source rather than declared, for the reason
 * `.claude/rules/testing.md` states over every guard in this folder: a missing
 * adopter is otherwise *invisible*, since the suite reports N green primitives
 * whether the roster lists N or N + 1. Here it is also the half that would have
 * caught [#1726](https://github.com/tutkli/forty-cdk/issues/1726) — ten roots
 * hand-rolled the block, so `provideForSelectDefaults({ align: 'end' })`
 * type-checked, resolved, and did nothing.
 *
 * The derived property is **the root extends one of the two bases** — directly,
 * or through `MenuOverlayHost` (the four menu roots) or `DatePickerBase` (both
 * date pickers) — which is the same property the generated `anchored
 * positioning block, inherited` matrix row is folded from, so
 * `pnpm check:matrices` and this guard cannot disagree about who the family is.
 * The property catches the two intermediate bases along with the roots, and they
 * are *declared* exclusions whose condition the guard falsifies.
 *
 * Unlike its six siblings the contract is adopted **here**, once per registry
 * entry, rather than from each primitive's own spec. The reason is in the
 * contract's own JSDoc and it is the SSR suite's: the claim is that thirteen
 * unrelated classes answer the same nine questions the same way, so the subject
 * is the set — the roots mount together in one host and the per-root variation
 * is the four numbers each entry carries. A new anchored root owes a registry
 * entry, never a hand-written `it`.
 *
 * The tenth input the block used to carry, `arrowPadding`, is the same claim over
 * a subset: it is declared by the three roots that ship an arrow piece and by no
 * other, which {@link ARROW_ROOTS} states and the meta-guard derives from source
 * in both directions ([#1776](https://github.com/tutkli/forty-cdk/issues/1776)).
 *
 * Reading the effective computeds off the directive is deliberate and is the one
 * place `### Test isolation` rule 6 does not apply: they are the *public* read
 * surface the content directives forward into `injectOverlayShell`, not internal
 * state. What the positioner then does with a resolved placement
 * (`data-side` / `data-align` / the `--for-floating-*` properties) is asserted
 * over the positioner itself in
 * `core-overlay/src/floating/floating.spec.ts`, and end to end through the DOM
 * in the popover / tooltip / hover-card suites; the wiring in between is the
 * source claim the last case here makes over every `kind: 'floating'` block in
 * the library.
 */
const SOURCES = import.meta.glob('/projects/forty-cdk/*/src/**/*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
});

interface AnchoredRootEntry {
  /** The root's selector, quoted in every failure this guard reports. */
  root: string;
  /** The file declaring the root, relative to `projects/forty-cdk/`. */
  source: string;
  /** Directive class the shared host is queried by. */
  directive: Type<AnchoredPositioningReadout>;
  /**
   * The placement this root resolves with no consumer binding and no scope
   * override — the values `main` produced before the roots were folded onto the
   * base. `sideOffset` is the one that genuinely varies (`0` flush at a pointer,
   * `4` for a trigger button, `8` for a larger surface), so a row changed by
   * accident is a real regression rather than a cosmetic one.
   */
  seeds: AnchoredPositioningSeeds;
  /** This root's own defaults provider, taking the four placement seeds. */
  provide: (overrides: AnchoredPositioningSeeds) => Provider[];
}

const REGISTRY: readonly AnchoredRootEntry[] = [
  {
    root: '[forPopover]',
    source: 'popover/src/popover.ts',
    directive: ForPopover,
    seeds: { side: 'bottom', align: 'center', sideOffset: 8, collisionPadding: 8 },
    provide: provideForPopoverDefaults,
  },
  {
    root: '[forTooltip]',
    source: 'tooltip/src/tooltip.ts',
    directive: ForTooltip,
    seeds: { side: 'top', align: 'center', sideOffset: 8, collisionPadding: 8 },
    provide: provideForTooltipDefaults,
  },
  {
    root: '[forHoverCard]',
    source: 'hover-card/src/hover-card.ts',
    directive: ForHoverCard,
    seeds: { side: 'top', align: 'center', sideOffset: 8, collisionPadding: 8 },
    provide: provideForHoverCardDefaults,
  },
  {
    root: '[forSelect]',
    source: 'select/src/select.ts',
    directive: ForSelect,
    seeds: { side: 'bottom', align: 'start', sideOffset: 4, collisionPadding: 8 },
    provide: provideForSelectDefaults,
  },
  {
    root: '[forCombobox]',
    source: 'combobox/src/combobox.ts',
    directive: ForCombobox,
    seeds: { side: 'bottom', align: 'start', sideOffset: 4, collisionPadding: 8 },
    provide: provideForComboboxDefaults,
  },
  {
    root: '[forTimePicker]',
    source: 'time-picker/src/time-picker.ts',
    directive: ForTimePicker,
    seeds: { side: 'bottom', align: 'start', sideOffset: 4, collisionPadding: 8 },
    provide: provideForTimePickerDefaults,
  },
  {
    root: '[forDatePicker]',
    source: 'date-picker/src/date-picker.ts',
    directive: ForDatePicker,
    seeds: { side: 'bottom', align: 'start', sideOffset: 8, collisionPadding: 8 },
    provide: provideForDatePickerDefaults,
  },
  {
    root: '[forDateRangePicker]',
    source: 'date-picker/src/date-range-picker.ts',
    directive: ForDateRangePicker,
    seeds: { side: 'bottom', align: 'start', sideOffset: 8, collisionPadding: 8 },
    provide: provideForDateRangePickerDefaults,
  },
  {
    root: '[forMenu]',
    source: 'menu/src/menu.ts',
    directive: ForMenu,
    seeds: { side: 'bottom', align: 'start', sideOffset: 0, collisionPadding: 8 },
    provide: provideForMenuDefaults,
  },
  {
    root: '[forMenuSub]',
    source: 'menu/src/menu-sub.ts',
    directive: ForMenuSub,
    seeds: { side: 'right', align: 'start', sideOffset: 0, collisionPadding: 8 },
    provide: provideForMenuDefaults,
  },
  {
    root: '[forDropdownMenu]',
    source: 'dropdown-menu/src/dropdown-menu.ts',
    directive: ForDropdownMenu,
    seeds: { side: 'bottom', align: 'start', sideOffset: 4, collisionPadding: 8 },
    provide: provideForDropdownMenuDefaults,
  },
  {
    root: '[forContextMenu]',
    source: 'context-menu/src/context-menu.ts',
    directive: ForContextMenu,
    seeds: { side: 'bottom', align: 'start', sideOffset: 0, collisionPadding: 8 },
    provide: provideForContextMenuDefaults,
  },
  {
    root: '[forMenubarTrigger]',
    source: 'menubar/src/menubar-trigger.ts',
    directive: ForMenubarTrigger,
    seeds: { side: 'bottom', align: 'start', sideOffset: 4, collisionPadding: 8 },
    provide: provideForMenubarDefaults,
  },
];

/**
 * Files the derived property catches that are not roots, with the reason — each
 * is an intermediate `@Directive()`-decorated **abstract** base that exists so
 * its subclasses inherit the block (`MenuOverlayHost` for the four menu roots,
 * `DatePickerBase` for both date pickers).
 *
 * The condition each entry is checked against is that the file still declares
 * an `abstract class` and still declares no `selector:` — the two properties
 * that make it un-mountable, and therefore not a root the contract could cover.
 * Mere existence is the weaker half: the day one of them gains a selector it
 * becomes a root with a positioning surface nothing asserts, and the exclusion
 * would keep it out with nothing red.
 */
const EXCLUSIONS: Readonly<Record<string, string>> = {
  'core-overlay/src/menu-overlay/menu-overlay-host.ts':
    'abstract base the four menu roots extend to inherit the block — not itself mountable',
  'date-picker/src/date-picker-base.ts':
    'abstract base [forDatePicker] / [forDateRangePicker] extend — not itself mountable',
};

/** The read surface the three arrow-capable roots publish beyond the shared nine. */
interface ArrowPaddingReadout {
  readonly arrowPadding: Signal<number>;
}

interface ArrowRootEntry {
  /** The root's selector, quoted in every failure the arrow cases report. */
  root: string;
  /** Directive class the shared host is queried by. */
  directive: Type<ArrowPaddingReadout>;
  /** This root's own defaults provider, taking the arrow padding. */
  provide: (overrides: { arrowPadding: number }) => Provider[];
}

/**
 * The roots that declare `arrowPadding` themselves, because they are the ones
 * with an arrow to pad: floating-ui installs the `arrow` middleware only when an
 * arrow element is supplied, so the input reaches nothing on a root with no arrow
 * piece — which is what the other ten inherited from the base until
 * [#1776](https://github.com/tutkli/forty-cdk/issues/1776).
 *
 * Membership is **derived in both directions** by the meta-guard below, from the
 * two source properties that make a root arrow-capable at all: it declares the
 * input, and it declares the `registerArrow` its `[for<Primitive>Arrow]` piece
 * calls. So a fourth root growing an arrow, or one of these three declaring an
 * `arrowPadding` its anatomy cannot use, fails here rather than shipping.
 */
const ARROW_ROOTS: readonly ArrowRootEntry[] = [
  { root: '[forPopover]', directive: ForPopover, provide: provideForPopoverDefaults },
  { root: '[forTooltip]', directive: ForTooltip, provide: provideForTooltipDefaults },
  { root: '[forHoverCard]', directive: ForHoverCard, provide: provideForHoverCardDefaults },
];

/** Every root's library fallback for `arrowPadding`, seeded from its own defaults file. */
const ARROW_PADDING_FALLBACK = 0;

/** The scope override the second arrow case seeds — differs from the fallback. */
const ARROW_PADDING_SCOPE_PROBE = 6;

/** The value the third arrow case binds per instance — differs from the scope probe. */
const ARROW_PADDING_BOUND_PROBE = 12;

const DECLARES_ARROW_PADDING = /^ {2}readonly arrowPadding = input\(/m;
const DECLARES_ARROW_REGISTRY = /\bregisterArrow\(/;

/**
 * Every file building a `kind: 'floating'` positioner block, asserted as a set
 * so the ledger cannot rot in either direction: a new hand-built block fails
 * until it is listed, and a site that moves onto the shared
 * `toFloatingPositioner` helper fails until it is removed.
 *
 * Five of the six are hand-built. `toFloatingPositioner`
 * (`core-overlay/src/floating/anchored-positioning-inputs.ts`) is the shared
 * one, and it covers the three roots with no collection — Popover, Tooltip and
 * HoverCard — so the five content directives below each spell the same thirteen
 * fields themselves.
 */
const FLOATING_POSITIONER_SITES: readonly string[] = [
  'combobox/src/combobox-content.ts',
  'core-overlay/src/floating/anchored-positioning-inputs.ts',
  'date-picker/src/date-picker-content.ts',
  'menu/src/menu-content.ts',
  'select/src/select-content.ts',
  'time-picker/src/time-picker-content.ts',
];

/**
 * The nine inputs a content directive must forward into `injectOverlayShell`, in
 * the `kind: 'floating'` positioner block. Every one of them is an *effective*
 * computed on the root, mirrored on its context, so forwarding a literal or the
 * neighbouring signal is the drift that leaves an input silently inert — which
 * is what the roots' own `side` / `align` were before #1726.
 *
 * **`arrowPadding` is required of a block that forwards an `arrow` and forbidden
 * of one that does not**, in both directions rather than as a carve-out: the
 * `arrow` middleware is installed only when an arrow element is supplied, so
 * padding forwarded without one is a value nothing reads and padding withheld
 * from one is a bound input that stops arriving. Exactly one site forwards
 * `arrow` — the shared `toFloatingPositioner`, reached by the three roots with an
 * arrow piece — so the five hand-built blocks must forward neither. They each did
 * forward the padding until
 * [#1776](https://github.com/tutkli/forty-cdk/issues/1776), because the base
 * handed every root the input along with the rest of the block (#1726).
 */
const FORWARDED_POSITIONING_INPUTS = [
  'side',
  'align',
  'sideOffset',
  'alignOffset',
  'avoidCollisions',
  'collisionPadding',
  'sticky',
  'hideWhenDetached',
  'clipUntilPositioned',
] as const;

const pathOf = (key: string): string => key.replace(/^\/projects\/forty-cdk\//, '');

const stripComments = (text: string): string =>
  text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

const LIBRARY_SOURCES: ReadonlyArray<readonly [string, string]> = Object.entries(SOURCES)
  .filter(([key]) => !key.endsWith('.spec.ts'))
  .map(([key, source]) => [pathOf(key), stripComments(source as string)] as const);

const INHERITS_THE_BLOCK =
  /extends\s+(?:AnchoredOverlayPositioningBase|AnchoredFormValueControlBase|MenuOverlayHost|DatePickerBase)\b/;

/** Every file extending one of the two bases, directly or through an intermediate one. */
const inheritors = (): string[] =>
  LIBRARY_SOURCES.filter(([, source]) => INHERITS_THE_BLOCK.test(source)).map(([path]) => path);

const familyMembers = (): string[] => inheritors().filter((path) => EXCLUSIONS[path] === undefined);

const declaredSelectors = (): Set<string> => {
  const selectors = new Set<string>();
  for (const [, source] of LIBRARY_SOURCES) {
    for (const match of source.matchAll(/selector:\s*'([^']+)'/g)) {
      selectors.add(match[1]!);
    }
  }
  return selectors;
};

/**
 * The object literal opening at the `{` that precedes `from`, brace-matched to
 * its close. Over-reading is harmless (the surrounding `dismiss` block shares no
 * key name with the ten); under-reading would make the forwarding case stop
 * looking rather than fail, which is why the case asserts all ten keys are found
 * per site.
 */
function enclosingObjectLiteral(source: string, from: number): string {
  const open = source.lastIndexOf('{', from);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') {
      depth++;
    } else if (source[i] === '}') {
      depth--;
      if (depth === 0) {
        return source.slice(open, i + 1);
      }
    }
  }
  return source.slice(open);
}

/** Every `kind: 'floating'` positioner block in library source, keyed by file. */
function floatingPositionerBlocks(): Array<{ path: string; block: string }> {
  const blocks: Array<{ path: string; block: string }> = [];
  for (const [path, source] of LIBRARY_SOURCES) {
    for (const match of source.matchAll(/kind: 'floating',/g)) {
      blocks.push({ path, block: enclosingObjectLiteral(source, match.index!) });
    }
  }
  return blocks;
}

const claimedSources = new Set(REGISTRY.map((entry) => entry.source));
const sorted = (values: Iterable<string>): string[] => [...values].sort();

@Component({
  imports: [
    ForPopover,
    ForTooltip,
    ForHoverCard,
    ForSelect,
    ForCombobox,
    ForTimePicker,
    ForDatePicker,
    ForDateRangePicker,
    ForMenu,
    ForMenuSub,
    ForDropdownMenu,
    ForContextMenu,
    ForMenubar,
    ForMenubarTrigger,
  ],
  providers: [...provideNativeDateAdapter()],
  template: `
    <div forPopover></div>
    <div forTooltip></div>
    <div forHoverCard></div>
    <div forSelect></div>
    <div forCombobox></div>
    <div forTimePicker></div>
    <div forDatePicker></div>
    <div forDateRangePicker></div>
    <div forMenu></div>
    <div forDropdownMenu></div>
    <div forContextMenu>
      <div forMenuSub></div>
    </div>
    <div forMenubar>
      <button forMenubarTrigger value="file">File</button>
    </div>
  `,
})
class AnchoredRootsHost {}

/**
 * The same thirteen roots with all nine positioning inputs bound per instance.
 * Every binding reads {@link ANCHORED_POSITIONING_BOUND_PROBE} rather than a
 * literal copied into the template, so the values the contract asserts and the
 * values the template binds cannot drift apart.
 */
@Component({
  imports: [
    ForPopover,
    ForTooltip,
    ForHoverCard,
    ForSelect,
    ForCombobox,
    ForTimePicker,
    ForDatePicker,
    ForDateRangePicker,
    ForMenu,
    ForMenuSub,
    ForDropdownMenu,
    ForContextMenu,
    ForMenubar,
    ForMenubarTrigger,
  ],
  providers: [...provideNativeDateAdapter()],
  template: `
    <div
      forPopover
      [side]="p.side"
      [align]="p.align"
      [sideOffset]="p.sideOffset"
      [alignOffset]="p.alignOffset"
      [avoidCollisions]="p.avoidCollisions"
      [collisionPadding]="p.collisionPadding"
      [sticky]="p.sticky"
      [hideWhenDetached]="p.hideWhenDetached"
      [clipUntilPositioned]="p.clipUntilPositioned"
    ></div>
    <div
      forTooltip
      [side]="p.side"
      [align]="p.align"
      [sideOffset]="p.sideOffset"
      [alignOffset]="p.alignOffset"
      [avoidCollisions]="p.avoidCollisions"
      [collisionPadding]="p.collisionPadding"
      [sticky]="p.sticky"
      [hideWhenDetached]="p.hideWhenDetached"
      [clipUntilPositioned]="p.clipUntilPositioned"
    ></div>
    <div
      forHoverCard
      [side]="p.side"
      [align]="p.align"
      [sideOffset]="p.sideOffset"
      [alignOffset]="p.alignOffset"
      [avoidCollisions]="p.avoidCollisions"
      [collisionPadding]="p.collisionPadding"
      [sticky]="p.sticky"
      [hideWhenDetached]="p.hideWhenDetached"
      [clipUntilPositioned]="p.clipUntilPositioned"
    ></div>
    <div
      forSelect
      [side]="p.side"
      [align]="p.align"
      [sideOffset]="p.sideOffset"
      [alignOffset]="p.alignOffset"
      [avoidCollisions]="p.avoidCollisions"
      [collisionPadding]="p.collisionPadding"
      [sticky]="p.sticky"
      [hideWhenDetached]="p.hideWhenDetached"
      [clipUntilPositioned]="p.clipUntilPositioned"
    ></div>
    <div
      forCombobox
      [side]="p.side"
      [align]="p.align"
      [sideOffset]="p.sideOffset"
      [alignOffset]="p.alignOffset"
      [avoidCollisions]="p.avoidCollisions"
      [collisionPadding]="p.collisionPadding"
      [sticky]="p.sticky"
      [hideWhenDetached]="p.hideWhenDetached"
      [clipUntilPositioned]="p.clipUntilPositioned"
    ></div>
    <div
      forTimePicker
      [side]="p.side"
      [align]="p.align"
      [sideOffset]="p.sideOffset"
      [alignOffset]="p.alignOffset"
      [avoidCollisions]="p.avoidCollisions"
      [collisionPadding]="p.collisionPadding"
      [sticky]="p.sticky"
      [hideWhenDetached]="p.hideWhenDetached"
      [clipUntilPositioned]="p.clipUntilPositioned"
    ></div>
    <div
      forDatePicker
      [side]="p.side"
      [align]="p.align"
      [sideOffset]="p.sideOffset"
      [alignOffset]="p.alignOffset"
      [avoidCollisions]="p.avoidCollisions"
      [collisionPadding]="p.collisionPadding"
      [sticky]="p.sticky"
      [hideWhenDetached]="p.hideWhenDetached"
      [clipUntilPositioned]="p.clipUntilPositioned"
    ></div>
    <div
      forDateRangePicker
      [side]="p.side"
      [align]="p.align"
      [sideOffset]="p.sideOffset"
      [alignOffset]="p.alignOffset"
      [avoidCollisions]="p.avoidCollisions"
      [collisionPadding]="p.collisionPadding"
      [sticky]="p.sticky"
      [hideWhenDetached]="p.hideWhenDetached"
      [clipUntilPositioned]="p.clipUntilPositioned"
    ></div>
    <div
      forMenu
      [side]="p.side"
      [align]="p.align"
      [sideOffset]="p.sideOffset"
      [alignOffset]="p.alignOffset"
      [avoidCollisions]="p.avoidCollisions"
      [collisionPadding]="p.collisionPadding"
      [sticky]="p.sticky"
      [hideWhenDetached]="p.hideWhenDetached"
      [clipUntilPositioned]="p.clipUntilPositioned"
    ></div>
    <div
      forDropdownMenu
      [side]="p.side"
      [align]="p.align"
      [sideOffset]="p.sideOffset"
      [alignOffset]="p.alignOffset"
      [avoidCollisions]="p.avoidCollisions"
      [collisionPadding]="p.collisionPadding"
      [sticky]="p.sticky"
      [hideWhenDetached]="p.hideWhenDetached"
      [clipUntilPositioned]="p.clipUntilPositioned"
    ></div>
    <div
      forContextMenu
      [side]="p.side"
      [align]="p.align"
      [sideOffset]="p.sideOffset"
      [alignOffset]="p.alignOffset"
      [avoidCollisions]="p.avoidCollisions"
      [collisionPadding]="p.collisionPadding"
      [sticky]="p.sticky"
      [hideWhenDetached]="p.hideWhenDetached"
      [clipUntilPositioned]="p.clipUntilPositioned"
    >
      <div
        forMenuSub
        [side]="p.side"
        [align]="p.align"
        [sideOffset]="p.sideOffset"
        [alignOffset]="p.alignOffset"
        [avoidCollisions]="p.avoidCollisions"
        [collisionPadding]="p.collisionPadding"
        [sticky]="p.sticky"
        [hideWhenDetached]="p.hideWhenDetached"
        [clipUntilPositioned]="p.clipUntilPositioned"
      ></div>
    </div>
    <div forMenubar>
      <button
        forMenubarTrigger
        value="file"
        [side]="p.side"
        [align]="p.align"
        [sideOffset]="p.sideOffset"
        [alignOffset]="p.alignOffset"
        [avoidCollisions]="p.avoidCollisions"
        [collisionPadding]="p.collisionPadding"
        [sticky]="p.sticky"
        [hideWhenDetached]="p.hideWhenDetached"
        [clipUntilPositioned]="p.clipUntilPositioned"
      >
        File
      </button>
    </div>
  `,
})
class BoundAnchoredRootsHost {
  protected readonly p = ANCHORED_POSITIONING_BOUND_PROBE;
}

/**
 * The three arrow-capable roots with `arrowPadding` bound per instance, from
 * {@link ARROW_PADDING_BOUND_PROBE} rather than a literal copied into the
 * template so the value asserted and the value bound cannot drift apart.
 */
@Component({
  imports: [ForPopover, ForTooltip, ForHoverCard],
  template: `
    <div forPopover [arrowPadding]="p"></div>
    <div forTooltip [arrowPadding]="p"></div>
    <div forHoverCard [arrowPadding]="p"></div>
  `,
})
class BoundArrowRootsHost {
  protected readonly p = ARROW_PADDING_BOUND_PROBE;
}

function mountAll(host: Type<unknown>, providers: Provider[] = []): <T>(directive: Type<T>) => T {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), ...providers],
  });
  const fixture = TestBed.createComponent(host);
  fixture.detectChanges();
  return <T>(directive: Type<T>): T =>
    fixture.debugElement.query(By.directive(directive)).injector.get(directive);
}

describe('anchored positioning contract adoption (meta-guard)', () => {
  it('finds the library sources through the glob', () => {
    expect(Object.keys(SOURCES).length).toBeGreaterThan(100);
  });

  it('finds every file inheriting the shared positioning block', () => {
    expect(inheritors().length).toBe(REGISTRY.length + Object.keys(EXCLUSIONS).length);
  });

  it('has a registry entry for every root in the family', () => {
    const missing = familyMembers().filter((path) => !claimedSources.has(path));

    expect(sorted(missing)).toEqual([]);
  });

  it('claims no file that stopped inheriting the block', () => {
    const inheriting = new Set(inheritors());
    const stale = [...claimedSources].filter((source) => !inheriting.has(source));

    expect(sorted(stale)).toEqual([]);
  });

  it('names a root that still declares its selector', () => {
    const selectors = declaredSelectors();
    const unknown = REGISTRY.filter((entry) => !selectors.has(entry.root)).map(
      (entry) => entry.root,
    );

    expect(sorted(unknown)).toEqual([]);
  });

  it('excludes no file whose exclusion condition stopped holding', () => {
    const byPath = new Map(LIBRARY_SOURCES);

    const stale = Object.keys(EXCLUSIONS).flatMap((path) => {
      const source = byPath.get(path);
      if (source === undefined) {
        return [`${path}: no longer exists`];
      }
      if (!/abstract class/.test(source)) {
        return [`${path}: no longer declares an abstract class`];
      }
      return /selector:\s*'/.test(source) ? [`${path}: now declares a selector`] : [];
    });

    expect(sorted(stale)).toEqual([]);
  });

  it('forwards the effective computeds into every floating positioner block', () => {
    const blocks = floatingPositionerBlocks();
    expect(sorted(new Set(blocks.map(({ path }) => path)))).toEqual([...FLOATING_POSITIONER_SITES]);

    const forwarded = (block: string, key: string): string | null =>
      block.match(new RegExp(`\\b${key}:\\s*([^,\\n]+),`))?.[1]?.trim() ?? null;

    const wrong = blocks.flatMap(({ path, block }) => {
      const padsAnArrow = forwarded(block, 'arrow') !== null;
      const required = padsAnArrow
        ? [...FORWARDED_POSITIONING_INPUTS, 'arrowPadding' as const]
        : [...FORWARDED_POSITIONING_INPUTS];
      const stray =
        !padsAnArrow && forwarded(block, 'arrowPadding') !== null
          ? [`${path}: forwards arrowPadding with no arrow to pad`]
          : [];
      return [
        ...stray,
        ...required.flatMap((key) => {
          const expression = forwarded(block, key);
          if (expression === null) {
            return [`${path}: forwards no ${key}`];
          }
          const member = /\.(\w+)$/.exec(expression)?.[1];
          return member === key ? [] : [`${path}: forwards ${expression} as ${key}`];
        }),
      ];
    });

    expect(sorted(wrong)).toEqual([]);
  });

  it('declares arrowPadding on exactly the roots that register an arrow', () => {
    const byPath = new Map(LIBRARY_SOURCES);
    const rootsWhere = (pattern: RegExp): string[] =>
      REGISTRY.filter((entry) => pattern.test(byPath.get(entry.source) ?? '')).map(
        (entry) => entry.root,
      );

    expect(sorted(rootsWhere(DECLARES_ARROW_PADDING))).toEqual(
      sorted(ARROW_ROOTS.map((entry) => entry.root)),
    );
    expect(sorted(rootsWhere(DECLARES_ARROW_REGISTRY))).toEqual(
      sorted(ARROW_ROOTS.map((entry) => entry.root)),
    );
  });
});

/**
 * `arrowPadding` resolves the way the nine shared inputs do — library fallback,
 * then this root's own scope defaults, then a per-instance binding — over the
 * three roots that declare it. Stated here rather than in each primitive's own
 * spec for the reason the swept contract below is: the claim is that the three
 * answer it identically, so the subject is the set.
 */
describe('arrow padding, declared per arrow-capable root', () => {
  for (const entry of ARROW_ROOTS) {
    it(`${entry.root} falls back to the library arrow padding`, () => {
      const root = mountAll(AnchoredRootsHost)(entry.directive);

      expect(root.arrowPadding()).toBe(ARROW_PADDING_FALLBACK);
    });

    it(`${entry.root} seeds it from its own defaults provider`, () => {
      const root = mountAll(
        AnchoredRootsHost,
        entry.provide({ arrowPadding: ARROW_PADDING_SCOPE_PROBE }),
      )(entry.directive);

      expect(root.arrowPadding()).toBe(ARROW_PADDING_SCOPE_PROBE);
    });

    it(`${entry.root} lets a per-instance binding win over the scope`, () => {
      const root = mountAll(
        BoundArrowRootsHost,
        entry.provide({ arrowPadding: ARROW_PADDING_SCOPE_PROBE }),
      )(entry.directive);

      expect(root.arrowPadding()).toBe(ARROW_PADDING_BOUND_PROBE);
    });
  }
});

for (const entry of REGISTRY) {
  assertAnchoredPositioningContract(
    {
      mount: () => mountAll(AnchoredRootsHost)(entry.directive),
      mountScoped: (overrides) =>
        mountAll(AnchoredRootsHost, entry.provide(overrides))(entry.directive),
      mountBound: (overrides) =>
        mountAll(BoundAnchoredRootsHost, entry.provide(overrides))(entry.directive),
    },
    { label: entry.root, seeds: entry.seeds },
  );
}
