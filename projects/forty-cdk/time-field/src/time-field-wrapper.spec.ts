import { Component, Directive, signal } from '@angular/core';

import { ForDatePicker, ForDatePickerContent, ForDatePickerTrigger } from 'forty-cdk/date-picker';
import { provideNativeDateAdapter } from 'forty-cdk/shared';
import { pressKey } from 'forty-cdk/testing';

import { afterEachOverlayCleanup, flush, renderHost } from '../../src/test-utils';

import { ForTimeField, provideForTimeField } from './time-field';
import { FOR_TIME_FIELD_CONTEXT } from './time-field-context';
import { ForTimeFieldLiteral } from './time-field-literal';
import { ForTimeFieldSegment } from './time-field-segment';

@Directive({
  selector: '[wrapperTimeField]',
  exportAs: 'wrapperTimeField',
  providers: provideForTimeField(WrapperTimeField),
})
class WrapperTimeField<D> extends ForTimeField<D> {}

@Directive({
  selector: '[ownContextTimeField]',
  exportAs: 'ownContextTimeField',
  providers: [{ provide: FOR_TIME_FIELD_CONTEXT, useExisting: OwnContextTimeField }],
})
class OwnContextTimeField<D> extends ForTimeField<D> {}

const PIECES = [
  ForDatePicker,
  ForDatePickerTrigger,
  ForDatePickerContent,
  ForTimeFieldSegment,
  ForTimeFieldLiteral,
];

@Component({
  imports: [...PIECES, WrapperTimeField],
  providers: [...provideNativeDateAdapter()],
  template: `
    <div forDatePicker [(value)]="value" [(open)]="open" granularity="minute" [hourCycle]="24">
      <button forDatePickerTrigger>Open</button>
      @if (open()) {
        <div forDatePickerContent>
          <div
            wrapperTimeField
            [value]="value()"
            [hourCycle]="24"
            locale="en-US"
            #tf="wrapperTimeField"
          >
            @for (s of tf.segments(); track s.id) {
              @if (s.isLiteral) {
                <span forTimeFieldLiteral>{{ s.text }}</span>
              } @else {
                <span forTimeFieldSegment [segment]="s.type!" [attr.data-testid]="s.type">{{
                  s.text
                }}</span>
              }
            }
          </div>
        </div>
      }
    </div>
  `,
})
class WrapperHost {
  readonly value = signal<Date | null>(new Date(2026, 5, 15, 14, 30));
  readonly open = signal(true);
}

@Component({
  imports: [...PIECES, OwnContextTimeField],
  providers: [...provideNativeDateAdapter()],
  template: `
    <div forDatePicker [(value)]="value" [(open)]="open" granularity="minute" [hourCycle]="24">
      <button forDatePickerTrigger>Open</button>
      @if (open()) {
        <div forDatePickerContent>
          <div
            ownContextTimeField
            [value]="value()"
            [hourCycle]="24"
            locale="en-US"
            #tf="ownContextTimeField"
          >
            @for (s of tf.segments(); track s.id) {
              @if (s.isLiteral) {
                <span forTimeFieldLiteral>{{ s.text }}</span>
              } @else {
                <span forTimeFieldSegment [segment]="s.type!" [attr.data-testid]="s.type">{{
                  s.text
                }}</span>
              }
            }
          </div>
        </div>
      }
    </div>
  `,
})
class OwnContextHost {
  readonly value = signal<Date | null>(new Date(2026, 5, 15, 14, 30));
  readonly open = signal(true);
}

const hour = () => document.querySelector<HTMLElement>('[data-testid="hour"]')!;

describe('ForTimeField subclass wrapper', () => {
  afterEachOverlayCleanup();

  it('feeds a date-time picker through a subclass spreading provideForTimeField', async () => {
    const r = renderHost(WrapperHost);
    await flush(r.fixture);

    pressKey(hour(), 'ArrowUp');
    await flush(r.fixture);

    expect(r.instance.value()?.getTime()).toBe(new Date(2026, 5, 15, 15, 30).getTime());
  });

  it('drops the time source when the subclass re-provides only its own context', async () => {
    const r = renderHost(OwnContextHost);
    await flush(r.fixture);

    pressKey(hour(), 'ArrowUp');
    await flush(r.fixture);

    expect(r.instance.value()?.getTime()).toBe(new Date(2026, 5, 15, 14, 30).getTime());
  });
});
