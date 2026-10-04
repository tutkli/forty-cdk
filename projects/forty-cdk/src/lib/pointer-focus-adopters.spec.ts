import { ChangeDetectionStrategy, Component, signal, type Type } from '@angular/core';

import {
  ForCombobox,
  ForComboboxContent,
  ForComboboxInput,
  ForComboboxOption,
  ForComboboxToggle,
} from 'forty-cdk/combobox';
import { ForField, ForFieldControl, ForLabel } from 'forty-cdk/field';
import { ForListbox, ForListboxOption } from 'forty-cdk/listbox';
import { ForSelect, ForSelectContent, ForSelectOption, ForSelectTrigger } from 'forty-cdk/select';
import { provideNativeDateAdapter } from 'forty-cdk/shared';
import { pressWithMouse } from 'forty-cdk/testing';
import {
  ForTimePicker,
  ForTimePickerContent,
  ForTimePickerOption,
  ForTimePickerTrigger,
} from 'forty-cdk/time-picker';
import { ForTree, ForTreeItem, ForTreeItemLabel, ForTreeItemToggle } from 'forty-cdk/tree';

import { afterEachOverlayCleanup, flush, renderHost } from '../test-utils';
import { LIBRARY_CODE } from '../test-utils/source-scan';

const HELPER = 'preventPointerFocus';

@Component({
  imports: [ForTree, ForTreeItem, ForTreeItemLabel, ForTreeItemToggle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul forTree aria-label="Files">
      <li forTreeItem value="src" data-focus>
        <div forTreeItemLabel><span forTreeItemToggle data-press>▸</span>src</div>
      </li>
      <li forTreeItem value="readme"><div forTreeItemLabel>readme</div></li>
    </ul>
  `,
})
class TreeToggleHost {}

@Component({
  imports: [ForTree, ForTreeItem, ForTreeItemLabel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul forTree aria-label="Files">
      <li forTreeItem value="src" data-arm data-focus><div forTreeItemLabel>src</div></li>
      <li forTreeItem value="readme" disabled><div forTreeItemLabel data-press>readme</div></li>
    </ul>
  `,
})
class TreeDisabledItemHost {}

@Component({
  imports: [ForListbox, ForListboxOption],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul forListbox aria-label="Fruit">
      <li>
        <button type="button" forListboxOption value="apple" data-arm data-focus>Apple</button>
      </li>
      <li>
        <button type="button" forListboxOption value="banana" disabled data-press>Banana</button>
      </li>
    </ul>
  `,
})
class ListboxDisabledOptionHost {}

@Component({
  imports: [ForSelect, ForSelectTrigger, ForSelectContent, ForSelectOption],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div forSelect [(open)]="open">
      <button forSelectTrigger>Fruit</button>
      @if (open()) {
        <div forSelectContent>
          <button forSelectOption value="apple" data-arm data-focus>Apple</button>
          <button forSelectOption value="banana" disabled data-press>Banana</button>
        </div>
      }
    </div>
  `,
})
class SelectDisabledOptionHost {
  readonly open = signal(true);
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
          <div forTimePickerOption [value]="nine" data-arm data-focus>09:00</div>
          <div forTimePickerOption [value]="ten" disabled data-press>10:00</div>
        </div>
      }
    </div>
  `,
})
class TimePickerDisabledOptionHost {
  readonly open = signal(true);
  readonly nine = new Date(2000, 0, 1, 9, 0, 0);
  readonly ten = new Date(2000, 0, 1, 10, 0, 0);
}

@Component({
  imports: [ForCombobox, ForComboboxInput, ForComboboxContent, ForComboboxOption],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div forCombobox [(open)]="open" multiple>
      <input forComboboxInput aria-label="Fruit" data-arm data-focus />
      @if (open()) {
        <div forComboboxContent>
          <div forComboboxOption value="apple" data-press>Apple</div>
          <div forComboboxOption value="banana">Banana</div>
        </div>
      }
    </div>
  `,
})
class ComboboxOptionHost {
  readonly open = signal(true);
}

