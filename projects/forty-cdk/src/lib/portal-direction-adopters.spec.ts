import {
  ChangeDetectionStrategy,
  Component,
  type Provider,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { flush } from '../test-utils/flush';
import { afterEachOverlayCleanup } from '../test-utils/overlay-cleanup';
import { LIBRARY_CODE } from '../test-utils/source-scan';

import { provideNativeDateAdapter } from 'forty-cdk/shared';
import { ForCombobox, ForComboboxContent, ForComboboxInput } from 'forty-cdk/combobox';
import { ForDatePicker, ForDatePickerContent, ForDatePickerTrigger } from 'forty-cdk/date-picker';
import { ForDialog } from 'forty-cdk/dialog';
import { ForDrawer } from 'forty-cdk/drawer';
import { ForDropdownMenu, ForDropdownMenuTrigger } from 'forty-cdk/dropdown-menu';
import { ForHoverCard, ForHoverCardContent, ForHoverCardTrigger } from 'forty-cdk/hover-card';
import { ForMenuContent, ForMenuItem } from 'forty-cdk/menu';
import { ForPopover, ForPopoverContent, ForPopoverTrigger } from 'forty-cdk/popover';
import { ForSelect, ForSelectContent, ForSelectTrigger } from 'forty-cdk/select';
import { ForTimePicker, ForTimePickerContent, ForTimePickerTrigger } from 'forty-cdk/time-picker';
import { ForToastViewport } from 'forty-cdk/toast';
import { ForTooltip, ForTooltipContent, ForTooltipTrigger } from 'forty-cdk/tooltip';

const PORTALING_HELPER =
  /\b(?:injectPortal|injectModalShell|injectOverlayShell|injectFloating|injectItemAlignedPositioner)\(/;

const INTERNAL_TIER = ['core/', 'core-overlay/'];

function portalingSources(): string[] {
  return [...LIBRARY_CODE]
    .filter(
      ([path, code]) =>
        !INTERNAL_TIER.some((tier) => path.startsWith(tier)) && PORTALING_HELPER.test(code),
    )
    .map(([path]) => path)
    .sort();
}

@Component({
  imports: [ForPopover, ForPopoverTrigger, ForPopoverContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section dir="rtl">
    <div forPopover [open]="true">
      <button forPopoverTrigger>Toggle</button>
      <div forPopoverContent>Content</div>
    </div>
  </section>`,
})
class PopoverHost {}

@Component({
  imports: [ForTooltip, ForTooltipTrigger, ForTooltipContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section dir="rtl">
    <div forTooltip [open]="true">
      <button forTooltipTrigger>Hover</button>
      <div forTooltipContent>Hint</div>
    </div>
  </section>`,
})
class TooltipHost {}

@Component({
  imports: [ForHoverCard, ForHoverCardTrigger, ForHoverCardContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section dir="rtl">
    <span forHoverCard [open]="true">
      <a forHoverCardTrigger href="/users/ada">Ada</a>
      <div forHoverCardContent>Preview</div>
    </span>
  </section>`,
})
class HoverCardHost {}

@Component({
  imports: [ForSelect, ForSelectTrigger, ForSelectContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section dir="rtl">
    <div forSelect [open]="true">
      <button forSelectTrigger>Select</button>
      <div forSelectContent></div>
    </div>
  </section>`,
})
class SelectHost {}

@Component({
  imports: [ForCombobox, ForComboboxInput, ForComboboxContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section dir="rtl">
    <div forCombobox [open]="true">
      <input forComboboxInput />
      <div forComboboxContent></div>
    </div>
  </section>`,
})
class ComboboxHost {}

@Component({
  imports: [ForDropdownMenu, ForDropdownMenuTrigger, ForMenuContent, ForMenuItem],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section dir="rtl">
    <div forDropdownMenu [open]="true">
      <button forDropdownMenuTrigger>Options</button>
      <div forMenuContent>
        <button forMenuItem>New</button>
      </div>
    </div>
  </section>`,
})
class MenuHost {}

@Component({
  imports: [ForDatePicker, ForDatePickerTrigger, ForDatePickerContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section dir="rtl">
    <div forDatePicker [open]="true">
      <button forDatePickerTrigger>Pick</button>
      <div forDatePickerContent></div>
    </div>
  </section>`,
})
class DatePickerHost {}

@Component({
  imports: [ForTimePicker, ForTimePickerTrigger, ForTimePickerContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section dir="rtl">
    <div forTimePicker [step]="60" [open]="true">
      <button forTimePickerTrigger>Pick</button>
      <div forTimePickerContent></div>
    </div>
  </section>`,
})
class TimePickerHost {}

@Component({
  imports: [ForDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section dir="rtl">
    <div forDialog ariaLabel="Dialog"><button type="button">OK</button></div>
  </section>`,
})
class DialogHost {}

@Component({
  imports: [ForDrawer],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section dir="rtl">
    <div forDrawer ariaLabel="Drawer"><button type="button">OK</button></div>
  </section>`,
})
class DrawerHost {}

@Component({
  imports: [ForToastViewport],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section dir="rtl"><for-toast-viewport /></section>`,
})
class ToastViewportHost {}

interface Adopter {
  readonly source: string;
  readonly surface: string;
  readonly host: Type<unknown>;
  readonly providers?: readonly Provider[];
}

const ADOPTERS: readonly Adopter[] = [
  {
    source: 'popover/src/popover-content.ts',
    surface: '[forPopoverContent]',
    host: PopoverHost,
  },
  {
    source: 'tooltip/src/tooltip-content.ts',
    surface: '[forTooltipContent]',
    host: TooltipHost,
  },
  {
    source: 'hover-card/src/hover-card-content.ts',
    surface: '[forHoverCardContent]',
    host: HoverCardHost,
  },
  { source: 'select/src/select-content.ts', surface: '[forSelectContent]', host: SelectHost },
  {
    source: 'combobox/src/combobox-content.ts',
    surface: '[forComboboxContent]',
    host: ComboboxHost,
  },
  { source: 'menu/src/menu-content.ts', surface: '[forMenuContent]', host: MenuHost },
  {
    source: 'date-picker/src/date-picker-content.ts',
    surface: '[forDatePickerContent]',
    host: DatePickerHost,
    providers: provideNativeDateAdapter(),
  },
  {
    source: 'time-picker/src/time-picker-content.ts',
    surface: '[forTimePickerContent]',
    host: TimePickerHost,
    providers: provideNativeDateAdapter(),
  },
  { source: 'dialog/src/dialog.ts', surface: '[forDialog]', host: DialogHost },
  { source: 'drawer/src/drawer.ts', surface: '[forDrawer]', host: DrawerHost },
  {
    source: 'toast/src/toast-viewport.ts',
    surface: 'for-toast-viewport',
    host: ToastViewportHost,
  },
];

describe('portaled surfaces keep the ambient writing direction (#2141)', () => {
  afterEachOverlayCleanup();

  it('derives a live family', () => {
    expect(portalingSources()).toContain('popover/src/popover-content.ts');
    expect(portalingSources()).toContain('dialog/src/dialog.ts');
    expect(portalingSources().length).toBeGreaterThan(8);
  });

  it('sweeps every library source that portals its host', () => {
    expect(ADOPTERS.map(({ source }) => source).sort()).toEqual(portalingSources());
  });

  for (const { source, surface, host, providers = [] } of ADOPTERS) {
    it(`${surface} leaves a dir="rtl" subtree still carrying dir="rtl"`, async () => {
      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection(), ...providers],
      });
      const fixture = TestBed.createComponent(host);
      await flush(fixture);

      const region = (fixture.nativeElement as HTMLElement).querySelector('section')!;
      const portaled = document.body.querySelector<HTMLElement>(surface);

      expect(portaled, source).not.toBeNull();
      expect(region.contains(portaled)).toBe(false);
      expect(portaled!.getAttribute('dir')).toBe('rtl');
    });
  }
});
