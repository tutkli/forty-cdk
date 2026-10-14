import { Component, Directive, signal } from '@angular/core';

import { ForCalendar, ForCalendarCell, ForCalendarGrid } from 'forty-cdk/calendar';
import { type DateRange, FOR_DATE_FIELD_HOST } from 'forty-cdk/core';
import { ForDateField, ForDateFieldLiteral, ForDateFieldSegment } from 'forty-cdk/date-field';
import { provideNativeDateAdapter } from 'forty-cdk/shared';
import { pressKey } from 'forty-cdk/testing';

import { afterEachOverlayCleanup, flush, renderHost } from '../../src/test-utils';

import { ForDatePicker, provideForDatePicker } from './date-picker';
import { ForDatePickerContent } from './date-picker-content';
import { FOR_DATE_PICKER_CONTEXT } from './date-picker-context';
import { ForDatePickerTrigger } from './date-picker-trigger';
import { ForDateRangePicker, provideForDateRangePicker } from './date-range-picker';
import { FOR_DATE_RANGE_PICKER_CONTEXT } from './date-range-picker-context';

@Directive({
  selector: '[wrapperDatePicker]',
  exportAs: 'wrapperDatePicker',
  providers: provideForDatePicker(WrapperDatePicker),
})
class WrapperDatePicker<D> extends ForDatePicker<D> {}

@Directive({
  selector: '[legacyDatePicker]',
  exportAs: 'legacyDatePicker',
  providers: [
    { provide: FOR_DATE_PICKER_CONTEXT, useExisting: LegacyDatePicker },
    { provide: FOR_DATE_FIELD_HOST, useExisting: LegacyDatePicker },
  ],
})
class LegacyDatePicker<D> extends ForDatePicker<D> {}

@Directive({
  selector: '[wrapperDateRangePicker]',
  exportAs: 'wrapperDateRangePicker',
  providers: provideForDateRangePicker(WrapperDateRangePicker),
})
class WrapperDateRangePicker<D> extends ForDateRangePicker<D> {}

@Directive({
  selector: '[ownContextRangePicker]',
  providers: [{ provide: FOR_DATE_RANGE_PICKER_CONTEXT, useExisting: OwnContextRangePicker }],
})
class OwnContextRangePicker<D> extends ForDateRangePicker<D> {}

const PICKER_PIECES = [
  ForDatePickerTrigger,
  ForDatePickerContent,
  ForCalendar,
  ForCalendarGrid,
  ForCalendarCell,
];

@Component({
  imports: [WrapperDatePicker, ...PICKER_PIECES],
  providers: [...provideNativeDateAdapter()],
  template: `
    <div wrapperDatePicker [(value)]="value" [(open)]="open" readonly #picker="wrapperDatePicker">
      <button forDatePickerTrigger>Open</button>
      @if (open()) {
        <div forDatePickerContent>
          <div forCalendar [value]="picker.value()">
            <table forCalendarGrid #grid="forCalendarGrid">
              <tbody>
                @for (week of grid.weeks(); track week.key) {
                  <tr>
                    @for (c of week.days; track c.key) {
                      <td forCalendarCell [date]="c.date" [attr.data-testid]="'cell-' + c.key">
                        {{ c.label }}
                      </td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>
  `,
})
class ReadonlyWrapperHost {
  readonly value = signal<Date | null>(new Date(2026, 5, 15));
  readonly open = signal(true);
}

@Component({
  imports: [LegacyDatePicker, ...PICKER_PIECES],
  providers: [...provideNativeDateAdapter()],
  template: `
    <div legacyDatePicker [(value)]="value" [(open)]="open" readonly #picker="legacyDatePicker">
      <button forDatePickerTrigger>Open</button>
      @if (open()) {
        <div forDatePickerContent>
          <div forCalendar [value]="picker.value()">
            <table forCalendarGrid #grid="forCalendarGrid">
              <tbody>
                @for (week of grid.weeks(); track week.key) {
                  <tr>
                    @for (c of week.days; track c.key) {
                      <td forCalendarCell [date]="c.date" [attr.data-testid]="'cell-' + c.key">
                        {{ c.label }}
                      </td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>
  `,
})
class ReadonlyLegacyHost {
  readonly value = signal<Date | null>(new Date(2026, 5, 15));
  readonly open = signal(true);
}

@Component({
  imports: [WrapperDatePicker, ForDateField, ForDateFieldSegment, ForDateFieldLiteral],
  providers: [...provideNativeDateAdapter()],
  template: `
    <div wrapperDatePicker anatomy="field" [(value)]="value" locale="en-US">
      <div forDateField #field="forDateField">
        @for (s of field.segments(); track s.id) {
          @if (s.isLiteral) {
            <span forDateFieldLiteral>{{ s.text }}</span>
          } @else {
            <span forDateFieldSegment [segment]="s.type!" [attr.data-testid]="s.type">{{
              s.text
            }}</span>
          }
        }
      </div>
    </div>
  `,
})
class FieldAnatomyWrapperHost {
  readonly value = signal<Date | null>(null);
}

