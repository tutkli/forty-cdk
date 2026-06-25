import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form, FormField, required as requiredRule } from '@angular/forms/signals';

import { flush, pressKey, renderHost, type RenderResult } from '../../src/test-utils';
import {
  type CalendarDateRange,
  NativeDateAdapter,
  provideNativeDateAdapter,
} from 'forty-cdk/calendar';
import { provideInternationalizedDateAdapter } from 'forty-cdk/internationalized-date';
import { ForDateRangeField } from './date-range-field';
import { ForDateRangeFieldEnd, ForDateRangeFieldStart } from './date-range-field-endpoint';
import { ForDateRangeFieldLiteral } from './date-range-field-literal';
import { ForDateRangeFieldSegment } from './date-range-field-segment';
import { provideForDateRangeFieldDefaults } from './date-range-field-defaults';

const adapter = new NativeDateAdapter();

type Endpoint = 'start' | 'end';
type Part = 'day' | 'month' | 'year';

@Component({
  imports: [
    ForDateRangeField,
    ForDateRangeFieldStart,
    ForDateRangeFieldEnd,
    ForDateRangeFieldSegment,
    ForDateRangeFieldLiteral,
  ],
  providers: [...provideNativeDateAdapter()],
  template: `
    <div
      forDateRangeField
      [(value)]="value"
      [minDate]="minDate()"
      [maxDate]="maxDate()"
      [disabled]="disabled()"
      [readonly]="readonly()"
      [required]="required()"
      [locale]="locale()"
      [ariaLabel]="ariaLabel()"
      [dir]="dir()"
      name="stay"
      #range="forDateRangeField"
    >
      <div forDateRangeFieldStart data-testid="start-group" #start="forDateRangeFieldStart">
        @for (seg of start.segments(); track seg.id) {
          @if (seg.isLiteral) {
            <span forDateRangeFieldLiteral>{{ seg.text }}</span>
          } @else {
            <span
              forDateRangeFieldSegment
              [segment]="seg.type!"
              [attr.data-testid]="'start-' + seg.type"
              >{{ seg.text }}</span
            >
          }
        }
      </div>
      <span aria-hidden="true">–</span>
      <div forDateRangeFieldEnd data-testid="end-group" #end="forDateRangeFieldEnd">
        @for (seg of end.segments(); track seg.id) {
          @if (seg.isLiteral) {
            <span forDateRangeFieldLiteral>{{ seg.text }}</span>
          } @else {
            <span
              forDateRangeFieldSegment
              [segment]="seg.type!"
              [attr.data-testid]="'end-' + seg.type"
              >{{ seg.text }}</span
            >
          }
        }
      </div>
    </div>
  `,
})
class Host {
  readonly value = signal<CalendarDateRange<Date> | null>(null);
  readonly minDate = signal<Date | null>(null);
  readonly maxDate = signal<Date | null>(null);
  readonly disabled = signal(false);
  readonly readonly = signal(false);
  readonly required = signal(false);
  readonly locale = signal<string | null>('en-US');
  readonly ariaLabel = signal<string | null>('Stay');
  readonly dir = signal<'ltr' | 'rtl'>('ltr');
}

type R = RenderResult<Host>;

const root = (r: R) => r.query('[forDateRangeField]')!;
const group = (r: R, which: Endpoint) => r.query(`[data-testid="${which}-group"]`)!;
const seg = (r: R, which: Endpoint, type: Part) => r.query(`[data-testid="${which}-${type}"]`)!;

async function type(r: R, which: Endpoint, type: Part, digits: string): Promise<void> {
  for (const digit of digits) {
    pressKey(seg(r, which, type), digit);
  }
  await flush(r.fixture);
}

async function key(r: R, which: Endpoint, type: Part, k: string): Promise<void> {
  pressKey(seg(r, which, type), k);
  await flush(r.fixture);
}

/** en-US locale composes month / day / year — type a full date into one endpoint. */
async function fill(
  r: R,
  which: Endpoint,
  month: string,
  day: string,
  year: string,
): Promise<void> {
  await type(r, which, 'month', month);
  await type(r, which, 'day', day);
  await type(r, which, 'year', year);
}

