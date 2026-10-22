import {
  ChangeDetectionStrategy,
  Component,
  type Provider,
  provideZonelessChangeDetection,
  signal,
  type Type,
} from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { flush } from '../test-utils/flush';
import { afterEachOverlayCleanup } from '../test-utils/overlay-cleanup';
import { LIBRARY_CODE } from '../test-utils/source-scan';

import { provideNativeDateAdapter } from 'forty-cdk/shared';
import {
  ForCombobox,
  ForComboboxContent,
  ForComboboxInput,
  ForComboboxList,
  ForComboboxOption,
} from 'forty-cdk/combobox';
import { ForContextMenu, ForContextMenuTrigger } from 'forty-cdk/context-menu';
import {
  ForDatePicker,
  ForDatePickerContent,
  ForDatePickerTrigger,
  ForDateRangePicker,
} from 'forty-cdk/date-picker';
import { ForDropdownMenu, ForDropdownMenuTrigger } from 'forty-cdk/dropdown-menu';
import { ForHoverCard, ForHoverCardContent, ForHoverCardTrigger } from 'forty-cdk/hover-card';
import {
  ForMenu,
  ForMenuContent,
  ForMenuItem,
  ForMenuSub,
  ForMenuSubTrigger,
} from 'forty-cdk/menu';
import { ForMenubar, ForMenubarTrigger } from 'forty-cdk/menubar';
import {
  ForNavigationMenu,
  ForNavigationMenuContent,
  ForNavigationMenuItem,
  ForNavigationMenuList,
  ForNavigationMenuTrigger,
} from 'forty-cdk/navigation-menu';
import { ForPopover, ForPopoverContent, ForPopoverTrigger } from 'forty-cdk/popover';
import { ForSelect, ForSelectContent, ForSelectTrigger } from 'forty-cdk/select';
import { ForTimePicker, ForTimePickerContent, ForTimePickerTrigger } from 'forty-cdk/time-picker';
import { ForTooltip, ForTooltipContent, ForTooltipTrigger } from 'forty-cdk/tooltip';

const CODE = 'FORCDK-CORE-014';

abstract class SurfaceHost {
  readonly open = signal(false);
  readonly withContent = signal(false);
}