@Component({
  imports: [WrapperDateRangePicker, ...PICKER_PIECES],
  providers: [...provideNativeDateAdapter()],
  template: `
    <div
      wrapperDateRangePicker
      [(value)]="value"
      [(open)]="open"
      readonly
      ariaLabel="Stay"
      #picker="wrapperDateRangePicker"
    >
      <button forDatePickerTrigger data-testid="trigger">Open</button>
      @if (open()) {
        <div forDatePickerContent data-testid="content">
          <div forCalendar selectionMode="range" [range]="picker.value()">
            <table forCalendarGrid #grid="forCalendarGrid">
              <tbody>
                @for (week of grid.weeks(); track week.key) {
                  <tr>
                    @for (c of week.days; track c.key) {
                      <td forCalendarCell [date]="c.date" [attr.data-testid]="'cell-' + c.key">
                        {{ c.label }}
                      </td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>
  `,
})
class RangeWrapperHost {
  readonly value = signal<DateRange<Date> | null>({
    start: new Date(2026, 5, 10),
    end: new Date(2026, 5, 12),
  });
  readonly open = signal(true);
}

@Component({
  imports: [OwnContextRangePicker, ForDatePickerTrigger],
  providers: [...provideNativeDateAdapter()],
  template: `
    <div ownContextRangePicker ariaLabel="Stay">
      <button forDatePickerTrigger>Open</button>
    </div>
  `,
})
class RangeOwnContextHost {}

const cell = (key: string) => document.querySelector<HTMLElement>(`[data-testid="cell-${key}"]`)!;

describe('ForDatePicker subclass wrapper', () => {
  afterEachOverlayCleanup();

  it('keeps a read-only picker read-only in its projected calendar when the subclass spreads provideForDatePicker', async () => {
    const r = renderHost(ReadonlyWrapperHost);
    await flush(r.fixture);

    cell('2026-6-20').click();
    await flush(r.fixture);

    expect(r.instance.value()?.getTime()).toBe(new Date(2026, 5, 15).getTime());
    expect(cell('2026-6-20').getAttribute('aria-selected')).toBe('false');
    expect(cell('2026-6-15').getAttribute('aria-selected')).toBe('true');
  });

  it('lets the projected calendar of a read-only picker accept picks when the subclass omits the source host', async () => {
    const r = renderHost(ReadonlyLegacyHost);
    await flush(r.fixture);

    cell('2026-6-20').click();
    await flush(r.fixture);

    expect(r.instance.value()?.getTime()).toBe(new Date(2026, 5, 15).getTime());
    expect(cell('2026-6-20').getAttribute('aria-selected')).toBe('true');
  });

  it('adopts a projected date field under anatomy="field" through a subclass spreading provideForDatePicker', async () => {
    const r = renderHost(FieldAnatomyWrapperHost);
    await flush(r.fixture);
    const segment = (type: string) => r.query<HTMLElement>(`[data-testid="${type}"]`)!;

    for (const [type, digits] of [
      ['month', '06'],
      ['day', '20'],
      ['year', '2026'],
    ] as const) {
      for (const digit of digits) {
        pressKey(segment(type), digit);
      }
      await flush(r.fixture);
    }

    expect(r.instance.value()?.getTime()).toBe(new Date(2026, 5, 20).getTime());
  });
});

describe('ForDateRangePicker subclass wrapper', () => {
  afterEachOverlayCleanup();

  it('resolves the shared trigger and content pieces under a subclass spreading provideForDateRangePicker', async () => {
    const r = renderHost(RangeWrapperHost);
    await flush(r.fixture);

    expect(r.query('[data-testid="trigger"]')!.getAttribute('aria-expanded')).toBe('true');
    expect(document.querySelector('[data-testid="content"]')).not.toBeNull();
  });

  it('keeps a read-only range picker read-only in its projected calendar', async () => {
    const r = renderHost(RangeWrapperHost);
    await flush(r.fixture);

    cell('2026-6-20').click();
    await flush(r.fixture);

    expect(cell('2026-6-20').hasAttribute('data-range-start')).toBe(false);
    expect(cell('2026-6-10').hasAttribute('data-range-start')).toBe(true);
  });

  it('fails the shared trigger when a subclass re-provides only its own context', () => {
    expect(() => renderHost(RangeOwnContextHost)).toThrow(/FORCDK-DATE-PICKER-004/);
  });
});
