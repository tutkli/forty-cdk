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

import {
  ForAccordion,
  ForAccordionContent,
  ForAccordionItem,
  ForAccordionTrigger,
} from 'forty-cdk/accordion';
import { provideNativeDateAdapter } from 'forty-cdk/calendar';
import { ForCombobox, ForComboboxContent, ForComboboxInput } from 'forty-cdk/combobox';
import { ForDatePicker, ForDatePickerContent, ForDatePickerTrigger } from 'forty-cdk/date-picker';
import { ForDisclosure, ForDisclosureContent, ForDisclosureTrigger } from 'forty-cdk/disclosure';
import { ForDropdownMenu, ForDropdownMenuTrigger } from 'forty-cdk/dropdown-menu';
import { ForHoverCard, ForHoverCardContent, ForHoverCardTrigger } from 'forty-cdk/hover-card';
import { ForMenuContent, ForMenuItem, ForMenuSub, ForMenuSubTrigger } from 'forty-cdk/menu';
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
import { ForTabs, ForTabsContent, ForTabsList, ForTabsTrigger } from 'forty-cdk/tabs';
import { ForTimePicker, ForTimePickerContent, ForTimePickerTrigger } from 'forty-cdk/time-picker';
import { ForTooltip, ForTooltipContent, ForTooltipTrigger } from 'forty-cdk/tooltip';

const MOUNT_WARNING = 'is mounted while the surface is closed.';

@Component({
  imports: [ForPopover, ForPopoverTrigger, ForPopoverContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forPopover>
    <button forPopoverTrigger>Toggle</button>
    <div forPopoverContent>Content</div>
  </div>`,
})
class PopoverHost {}

@Component({
  imports: [ForSelect, ForSelectTrigger, ForSelectContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forSelect>
    <button forSelectTrigger>Select</button>
    <div forSelectContent></div>
  </div>`,
})
class SelectHost {}

@Component({
  imports: [ForCombobox, ForComboboxInput, ForComboboxContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forCombobox>
    <input forComboboxInput />
    <div forComboboxContent></div>
  </div>`,
})
class ComboboxHost {}

@Component({
  imports: [ForDropdownMenu, ForDropdownMenuTrigger, ForMenuContent, ForMenuItem],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forDropdownMenu>
    <button forDropdownMenuTrigger>Options</button>
    <div forMenuContent>
      <button forMenuItem>New</button>
    </div>
  </div>`,
})
class DropdownMenuHost {}

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
  template: `<div forDropdownMenu [(open)]="open">
    <button forDropdownMenuTrigger>Options</button>
    @if (open()) {
      <div forMenuContent>
        <div forMenuSub>
          <button forMenuSubTrigger>More tools</button>
          <div forMenuSubContent>
            <button forMenuItem>Developer tools</button>
          </div>
        </div>
      </div>
    }
  </div>`,
})
class SubmenuHost {
  readonly open = signal(true);
}

