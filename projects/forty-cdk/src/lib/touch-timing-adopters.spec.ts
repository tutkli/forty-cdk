import { Component, signal, type Type, type WritableSignal } from '@angular/core';

import { afterEachOverlayCleanup, pointerDownOn, renderHost } from '../test-utils';
import { LIBRARY_CODE } from '../test-utils/source-scan';

import { ForCheckbox } from 'forty-cdk/checkbox';
import {
  ForCombobox,
  ForComboboxClear,
  ForComboboxContent,
  ForComboboxInput,
  ForComboboxOption,
} from 'forty-cdk/combobox';
import { ForDateField, ForDateFieldLiteral, ForDateFieldSegment } from 'forty-cdk/date-field';
import {
  ForDatePicker,
  ForDatePickerContent,
  ForDatePickerTrigger,
  ForDateRangePicker,
} from 'forty-cdk/date-picker';
import { ForSelect, ForSelectContent, ForSelectOption, ForSelectTrigger } from 'forty-cdk/select';
import { provideNativeDateAdapter } from 'forty-cdk/shared';
import { ForSwitch } from 'forty-cdk/switch';
import { pressKey } from 'forty-cdk/testing';
import { ForTimeField, ForTimeFieldLiteral, ForTimeFieldSegment } from 'forty-cdk/time-field';
import {
  ForTimePicker,
  ForTimePickerContent,
  ForTimePickerOption,
  ForTimePickerTrigger,
} from 'forty-cdk/time-picker';
import { ForToggle } from 'forty-cdk/toggle';