@Component({
  imports: [
    ForCombobox,
    ForComboboxInput,
    ForComboboxContent,
    ForComboboxOption,
    ForComboboxToggle,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div forCombobox [(open)]="open">
      <input forComboboxInput aria-label="Fruit" data-arm data-focus />
      <button forComboboxToggle data-press>▾</button>
      @if (open()) {
        <div forComboboxContent>
          <div forComboboxOption value="apple">Apple</div>
        </div>
      }
    </div>
  `,
})
class ComboboxToggleHost {
  readonly open = signal(false);
}

@Component({
  imports: [ForField, ForLabel, ForFieldControl],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div forField>
      <span forLabel data-press>Email</span>
      <input forFieldControl data-focus />
    </div>
  `,
})
class FieldLabelHost {}

interface PressCase {
  readonly file: string;
  readonly host: Type<unknown>;
}

const SWEEP: readonly PressCase[] = [
  { file: 'tree/src/tree-item-toggle.ts', host: TreeToggleHost },
  { file: 'tree/src/tree-item.ts', host: TreeDisabledItemHost },
  { file: 'listbox/src/listbox-option.ts', host: ListboxDisabledOptionHost },
  { file: 'select/src/select-option.ts', host: SelectDisabledOptionHost },
  { file: 'time-picker/src/time-picker-option.ts', host: TimePickerDisabledOptionHost },
  { file: 'combobox/src/combobox-option.ts', host: ComboboxOptionHost },
  { file: 'combobox/src/combobox-toggle.ts', host: ComboboxToggleHost },
  { file: 'field/src/label.ts', host: FieldLabelHost },
];

function declaringFile(): string {
  const found = [...LIBRARY_CODE].find(([, source]) =>
    source.includes(`export function ${HELPER}(`),
  );
  expect(found).toBeDefined();
  return found![0];
}

function callers(): string[] {
  const declaring = declaringFile();
  const call = new RegExp(`[^A-Za-z]${HELPER}\\(`);
  return [...LIBRARY_CODE]
    .filter(([path, source]) => path !== declaring && call.test(source))
    .map(([path]) => path)
    .sort();
}

function filesWhere(test: (source: string) => boolean): string[] {
  return [...LIBRARY_CODE]
    .filter(([, source]) => test(source))
    .map(([path]) => path)
    .sort();
}

function required(selector: string): HTMLElement {
  const found = document.querySelector<HTMLElement>(selector);
  expect(found, selector).not.toBeNull();
  return found!;
}

describe('pointer focus guard (meta-guard)', () => {
  afterEachOverlayCleanup();

  it('finds the library sources through the glob', () => {
    expect(LIBRARY_CODE.size).toBeGreaterThan(100);
  });

  it('finds every piece calling the helper', () => {
    expect(callers().length).toBeGreaterThanOrEqual(SWEEP.length);
  });

  it('has every option and treeitem host calling the helper', () => {
    const hosts = filesWhere((source) => /role: '(option|treeitem)'/.test(source));
    expect(hosts.length).toBeGreaterThanOrEqual(5);
    expect(hosts.filter((path) => !callers().includes(path))).toEqual([]);
  });

  it('has every aria-hidden piece carrying a tabindex calling the helper', () => {
    const hosts = filesWhere(
      (source) => source.includes(`'aria-hidden': 'true'`) && /\btabindex: /.test(source),
    );
    expect(hosts.length).toBeGreaterThanOrEqual(1);
    expect(hosts.filter((path) => !callers().includes(path))).toEqual([]);
  });

  it('has no piece listening for mousedown beside the helper', () => {
    expect(filesWhere((source) => source.includes(`'(mousedown)'`))).toEqual([]);
  });

  it('sweeps every caller', () => {
    expect(SWEEP.map((entry) => entry.file).sort()).toEqual(callers());
  });

  for (const entry of SWEEP) {
    it(`${entry.file}: a mouse press is cancelled and focus ends where the piece promises`, async () => {
      const { fixture } = renderHost(entry.host);
      await flush(fixture);
      document.querySelector<HTMLElement>('[data-arm]')?.focus();
      await flush(fixture);

      let cancelled: boolean | null = null;
      const record = (event: MouseEvent): void => {
        cancelled = event.defaultPrevented;
      };
      window.addEventListener('mousedown', record);
      try {
        pressWithMouse(required('[data-press]'));
      } finally {
        window.removeEventListener('mousedown', record);
      }
      await flush(fixture);

      expect(cancelled).toBe(true);
      expect(document.activeElement).toBe(required('[data-focus]'));
    });
  }
});
