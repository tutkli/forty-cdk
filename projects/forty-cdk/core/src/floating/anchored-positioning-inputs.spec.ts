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

import { ANCHORED_POSITIONING_DEFAULTS } from './anchored-positioning-inputs';
import type { FloatingAlign, FloatingSide } from './floating';

const BASE_SOURCES = import.meta.glob(
  './anchored-{overlay-positioning,form-value-control}-base.ts',
  {
    query: '?raw',
    import: 'default',
    eager: true,
  },
) as Record<string, string>;

/**
 * The positioning block a base declares: everything from the abstract seed
 * accessor to the end of the class. Both bases are expected to carry it
 * character-for-character, so the region is extracted rather than compared
 * whole — the imports and the class JSDoc above it legitimately differ.
 */
function positioningBlock(source: string): string {
  const start = source.indexOf('  protected abstract readonly positioningDefaults');
  const end = source.lastIndexOf('}\n');
  return source.slice(start, end);
}

/**
 * The read surface every anchored root publishes. Deliberately structural: the
 * point of the table below is that thirteen unrelated classes answer the same
 * ten questions the same way.
 */
interface PositioningReadout {
  readonly side: Signal<FloatingSide>;
  readonly align: Signal<FloatingAlign>;
  readonly sideOffset: Signal<number>;
  readonly alignOffset: Signal<number>;
  readonly avoidCollisions: Signal<boolean>;
  readonly collisionPadding: Signal<number>;
  readonly arrowPadding: Signal<number>;
  readonly sticky: Signal<'partial' | 'always' | false>;
  readonly hideWhenDetached: Signal<boolean>;
  readonly clipUntilPositioned: Signal<boolean>;
}

interface RootCase {
  /** Selector the case is named after, used as the suite label. */
  readonly name: string;
  /** Directive class the fixture is queried by. */
  readonly directive: Type<PositioningReadout>;
  /** Effective `side` with no consumer binding and no scope override. */
  readonly side: FloatingSide;
  /** Effective `align` with no consumer binding and no scope override. */
  readonly align: FloatingAlign;
  /** Effective `sideOffset` with no consumer binding and no scope override. */
  readonly sideOffset: number;
  /** Effective `collisionPadding` with no consumer binding and no scope override. */
  readonly collisionPadding: number;
  /** This root's own defaults provider, taking the two placement seeds. */
  readonly provide: (overrides: { side: FloatingSide; align: FloatingAlign }) => Provider[];
}

/**
 * The thirteen anchored roots and the effective placement each resolves when
 * the consumer binds nothing. **These four numbers per row are the compatibility
 * claim of [#1726](https://github.com/tutkli/forty-cdk/issues/1726)**: the roots
 * moved from ten hand-rolled input blocks to one inherited block, and every
 * value here is what `main` produced before the move. `sideOffset` is the one
 * that genuinely varies (`0` flush at a pointer, `4` for a trigger button, `8`
 * for a larger surface), so a row changed by accident is a real regression
 * rather than a cosmetic one.
 */