function balancedBody(source: string, open: number): string {
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

function methodBodies(source: string, names: ReadonlySet<string>): Map<string, string> {
  const bodies = new Map<string, string>();
  const method = /^[ \t]*(?:(?:private|protected|public|override|async)\s+)*(#?\w+)\s*\(/gm;
  let match: RegExpExecArray | null;
  while ((match = method.exec(source)) !== null) {
    const name = match[1]!.replace(/^#/, '');
    if (!names.has(name)) {
      continue;
    }
    const close = source.indexOf(')', match.index + match[0].length);
    const open = source.indexOf('{', close);
    const between = source.slice(close + 1, open);
    if (open < 0 || /[;=]/.test(between)) {
      continue;
    }
    bodies.set(`${name}@${match.index}`, balancedBody(source, open));
  }
  return bodies;
}

function focusOutHandlerNames(source: string): Set<string> {
  const names = new Set<string>();
  for (const match of source.matchAll(/'\(focusout\)':\s*'(\w+)\(/g)) {
    names.add(match[1]!);
  }
  for (const match of source.matchAll(/\b(\w*[fF]ocusOut)\s*\(\s*\w+\s*:\s*FocusEvent\b/g)) {
    names.add(match[1]!);
  }
  return names;
}

function touchingFocusOutHandlers(): Map<string, string> {
  const handlers = new Map<string, string>();
  for (const [file, source] of LIBRARY_CODE) {
    const names = focusOutHandlerNames(source);
    for (const [key, body] of methodBodies(source, names)) {
      if (/\bmarkTouched\(/.test(body)) {
        handlers.set(`${file}::${key.split('@')[0]}`, body);
      }
    }
  }
  return handlers;
}

const DISMISS_MEMBERS = new Set(['requestClose', 'onDismiss', 'close', 'emitEscapeKeyDown']);

function dismissPropertyValues(source: string): string[] {
  const values: string[] = [];
  for (const match of source.matchAll(/\b(requestClose|onDismiss)\s*:\s*/g)) {
    const start = match.index + match[0].length;
    const arrow = /^(?:\([^)]*\)|\w+)\s*=>\s*/.exec(source.slice(start));
    if (arrow && source[start + arrow[0].length] === '{') {
      values.push(balancedBody(source, start + arrow[0].length));
      continue;
    }
    const end = source.indexOf('\n', start);
    values.push(source.slice(start, end < 0 ? undefined : end));
  }
  return values;
}

function touchingDismissSites(): Map<string, string> {
  const sites = new Map<string, string>();
  for (const [file, source] of LIBRARY_CODE) {
    for (const [key, body] of methodBodies(source, DISMISS_MEMBERS)) {
      if (/\bmarkTouched\b/.test(body)) {
        sites.set(`${file}::${key}`, body);
      }
    }
    dismissPropertyValues(source).forEach((value, index) => {
      if (/\bmarkTouched\b/.test(value)) {
        sites.set(`${file}::property#${index}`, value);
      }
    });
  }
  return sites;
}

describe('touch-timing adoption (meta-guard)', () => {
  it('finds the focusout handlers that mark a control touched', () => {
    expect(touchingFocusOutHandlers().size).toBeGreaterThanOrEqual(13);
  });

  it('routes every touching focusout through leavesControl', () => {
    const offenders = [...touchingFocusOutHandlers()]
      .filter(([, body]) => !/\bleavesControl\(/.test(body))
      .map(([key]) => key);
    expect(offenders).toEqual([]);
  });

  it('finds the dismissal sites that mark a control touched', () => {
    expect(touchingDismissSites().size).toBeGreaterThanOrEqual(7);
  });

  it('routes every touching dismissal through dismissMarksTouched', () => {
    const offenders = [...touchingDismissSites()]
      .filter(([, body]) => !/\bdismissMarksTouched\(/.test(body))
      .map(([key]) => key);
    expect(offenders).toEqual([]);
  });
});

function focusOut(from: Element, to: Element | null): void {
  from.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: to }));
}

interface TouchedHost {
  readonly touched: WritableSignal<boolean>;
}

@Component({
  imports: [ForCheckbox],
  template: `<button forCheckbox aria-label="Terms" [(touched)]="touched">C</button>`,
})
class CheckboxPointerHost implements TouchedHost {
  readonly touched = signal(false);
}

@Component({
  imports: [ForSwitch],
  template: `<button forSwitch aria-label="Notify" [(touched)]="touched">S</button>`,
})
class SwitchPointerHost implements TouchedHost {
  readonly touched = signal(false);
}

@Component({
  imports: [ForToggle],
  template: `<button forToggle aria-label="Bold" [(touched)]="touched">T</button>`,
})
class TogglePointerHost implements TouchedHost {
  readonly touched = signal(false);
}

const POINTER_CONTROLS: readonly [string, Type<TouchedHost>][] = [
  ['ForCheckbox', CheckboxPointerHost],
  ['ForSwitch', SwitchPointerHost],
  ['ForToggle', TogglePointerHost],
];

describe('a pointer activation that never focuses the control', () => {
  for (const [name, host] of POINTER_CONTROLS) {
    it(`${name}: marks the control touched without a blur`, async () => {
      const { el, instance, flush } = renderHost(host);
      await flush();
      const button = el.querySelector<HTMLButtonElement>('button')!;

      button.click();
      await flush();

      expect(document.activeElement).not.toBe(button);
      expect(instance.touched()).toBe(true);
      expect(button.hasAttribute('data-touched')).toBe(true);
    });
  }
});

@Component({
  imports: [
    ForDatePicker,
    ForDatePickerTrigger,
    ForDateField,
    ForDateFieldSegment,
    ForDateFieldLiteral,
  ],
  providers: [...provideNativeDateAdapter()],
  template: `
    <button data-test-id="outside">Elsewhere</button>
    <div forDatePicker anatomy="field" [(touched)]="touched">
      <div forDateField #field="forDateField">
        @for (s of field.segments(); track s.id) {
          @if (s.isLiteral) {
            <span forDateFieldLiteral>{{ s.text }}</span>
          } @else {
            <span forDateFieldSegment [segment]="s.type!" data-test-id="segment">{{ s.text }}</span>
          }
        }
      </div>
      <button forDatePickerTrigger data-test-id="trigger" aria-label="Open calendar">C</button>
    </div>
  `,
})
class DatePickerFieldHost implements TouchedHost {
  readonly touched = signal(false);
}

@Component({
  imports: [
    ForTimePicker,
    ForTimePickerTrigger,
    ForTimeField,
    ForTimeFieldSegment,
    ForTimeFieldLiteral,
  ],
  providers: [...provideNativeDateAdapter()],
  template: `
    <button data-test-id="outside">Elsewhere</button>
    <div forTimePicker anatomy="field" [(touched)]="touched">
      <div forTimeField #field="forTimeField">
        @for (s of field.segments(); track s.id) {
          @if (s.isLiteral) {
            <span forTimeFieldLiteral>{{ s.text }}</span>
          } @else {
            <span forTimeFieldSegment [segment]="s.type!" data-test-id="segment">{{ s.text }}</span>
          }
        }
      </div>
      <button forTimePickerTrigger data-test-id="trigger" aria-label="Choose a time">T</button>
    </div>
  `,
})
class TimePickerFieldHost implements TouchedHost {
  readonly touched = signal(false);
}

const FIELD_ANATOMY_PICKERS: readonly [string, Type<TouchedHost>][] = [
  ['ForDatePicker', DatePickerFieldHost],
  ['ForTimePicker', TimePickerFieldHost],
];

describe('a focus move between the parts of a field-anatomy picker', () => {
  for (const [name, host] of FIELD_ANATOMY_PICKERS) {
    it(`${name}: segment to trigger and back does not mark the picker touched`, async () => {
      const { query, instance, flush } = renderHost(host);
      await flush();
      const segment = query('[data-test-id="segment"]')!;
      const trigger = query('[data-test-id="trigger"]')!;

      focusOut(segment, trigger);
      await flush();
      focusOut(trigger, segment);
      await flush();

      expect(instance.touched()).toBe(false);
    });

    it(`${name}: leaving the picker root from the segment marks it touched`, async () => {
      const { query, instance, flush } = renderHost(host);
      await flush();

      focusOut(query('[data-test-id="segment"]')!, query('[data-test-id="outside"]'));
      await flush();

      expect(instance.touched()).toBe(true);
    });

    it(`${name}: leaving the picker root from the trigger marks it touched`, async () => {
      const { query, instance, flush } = renderHost(host);
      await flush();

      focusOut(query('[data-test-id="trigger"]')!, query('[data-test-id="outside"]'));
      await flush();

      expect(instance.touched()).toBe(true);
    });
  }
});

@Component({
  imports: [ForSelect, ForSelectTrigger],
  template: `
    <div forSelect [(touched)]="touched">
      <button forSelectTrigger data-test-id="from">x</button>
      <button type="button" data-test-id="to">Clear</button>
    </div>
  `,
})
class SelectSiblingHost implements TouchedHost {
  readonly touched = signal(false);
}

@Component({
  imports: [ForCombobox, ForComboboxInput, ForComboboxClear],
  template: `
    <div forCombobox ariaLabel="Fruit" [(touched)]="touched">
      <input forComboboxInput data-test-id="from" />
      <button forComboboxClear data-test-id="to">Clear</button>
    </div>
  `,
})
class ComboboxClearHost implements TouchedHost {
  readonly touched = signal(false);
}

describe('a focus move between the parts of a listbox composite', () => {
  for (const [name, host] of [
    ['ForSelect: trigger to a sibling inside the wrapper', SelectSiblingHost],
    ['ForCombobox: input to the clear button', ComboboxClearHost],
  ] as const) {
    it(`${name} does not mark the control touched`, async () => {
      const { query, instance, flush } = renderHost<TouchedHost>(host);
      await flush();

      focusOut(query('[data-test-id="from"]')!, query('[data-test-id="to"]'));
      await flush();

      expect(instance.touched()).toBe(false);
    });
  }
});

interface DismissHost extends TouchedHost {
  readonly open: WritableSignal<boolean>;
  readonly modal: WritableSignal<boolean>;
}

@Component({
  imports: [ForSelect, ForSelectTrigger, ForSelectContent, ForSelectOption],
  template: `
    <div forSelect [modal]="modal()" [(open)]="open" [(touched)]="touched">
      <button forSelectTrigger>x</button>
      @if (open()) {
        <div forSelectContent>
          <button forSelectOption value="a">A</button>
        </div>
      }
    </div>
  `,
})
class SelectDismissHost implements DismissHost {
  readonly open = signal(false);
  readonly modal = signal(false);
  readonly touched = signal(false);
}

@Component({
  imports: [ForTimePicker, ForTimePickerTrigger, ForTimePickerContent, ForTimePickerOption],
  providers: [...provideNativeDateAdapter()],
  template: `
    <div
      forTimePicker
      [modal]="modal()"
      [step]="720"
      [(open)]="open"
      [(touched)]="touched"
      #picker="forTimePicker"
    >
      <button forTimePickerTrigger>t</button>
      @if (open()) {
        <div forTimePickerContent>
          @for (slot of picker.slots(); track slot.id) {
            <div forTimePickerOption [value]="slot.value">{{ slot.label }}</div>
          }
        </div>
      }
    </div>
  `,
})
class TimePickerDismissHost implements DismissHost {
  readonly open = signal(false);
  readonly modal = signal(false);
  readonly touched = signal(false);
}

@Component({
  imports: [ForDatePicker, ForDatePickerTrigger, ForDatePickerContent],
  providers: [...provideNativeDateAdapter()],
  template: `
    <div forDatePicker [modal]="modal()" [(open)]="open" [(touched)]="touched">
      <button forDatePickerTrigger>d</button>
      @if (open()) {
        <div forDatePickerContent><button>Today</button></div>
      }
    </div>
  `,
})
class DatePickerDismissHost implements DismissHost {
  readonly open = signal(false);
  readonly modal = signal(false);
  readonly touched = signal(false);
}

@Component({
  imports: [ForDateRangePicker, ForDatePickerTrigger, ForDatePickerContent],
  providers: [...provideNativeDateAdapter()],
  template: `
    <div forDateRangePicker [modal]="modal()" [(open)]="open" [(touched)]="touched">
      <button forDatePickerTrigger>r</button>
      @if (open()) {
        <div forDatePickerContent><button>Today</button></div>
      }
    </div>
  `,
})
class DateRangePickerDismissHost implements DismissHost {
  readonly open = signal(false);
  readonly modal = signal(false);
  readonly touched = signal(false);
}

@Component({
  imports: [ForCombobox, ForComboboxInput, ForComboboxContent, ForComboboxOption],
  template: `
    <div forCombobox ariaLabel="Fruit" [(open)]="open" [(touched)]="touched">
      <input forComboboxInput data-test-id="input" />
      @if (open()) {
        <div forComboboxContent>
          <div forComboboxOption value="a">A</div>
        </div>
      }
    </div>
  `,
})
class ComboboxDismissHost implements DismissHost {
  readonly open = signal(false);
  readonly modal = signal(false);
  readonly touched = signal(false);
}

const DISMISS_ROOTS: readonly [string, Type<DismissHost>, boolean][] = [
  ['ForSelect (anchored)', SelectDismissHost, false],
  ['ForSelect (modal)', SelectDismissHost, true],
  ['ForTimePicker (anchored)', TimePickerDismissHost, false],
  ['ForTimePicker (modal)', TimePickerDismissHost, true],
  ['ForDatePicker (anchored)', DatePickerDismissHost, false],
  ['ForDatePicker (modal)', DatePickerDismissHost, true],
  ['ForDateRangePicker (anchored)', DateRangePickerDismissHost, false],
  ['ForDateRangePicker (modal)', DateRangePickerDismissHost, true],
  ['ForCombobox (anchored)', ComboboxDismissHost, false],
];

async function openRoot(host: Type<DismissHost>, modal: boolean) {
  const result = renderHost(host);
  result.instance.modal.set(modal);
  await result.flush();
  result.query<HTMLElement>('[data-test-id="input"]')?.focus();
  result.instance.open.set(true);
  await result.flush();
  return result;
}

describe('the touched outcome of a dismissal', () => {
  afterEachOverlayCleanup();

  for (const [name, host, modal] of DISMISS_ROOTS) {
    it(`${name}: Escape closes without marking the control touched`, async () => {
      const { instance, flush } = await openRoot(host, modal);
      expect(instance.open()).toBe(true);

      pressKey(document.activeElement ?? document, 'Escape');
      await flush();

      expect(instance.open()).toBe(false);
      expect(instance.touched()).toBe(false);
    });

    it(`${name}: an outside press closes and marks the control touched`, async () => {
      const { instance, flush } = await openRoot(host, modal);
      const outside = document.createElement('button');
      document.body.appendChild(outside);
      try {
        pointerDownOn(outside);
        await flush();

        expect(instance.open()).toBe(false);
        expect(instance.touched()).toBe(true);
      } finally {
        outside.remove();
      }
    });
  }
});