describe('ForDateRangeField', () => {
  describe('structure & ARIA', () => {
    it('renders an outer role=group with two labelled endpoint groups', () => {
      const r = renderHost(Host);
      expect(root(r).getAttribute('role')).toBe('group');
      expect(root(r).getAttribute('aria-label')).toBe('Stay');
      expect(group(r, 'start').getAttribute('role')).toBe('group');
      expect(group(r, 'end').getAttribute('role')).toBe('group');
      expect(group(r, 'start').getAttribute('aria-label')).toBe('Start date');
      expect(group(r, 'end').getAttribute('aria-label')).toBe('End date');
    });

    it('renders one role=spinbutton per editable segment in each endpoint', () => {
      const r = renderHost(Host);
      expect(group(r, 'start').querySelectorAll('[role="spinbutton"]')).toHaveLength(3);
      expect(group(r, 'end').querySelectorAll('[role="spinbutton"]')).toHaveLength(3);
    });

    it('gives each endpoint its own single tab entry (the first segment in locale order)', () => {
      const r = renderHost(Host);
      // en-US order is month / day / year, so month is each endpoint's tab entry.
      expect(seg(r, 'start', 'month').getAttribute('tabindex')).toBe('0');
      expect(seg(r, 'start', 'day').getAttribute('tabindex')).toBe('-1');
      expect(seg(r, 'end', 'month').getAttribute('tabindex')).toBe('0');
      expect(seg(r, 'end', 'day').getAttribute('tabindex')).toBe('-1');
    });

    it('starts empty and reflects data-empty', () => {
      const r = renderHost(Host);
      expect(r.instance.value()).toBeNull();
      expect(root(r).getAttribute('data-empty')).toBe('');
      expect(root(r).getAttribute('aria-invalid')).toBeNull();
    });
  });

  describe('value composition', () => {
    it('composes a range only once both endpoints are fully entered', async () => {
      const r = renderHost(Host);
      await fill(r, 'start', '06', '10', '2026');
      expect(r.instance.value()).toBeNull();
      expect(root(r).getAttribute('data-empty')).toBe('');

      await fill(r, 'end', '06', '20', '2026');
      const range = r.instance.value()!;
      expect(range.start.getTime()).toBe(new Date(2026, 5, 10).getTime());
      expect(range.end.getTime()).toBe(new Date(2026, 5, 20).getTime());
      expect(root(r).getAttribute('data-empty')).toBeNull();
    });

    it('accepts an equal start and end (single-day range)', async () => {
      const r = renderHost(Host);
      await fill(r, 'start', '06', '10', '2026');
      await fill(r, 'end', '06', '10', '2026');
      const range = r.instance.value()!;
      expect(range.start.getTime()).toBe(range.end.getTime());
    });

    it('rehydrates both endpoints from an external value write', async () => {
      const r = renderHost(Host);
      r.instance.value.set({ start: new Date(2026, 0, 5), end: new Date(2026, 2, 9) });
      await flush(r.fixture);
      expect(seg(r, 'start', 'month').textContent?.trim()).toBe('01');
      expect(seg(r, 'start', 'day').textContent?.trim()).toBe('05');
      expect(seg(r, 'start', 'year').textContent?.trim()).toBe('2026');
      expect(seg(r, 'end', 'month').textContent?.trim()).toBe('03');
      expect(seg(r, 'end', 'day').textContent?.trim()).toBe('09');
      expect(seg(r, 'end', 'year').textContent?.trim()).toBe('2026');
    });

    it('clears the range to null when one endpoint segment is cleared, keeping the other endpoint', async () => {
      const r = renderHost(Host);
      r.instance.value.set({ start: new Date(2026, 0, 5), end: new Date(2026, 2, 9) });
      await flush(r.fixture);

      await key(r, 'start', 'day', 'Backspace');
      expect(r.instance.value()).toBeNull();
      expect(seg(r, 'start', 'day').textContent?.trim()).toBe('dd');
      // The untouched end endpoint keeps its entered segments.
      expect(seg(r, 'end', 'month').textContent?.trim()).toBe('03');
      expect(seg(r, 'end', 'year').textContent?.trim()).toBe('2026');
    });

    it('clamps a composed endpoint down to the shared maxDate', async () => {
      const r = renderHost(Host);
      r.instance.maxDate.set(new Date(2026, 5, 20));
      await flush(r.fixture);

      await fill(r, 'start', '06', '15', '2026'); // within range → kept
      await fill(r, 'end', '06', '25', '2026'); // above max → clamps down to the 20th
      const range = r.instance.value()!;
      expect(range.start.getTime()).toBe(new Date(2026, 5, 15).getTime());
      expect(range.end.getTime()).toBe(new Date(2026, 5, 20).getTime());
    });
  });

  describe('ordering', () => {
    it('keeps value null and flags the disorder when start falls after end', async () => {
      const r = renderHost(Host);
      await fill(r, 'start', '06', '20', '2026');
      await fill(r, 'end', '06', '10', '2026'); // end < start

      expect(r.instance.value()).toBeNull();
      expect(root(r).getAttribute('aria-invalid')).toBe('true');
      expect(root(r).getAttribute('data-range-error')).toBe('');
      // The typed segments are preserved, not silently rewritten.
      expect(seg(r, 'start', 'day').textContent?.trim()).toBe('20');
      expect(seg(r, 'end', 'day').textContent?.trim()).toBe('10');
    });

    it('emits the range once order is restored', async () => {
      const r = renderHost(Host);
      await fill(r, 'start', '06', '20', '2026');
      await fill(r, 'end', '06', '10', '2026');
      expect(r.instance.value()).toBeNull();

      await type(r, 'end', 'day', '25'); // 06/25 > 06/20
      const range = r.instance.value()!;
      expect(range.start.getTime()).toBe(new Date(2026, 5, 20).getTime());
      expect(range.end.getTime()).toBe(new Date(2026, 5, 25).getTime());
      expect(root(r).getAttribute('aria-invalid')).toBeNull();
      expect(root(r).getAttribute('data-range-error')).toBeNull();
    });
  });

  describe('keyboard editing', () => {
    it('steps a segment within its endpoint without disturbing the other endpoint', async () => {
      const r = renderHost(Host);
      r.instance.value.set({ start: new Date(2026, 5, 10), end: new Date(2026, 5, 20) });
      await flush(r.fixture);

      await key(r, 'start', 'day', 'ArrowUp');
      const range = r.instance.value()!;
      expect(range.start.getTime()).toBe(new Date(2026, 5, 11).getTime());
      expect(range.end.getTime()).toBe(new Date(2026, 5, 20).getTime());
    });
  });

  describe('disabled & readonly', () => {
    it('disables the field: every segment leaves the tab order and editing is blocked', async () => {
      const r = renderHost(Host);
      r.instance.disabled.set(true);
      await flush(r.fixture);
      expect(root(r).getAttribute('aria-disabled')).toBe('true');
      expect(group(r, 'start').getAttribute('aria-disabled')).toBe('true');
      expect(seg(r, 'start', 'month').getAttribute('tabindex')).toBe('-1');
      expect(seg(r, 'end', 'month').getAttribute('tabindex')).toBe('-1');

      await type(r, 'start', 'month', '12');
      expect(seg(r, 'start', 'month').getAttribute('aria-valuenow')).toBeNull();
    });

    it('read-only field reflects aria-readonly and blocks editing', async () => {
      const r = renderHost(Host);
      r.instance.value.set({ start: new Date(2026, 5, 10), end: new Date(2026, 5, 20) });
      r.instance.readonly.set(true);
      await flush(r.fixture);
      expect(root(r).getAttribute('aria-readonly')).toBe('true');
      await key(r, 'start', 'day', 'ArrowUp');
      expect(r.instance.value()!.start.getTime()).toBe(new Date(2026, 5, 10).getTime());
    });
  });

  describe('locale ordering & direction', () => {
    it('orders segments per the locale in both endpoints (de-DE → day / month / year)', async () => {
      const r = renderHost(Host);
      r.instance.locale.set('de-DE');
      await flush(r.fixture);
      const order = (which: Endpoint) =>
        Array.from(group(r, which).querySelectorAll('[forDateRangeFieldSegment]')).map((s) =>
          s.getAttribute('data-testid'),
        );
      expect(order('start')).toEqual(['start-day', 'start-month', 'start-year']);
      expect(order('end')).toEqual(['end-day', 'end-month', 'end-year']);
    });

    it('reflects the resolved writing direction on the host and endpoints', async () => {
      const r = renderHost(Host);
      expect(root(r).getAttribute('dir')).toBe('ltr');
      r.instance.dir.set('rtl');
      await flush(r.fixture);
      expect(root(r).getAttribute('dir')).toBe('rtl');
      expect(group(r, 'start').getAttribute('dir')).toBe('rtl');
    });
  });

  describe('localized labels via provideForDateRangeFieldDefaults', () => {
    @Component({
      imports: [
        ForDateRangeField,
        ForDateRangeFieldStart,
        ForDateRangeFieldEnd,
        ForDateRangeFieldSegment,
      ],
      providers: [
        ...provideNativeDateAdapter(),
        ...provideForDateRangeFieldDefaults({
          startLabel: 'Desde',
          endLabel: 'Hasta',
          segmentLabels: { day: 'día' },
        }),
      ],
      template: `
        <div forDateRangeField [locale]="'en-US'">
          <div forDateRangeFieldStart data-testid="start-group" #start="forDateRangeFieldStart">
            @for (seg of start.segments(); track seg.id) {
              @if (!seg.isLiteral) {
                <span
                  forDateRangeFieldSegment
                  [segment]="seg.type!"
                  [attr.data-testid]="'start-' + seg.type"
                ></span>
              }
            }
          </div>
          <div forDateRangeFieldEnd data-testid="end-group" #end="forDateRangeFieldEnd">
            @for (seg of end.segments(); track seg.id) {
              @if (!seg.isLiteral) {
                <span
                  forDateRangeFieldSegment
                  [segment]="seg.type!"
                  [attr.data-testid]="'end-' + seg.type"
                ></span>
              }
            }
          </div>
        </div>
      `,
    })
    class LocalizedHost {}

    it('localizes the group labels and segment labels, keeping unset keys at the default', () => {
      const r = renderHost(LocalizedHost);
      const host = r.fixture.nativeElement as HTMLElement;
      expect(host.querySelector('[data-testid="start-group"]')!.getAttribute('aria-label')).toBe(
        'Desde',
      );
      expect(host.querySelector('[data-testid="end-group"]')!.getAttribute('aria-label')).toBe(
        'Hasta',
      );
      expect(host.querySelector('[data-testid="start-day"]')!.getAttribute('aria-label')).toBe(
        'día',
      );
      expect(host.querySelector('[data-testid="start-month"]')!.getAttribute('aria-label')).toBe(
        'month',
      );
    });
  });

  describe('Signal Forms via [formField]', () => {
    interface Booking {
      stay: CalendarDateRange<Date> | null;
    }

    @Component({
      imports: [
        ForDateRangeField,
        ForDateRangeFieldStart,
        ForDateRangeFieldEnd,
        ForDateRangeFieldSegment,
        FormField,
      ],
      providers: [...provideNativeDateAdapter()],
      template: `
        <div forDateRangeField [formField]="booking.stay" [locale]="'en-US'">
          <div forDateRangeFieldStart data-testid="start-group" #start="forDateRangeFieldStart">
            @for (seg of start.segments(); track seg.id) {
              @if (!seg.isLiteral) {
                <span
                  forDateRangeFieldSegment
                  [segment]="seg.type!"
                  [attr.data-testid]="'start-' + seg.type"
                ></span>
              }
            }
          </div>
          <div forDateRangeFieldEnd data-testid="end-group" #end="forDateRangeFieldEnd">
            @for (seg of end.segments(); track seg.id) {
              @if (!seg.isLiteral) {
                <span
                  forDateRangeFieldSegment
                  [segment]="seg.type!"
                  [attr.data-testid]="'end-' + seg.type"
                ></span>
              }
            }
          </div>
        </div>
      `,
    })
    class FormHost {
      readonly model = signal<Booking>({ stay: null });
      readonly booking = form(this.model, (b) => {
        requiredRule(b.stay);
      });
    }

    type FR = RenderResult<FormHost>;
    const fseg = (r: FR, id: string) => r.query(`[data-testid="${id}"]`)!;
    const fillEndpoint = async (r: FR, which: Endpoint, m: string, d: string, y: string) => {
      for (const digit of m) pressKey(fseg(r, `${which}-month`), digit);
      for (const digit of d) pressKey(fseg(r, `${which}-day`), digit);
      for (const digit of y) pressKey(fseg(r, `${which}-year`), digit);
      await flush(r.fixture);
    };

    it('flows schema-driven required into aria-required', async () => {
      const r = renderHost(FormHost);
      await flush(r.fixture);
      expect(r.query('[forDateRangeField]')!.getAttribute('aria-required')).toBe('true');
    });

    it('two-way binds the composed range with the field', async () => {
      const r = renderHost(FormHost);
      await fillEndpoint(r, 'start', '06', '10', '2026');
      await fillEndpoint(r, 'end', '06', '20', '2026');
      const stay = r.instance.model().stay!;
      expect(stay.start.getTime()).toBe(new Date(2026, 5, 10).getTime());
      expect(stay.end.getTime()).toBe(new Date(2026, 5, 20).getTime());
    });
  });

  describe('date-time range (granularity > day)', () => {
    @Component({
      imports: [
        ForDateRangeField,
        ForDateRangeFieldStart,
        ForDateRangeFieldEnd,
        ForDateRangeFieldSegment,
      ],
      providers: [...provideNativeDateAdapter()],
      template: `
        <div
          forDateRangeField
          [(value)]="value"
          granularity="minute"
          [hourCycle]="24"
          [locale]="'en-US'"
        >
          <div forDateRangeFieldStart data-testid="start-group" #start="forDateRangeFieldStart">
            @for (seg of start.segments(); track seg.id) {
              @if (!seg.isLiteral) {
                <span
                  forDateRangeFieldSegment
                  [segment]="seg.type!"
                  [attr.data-testid]="'start-' + seg.type"
                ></span>
              }
            }
          </div>
          <div forDateRangeFieldEnd data-testid="end-group" #end="forDateRangeFieldEnd">
            @for (seg of end.segments(); track seg.id) {
              @if (!seg.isLiteral) {
                <span
                  forDateRangeFieldSegment
                  [segment]="seg.type!"
                  [attr.data-testid]="'end-' + seg.type"
                ></span>
              }
            }
          </div>
        </div>
      `,
    })
    class DateTimeHost {
      readonly value = signal<CalendarDateRange<Date> | null>(null);
    }

    it('appends the time segments to each endpoint', () => {
      const r = renderHost(DateTimeHost);
      const host = r.fixture.nativeElement as HTMLElement;
      expect(host.querySelector('[data-testid="start-hour"]')).not.toBeNull();
      expect(host.querySelector('[data-testid="start-minute"]')).not.toBeNull();
      expect(host.querySelector('[data-testid="end-hour"]')).not.toBeNull();
    });

    it('composes a date-time range once every segment is filled', async () => {
      const r = renderHost(DateTimeHost);
      const host = r.fixture.nativeElement as HTMLElement;
      const sg = (id: string) => host.querySelector(`[data-testid="${id}"]`) as HTMLElement;
      const enter = async (which: Endpoint, parts: [string, string][]) => {
        for (const [type, digits] of parts) {
          for (const digit of digits) pressKey(sg(`${which}-${type}`), digit);
        }
        await flush(r.fixture);
      };
      await enter('start', [
        ['month', '06'],
        ['day', '10'],
        ['year', '2026'],
        ['hour', '09'],
        ['minute', '00'],
      ]);
      await enter('end', [
        ['month', '06'],
        ['day', '10'],
        ['year', '2026'],
        ['hour', '17'],
        ['minute', '30'],
      ]);
      const range = r.instance.value()!;
      expect(adapter.getHours(range.start)).toBe(9);
      expect(adapter.getHours(range.end)).toBe(17);
      expect(adapter.getMinutes(range.end)).toBe(30);
    });

    it('surfaces the time-capable-adapter requirement under a day-only adapter', () => {
      @Component({
        imports: [ForDateRangeField, ForDateRangeFieldStart, ForDateRangeFieldSegment],
        providers: [...provideInternationalizedDateAdapter()],
        template: `
          <div forDateRangeField granularity="minute">
            <div forDateRangeFieldStart #start="forDateRangeFieldStart">
              @for (seg of start.segments(); track seg.id) {
                @if (!seg.isLiteral) {
                  <span forDateRangeFieldSegment [segment]="seg.type!"></span>
                }
              }
            </div>
          </div>
        `,
      })
      class DayOnlyHost {}

      // The eager-validation effect raises during change detection — observed,
      // never swallowed.
      expect(() => renderHost(DayOnlyHost)).toThrow(
        /\[forty-cdk\/date-adapter\] ForDateRangeField requires a time-capable DateAdapter/,
      );
    });
  });

  describe('zoneless reactivity', () => {
    it('rehydrates both endpoints from an external value write without Zone.js', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(Host);
      await flush(fixture);
      const host = fixture.nativeElement as HTMLElement;
      const sg = (id: string) => host.querySelector(`[data-testid="${id}"]`)!;

      const root = host.querySelector('[forDateRangeField]')!;
      expect(root.getAttribute('data-empty')).toBe('');

      fixture.componentInstance.value.set({
        start: new Date(2026, 0, 9),
        end: new Date(2026, 1, 14),
      });
      await flush(fixture);
      expect(sg('start-month').textContent?.trim()).toBe('01');
      expect(sg('start-day').textContent?.trim()).toBe('09');
      expect(sg('end-month').textContent?.trim()).toBe('02');
      expect(sg('end-day').textContent?.trim()).toBe('14');
      expect(root.getAttribute('data-empty')).toBeNull();

      // A second external write re-derives both endpoints, no Zone.js involved.
      fixture.componentInstance.value.set({
        start: new Date(2027, 11, 1),
        end: new Date(2027, 11, 25),
      });
      await flush(fixture);
      expect(sg('start-month').textContent?.trim()).toBe('12');
      expect(sg('start-day').textContent?.trim()).toBe('01');
      expect(sg('start-year').textContent?.trim()).toBe('2027');
      expect(sg('end-day').textContent?.trim()).toBe('25');
    });
  });
});
