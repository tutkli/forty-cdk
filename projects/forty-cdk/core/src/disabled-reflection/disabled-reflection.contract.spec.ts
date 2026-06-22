import { Component, type Provider, provideZonelessChangeDetection, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { ForAccordion, ForAccordionItem, ForAccordionTrigger } from 'forty-cdk/accordion';
import { ForDisclosure, ForDisclosureTrigger } from 'forty-cdk/disclosure';
import { ForFieldset } from 'forty-cdk/fieldset';
import { ForInput, ForTextarea } from 'forty-cdk/input';
import {
  ForNumberInput,
  ForNumberInputDecrement,
  ForNumberInputGroup,
  ForNumberInputIncrement,
} from 'forty-cdk/number-input';
import { ForToggleGroup, ForToggleGroupItem } from 'forty-cdk/toggle';
import { ForToolbar, ForToolbarButton } from 'forty-cdk/toolbar';
import {
  ForCalendar,
  ForCalendarNextButton,
  ForCalendarPrevButton,
  provideNativeDateAdapter,
} from 'forty-cdk/calendar';
import { ForDatePicker, ForDatePickerTrigger } from 'forty-cdk/date-picker';

import {
  ForCombobox,
  ForComboboxChip,
  ForComboboxChipRemove,
  ForComboboxChips,
  ForComboboxClear,
  ForComboboxInput,
  ForComboboxTrigger,
} from 'forty-cdk/combobox';
import { ForSelect, ForSelectTrigger } from 'forty-cdk/select';

import { ForDialogTrigger } from 'forty-cdk/dialog';
import { ForDrawerTrigger } from 'forty-cdk/drawer';
import { ForPopover, ForPopoverTrigger } from 'forty-cdk/popover';
import { ForDropdownMenu, ForDropdownMenuTrigger } from 'forty-cdk/dropdown-menu';
import {
  ForNavigationMenu,
  ForNavigationMenuItem,
  ForNavigationMenuList,
  ForNavigationMenuTrigger,
} from 'forty-cdk/navigation-menu';

/**
 * Library-wide contract for the non-destructive `disabled` reflection rolled
 * out from the shared `reflectDisabled` helper (#656). Two assertions per host,
 * matching the two failure shapes the helper closes:
 *
 * - **Static-attr hosts** (no same-element `disabled` input — the reflection is
 *   driven by a context / computed): a consumer-set static `disabled` survives
 *   an enabled context. The naive `'[attr.disabled]': "… ? '' : null"` binding
 *   removed it on first render; the helper leaves it because it never set it.
 * - **Local-input hosts** (a same-element `booleanAttribute disabled` input): a
 *   `disabled` applied imperatively while the input is `false` survives an
 *   enable→disable cycle, where the naive binding's `null` edge clobbered it.
 *
 * The mechanics live in `disabled-reflection.spec.ts`; this file proves every
 * migrated host is wired to the helper with the correct signal.
 */

function configure(providers: Provider[] = []): void {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), ...providers],
  });
}

function mount<T>(component: { new (): T }): ComponentFixture<T> {
  const fixture = TestBed.createComponent(component);
  fixture.detectChanges();
  return fixture;
}

