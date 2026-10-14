import { Component, Directive, signal } from '@angular/core';

import { provideNativeDateAdapter } from 'forty-cdk/shared';
import { pressKey } from 'forty-cdk/testing';
import { ForTimeField, ForTimeFieldLiteral, ForTimeFieldSegment } from 'forty-cdk/time-field';

import {
  afterEachOverlayCleanup,
  flush,
  renderHost,
  type RenderResult,
} from '../../src/test-utils';

import { ForTimePicker, provideForTimePicker } from './time-picker';
import { FOR_TIME_PICKER_CONTEXT } from './time-picker-context';
import { ForTimePickerTrigger } from './time-picker-trigger';

@Directive({
  selector: '[wrapperTimePicker]',
  exportAs: 'wrapperTimePicker',
  providers: provideForTimePicker(WrapperTimePicker),
})
class WrapperTimePicker<D> extends ForTimePicker<D> {}

@Directive({
  selector: '[ownContextTimePicker]',
  exportAs: 'ownContextTimePicker',
  providers: [{ provide: FOR_TIME_PICKER_CONTEXT, useExisting: OwnContextTimePicker }],
})
class OwnContextTimePicker<D> extends ForTimePicker<D> {}

const FIELD_PIECES = [ForTimeField, ForTimeFieldSegment, ForTimeFieldLiteral, ForTimePickerTrigger];

@Component({
  imports: [WrapperTimePicker, ...FIELD_PIECES],
  providers: [...provideNativeDateAdapter()],
  template: `
    <div wrapperTimePicker anatomy="field" [(value)]="value" [hourCycle]="24" locale="en-US">
      <div forTimeField #field="forTimeField">
        @for (s of field.segments(); track s.id) {
          @if (s.isLiteral) {
            <span forTimeFieldLiteral>{{ s.text }}</span>
          } @else {
            <span forTimeFieldSegment [segment]="s.type!" [attr.data-testid]="s.type">{{
              s.text
            }}</span>
          }
        }
      </div>
      <button forTimePickerTrigger aria-label="Choose a time">Slots</button>
    </div>
  `,
})
class WrapperHost {
  readonly value = signal<Date | null>(null);
}

@Component({
  imports: [OwnContextTimePicker, ...FIELD_PIECES],
  providers: [...provideNativeDateAdapter()],
  template: `
    <div ownContextTimePicker anatomy="field" [(value)]="value" [hourCycle]="24" locale="en-US">
      <div forTimeField #field="forTimeField">
        @for (s of field.segments(); track s.id) {
          @if (s.isLiteral) {
            <span forTimeFieldLiteral>{{ s.text }}</span>
          } @else {
            <span forTimeFieldSegment [segment]="s.type!" [attr.data-testid]="s.type">{{
              s.text
            }}</span>
          }
        }
      </div>
      <button forTimePickerTrigger aria-label="Choose a time">Slots</button>
    </div>
  `,
})
class OwnContextHost {
  readonly value = signal<Date | null>(null);
}

async function typeTime(r: RenderResult<{ value: () => Date | null }>): Promise<void> {
  for (const [type, digits] of [
    ['hour', '09'],
    ['minute', '15'],
  ] as const) {
    for (const digit of digits) {
      pressKey(r.query<HTMLElement>(`[data-testid="${type}"]`)!, digit);
    }
    await flush(r.fixture);
  }
}

describe('ForTimePicker subclass wrapper', () => {
  afterEachOverlayCleanup();

  it('adopts a projected time field under anatomy="field" through a subclass spreading provideForTimePicker', async () => {
    const r = renderHost(WrapperHost);
    await flush(r.fixture);

    await typeTime(r);

    const value = r.instance.value();
    expect(value === null ? null : [value.getHours(), value.getMinutes()]).toEqual([9, 15]);
  });

  it('leaves a projected time field unadopted when the subclass re-provides only its own context', async () => {
    const r = renderHost(OwnContextHost);
    await flush(r.fixture);

    await typeTime(r);

    expect(r.instance.value()).toBeNull();
  });
});
