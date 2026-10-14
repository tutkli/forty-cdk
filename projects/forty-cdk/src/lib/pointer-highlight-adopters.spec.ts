import {
  ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  signal,
  type Type,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  ForCombobox,
  ForComboboxContent,
  ForComboboxInput,
  ForComboboxOption,
} from 'forty-cdk/combobox';
import { ForDropdownMenu, ForDropdownMenuTrigger } from 'forty-cdk/dropdown-menu';
import { ForListbox, ForListboxOption } from 'forty-cdk/listbox';
import { ForMenuContent, ForMenuItem } from 'forty-cdk/menu';
import { ForSelect, ForSelectContent, ForSelectOption, ForSelectTrigger } from 'forty-cdk/select';
import { provideNativeDateAdapter } from 'forty-cdk/shared';
import {
  ForTable,
  ForTableCell,
  ForTableHeaderCell,
  ForTableHeaderRow,
  ForTableRow,
} from 'forty-cdk/table';
import { installObserverPolyfills, pointerEvent } from 'forty-cdk/testing';
import {
  ForTimePicker,
  ForTimePickerContent,
  ForTimePickerOption,
  ForTimePickerTrigger,
} from 'forty-cdk/time-picker';
import { ForTree, ForTreeItem, ForTreeItemLabel } from 'forty-cdk/tree';

import { afterEachOverlayCleanup, flush, nextMacrotask, renderHost } from '../test-utils';
import { LIBRARY_CODE } from '../test-utils/source-scan';

const LISTENER = 'injectPointerMove';
const CLAIM = 'createPointerHighlight';
const COUNT = 200;
const SUPPRESSION_ELAPSED_MS = 250;
const indices = Array.from({ length: COUNT }, (_, i) => i);

@Component({
  imports: [ForListbox, ForListboxOption],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div forListbox aria-label="Numbers">
      @for (i of indices; track i) {
        <button
          type="button"
          forListboxOption
          [value]="i"
          [attr.data-target]="i === 5 ? '' : null"
          [attr.data-rest]="i === 4 ? '' : null"
        >
          {{ i }}
        </button>
      }
    </div>
  `,
})
class ListboxHost {
  readonly indices = indices;
}

@Component({
  imports: [ForSelect, ForSelectTrigger, ForSelectContent, ForSelectOption],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div forSelect [(open)]="open">
      <button forSelectTrigger>Number</button>
      @if (open()) {
        <div forSelectContent>
          @for (i of indices; track i) {
            <button
              forSelectOption
              [value]="i"
              [attr.data-target]="i === 5 ? '' : null"
              [attr.data-rest]="i === 4 ? '' : null"
            >
              {{ i }}
            </button>
          }
        </div>
      }
    </div>
  `,
})
class SelectHost {
  readonly open = signal(true);
  readonly indices = indices;
}

@Component({
  imports: [ForTimePicker, ForTimePickerTrigger, ForTimePickerContent, ForTimePickerOption],
  providers: [...provideNativeDateAdapter()],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div forTimePicker [(open)]="open">
      <button forTimePickerTrigger>Time</button>
      @if (open()) {
        <div forTimePickerContent>
          @for (slot of slots; track $index) {
            <div
              forTimePickerOption
              [value]="slot"
              [attr.data-target]="$index === 5 ? '' : null"
              [attr.data-rest]="$index === 4 ? '' : null"
            >
              {{ $index }}
            </div>
          }
        </div>
      }
    </div>
  `,
})
class TimePickerHost {
  readonly open = signal(true);
  readonly slots = indices.map((i) => new Date(2000, 0, 1, 0, i, 0));
}

@Component({
  imports: [ForCombobox, ForComboboxInput, ForComboboxContent, ForComboboxOption],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div forCombobox [(open)]="open">
      <input forComboboxInput aria-label="Number" />
      @if (open()) {
        <div forComboboxContent>
          @for (i of indices; track i) {
            <div
              forComboboxOption
              [value]="i"
              [attr.data-target]="i === 5 ? '' : null"
              [attr.data-rest]="i === 4 ? '' : null"
            >
              {{ i }}
            </div>
          }
        </div>
      }
    </div>
  `,
})
class ComboboxHost {
  readonly open = signal(true);
  readonly indices = indices;
}