const CASES: readonly RootCase[] = [
  {
    name: '[forPopover]',
    directive: ForPopover,
    side: 'bottom',
    align: 'center',
    sideOffset: 8,
    collisionPadding: 8,
    provide: provideForPopoverDefaults,
  },
  {
    name: '[forTooltip]',
    directive: ForTooltip,
    side: 'top',
    align: 'center',
    sideOffset: 8,
    collisionPadding: 8,
    provide: provideForTooltipDefaults,
  },
  {
    name: '[forHoverCard]',
    directive: ForHoverCard,
    side: 'top',
    align: 'center',
    sideOffset: 8,
    collisionPadding: 8,
    provide: provideForHoverCardDefaults,
  },
  {
    name: '[forSelect]',
    directive: ForSelect,
    side: 'bottom',
    align: 'start',
    sideOffset: 4,
    collisionPadding: 8,
    provide: provideForSelectDefaults,
  },
  {
    name: '[forCombobox]',
    directive: ForCombobox,
    side: 'bottom',
    align: 'start',
    sideOffset: 4,
    collisionPadding: 8,
    provide: provideForComboboxDefaults,
  },
  {
    name: '[forTimePicker]',
    directive: ForTimePicker,
    side: 'bottom',
    align: 'start',
    sideOffset: 4,
    collisionPadding: 8,
    provide: provideForTimePickerDefaults,
  },
  {
    name: '[forDatePicker]',
    directive: ForDatePicker,
    side: 'bottom',
    align: 'start',
    sideOffset: 8,
    collisionPadding: 8,
    provide: provideForDatePickerDefaults,
  },
  {
    name: '[forDateRangePicker]',
    directive: ForDateRangePicker,
    side: 'bottom',
    align: 'start',
    sideOffset: 8,
    collisionPadding: 8,
    provide: provideForDateRangePickerDefaults,
  },
  {
    name: '[forMenu]',
    directive: ForMenu,
    side: 'bottom',
    align: 'start',
    sideOffset: 0,
    collisionPadding: 8,
    provide: provideForMenuDefaults,
  },
  {
    name: '[forMenuSub]',
    directive: ForMenuSub,
    side: 'right',
    align: 'start',
    sideOffset: 0,
    collisionPadding: 8,
    provide: provideForMenuDefaults,
  },
  {
    name: '[forDropdownMenu]',
    directive: ForDropdownMenu,
    side: 'bottom',
    align: 'start',
    sideOffset: 4,
    collisionPadding: 8,
    provide: provideForDropdownMenuDefaults,
  },
  {
    name: '[forContextMenu]',
    directive: ForContextMenu,
    side: 'bottom',
    align: 'start',
    sideOffset: 0,
    collisionPadding: 8,
    provide: provideForContextMenuDefaults,
  },
  {
    name: '[forMenubarTrigger]',
    directive: ForMenubarTrigger,
    side: 'bottom',
    align: 'start',
    sideOffset: 4,
    collisionPadding: 8,
    provide: provideForMenubarDefaults,
  },
];

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

function mount(providers: Provider[] = []): (c: RootCase) => PositioningReadout {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), ...providers],
  });
  const fixture = TestBed.createComponent(AnchoredRootsHost);
  fixture.detectChanges();
  return (c) => fixture.debugElement.query(By.directive(c.directive)).injector.get(c.directive);
}

/**
 * Drift guard for the shared anchored-positioning block ([#962](https://github.com/tutkli/forty-cdk/issues/962),
 * [#1391](https://github.com/tutkli/forty-cdk/issues/1391),
 * [#1726](https://github.com/tutkli/forty-cdk/issues/1726)).
 *
 * All thirteen trigger-anchored roots now inherit their ten positioning inputs
 * and four effective computeds instead of declaring them — eight through
 * `AnchoredOverlayPositioningBase` (four of those via `MenuOverlayHost`), and
 * the five that are also form values through `AnchoredFormValueControlBase`,
 * which exists only because TypeScript has single inheritance and they must
 * extend `FormUiControlBase` too.
 *
 * That second base is the one thing here worth being suspicious of, so the
 * first case pins the two declarations character-for-character. The rest is the
 * per-root table: the non-seed values come from the single
 * `ANCHORED_POSITIONING_DEFAULTS` source and must be identical everywhere, the
 * four placement seeds come from each root's own defaults provider and are
 * asserted against the values `main` produced before the roots were folded onto
 * the base.
 */
describe('anchored positioning inputs', () => {
  it('declares the positioning block identically on both bases', () => {
    const blocks = Object.entries(BASE_SOURCES)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([path, source]) => ({ path, block: positioningBlock(source) }));

    expect(blocks).toHaveLength(2);
    for (const { path, block } of blocks) {
      expect(block, `${path} has no extractable positioning block`).toContain(
        'readonly clipUntilPositioned = input(',
      );
    }
    expect(blocks[0]!.block).toBe(blocks[1]!.block);
  });

  it('keeps the non-seed positioning defaults identical across all thirteen roots', () => {
    const read = mount();

    for (const c of CASES) {
      const root = read(c);
      expect(root.alignOffset(), c.name).toBe(ANCHORED_POSITIONING_DEFAULTS.alignOffset);
      expect(root.avoidCollisions(), c.name).toBe(ANCHORED_POSITIONING_DEFAULTS.avoidCollisions);
      expect(root.arrowPadding(), c.name).toBe(ANCHORED_POSITIONING_DEFAULTS.arrowPadding);
      expect(root.sticky(), c.name).toBe(ANCHORED_POSITIONING_DEFAULTS.sticky);
      expect(root.hideWhenDetached(), c.name).toBe(ANCHORED_POSITIONING_DEFAULTS.hideWhenDetached);
      expect(root.clipUntilPositioned(), c.name).toBe(
        ANCHORED_POSITIONING_DEFAULTS.clipUntilPositioned,
      );
    }
  });

  it('resolves each root to the placement it produced before adopting the base', () => {
    const read = mount();

    for (const c of CASES) {
      const root = read(c);
      expect(root.side(), c.name).toBe(c.side);
      expect(root.align(), c.name).toBe(c.align);
      expect(root.sideOffset(), c.name).toBe(c.sideOffset);
      expect(root.collisionPadding(), c.name).toBe(c.collisionPadding);
    }
  });
});

