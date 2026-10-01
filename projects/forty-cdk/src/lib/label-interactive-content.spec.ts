import { Component, signal, type Type } from '@angular/core';

import { afterEachOverlayCleanup, renderHost } from '../test-utils';

import { provideNativeDateAdapter } from 'forty-cdk/shared';
import {
  ForCombobox,
  ForComboboxContent,
  ForComboboxInput,
  ForComboboxList,
  ForComboboxTrigger,
} from 'forty-cdk/combobox';
import { ForDateField, ForDateFieldLiteral, ForDateFieldSegment } from 'forty-cdk/date-field';
import { ForDatePicker, ForDatePickerContent, ForDatePickerTrigger } from 'forty-cdk/date-picker';
import { ForField, ForFieldControl, ForLabel } from 'forty-cdk/field';
import { ForSelect, ForSelectContent, ForSelectOption, ForSelectTrigger } from 'forty-cdk/select';
import { ForTimePicker, ForTimePickerContent, ForTimePickerTrigger } from 'forty-cdk/time-picker';
import { pressWithMouse } from 'forty-cdk/testing';

let nativeLabel = false;

abstract class LabelHost {
  readonly native = nativeLabel;
  readonly open = signal(false);
  readonly openChanges: boolean[] = [];
  clicks = 0;

  countClick(): void {
    this.clicks++;
  }

  onOpenChange(open: boolean): void {
    this.openChanges.push(open);
    this.open.set(open);
  }
}

@Component({
  imports: [ForField, ForLabel, ForFieldControl],
  template: `
    <div forField>
      @if (native) {
        <label forLabel data-test-id="label">
          Priority
          <button type="button" data-test-id="info">?</button>
          <a href="#help" data-test-id="link" (click)="$event.preventDefault()">Help</a>
        </label>
      } @else {
        <span forLabel data-test-id="label">
          Priority
          <button type="button" data-test-id="info">?</button>
          <a href="#help" data-test-id="link" (click)="$event.preventDefault()">Help</a>
        </span>
      }
      <input forFieldControl data-test-id="control" (click)="countClick()" />
    </div>
  `,
})
class TextInputHost extends LabelHost {}

@Component({
  imports: [ForField, ForLabel, ForDateField, ForDateFieldSegment, ForDateFieldLiteral],
  providers: [...provideNativeDateAdapter()],
  template: `
    <div forField>
      @if (native) {
        <label forLabel data-test-id="label">
          Priority
          <button type="button" data-test-id="info">?</button>
          <a href="#help" data-test-id="link" (click)="$event.preventDefault()">Help</a>
        </label>
      } @else {
        <span forLabel data-test-id="label">
          Priority
          <button type="button" data-test-id="info">?</button>
          <a href="#help" data-test-id="link" (click)="$event.preventDefault()">Help</a>
        </span>
      }
      <div forDateField data-test-id="control" (click)="countClick()" #df="forDateField">
        @for (seg of df.segments(); track seg.id) {
          @if (seg.isLiteral) {
            <span forDateFieldLiteral>{{ seg.text }}</span>
          } @else {
            <span forDateFieldSegment [segment]="seg.type!">{{ seg.text }}</span>
          }
        }
      </div>
    </div>
  `,
})
class DateFieldHost extends LabelHost {}

@Component({
  imports: [ForField, ForLabel, ForSelect, ForSelectTrigger, ForSelectContent, ForSelectOption],
  template: `
    <div forField>
      @if (native) {
        <label forLabel data-test-id="label">
          Priority
          <button type="button" data-test-id="info">?</button>
          <a href="#help" data-test-id="link" (click)="$event.preventDefault()">Help</a>
        </label>
      } @else {
        <span forLabel data-test-id="label">
          Priority
          <button type="button" data-test-id="info">?</button>
          <a href="#help" data-test-id="link" (click)="$event.preventDefault()">Help</a>
        </span>
      }
      <div forSelect [open]="open()" (openChange)="onOpenChange($event)">
        <button forSelectTrigger data-test-id="control" (click)="countClick()">High</button>
        @if (open()) {
          <div forSelectContent data-test-id="content">
            <button forSelectOption value="high">High</button>
            <button forSelectOption value="low">Low</button>
          </div>
        }
      </div>
    </div>
  `,
})
class SelectHost extends LabelHost {}

@Component({
  imports: [
    ForField,
    ForLabel,
    ForCombobox,
    ForComboboxTrigger,
    ForComboboxContent,
    ForComboboxInput,
    ForComboboxList,
  ],
  template: `
    <div forField>
      @if (native) {
        <label forLabel data-test-id="label">
          Priority
          <button type="button" data-test-id="info">?</button>
          <a href="#help" data-test-id="link" (click)="$event.preventDefault()">Help</a>
        </label>
      } @else {
        <span forLabel data-test-id="label">
          Priority
          <button type="button" data-test-id="info">?</button>
          <a href="#help" data-test-id="link" (click)="$event.preventDefault()">Help</a>
        </span>
      }
      <div forCombobox [open]="open()" (openChange)="onOpenChange($event)">
        <button forComboboxTrigger data-test-id="control" (click)="countClick()">High</button>
        @if (open()) {
          <div forComboboxContent data-test-id="content">
            <input forComboboxInput />
            <div forComboboxList></div>
          </div>
        }
      </div>
    </div>
  `,
})
class ComboboxHost extends LabelHost {}