@Component({
  imports: [ForTree, ForTreeItem, ForTreeItemLabel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul forTree aria-label="Numbers">
      @for (i of indices; track i) {
        <li forTreeItem [value]="i">
          <div
            forTreeItemLabel
            [attr.data-target]="i === 5 ? '' : null"
            [attr.data-rest]="i === 4 ? '' : null"
          >
            {{ i }}
          </div>
        </li>
      }
    </ul>
  `,
})
class TreeHost {
  readonly indices = indices;
}

@Component({
  imports: [ForTable, ForTableRow, ForTableCell],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <table forTable mode="grid" aria-label="Numbers">
      <tbody>
        @for (i of indices; track i) {
          <tr forTableRow>
            <td
              forTableCell
              name="n"
              [attr.data-target]="i === 5 ? '' : null"
              [attr.data-rest]="i === 4 ? '' : null"
            >
              {{ i }}
            </td>
          </tr>
        }
      </tbody>
    </table>
  `,
})
class TableHost {
  readonly indices = indices;
}

@Component({
  imports: [ForTable, ForTableHeaderRow, ForTableHeaderCell, ForTableRow, ForTableCell],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <table forTable mode="grid" aria-label="Numbers">
      <thead>
        <tr forTableHeaderRow>
          <th forTableHeaderCell name="n" data-target>N</th>
        </tr>
      </thead>
      <tbody>
        @for (i of indices; track i) {
          <tr forTableRow>
            <td forTableCell name="n" [attr.data-rest]="i === 4 ? '' : null">{{ i }}</td>
          </tr>
        }
      </tbody>
    </table>
  `,
})
class TableHeaderHost {
  readonly indices = indices;
}

@Component({
  imports: [ForDropdownMenu, ForDropdownMenuTrigger, ForMenuContent, ForMenuItem],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div forDropdownMenu [(open)]="open">
      <button forDropdownMenuTrigger>Actions</button>
      @if (open()) {
        <div forMenuContent>
          @for (i of indices; track i) {
            <button
              forMenuItem
              [attr.data-target]="i === 5 ? '' : null"
              [attr.data-rest]="i === 4 ? '' : null"
            >
              {{ i }}
            </button>
          }
        </div>
      }
    </div>
  `,
})
class MenuHost {
  readonly open = signal(true);
  readonly indices = indices;
}

interface Adopter {
  readonly file: string;
  readonly root: string | null;
  readonly host: Type<unknown>;
}

const ADOPTERS: readonly Adopter[] = [
  { file: 'listbox/src/listbox-option.ts', root: 'listbox/src/listbox.ts', host: ListboxHost },
  { file: 'select/src/select-option.ts', root: 'select/src/select.ts', host: SelectHost },
  {
    file: 'time-picker/src/time-picker-option.ts',
    root: 'time-picker/src/time-picker.ts',
    host: TimePickerHost,
  },
  { file: 'combobox/src/combobox-option.ts', root: 'combobox/src/combobox.ts', host: ComboboxHost },
  { file: 'tree/src/tree-item.ts', root: 'tree/src/tree.ts', host: TreeHost },
  { file: 'table/src/table-cell.ts', root: 'table/src/table.ts', host: TableHost },
  { file: 'table/src/table-header-cell.ts', root: 'table/src/table.ts', host: TableHeaderHost },
  { file: 'menu/src/menu-item-interaction.ts', root: null, host: MenuHost },
];

const MENU_ITEMS = [
  'menu/src/menu-item.ts',
  'menu/src/menu-checkbox-item.ts',
  'menu/src/menu-radio-item.ts',
];

interface Exclusion {
  readonly reason: string;
  readonly holds: () => boolean;
}

const focusDerived = (file: string): boolean =>
  source(file).includes(`'[attr.data-highlighted]': 'focused() ? "" : null'`);

const EXCLUSIONS: Readonly<Record<string, Exclusion>> = {
  'calendar/src/calendar-cell.ts': {
    reason: 'the highlight is the 2D keyboard cursor; hover feeds data-range-preview instead',
    holds: () =>
      focusDerived('calendar/src/calendar-cell.ts') &&
      source('calendar/src/calendar-cell.ts').includes('setHovered'),
  },
  'calendar/src/calendar-month-cell.ts': {
    reason: 'a calendar grid cell, keyboard-only like [forCalendarCell]',
    holds: () => focusDerived('calendar/src/calendar-month-cell.ts'),
  },
  'calendar/src/calendar-year-cell.ts': {
    reason: 'a calendar grid cell, keyboard-only like [forCalendarCell]',
    holds: () => focusDerived('calendar/src/calendar-year-cell.ts'),
  },
  'combobox/src/combobox-action.ts': {
    reason:
      'a role="button" action beside the option collection, highlighted while it holds DOM focus',
    holds: () =>
      focusDerived('combobox/src/combobox-action.ts') &&
      source('combobox/src/combobox-action.ts').includes(`role: 'button'`),
  },
  'core/src/datetime/segment-directive.ts': {
    reason: 'a spinbutton segment, not an item of a pointable collection',
    holds: () => source('core/src/datetime/segment-directive.ts').includes(`role: 'spinbutton'`),
  },
  'drag-drop/src/draggable.ts': {
    reason:
      'hover over a sortable item is a drag affordance; a table header hosting one claims through [forTableHeaderCell]',
    holds: () => callers(LISTENER).includes('table/src/table-header-cell.ts'),
  },
  ...Object.fromEntries(
    MENU_ITEMS.map((file) => [
      file,
      {
        reason: 'hover moves DOM focus onto the item, so the highlight follows focus, not a claim',
        holds: () =>
          source(file).includes('createMenuItemInteraction(') &&
          source('menu/src/menu-item-interaction.ts').includes('host.focus('),
      },
    ]),
  ),
};

function source(file: string): string {
  const code = LIBRARY_CODE.get(file);
  expect(code, file).toBeDefined();
  return code!;
}

function callers(helper: string): string[] {
  const call = new RegExp(`[^A-Za-z]${helper}\\(`);
  return [...LIBRARY_CODE]
    .filter(([path, code]) => path !== 'core/src/pointer/pointer-highlight.ts' && call.test(code))
    .map(([path]) => path)
    .sort();
}

function highlightPieces(): string[] {
  return [...LIBRARY_CODE]
    .filter(([, code]) => code.includes(`'[attr.data-highlighted]'`))
    .map(([path]) => path)
    .sort();
}

describe('pointer highlight channel (meta-guard)', () => {
  afterEachOverlayCleanup();
  let restoreObservers: () => void;
  beforeAll(() => {
    restoreObservers = installObserverPolyfills();
  });
  afterAll(() => restoreObservers());

  it('finds the library sources through the glob', () => {
    expect(LIBRARY_CODE.size).toBeGreaterThan(100);
    expect(highlightPieces().length).toBeGreaterThanOrEqual(10);
  });

  it('routes every data-highlighted piece through the helper or names why it does not', () => {
    const covered = new Set([
      ...ADOPTERS.map((entry) => entry.file),
      ...MENU_ITEMS,
      ...Object.keys(EXCLUSIONS),
    ]);
    expect(highlightPieces().filter((file) => !covered.has(file))).toEqual([]);
  });

  it('has every adopter calling the listener', () => {
    expect(ADOPTERS.filter((entry) => !callers(LISTENER).includes(entry.file))).toEqual([]);
  });

  it('has every adopter root owning the claim', () => {
    const roots = [...new Set(ADOPTERS.map((entry) => entry.root).filter((root) => root !== null))];
    expect(roots.filter((root) => !callers(CLAIM).includes(root)).sort()).toEqual([]);
    expect(callers(CLAIM)).toEqual(roots.sort());
  });

  it('keeps every exclusion condition true', () => {
    expect(Object.entries(EXCLUSIONS).filter(([, entry]) => !entry.holds())).toEqual([]);
  });

  it('has no piece binding a (pointermove) host listener', () => {
    expect(
      [...LIBRARY_CODE]
        .filter(([, code]) => code.includes(`'(pointermove)'`))
        .map(([path]) => path),
    ).toEqual([]);
  });

  for (const entry of ADOPTERS) {
    it(`${entry.file}: repeated moves over one item schedule at most one render`, async () => {
      const { fixture } = renderHost(entry.host);
      await flush(fixture);
      await nextMacrotask();
      const target = document.querySelector<HTMLElement>('[data-target]')!;
      const appRef = TestBed.inject(ApplicationRef) as unknown as { _tick(): void };
      const tick = vi.spyOn(appRef, '_tick');

      for (let i = 0; i < 5; i++) {
        target.dispatchEvent(pointerEvent('pointermove', { pointerType: 'mouse' }));
        await nextMacrotask();
      }

      expect(tick.mock.calls.length).toBeLessThanOrEqual(1);
    });

    it(`${entry.file}: a move that did not move the pointer after a scroll claims nothing`, async () => {
      const { fixture } = renderHost(entry.host);
      await flush(fixture);
      await nextMacrotask();
      const target = document.querySelector<HTMLElement>('[data-target]')!;
      const highlighted = (): boolean => target.closest('[data-highlighted]') !== null;
      const resting = { pointerType: 'mouse', clientX: 10, clientY: 20 };
      expect(highlighted()).toBe(false);
      await new Promise((resolve) => setTimeout(resolve, SUPPRESSION_ELAPSED_MS));

      document
        .querySelector<HTMLElement>('[data-rest]')!
        .dispatchEvent(pointerEvent('pointermove', resting));
      target.dispatchEvent(new Event('scroll'));
      target.dispatchEvent(pointerEvent('pointermove', resting));
      await flush(fixture);
      expect(highlighted()).toBe(false);

      target.dispatchEvent(pointerEvent('pointermove', { ...resting, clientY: 21 }));
      await flush(fixture);
      expect(highlighted()).toBe(true);
    });
  }
});