/**
 * The capability #1726 was opened over: `side` and `align` were scope-defaultable
 * for three roots and not for the other ten, with nothing documenting the split.
 * Each root's own provider now seeds both, so a design system can state "our
 * popups align to `end`" once per primitive.
 */
describe('anchored positioning seeds reach every root from its defaults provider', () => {
  for (const c of CASES) {
    describe(c.name, () => {
      it('resolves `side` / `align` from the scope defaults provider', () => {
        const read = mount(c.provide({ side: 'left', align: 'end' }));
        const root = read(c);

        expect(root.side()).toBe('left');
        expect(root.align()).toBe('end');
      });
    });
  }
});

@Component({
  imports: [ForCombobox, ForContextMenu, ForMenuSub],
  template: `
    <div forCombobox dir="rtl"></div>
    <div forContextMenu dir="rtl">
      <div forMenuSub></div>
    </div>
  `,
})
class RtlHost {}

/**
 * Two roots resolve a placement seed from the writing direction rather than from
 * a fixed literal, which is why their defaults key is nullable: `null` means
 * "derive it". Folding them onto the shared base had to preserve both exactly —
 * the combobox listbox anchors to the input's leading edge, and a submenu opens
 * away from its parent item.
 */
describe('writing-direction placement seeds', () => {
  function setup(providers: Provider[] = []): { combobox: ForCombobox; sub: ForMenuSub } {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), ...providers],
    });
    const fixture = TestBed.createComponent(RtlHost);
    fixture.detectChanges();
    return {
      combobox: fixture.debugElement.query(By.directive(ForCombobox)).injector.get(ForCombobox),
      sub: fixture.debugElement.query(By.directive(ForMenuSub)).injector.get(ForMenuSub),
    };
  }

  it('aligns the combobox listbox to `end` and opens the submenu to `left` under dir="rtl"', () => {
    const { combobox, sub } = setup();

    expect(combobox.align()).toBe('end');
    expect(sub.side()).toBe('left');
  });

  it('lets a scope default pin them regardless of writing direction', () => {
    const { combobox, sub } = setup([
      ...provideForComboboxDefaults({ align: 'center' }),
      ...provideForMenuDefaults({ side: 'top' }),
    ]);

    expect(combobox.align()).toBe('center');
    expect(sub.side()).toBe('top');
  });
});

@Component({
  imports: [ForTooltip],
  template: `
    <div
      forTooltip
      side="left"
      align="end"
      [sideOffset]="20"
      [alignOffset]="6"
      [collisionPadding]="24"
      [avoidCollisions]="false"
      [hideWhenDetached]="true"
      [clipUntilPositioned]="false"
    ></div>
  `,
})
class InheritedInputsHost {}

/**
 * Proves the positioning inputs declared on `AnchoredOverlayPositioningBase`
 * actually bind through the base on a concrete root: alias (`side` / `align` /
 * `sideOffset` / `alignOffset` / `collisionPadding`), transform
 * (`numberAttribute` / `booleanAttribute`), and inheritance all survive the
 * compile — and a per-instance binding still wins over the scope default.
 */
describe('anchored positioning inputs inherited from the base', () => {
  it('binds the inherited positioning inputs through the base on a forTooltip host', () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        ...provideForTooltipDefaults({ side: 'bottom', align: 'start', sideOffset: 2 }),
      ],
    });
    const fixture = TestBed.createComponent(InheritedInputsHost);
    fixture.detectChanges();
    const tooltip = fixture.debugElement.query(By.directive(ForTooltip)).injector.get(ForTooltip);

    expect(tooltip.side()).toBe('left');
    expect(tooltip.align()).toBe('end');
    expect(tooltip.sideOffset()).toBe(20);
    expect(tooltip.alignOffset()).toBe(6);
    expect(tooltip.collisionPadding()).toBe(24);
    expect(tooltip.avoidCollisions()).toBe(false);
    expect(tooltip.hideWhenDetached()).toBe(true);
    expect(tooltip.clipUntilPositioned()).toBe(false);
  });
});
