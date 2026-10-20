import {
  Component,
  type Provider,
  provideZonelessChangeDetection,
  signal,
  type Type,
  type WritableSignal,
} from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { ForAccordion, ForAccordionItem, ForAccordionTrigger } from 'forty-cdk/accordion';
import { ForDisclosure, ForDisclosureTrigger } from 'forty-cdk/disclosure';
import { ForFieldControl } from 'forty-cdk/field';
import { ForFieldset } from 'forty-cdk/fieldset';
import { ForFileUpload, ForFileUploadInput, ForFileUploadTrigger } from 'forty-cdk/file-upload';
import { ForInput, ForTextarea } from 'forty-cdk/input';
import { ForNumberInput } from 'forty-cdk/number-input';
import { ForPagination, ForPaginationItem } from 'forty-cdk/pagination';
import { ForSearch, ForSearchClear, ForSearchGroup } from 'forty-cdk/search';
import { provideNativeDateAdapter } from 'forty-cdk/shared';
import { ForDatePicker, ForDatePickerTrigger } from 'forty-cdk/date-picker';
import { ForTimePicker, ForTimePickerTrigger } from 'forty-cdk/time-picker';

import {
  ForCombobox,
  ForComboboxChip,
  ForComboboxChipRemove,
  ForComboboxChips,
  ForComboboxClear,
  ForComboboxInput,
  ForComboboxToggle,
  ForComboboxTrigger,
} from 'forty-cdk/combobox';
import { ForSelect, ForSelectTrigger } from 'forty-cdk/select';

import { ForDialogTrigger } from 'forty-cdk/dialog';
import { ForDrawerTrigger } from 'forty-cdk/drawer';
import { ForPopover, ForPopoverTrigger } from 'forty-cdk/popover';
import { ForDropdownMenu, ForDropdownMenuTrigger } from 'forty-cdk/dropdown-menu';

import { LIBRARY_CODE } from '../../../src/test-utils/source-scan';

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

function mount<T>(component: Type<T>): ComponentFixture<T> {
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

interface LocalInputHost {
  readonly disabled: WritableSignal<boolean>;
}

/**
 * Local-input host: an imperatively-applied `disabled` survives an
 * enable→disable cycle, since the helper only removes what it set itself.
 */
function expectImperativeDisabledSurvives<T extends LocalInputHost>(
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

const HELPER_CALL = /[^A-Za-z#.]reflectDisabled\(/g;

function helperCalls(source: string): number {
  return source.match(HELPER_CALL)?.length ?? 0;
}

function declaringPath(): string {
  const found = [...LIBRARY_CODE].find(([, source]) =>
    source.includes('export function reflectDisabled('),
  );
  expect(found).toBeDefined();
  return found![0];
}

function callerPaths(): string[] {
  const declaring = declaringPath();
  return [...LIBRARY_CODE]
    .filter(([path, source]) => path !== declaring && helperCalls(source) > 0)
    .map(([path]) => path);
}

function subclassPaths(base: string): string[] {
  const heritage = new RegExp(`\\bextends\\s+${base}\\b`);
  return [...LIBRARY_CODE].filter(([, source]) => heritage.test(source)).map(([path]) => path);
}

function reflectDisabledHosts(): string[] {
  return callerPaths()
    .flatMap((path) => {
      const base = /\bexport abstract class (\w+)/.exec(LIBRARY_CODE.get(path)!)?.[1];
      return base === undefined ? [path] : subclassPaths(base);
    })
    .sort();
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
  imports: [ForTimePicker, ForTimePickerTrigger],
  template: `
    <div forTimePicker>
      <button forTimePickerTrigger data-testid="target" disabled>Open</button>
    </div>
  `,
})
class TimePickerTriggerHost {}

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
  imports: [ForCombobox, ForComboboxInput, ForComboboxToggle],
  template: `
    <div forCombobox>
      <input forComboboxInput />
      <button forComboboxToggle data-testid="target" disabled>▾</button>
    </div>
  `,
})
class ComboboxToggleHost {}

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
  imports: [ForFileUpload, ForFileUploadInput, ForFileUploadTrigger],
  template: `
    <div forFileUpload>
      <button forFileUploadTrigger data-testid="target" disabled>Choose</button>
      <input forFileUploadInput aria-label="Upload" />
    </div>
  `,
})
class FileUploadTriggerHost {}