function target<T>(fixture: ComponentFixture<T>): HTMLElement {
  return (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(
    '[data-testid="target"]',
  )!;
}

/**
 * Static-attr host: a consumer-set static `disabled` (orphan markup the
 * directive never owned) survives under an enabled context.
 */
function expectStaticDisabledSurvives<T>(fixture: ComponentFixture<T>): void {
  expect(target(fixture).getAttribute('disabled')).toBe('');
}

/**
 * Local-input host: an imperatively-applied `disabled` survives an
 * enable→disable cycle, since the helper only removes what it set itself.
 */
function expectImperativeDisabledSurvives<T extends { disabled: { set(v: boolean): void } }>(
  fixture: ComponentFixture<T>,
): void {
  const el = target(fixture);
  // Enabled context: the directive set nothing.
  expect(el.hasAttribute('disabled')).toBe(false);

  // The consumer applies the attribute outside the directive's input.
  el.setAttribute('disabled', '');

  // Drive the reflection through a full disable→enable cycle.
  fixture.componentInstance.disabled.set(true);
  fixture.detectChanges();
  expect(el.hasAttribute('disabled')).toBe(true);

  fixture.componentInstance.disabled.set(false);
  fixture.detectChanges();
  expect(el.getAttribute('disabled')).toBe('');
}

// ---------------------------------------------------------------------------
// Static-attr hosts (reflection driven by context / computed).
// ---------------------------------------------------------------------------

@Component({
  imports: [ForAccordion, ForAccordionItem, ForAccordionTrigger],
  template: `
    <div forAccordion [(value)]="value">
      <div forAccordionItem value="a">
        <button type="button" forAccordionTrigger data-testid="target" disabled>A</button>
      </div>
    </div>
  `,
})
class AccordionTriggerHost {
  readonly value = signal<readonly string[]>([]);
}

@Component({
  imports: [
    ForNavigationMenu,
    ForNavigationMenuList,
    ForNavigationMenuItem,
    ForNavigationMenuTrigger,
  ],
  template: `
    <nav forNavigationMenu [ariaLabel]="'Nav'">
      <ul forNavigationMenuList>
        <li forNavigationMenuItem value="a">
          <button forNavigationMenuTrigger data-testid="target" disabled>A</button>
        </li>
      </ul>
    </nav>
  `,
})
class NavigationMenuTriggerHost {}

@Component({
  imports: [ForSelect, ForSelectTrigger],
  template: `
    <div forSelect [(value)]="value">
      <button forSelectTrigger data-testid="target" disabled>Pick</button>
    </div>
  `,
})
class SelectTriggerHost {
  readonly value = signal<readonly string[]>([]);
}

@Component({
  imports: [ForDatePicker, ForDatePickerTrigger],
  template: `
    <div forDatePicker [ariaLabel]="'Pick date'">
      <button forDatePickerTrigger data-testid="target" disabled>Open</button>
    </div>
  `,
})
class DatePickerTriggerHost {}

@Component({
  imports: [ForCombobox, ForComboboxInput],
  template: `
    <div forCombobox [(query)]="query">
      <input forComboboxInput data-testid="target" disabled />
    </div>
  `,
})
class ComboboxInputHost {
  readonly query = signal('');
}

@Component({
  imports: [ForCombobox, ForComboboxInput, ForComboboxClear],
  template: `
    <div forCombobox [(query)]="query">
      <input forComboboxInput />
      <button forComboboxClear data-testid="target" disabled>×</button>
    </div>
  `,
})
class ComboboxClearHost {
  readonly query = signal('x');
}

@Component({
  imports: [
    ForCombobox,
    ForComboboxInput,
    ForComboboxChips,
    ForComboboxChip,
    ForComboboxChipRemove,
  ],
  template: `
    <div forCombobox multiple [(value)]="value">
      <div forComboboxChips>
        @for (item of value(); track item) {
          <span forComboboxChip [value]="item">
            {{ item }}
            <button forComboboxChipRemove data-testid="target" disabled>×</button>
          </span>
        }
        <input forComboboxInput />
      </div>
    </div>
  `,
})
class ComboboxChipRemoveHost {
  readonly value = signal<readonly string[]>(['apple']);
}

@Component({
  imports: [ForCombobox, ForComboboxTrigger],
  template: `
    <div forCombobox>
      <button forComboboxTrigger data-testid="target" disabled>Open</button>
    </div>
  `,
})
class ComboboxTriggerHost {}

@Component({
  imports: [ForCalendar, ForCalendarPrevButton, ForCalendarNextButton],
  template: `
    <div forCalendar [(value)]="value">
      <button forCalendarPrevButton [ariaLabel]="'Previous'" data-testid="target" disabled>
        ‹
      </button>
      <button forCalendarNextButton [ariaLabel]="'Next'" data-testid="next" disabled>›</button>
    </div>
  `,
})
class CalendarButtonsHost {
  readonly value = signal(new Date(2026, 5, 15));
}

@Component({
  imports: [ForNumberInputGroup, ForNumberInput, ForNumberInputIncrement, ForNumberInputDecrement],
  template: `
    <div forNumberInputGroup>
      <input forNumberInput [(value)]="qty" />
      <button forNumberInputIncrement [ariaLabel]="'Increase'" data-testid="target" disabled>
        +
      </button>
      <button forNumberInputDecrement [ariaLabel]="'Decrease'" data-testid="dec" disabled>−</button>
    </div>
  `,
})
class NumberInputButtonsHost {
  readonly qty = signal<number | null>(5);
}

// ---------------------------------------------------------------------------
// Local-input hosts (same-element `booleanAttribute disabled` input).
// ---------------------------------------------------------------------------

@Component({
  imports: [ForPopover, ForPopoverTrigger],
  template: `
    <div forPopover>
      <button forPopoverTrigger [disabled]="disabled()" data-testid="target">Open</button>
    </div>
  `,
})
class PopoverTriggerHost {
  readonly disabled = signal(false);
}

@Component({
  imports: [ForDisclosure, ForDisclosureTrigger],
  template: `
    <div forDisclosure>
      <button forDisclosureTrigger [disabled]="disabled()" data-testid="target">Toggle</button>
    </div>
  `,
})
class DisclosureTriggerHost {
  readonly disabled = signal(false);
}

@Component({
  imports: [ForDropdownMenu, ForDropdownMenuTrigger],
  template: `
    <div forDropdownMenu>
      <button forDropdownMenuTrigger [disabled]="disabled()" data-testid="target">Menu</button>
    </div>
  `,
})
class DropdownMenuTriggerHost {
  readonly disabled = signal(false);
}

@Component({
  imports: [ForDialogTrigger],
  template: `<button forDialogTrigger [disabled]="disabled()" data-testid="target">Open</button>`,
})
class DialogTriggerHost {
  readonly disabled = signal(false);
}

@Component({
  imports: [ForDrawerTrigger],
  template: `<button forDrawerTrigger [disabled]="disabled()" data-testid="target">Open</button>`,
})
class DrawerTriggerHost {
  readonly disabled = signal(false);
}

@Component({
  imports: [ForToolbar, ForToolbarButton],
  template: `
    <div forToolbar>
      <button forToolbarButton [disabled]="disabled()" data-testid="target">Action</button>
    </div>
  `,
})
class ToolbarButtonHost {
  readonly disabled = signal(false);
}

@Component({
  imports: [ForToggleGroup, ForToggleGroupItem],
  template: `
    <div forToggleGroup [(value)]="value">
      <button forToggleGroupItem value="a" [disabled]="disabled()" data-testid="target">A</button>
    </div>
  `,
})
class ToggleGroupItemHost {
  readonly value = signal<readonly string[]>([]);
  readonly disabled = signal(false);
}

@Component({
  imports: [ForInput],
  template: `<input forInput [disabled]="disabled()" data-testid="target" />`,
})
class InputHost {
  readonly disabled = signal(false);
}

@Component({
  imports: [ForTextarea],
  template: `<textarea forTextarea [disabled]="disabled()" data-testid="target"></textarea>`,
})
class TextareaHost {
  readonly disabled = signal(false);
}

@Component({
  imports: [ForNumberInput],
  template: `<input forNumberInput [disabled]="disabled()" data-testid="target" />`,
})
class NumberInputRootHost {
  readonly disabled = signal(false);
}

@Component({
  imports: [ForFieldset],
  template: `<fieldset forFieldset [disabled]="disabled()" data-testid="target"></fieldset>`,
})
class FieldsetHost {
  readonly disabled = signal(false);
}

describe('disabled reflection — library-wide contract', () => {
  describe('static-attr hosts preserve a consumer-set static disabled', () => {
    it('accordion trigger', () => {
      configure();
      expectStaticDisabledSurvives(mount(AccordionTriggerHost));
    });

    it('navigation-menu trigger', () => {
      configure();
      expectStaticDisabledSurvives(mount(NavigationMenuTriggerHost));
    });

    it('select trigger', () => {
      configure();
      expectStaticDisabledSurvives(mount(SelectTriggerHost));
    });

    it('date-picker trigger', () => {
      configure(provideNativeDateAdapter());
      expectStaticDisabledSurvives(mount(DatePickerTriggerHost));
    });

    it('combobox input', () => {
      configure();
      expectStaticDisabledSurvives(mount(ComboboxInputHost));
    });

    it('combobox clear', () => {
      configure();
      expectStaticDisabledSurvives(mount(ComboboxClearHost));
    });

    it('combobox chip-remove', () => {
      configure();
      expectStaticDisabledSurvives(mount(ComboboxChipRemoveHost));
    });

    it('combobox trigger', () => {
      configure();
      expectStaticDisabledSurvives(mount(ComboboxTriggerHost));
    });

    it('calendar prev / next buttons', () => {
      configure(provideNativeDateAdapter());
      const fixture = mount(CalendarButtonsHost);
      const root = fixture.nativeElement as HTMLElement;
      expect(root.querySelector('[data-testid="target"]')!.getAttribute('disabled')).toBe('');
      expect(root.querySelector('[data-testid="next"]')!.getAttribute('disabled')).toBe('');
    });

    it('number-input increment / decrement buttons', () => {
      configure();
      const fixture = mount(NumberInputButtonsHost);
      const root = fixture.nativeElement as HTMLElement;
      expect(root.querySelector('[data-testid="target"]')!.getAttribute('disabled')).toBe('');
      expect(root.querySelector('[data-testid="dec"]')!.getAttribute('disabled')).toBe('');
    });
  });

  describe('local-input hosts preserve an imperatively-applied disabled across an enable cycle', () => {
    it('popover trigger', () => {
      configure();
      expectImperativeDisabledSurvives(mount(PopoverTriggerHost));
    });

    it('disclosure trigger', () => {
      configure();
      expectImperativeDisabledSurvives(mount(DisclosureTriggerHost));
    });

    it('dropdown-menu trigger', () => {
      configure();
      expectImperativeDisabledSurvives(mount(DropdownMenuTriggerHost));
    });

    it('dialog trigger', () => {
      configure();
      expectImperativeDisabledSurvives(mount(DialogTriggerHost));
    });

    it('drawer trigger', () => {
      configure();
      expectImperativeDisabledSurvives(mount(DrawerTriggerHost));
    });

    it('toolbar button', () => {
      configure();
      expectImperativeDisabledSurvives(mount(ToolbarButtonHost));
    });

    it('toggle-group item', () => {
      configure();
      expectImperativeDisabledSurvives(mount(ToggleGroupItemHost));
    });

    it('input', () => {
      configure();
      expectImperativeDisabledSurvives(mount(InputHost));
    });

    it('textarea', () => {
      configure();
      expectImperativeDisabledSurvives(mount(TextareaHost));
    });

    it('number-input root', () => {
      configure();
      expectImperativeDisabledSurvives(mount(NumberInputRootHost));
    });

    it('fieldset', () => {
      configure();
      expectImperativeDisabledSurvives(mount(FieldsetHost));
    });
  });
});