@Component({
  imports: [ForTooltip, ForTooltipTrigger, ForTooltipContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forTooltip>
    <button forTooltipTrigger>Hover</button>
    <div forTooltipContent>Hint</div>
  </div>`,
})
class TooltipHost {}

@Component({
  imports: [ForHoverCard, ForHoverCardTrigger, ForHoverCardContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span forHoverCard>
    <a forHoverCardTrigger href="/users/ada">Ada</a>
    <div forHoverCardContent>Preview</div>
  </span>`,
})
class HoverCardHost {}

@Component({
  imports: [ForDatePicker, ForDatePickerTrigger, ForDatePickerContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forDatePicker>
    <button forDatePickerTrigger>Pick</button>
    <div forDatePickerContent></div>
  </div>`,
})
class DatePickerHost {}

@Component({
  imports: [ForTimePicker, ForTimePickerTrigger, ForTimePickerContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forTimePicker [step]="60">
    <button forTimePickerTrigger>Pick</button>
    <div forTimePickerContent></div>
  </div>`,
})
class TimePickerHost {}

@Component({
  imports: [
    ForNavigationMenu,
    ForNavigationMenuList,
    ForNavigationMenuItem,
    ForNavigationMenuTrigger,
    ForNavigationMenuContent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<nav forNavigationMenu>
    <ul forNavigationMenuList>
      <li forNavigationMenuItem value="products">
        <button forNavigationMenuTrigger>Products</button>
        <div forNavigationMenuContent>Panel</div>
      </li>
    </ul>
  </nav>`,
})
class NavigationMenuHost {}

interface Adopter {
  readonly primitive: string;
  readonly piece: string;
  /**
   * The `@if` expression the report quotes back. Asserted per adopter because
   * a report that names the piece but not a copy-pasteable fix is half a
   * diagnostic — and the two adopters whose fix is not a plain `open()` (the
   * navigation menu's per-value compare, the submenu alias below) are exactly
   * the ones a shared assertion on the prefix alone would miss.
   */
  readonly condition: string;
  readonly host: Type<unknown>;
  readonly providers?: readonly Provider[];
}

const ADOPTERS: readonly Adopter[] = [
  {
    primitive: 'popover',
    piece: '[forPopoverContent]',
    condition: 'popover.open()',
    host: PopoverHost,
  },
  {
    primitive: 'select',
    piece: '[forSelectContent]',
    condition: 'select.open()',
    host: SelectHost,
  },
  {
    primitive: 'combobox',
    piece: '[forComboboxContent]',
    condition: 'combobox.open()',
    host: ComboboxHost,
  },
  {
    primitive: 'menu',
    piece: '[forMenuContent]',
    condition: 'menu.open()',
    host: DropdownMenuHost,
  },
  {
    primitive: 'tooltip',
    piece: '[forTooltipContent]',
    condition: 'tip.open()',
    host: TooltipHost,
  },
  {
    primitive: 'hover-card',
    piece: '[forHoverCardContent]',
    condition: 'card.open()',
    host: HoverCardHost,
  },
  {
    primitive: 'date-picker',
    piece: '[forDatePickerContent]',
    condition: 'picker.open()',
    host: DatePickerHost,
    providers: provideNativeDateAdapter(),
  },
  {
    primitive: 'time-picker',
    piece: '[forTimePickerContent]',
    condition: 'picker.open()',
    host: TimePickerHost,
    providers: provideNativeDateAdapter(),
  },
  {
    primitive: 'navigation-menu',
    piece: '[forNavigationMenuContent]',
    condition: "open() === 'products'",
    host: NavigationMenuHost,
  },
];

describe('mounted-while-closed warning adopters (#1591)', () => {
  afterEachOverlayCleanup();

  let warned: string[];

  beforeEach(() => {
    warned = [];
    vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
      warned.push(args.map(String).join(' '));
    });
  });

  function mount<T>(host: Type<T>, providers: readonly Provider[] = []): ComponentFixture<T> {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), ...providers],
    });
    return TestBed.createComponent(host);
  }

  function mountWarnings(): string[] {
    return warned.filter((message) => message.includes(MOUNT_WARNING));
  }

  describe('every overlay surface whose mount is its open state', () => {
    for (const { primitive, piece, condition, host, providers } of ADOPTERS) {
      it(`${piece} reports a surface mounted while closed, quoting its own fix`, async () => {
        const fixture = mount(host, providers);
        await flush(fixture);

        const reported = mountWarnings();
        expect(reported).toHaveLength(1);
        expect(reported[0]).toContain(
          `[forty-cdk/${primitive}] FORCDK-CORE-006: ${piece} ${MOUNT_WARNING}`,
        );
        expect(reported[0]).toContain(`@if (${condition})`);
      });
    }
  });

  it('a submenu surface reports under its own alias and its own open state', async () => {
    const fixture = mount(SubmenuHost);
    await flush(fixture);

    const reported = mountWarnings();
    expect(reported).toHaveLength(1);
    expect(reported[0]).toContain(
      `[forty-cdk/menu] FORCDK-CORE-006: [forMenuSubContent] ${MOUNT_WARNING}`,
    );
    expect(reported[0]).toContain('@if (sub.open())');
  });

  describe('the shapes that are legitimately mounted while closed', () => {
    @Component({
      selector: 'wired-popover-host',
      imports: [ForPopover, ForPopoverTrigger, ForPopoverContent],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `<div forPopover [(open)]="open">
        <button forPopoverTrigger>Toggle</button>
        @if (open()) {
          <div forPopoverContent>Content</div>
        }
      </div>`,
    })
    class WiredPopoverHost {
      readonly open = signal(true);
    }

    @Component({
      selector: 'leaving-popover-host',
      imports: [ForPopover, ForPopoverTrigger, ForPopoverContent],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `<div forPopover [(open)]="open">
        <button forPopoverTrigger>Toggle</button>
        @if (mounted()) {
          <div forPopoverContent>Content</div>
        }
      </div>`,
    })
    class LeavingPopoverHost {
      readonly open = signal(true);
      readonly mounted = signal(true);
    }

    @Component({
      imports: [ForMenubar, ForMenubarTrigger, ForMenuContent, ForMenuItem],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `<div forMenubar [(value)]="value">
        <button forMenubarTrigger value="file">File</button>
        <div forMenuContent>
          <button forMenuItem>New</button>
        </div>
      </div>`,
    })
    class UnconditionalMenubarHost {
      readonly value = signal<string | null>(null);
    }

    @Component({
      imports: [ForTabs, ForTabsList, ForTabsTrigger, ForTabsContent],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `<div forTabs [(value)]="value">
        <div forTabsList>
          <button forTabsTrigger value="a">A</button>
          <button forTabsTrigger value="b">B</button>
        </div>
        <section forTabsContent value="a">Panel A</section>
        <section forTabsContent value="b">Panel B</section>
      </div>`,
    })
    class TabsHost {
      readonly value = signal<string | null>('a');
    }

    @Component({
      imports: [ForDisclosure, ForDisclosureTrigger, ForDisclosureContent],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `<div forDisclosure>
        <button forDisclosureTrigger>Toggle</button>
        <section forDisclosureContent>Content</section>
      </div>`,
    })
    class DisclosureHost {}

    @Component({
      imports: [ForAccordion, ForAccordionItem, ForAccordionTrigger, ForAccordionContent],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `<div forAccordion>
        <div forAccordionItem value="a">
          <button forAccordionTrigger>A</button>
          <section forAccordionContent>Panel A</section>
        </div>
      </div>`,
    })
    class AccordionHost {}

    it('a correctly wired @if never reports', async () => {
      const fixture = mount(WiredPopoverHost);
      await flush(fixture);

      expect(mountWarnings()).toEqual([]);
    });

    it('the exit-animation window never reports', async () => {
      const fixture = mount(LeavingPopoverHost);
      await flush(fixture);

      fixture.componentInstance.open.set(false);
      await flush(fixture);

      expect(document.body.querySelector('[forPopoverContent]')).not.toBeNull();
      expect(mountWarnings()).toEqual([]);
    });

    it('an unconditionally mounted [forMenuContent] under [forMenubar] never reports', async () => {
      const fixture = mount(UnconditionalMenubarHost);
      await flush(fixture);

      expect(mountWarnings()).toEqual([]);
    });

    it('an inactive tabs panel never reports', async () => {
      const fixture = mount(TabsHost);
      await flush(fixture);

      expect(mountWarnings()).toEqual([]);
    });

    it('a closed disclosure panel never reports', async () => {
      const fixture = mount(DisclosureHost);
      await flush(fixture);

      expect(mountWarnings()).toEqual([]);
    });

    it('a collapsed accordion panel never reports', async () => {
      const fixture = mount(AccordionHost);
      await flush(fixture);

      expect(mountWarnings()).toEqual([]);
    });
  });
});