@Component({
  imports: [ForSearchGroup, ForSearch, ForSearchClear],
  template: `
    <div forSearchGroup>
      <input forSearch [(value)]="query" />
      <button forSearchClear data-testid="target" disabled>×</button>
    </div>
  `,
})
class SearchClearHost {
  readonly query = signal('x');
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
  imports: [ForPagination, ForPaginationItem],
  template: `
    <nav forPagination [count]="3" [page]="1">
      <button forPaginationItem [page]="2" [disabled]="disabled()" data-testid="target">2</button>
    </nav>
  `,
})
class PaginationItemHost {
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
  imports: [ForSearch],
  template: `<input forSearch [disabled]="disabled()" data-testid="target" />`,
})
class SearchHost {
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
  imports: [ForFieldControl],
  template: `<input forFieldControl [disabled]="disabled()" data-testid="target" />`,
})
class FieldControlHost {
  readonly disabled = signal(false);
}

@Component({
  imports: [ForFieldset],
  template: `<fieldset forFieldset [disabled]="disabled()" data-testid="target"></fieldset>`,
})
class FieldsetHost {
  readonly disabled = signal(false);
}

interface HostCase<T> {
  readonly fixture: Type<T>;
  readonly providers?: Provider[];
}

const STATIC_ATTR_HOSTS: Readonly<Record<string, HostCase<unknown>>> = {
  'accordion/src/accordion-trigger.ts': { fixture: AccordionTriggerHost },
  'combobox/src/combobox-chip-remove.ts': { fixture: ComboboxChipRemoveHost },
  'combobox/src/combobox-clear.ts': { fixture: ComboboxClearHost },
  'combobox/src/combobox-input.ts': { fixture: ComboboxInputHost },
  'combobox/src/combobox-toggle.ts': { fixture: ComboboxToggleHost },
  'combobox/src/combobox-trigger.ts': { fixture: ComboboxTriggerHost },
  'date-picker/src/date-picker-trigger.ts': {
    fixture: DatePickerTriggerHost,
    providers: provideNativeDateAdapter(),
  },
  'file-upload/src/file-upload-trigger.ts': { fixture: FileUploadTriggerHost },
  'search/src/search-clear.ts': { fixture: SearchClearHost },
  'select/src/select-trigger.ts': { fixture: SelectTriggerHost },
  'time-picker/src/time-picker-trigger.ts': {
    fixture: TimePickerTriggerHost,
    providers: provideNativeDateAdapter(),
  },
};

const LOCAL_INPUT_HOSTS: Readonly<Record<string, HostCase<LocalInputHost>>> = {
  'dialog/src/dialog-trigger.ts': { fixture: DialogTriggerHost },
  'disclosure/src/disclosure-trigger.ts': { fixture: DisclosureTriggerHost },
  'drawer/src/drawer-trigger.ts': { fixture: DrawerTriggerHost },
  'dropdown-menu/src/dropdown-menu-trigger.ts': { fixture: DropdownMenuTriggerHost },
  'field/src/field-control.ts': { fixture: FieldControlHost },
  'fieldset/src/fieldset.ts': { fixture: FieldsetHost },
  'input/src/input.ts': { fixture: InputHost },
  'input/src/textarea.ts': { fixture: TextareaHost },
  'number-input/src/number-input.ts': { fixture: NumberInputRootHost },
  'pagination/src/pagination-item.ts': { fixture: PaginationItemHost },
  'popover/src/popover-trigger.ts': { fixture: PopoverTriggerHost },
  'search/src/search.ts': { fixture: SearchHost },
};

describe('disabled reflection — library-wide contract', () => {
  describe('roster derived from source', () => {
    it('finds the reflectDisabled hosts through the glob', () => {
      expect(reflectDisabledHosts().length).toBeGreaterThan(20);
    });

    it('finds one reflectDisabled call per calling file', () => {
      const counts = callerPaths().map((path) => [path, helperCalls(LIBRARY_CODE.get(path)!)]);
      expect(counts.filter(([, n]) => n !== 1)).toEqual([]);
    });

    it('has exactly one case per reflectDisabled host', () => {
      const cases = [...Object.keys(STATIC_ATTR_HOSTS), ...Object.keys(LOCAL_INPUT_HOSTS)].sort();
      expect(cases).toEqual(reflectDisabledHosts());
    });
  });

  describe('static-attr hosts preserve a consumer-set static disabled', () => {
    it.each(Object.entries(STATIC_ATTR_HOSTS))('%s', (_, { fixture, providers }) => {
      configure(providers);
      expectStaticDisabledSurvives(mount(fixture));
    });
  });

  describe('local-input hosts preserve an imperatively-applied disabled across an enable cycle', () => {
    it.each(Object.entries(LOCAL_INPUT_HOSTS))('%s', (_, { fixture, providers }) => {
      configure(providers);
      expectImperativeDisabledSurvives(mount(fixture));
    });
  });
});