@Component({
  imports: [ForField, ForLabel, ForDatePicker, ForDatePickerTrigger, ForDatePickerContent],
  providers: [...provideNativeDateAdapter()],
  template: `
    <div forField>
      @if (native) {
        <label forLabel data-test-id="label">
          Priority
          <button type="button" data-test-id="info">?</button>
          <a href="#help" data-test-id="link" (click)="$event.preventDefault()">Help</a>
        </label>
      } @else {
        <span forLabel data-test-id="label">
          Priority
          <button type="button" data-test-id="info">?</button>
          <a href="#help" data-test-id="link" (click)="$event.preventDefault()">Help</a>
        </span>
      }
      <div forDatePicker [open]="open()" (openChange)="onOpenChange($event)">
        <button forDatePickerTrigger data-test-id="control" (click)="countClick()">Pick</button>
        @if (open()) {
          <div forDatePickerContent data-test-id="content">
            <button type="button">Today</button>
          </div>
        }
      </div>
    </div>
  `,
})
class DatePickerHost extends LabelHost {}

@Component({
  imports: [ForField, ForLabel, ForTimePicker, ForTimePickerTrigger, ForTimePickerContent],
  providers: [...provideNativeDateAdapter()],
  template: `
    <div forField>
      @if (native) {
        <label forLabel data-test-id="label">
          Priority
          <button type="button" data-test-id="info">?</button>
          <a href="#help" data-test-id="link" (click)="$event.preventDefault()">Help</a>
        </label>
      } @else {
        <span forLabel data-test-id="label">
          Priority
          <button type="button" data-test-id="info">?</button>
          <a href="#help" data-test-id="link" (click)="$event.preventDefault()">Help</a>
        </span>
      }
      <div forTimePicker [open]="open()" (openChange)="onOpenChange($event)">
        <button forTimePickerTrigger data-test-id="control" (click)="countClick()">Pick</button>
        @if (open()) {
          <div forTimePickerContent data-test-id="content"></div>
        }
      </div>
    </div>
  `,
})
class TimePickerHost extends LabelHost {}

const CONTROLS: readonly {
  readonly name: string;
  readonly host: Type<LabelHost>;
  readonly overlay: boolean;
}[] = [
  { name: 'a text input', host: TextInputHost, overlay: false },
  { name: 'a date field', host: DateFieldHost, overlay: false },
  { name: '[forSelect]', host: SelectHost, overlay: true },
  { name: 'a picker-anatomy [forCombobox]', host: ComboboxHost, overlay: true },
  { name: '[forDatePicker]', host: DatePickerHost, overlay: true },
  { name: '[forTimePicker]', host: TimePickerHost, overlay: true },
];

const byTestId = (testId: string) =>
  document.querySelector<HTMLElement>(`[data-test-id="${testId}"]`);

describe('[forLabel] leaves its interactive content alone', () => {
  afterEachOverlayCleanup();

  afterEach(() => {
    nativeLabel = false;
  });

  for (const [shape, native] of [
    ['a non-<label> host', false],
    ['a native <label> host', true],
  ] as const) {
    for (const { name, host, overlay } of CONTROLS) {
      describe(`${shape} over ${name}`, () => {
        const render = async () => {
          nativeLabel = native;
          const r = renderHost(host);
          await r.flush();
          return r;
        };

        for (const inner of ['info', 'link']) {
          it(`a press on the inner ${inner === 'info' ? 'button' : 'link'} neither clicks nor focuses the control`, async () => {
            const r = await render();
            const element = byTestId(inner)!;

            pressWithMouse(element);
            await r.flush();

            expect(document.activeElement).toBe(element);
            expect(r.instance.clicks).toBe(0);
            expect(r.instance.openChanges).toEqual([]);
          });
        }

        it('a press on the label text still activates the control', async () => {
          const r = await render();

          pressWithMouse(byTestId('label')!);
          await r.flush();

          expect(r.instance.clicks).toBe(1);
          expect(r.instance.openChanges).toEqual(overlay ? [true] : []);
        });

        if (overlay) {
          it('with the panel open, a press on the inner button closes it once', async () => {
            const r = await render();
            pressWithMouse(byTestId('label')!);
            await r.flush();
            expect(byTestId('content')).not.toBeNull();

            pressWithMouse(byTestId('info')!);
            await r.flush();

            expect(r.instance.openChanges).toEqual([true, false]);
            expect(byTestId('content')).toBeNull();
            expect(r.instance.clicks).toBe(1);
          });
        }
      });
    }
  }
});