@Component({
  imports: [ForPopover, ForPopoverTrigger, ForPopoverContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forPopover [(open)]="open">
    <button forPopoverTrigger>Toggle</button>
    @if (open() && withContent()) {
      <div forPopoverContent>Content</div>
    }
  </div>`,
})
class PopoverHost extends SurfaceHost {}

@Component({
  imports: [ForSelect, ForSelectTrigger, ForSelectContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forSelect [(open)]="open">
    <button forSelectTrigger>Select</button>
    @if (open() && withContent()) {
      <div forSelectContent></div>
    }
  </div>`,
})
class SelectHost extends SurfaceHost {}

@Component({
  imports: [ForCombobox, ForComboboxInput, ForComboboxContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forCombobox [(open)]="open">
    <input forComboboxInput />
    @if (open() && withContent()) {
      <div forComboboxContent></div>
    }
  </div>`,
})
class ComboboxHost extends SurfaceHost {}

@Component({
  imports: [ForDropdownMenu, ForDropdownMenuTrigger, ForMenuContent, ForMenuItem],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forDropdownMenu [(open)]="open">
    <button forDropdownMenuTrigger>Options</button>
    @if (open() && withContent()) {
      <div forMenuContent><button forMenuItem>New</button></div>
    }
  </div>`,
})
class DropdownMenuHost extends SurfaceHost {}

@Component({
  imports: [ForMenu, ForDropdownMenuTrigger, ForMenuContent, ForMenuItem],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forMenu #row="forMenu" [(open)]="open">
    <button [forDropdownMenuTrigger]="row">Row actions</button>
    @if (open() && withContent()) {
      <div forMenuContent><button forMenuItem>Edit</button></div>
    }
  </div>`,
})
class SharedMenuHost extends SurfaceHost {}

@Component({
  imports: [
    ForDropdownMenu,
    ForDropdownMenuTrigger,
    ForMenuContent,
    ForMenuItem,
    ForMenuSub,
    ForMenuSubTrigger,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forDropdownMenu [open]="true">
    <button forDropdownMenuTrigger>Options</button>
    <div forMenuContent>
      <div forMenuSub [(open)]="open">
        <button forMenuSubTrigger>More tools</button>
        @if (open() && withContent()) {
          <div forMenuSubContent><button forMenuItem>Developer tools</button></div>
        }
      </div>
    </div>
  </div>`,
})
class SubmenuHost extends SurfaceHost {}

@Component({
  imports: [ForTooltip, ForTooltipTrigger, ForTooltipContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forTooltip [(open)]="open">
    <button forTooltipTrigger>Hover</button>
    @if (open() && withContent()) {
      <div forTooltipContent>Hint</div>
    }
  </div>`,
})
class TooltipHost extends SurfaceHost {}

@Component({
  imports: [ForHoverCard, ForHoverCardTrigger, ForHoverCardContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span forHoverCard [(open)]="open">
    <a forHoverCardTrigger href="/users/ada">Ada</a>
    @if (open() && withContent()) {
      <div forHoverCardContent>Preview</div>
    }
  </span>`,
})
class HoverCardHost extends SurfaceHost {}

@Component({
  imports: [ForDatePicker, ForDatePickerTrigger, ForDatePickerContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forDatePicker [(open)]="open">
    <button forDatePickerTrigger>Pick</button>
    @if (open() && withContent()) {
      <div forDatePickerContent></div>
    }
  </div>`,
})
class DatePickerHost extends SurfaceHost {}

@Component({
  imports: [ForDateRangePicker, ForDatePickerTrigger, ForDatePickerContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forDateRangePicker [(open)]="open">
    <button forDatePickerTrigger>Pick a range</button>
    @if (open() && withContent()) {
      <div forDatePickerContent></div>
    }
  </div>`,
})
class DateRangePickerHost extends SurfaceHost {}

@Component({
  imports: [ForTimePicker, ForTimePickerTrigger, ForTimePickerContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forTimePicker [step]="60" [(open)]="open">
    <button forTimePickerTrigger>Pick</button>
    @if (open() && withContent()) {
      <div forTimePickerContent></div>
    }
  </div>`,
})
class TimePickerHost extends SurfaceHost {}

@Component({
  imports: [ForMenubar, ForMenubarTrigger, ForMenuContent, ForMenuItem],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forMenubar [value]="open() ? 'file' : null">
    <button forMenubarTrigger value="file">File</button>
    @if (open() && withContent()) {
      <div forMenuContent><button forMenuItem>New</button></div>
    }
  </div>`,
})
class MenubarHost extends SurfaceHost {}

@Component({
  imports: [
    ForNavigationMenu,
    ForNavigationMenuList,
    ForNavigationMenuItem,
    ForNavigationMenuTrigger,
    ForNavigationMenuContent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<nav forNavigationMenu [value]="open() ? 'products' : null">
    <ul forNavigationMenuList>
      <li forNavigationMenuItem value="products">
        <button forNavigationMenuTrigger>Products</button>
        @if (open() && withContent()) {
          <div forNavigationMenuContent>Panel</div>
        }
      </li>
    </ul>
  </nav>`,
})
class NavigationMenuHost extends SurfaceHost {}

interface Adopter {
  /** The `<entry-point>/src/<file>.ts` whose root calls the helper. */
  readonly source: string;
  readonly primitive: string;
  readonly piece: string;
  /** The `@if` expression the report quotes back, as the primitive's README writes it. */
  readonly condition: string;
  readonly host: Type<SurfaceHost>;
  readonly providers?: readonly Provider[];
}

const ADOPTERS: readonly Adopter[] = [
  {
    source: 'popover/src/popover.ts',
    primitive: 'popover',
    piece: '[forPopoverContent]',
    condition: 'popover.open()',
    host: PopoverHost,
  },
  {
    source: 'select/src/select.ts',
    primitive: 'select',
    piece: '[forSelectContent]',
    condition: 'select.open()',
    host: SelectHost,
  },
  {
    source: 'combobox/src/combobox.ts',
    primitive: 'combobox',
    piece: '[forComboboxContent]',
    condition: 'combobox.open()',
    host: ComboboxHost,
  },
  {
    source: 'dropdown-menu/src/dropdown-menu.ts',
    primitive: 'dropdown-menu',
    piece: '[forMenuContent]',
    condition: 'menu.open()',
    host: DropdownMenuHost,
  },
  {
    source: 'menu/src/menu.ts',
    primitive: 'menu',
    piece: '[forMenuContent]',
    condition: 'menu.open()',
    host: SharedMenuHost,
  },
  {
    source: 'menu/src/menu-sub.ts',
    primitive: 'menu',
    piece: '[forMenuSubContent]',
    condition: 'sub.open()',
    host: SubmenuHost,
  },
  {
    source: 'tooltip/src/tooltip.ts',
    primitive: 'tooltip',
    piece: '[forTooltipContent]',
    condition: 'tip.open()',
    host: TooltipHost,
  },
  {
    source: 'hover-card/src/hover-card.ts',
    primitive: 'hover-card',
    piece: '[forHoverCardContent]',
    condition: 'card.open()',
    host: HoverCardHost,
  },
  {
    source: 'date-picker/src/date-picker-base.ts',
    primitive: 'date-picker',
    piece: '[forDatePickerContent]',
    condition: 'picker.open()',
    host: DatePickerHost,
    providers: provideNativeDateAdapter(),
  },
  {
    source: 'date-picker/src/date-picker-base.ts',
    primitive: 'date-picker',
    piece: '[forDatePickerContent]',
    condition: 'picker.open()',
    host: DateRangePickerHost,
    providers: provideNativeDateAdapter(),
  },
  {
    source: 'time-picker/src/time-picker.ts',
    primitive: 'time-picker',
    piece: '[forTimePickerContent]',
    condition: 'picker.open()',
    host: TimePickerHost,
    providers: provideNativeDateAdapter(),
  },
  {
    source: 'menubar/src/menubar.ts',
    primitive: 'menubar',
    piece: '[forMenuContent]',
    condition: "open() === 'file'",
    host: MenubarHost,
  },
  {
    source: 'navigation-menu/src/navigation-menu.ts',
    primitive: 'navigation-menu',
    piece: '[forNavigationMenuContent]',
    condition: "open() === 'products'",
    host: NavigationMenuHost,
  },
];

/**
 * The anchored overlay roots that do not call the helper, each with the condition that keeps the
 * exclusion true. Checked against source so an exclusion cannot outlive its reason.
 */
const EXCLUSIONS: Readonly<
  Record<string, { readonly reason: string; readonly holds: () => boolean }>
> = {
  'context-menu/src/context-menu.ts': {
    reason:
      'its trigger closes an open that renders no [forMenuContent] and reports FORCDK-CONTEXT-MENU-002',
    holds: () =>
      LIBRARY_CODE.get('context-menu/src/context-menu-trigger.ts')?.includes(
        'FORCDK-CONTEXT-MENU-002',
      ) === true,
  },
  'menubar/src/menubar-trigger.ts': {
    reason: 'it positions the bar’s shared surface, whose open state [forMenubar] owns and checks',
    holds: () =>
      LIBRARY_CODE.get('menubar/src/menubar.ts')?.includes('warnIfOpenWithoutContent(') === true,
  },
  'core-anchored/src/menu-overlay/menu-overlay-host.ts': {
    reason: 'it is the abstract base of the menu roots, each of which reports under its own name',
    holds: () =>
      /export abstract class MenuOverlayHost\b/.test(
        LIBRARY_CODE.get('core-anchored/src/menu-overlay/menu-overlay-host.ts') ?? '',
      ),
  },
};

const ANCHORED_ROOT =
  /extends\s+(?:AnchoredOverlayPositioningBase|AnchoredFormValueControlBase|MenuOverlayHost)\b/;

const callers = (): string[] =>
  [...LIBRARY_CODE]
    .filter(
      ([path, source]) =>
        !path.startsWith('core-overlay/') && source.includes('warnIfOpenWithoutContent('),
    )
    .map(([path]) => path)
    .sort();

describe('open-without-content warning adopters (#2622)', () => {
  afterEachOverlayCleanup();

  let warned: string[];

  beforeEach(() => {
    warned = [];
    vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
      warned.push(args.map(String).join(' '));
    });
  });

  async function mount<T>(host: Type<T>, providers: readonly Provider[] = []) {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), ...providers],
    });
    const fixture: ComponentFixture<T> = TestBed.createComponent(host);
    await flush(fixture);
    return fixture;
  }

  const reports = (): string[] => warned.filter((message) => message.includes(CODE));

  describe('the roster', () => {
    it('lists every root that calls the helper, and nothing else', () => {
      expect([...new Set(ADOPTERS.map((adopter) => adopter.source))].sort()).toEqual(callers());
    });

    it('covers every anchored overlay root, or names why it is left out', () => {
      const anchored = [...LIBRARY_CODE]
        .filter(([, source]) => ANCHORED_ROOT.test(source))
        .map(([path]) => path);

      expect(anchored.length).toBeGreaterThan(10);
      const uncovered = anchored.filter(
        (path) => !callers().includes(path) && EXCLUSIONS[path] === undefined,
      );
      expect(uncovered).toEqual([]);
    });

    it('keeps every exclusion’s condition true', () => {
      const stale = Object.entries(EXCLUSIONS)
        .filter(([path, { holds }]) => callers().includes(path) || !holds())
        .map(([path, { reason }]) => `${path}: ${reason}`);

      expect(stale).toEqual([]);
    });
  });

  for (const { primitive, piece, condition, host, providers } of ADOPTERS) {
    describe(host.name.replace(/^_/, ''), () => {
      it(`reports an open surface with no ${piece}, quoting its own fix`, async () => {
        const fixture = await mount(host, providers);

        fixture.componentInstance.open.set(true);
        await flush(fixture);

        expect(reports()).toHaveLength(1);
        expect(reports()[0]).toContain(`[forty-cdk/${primitive}] ${CODE}:`);
        expect(reports()[0]).toContain(piece);
        expect(reports()[0]).toContain(`@if (${condition})`);
      });

      it('reports again on the next open, and not while it stays open', async () => {
        const fixture = await mount(host, providers);

        fixture.componentInstance.open.set(true);
        await flush(fixture);
        await flush(fixture);
        fixture.componentInstance.open.set(false);
        await flush(fixture);
        fixture.componentInstance.open.set(true);
        await flush(fixture);

        expect(reports()).toHaveLength(2);
      });

      it(`stays silent when ${piece} mounts with the open state`, async () => {
        const fixture = await mount(host, providers);
        fixture.componentInstance.withContent.set(true);

        fixture.componentInstance.open.set(true);
        await flush(fixture);
        fixture.componentInstance.open.set(false);
        await flush(fixture);

        expect(reports()).toEqual([]);
      });
    });
  }

  describe('the context menu, which closes an empty open itself', () => {
    @Component({
      imports: [ForContextMenu, ForContextMenuTrigger],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `<div forContextMenu [(open)]="open">
        <div forContextMenuTrigger data-testid="region">Right-click here</div>
      </div>`,
    })
    class ContextMenuHost {
      readonly open = signal(false);
    }

    @Component({
      imports: [ForMenu, ForContextMenuTrigger],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `<div forMenu #row="forMenu" [(open)]="open">
        <div [forContextMenuTrigger]="row" data-testid="region">Right-click here</div>
      </div>`,
    })
    class SharedMenuRegionHost {
      readonly open = signal(false);
    }

    for (const host of [ContextMenuHost, SharedMenuRegionHost]) {
      it(`${host.name.replace(/^_/, '')} reports FORCDK-CONTEXT-MENU-002 alone`, async () => {
        const fixture = await mount(host);
        const region = fixture.nativeElement.querySelector('[data-testid="region"]') as HTMLElement;

        region.dispatchEvent(
          new MouseEvent('contextmenu', {
            bubbles: true,
            cancelable: true,
            clientX: 4,
            clientY: 4,
          }),
        );
        await flush(fixture);

        expect(fixture.componentInstance.open()).toBe(false);
        expect(
          warned.filter((message) => message.includes('FORCDK-CONTEXT-MENU-002')),
        ).toHaveLength(1);
        expect(reports()).toEqual([]);
      });
    }
  });

  describe('the combobox, whose mounted list is a surface', () => {
    @Component({
      imports: [
        ForCombobox,
        ForComboboxInput,
        ForComboboxList,
        ForComboboxOption,
        ForPopover,
        ForPopoverTrigger,
        ForPopoverContent,
      ],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `<div forCombobox [open]="open()" (openChange)="open.set($event)">
        <div forPopover [open]="open()" (openChange)="open.set($event)">
          <button forPopoverTrigger>Fruit</button>
          @if (open()) {
            <div forPopoverContent>
              <input forComboboxInput data-testid="input" />
              <div forComboboxList data-testid="list">
                <div forComboboxOption value="apple">Apple</div>
              </div>
            </div>
          }
        </div>
      </div>`,
    })
    class EmbeddedListHost {
      readonly open = signal(false);
    }

    it('stays silent while a [forComboboxList] is mounted without [forComboboxContent]', async () => {
      const fixture = await mount(EmbeddedListHost);

      fixture.componentInstance.open.set(true);
      await flush(fixture);
      await flush(fixture);

      const input = document.querySelector('[data-testid="input"]') as HTMLElement;
      const list = document.querySelector('[data-testid="list"]') as HTMLElement;
      expect(list.id).not.toBe('');
      expect(input.getAttribute('aria-controls')).toBe(list.id);
      expect(reports()).toEqual([]);
    });
  });
});
