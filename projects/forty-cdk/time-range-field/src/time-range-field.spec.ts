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
import { ForTimeRangeField } from './time-range-field';
import { ForTimeRangeFieldEnd, ForTimeRangeFieldStart } from './time-range-field-endpoint';
import { ForTimeRangeFieldLiteral } from './time-range-field-literal';
import { ForTimeRangeFieldSegment } from './time-range-field-segment';
import { provideForTimeRangeFieldDefaults } from './time-range-field-defaults';

const adapter = new NativeDateAdapter();

type Endpoint = 'start' | 'end';
type Part = 'hour' | 'minute' | 'second' | 'dayPeriod';

@Component({
  imports: [
    ForTimeRangeField,
    ForTimeRangeFieldStart,
    ForTimeRangeFieldEnd,
    ForTimeRangeFieldSegment,
    ForTimeRangeFieldLiteral,
  ],
  providers: [...provideNativeDateAdapter()],
  template: `
    <div
      forTimeRangeField
      [(value)]="value"
      [minTime]="minTime()"
      [maxTime]="maxTime()"
      [hourCycle]="hourCycle()"
      [granularity]="granularity()"
      [disabled]="disabled()"
      [readonly]="readonly()"
      [required]="required()"
      [locale]="locale()"
      [ariaLabel]="ariaLabel()"
      [dir]="dir()"
      name="hours"
      #range="forTimeRangeField"
    >
      <div forTimeRangeFieldStart data-testid="start-group" #start="forTimeRangeFieldStart">
        @for (seg of start.segments(); track seg.id) {
          @if (seg.isLiteral) {
            <span forTimeRangeFieldLiteral>{{ seg.text }}</span>
          } @else {
            <span
              forTimeRangeFieldSegment
              [segment]="seg.type!"
              [attr.data-testid]="'start-' + seg.type"
              >{{ seg.text }}</span
            >
          }
        }
      </div>
      <span aria-hidden="true">–</span>
      <div forTimeRangeFieldEnd data-testid="end-group" #end="forTimeRangeFieldEnd">
        @for (seg of end.segments(); track seg.id) {
          @if (seg.isLiteral) {
            <span forTimeRangeFieldLiteral>{{ seg.text }}</span>
          } @else {
            <span
              forTimeRangeFieldSegment
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
  readonly minTime = signal<Date | null>(null);
  readonly maxTime = signal<Date | null>(null);
  readonly hourCycle = signal<12 | 24 | null>(24);
  readonly granularity = signal<'hour' | 'minute' | 'second'>('minute');
  readonly disabled = signal(false);
  readonly readonly = signal(false);
  readonly required = signal(false);
  readonly locale = signal<string | null>('en-US');
  readonly ariaLabel = signal<string | null>('Opening hours');
  readonly dir = signal<'ltr' | 'rtl'>('ltr');
}

type R = RenderResult<Host>;

const root = (r: R) => r.query('[forTimeRangeField]')!;
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

/** en-US 24-hour, minute granularity composes hour / minute — fill one endpoint. */
async function fill(r: R, which: Endpoint, hour: string, minute: string): Promise<void> {
  await type(r, which, 'hour', hour);
  await type(r, which, 'minute', minute);
}

describe('ForTimeRangeField', () => {
  describe('structure & ARIA', () => {
    it('renders an outer role=group with two labelled endpoint groups', () => {
      const r = renderHost(Host);
      expect(root(r).getAttribute('role')).toBe('group');
      expect(root(r).getAttribute('aria-label')).toBe('Opening hours');
      expect(group(r, 'start').getAttribute('role')).toBe('group');
      expect(group(r, 'end').getAttribute('role')).toBe('group');
      expect(group(r, 'start').getAttribute('aria-label')).toBe('Start time');
      expect(group(r, 'end').getAttribute('aria-label')).toBe('End time');
    });

    it('renders one role=spinbutton per editable segment in each endpoint', () => {
      const r = renderHost(Host);
      expect(group(r, 'start').querySelectorAll('[role="spinbutton"]')).toHaveLength(2);
      expect(group(r, 'end').querySelectorAll('[role="spinbutton"]')).toHaveLength(2);
    });

    it('gives each endpoint its own single tab entry (the first segment in locale order)', () => {
      const r = renderHost(Host);
      expect(seg(r, 'start', 'hour').getAttribute('tabindex')).toBe('0');
      expect(seg(r, 'start', 'minute').getAttribute('tabindex')).toBe('-1');
      expect(seg(r, 'end', 'hour').getAttribute('tabindex')).toBe('0');
      expect(seg(r, 'end', 'minute').getAttribute('tabindex')).toBe('-1');
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
      await fill(r, 'start', '09', '00');
      expect(r.instance.value()).toBeNull();
      expect(root(r).getAttribute('data-empty')).toBe('');

      await fill(r, 'end', '17', '30');
      const range = r.instance.value()!;
      expect(adapter.getHours(range.start)).toBe(9);
      expect(adapter.getMinutes(range.start)).toBe(0);
      expect(adapter.getHours(range.end)).toBe(17);
      expect(adapter.getMinutes(range.end)).toBe(30);
      expect(root(r).getAttribute('data-empty')).toBeNull();
      expect(range.start.getFullYear()).toBe(2000);
      expect(range.end.getFullYear()).toBe(2000);
    });

    it('accepts an equal start and end (zero-length range)', async () => {
      const r = renderHost(Host);
      await fill(r, 'start', '09', '00');
      await fill(r, 'end', '09', '00');
      const range = r.instance.value()!;
      expect(range.start.getTime()).toBe(range.end.getTime());
    });

    it('rehydrates both endpoints from an external value write', async () => {
      const r = renderHost(Host);
      r.instance.value.set({
        start: new Date(2026, 5, 10, 9, 5),
        end: new Date(2026, 5, 10, 17, 30),
      });
      await flush(r.fixture);
      expect(seg(r, 'start', 'hour').textContent?.trim()).toBe('09');
      expect(seg(r, 'start', 'minute').textContent?.trim()).toBe('05');
      expect(seg(r, 'end', 'hour').textContent?.trim()).toBe('17');
      expect(seg(r, 'end', 'minute').textContent?.trim()).toBe('30');
    });

    it('clears the range to null when one endpoint segment is cleared, keeping the other endpoint', async () => {
      const r = renderHost(Host);
      r.instance.value.set({
        start: new Date(2026, 5, 10, 9, 5),
        end: new Date(2026, 5, 10, 17, 30),
      });
      await flush(r.fixture);

      await key(r, 'start', 'minute', 'Backspace');
      expect(r.instance.value()).toBeNull();
      expect(seg(r, 'start', 'minute').textContent?.trim()).toBe('mm');
      expect(seg(r, 'end', 'hour').textContent?.trim()).toBe('17');
      expect(seg(r, 'end', 'minute').textContent?.trim()).toBe('30');
    });

    it('clears both endpoints when a typed range is reset to null externally', async () => {
      const r = renderHost(Host);
      await fill(r, 'start', '09', '00');
      await fill(r, 'end', '17', '30');
      expect(r.instance.value()).not.toBeNull();

      r.instance.value.set(null);
      await flush(r.fixture);
      for (const which of ['start', 'end'] as const) {
        expect(seg(r, which, 'hour').textContent?.trim()).toBe('hh');
        expect(seg(r, which, 'minute').textContent?.trim()).toBe('mm');
      }
      expect(root(r).getAttribute('data-empty')).toBe('');
    });

    it('clears both endpoints when an externally set range is reset to null', async () => {
      const r = renderHost(Host);
      r.instance.value.set({
        start: new Date(2026, 5, 10, 9, 0),
        end: new Date(2026, 5, 10, 17, 0),
      });
      await flush(r.fixture);
      expect(seg(r, 'start', 'hour').textContent?.trim()).toBe('09');
      expect(seg(r, 'end', 'hour').textContent?.trim()).toBe('17');

      r.instance.value.set(null);
      await flush(r.fixture);
      expect(seg(r, 'start', 'hour').textContent?.trim()).toBe('hh');
      expect(seg(r, 'end', 'hour').textContent?.trim()).toBe('hh');
    });

    it('clamps a composed endpoint down to the shared maxTime (time-of-day only)', async () => {
      const r = renderHost(Host);
      r.instance.maxTime.set(new Date(2000, 0, 1, 17, 0));
      await flush(r.fixture);

      await fill(r, 'start', '09', '00');
      await fill(r, 'end', '20', '00');
      const range = r.instance.value()!;
      expect(adapter.getHours(range.start)).toBe(9);
      expect(adapter.getHours(range.end)).toBe(17);
      expect(adapter.getMinutes(range.end)).toBe(0);
    });
  });

  describe('ordering', () => {
    it('keeps value null and flags the disorder when start falls after end', async () => {
      const r = renderHost(Host);
      await fill(r, 'start', '17', '00');
      await fill(r, 'end', '09', '00');

      expect(r.instance.value()).toBeNull();
      expect(root(r).getAttribute('aria-invalid')).toBe('true');
      expect(root(r).getAttribute('data-range-error')).toBe('');
      expect(seg(r, 'start', 'hour').textContent?.trim()).toBe('17');
      expect(seg(r, 'end', 'hour').textContent?.trim()).toBe('09');
    });

    it('emits the range once order is restored', async () => {
      const r = renderHost(Host);
      await fill(r, 'start', '17', '00');
      await fill(r, 'end', '09', '00');
      expect(r.instance.value()).toBeNull();

      await type(r, 'end', 'hour', '18');
      const range = r.instance.value()!;
      expect(adapter.getHours(range.start)).toBe(17);
      expect(adapter.getHours(range.end)).toBe(18);
      expect(root(r).getAttribute('aria-invalid')).toBeNull();
      expect(root(r).getAttribute('data-range-error')).toBeNull();
    });
  });

  describe('keyboard editing', () => {
    it('steps a segment within its endpoint without disturbing the other endpoint', async () => {
      const r = renderHost(Host);
      r.instance.value.set({
        start: new Date(2026, 5, 10, 9, 0),
        end: new Date(2026, 5, 10, 17, 0),
      });
      await flush(r.fixture);

      await key(r, 'start', 'hour', 'ArrowUp');
      const range = r.instance.value()!;
      expect(adapter.getHours(range.start)).toBe(10);
      expect(adapter.getHours(range.end)).toBe(17);
    });
  });

  describe('disabled & readonly', () => {
    it('disables the field: every segment leaves the tab order and editing is blocked', async () => {
      const r = renderHost(Host);
      r.instance.disabled.set(true);
      await flush(r.fixture);
      expect(root(r).getAttribute('aria-disabled')).toBe('true');
      expect(group(r, 'start').getAttribute('aria-disabled')).toBe('true');
      expect(seg(r, 'start', 'hour').getAttribute('tabindex')).toBe('-1');
      expect(seg(r, 'end', 'hour').getAttribute('tabindex')).toBe('-1');

      await type(r, 'start', 'hour', '13');
      expect(seg(r, 'start', 'hour').getAttribute('aria-valuenow')).toBeNull();
    });

    it('read-only field reflects aria-readonly and blocks editing', async () => {
      const r = renderHost(Host);
      r.instance.value.set({
        start: new Date(2026, 5, 10, 9, 0),
        end: new Date(2026, 5, 10, 17, 0),
      });
      r.instance.readonly.set(true);
      await flush(r.fixture);
      expect(root(r).getAttribute('aria-readonly')).toBe('true');
      await key(r, 'start', 'hour', 'ArrowUp');
      expect(adapter.getHours(r.instance.value()!.start)).toBe(9);
    });
  });

  describe('locale ordering & direction', () => {
    it('reflects the resolved writing direction on the host and endpoints', async () => {
      const r = renderHost(Host);
      expect(root(r).getAttribute('dir')).toBe('ltr');
      r.instance.dir.set('rtl');
      await flush(r.fixture);
      expect(root(r).getAttribute('dir')).toBe('rtl');
      expect(group(r, 'start').getAttribute('dir')).toBe('rtl');
    });
  });

  describe('12-hour mode (dayPeriod)', () => {
    it('adds an AM/PM segment to each endpoint and composes the period', async () => {
      const r = renderHost(Host);
      r.instance.hourCycle.set(12);
      await flush(r.fixture);
      expect(seg(r, 'start', 'dayPeriod')).not.toBeNull();
      expect(seg(r, 'end', 'dayPeriod')).not.toBeNull();

      await type(r, 'start', 'hour', '09');
      await type(r, 'start', 'minute', '00');
      await key(r, 'start', 'dayPeriod', 'a');
      await type(r, 'end', 'hour', '05');
      await type(r, 'end', 'minute', '30');
      await key(r, 'end', 'dayPeriod', 'p');
      const range = r.instance.value()!;
      expect(adapter.getHours(range.start)).toBe(9);
      expect(adapter.getHours(range.end)).toBe(17);
      expect(adapter.getMinutes(range.end)).toBe(30);
    });
  });

  describe('second granularity', () => {
    it('appends a second segment to each endpoint', async () => {
      const r = renderHost(Host);
      r.instance.granularity.set('second');
      await flush(r.fixture);
      expect(seg(r, 'start', 'second')).not.toBeNull();
      expect(seg(r, 'end', 'second')).not.toBeNull();
      expect(seg(r, 'start', 'second').getAttribute('aria-valuemax')).toBe('59');
    });
  });

  describe('localized labels via provideForTimeRangeFieldDefaults', () => {
    @Component({
      imports: [
        ForTimeRangeField,
        ForTimeRangeFieldStart,
        ForTimeRangeFieldEnd,
        ForTimeRangeFieldSegment,
      ],
      providers: [
        ...provideNativeDateAdapter(),
        ...provideForTimeRangeFieldDefaults({
          startLabel: 'Desde',
          endLabel: 'Hasta',
          segmentLabels: { hour: 'hora' },
        }),
      ],
      template: `
        <div forTimeRangeField [locale]="'en-US'" [hourCycle]="24">
          <div forTimeRangeFieldStart data-testid="start-group" #start="forTimeRangeFieldStart">
            @for (seg of start.segments(); track seg.id) {
              @if (!seg.isLiteral) {
                <span
                  forTimeRangeFieldSegment
                  [segment]="seg.type!"
                  [attr.data-testid]="'start-' + seg.type"
                ></span>
              }
            }
          </div>
          <div forTimeRangeFieldEnd data-testid="end-group" #end="forTimeRangeFieldEnd">
            @for (seg of end.segments(); track seg.id) {
              @if (!seg.isLiteral) {
                <span
                  forTimeRangeFieldSegment
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
      expect(host.querySelector('[data-testid="start-hour"]')!.getAttribute('aria-label')).toBe(
        'hora',
      );
      expect(host.querySelector('[data-testid="start-minute"]')!.getAttribute('aria-label')).toBe(
        'minute',
      );
    });
  });

  describe('Signal Forms via [formField]', () => {
    interface Schedule {
      hours: CalendarDateRange<Date> | null;
    }

    @Component({
      imports: [
        ForTimeRangeField,
        ForTimeRangeFieldStart,
        ForTimeRangeFieldEnd,
        ForTimeRangeFieldSegment,
        FormField,
      ],
      providers: [...provideNativeDateAdapter()],
      template: `
        <div forTimeRangeField [formField]="schedule.hours" [locale]="'en-US'" [hourCycle]="24">
          <div forTimeRangeFieldStart data-testid="start-group" #start="forTimeRangeFieldStart">
            @for (seg of start.segments(); track seg.id) {
              @if (!seg.isLiteral) {
                <span
                  forTimeRangeFieldSegment
                  [segment]="seg.type!"
                  [attr.data-testid]="'start-' + seg.type"
                ></span>
              }
            }
          </div>
          <div forTimeRangeFieldEnd data-testid="end-group" #end="forTimeRangeFieldEnd">
            @for (seg of end.segments(); track seg.id) {
              @if (!seg.isLiteral) {
                <span
                  forTimeRangeFieldSegment
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
      readonly model = signal<Schedule>({ hours: null });
      readonly schedule = form(this.model, (s) => {
        requiredRule(s.hours);
      });
    }

    type FR = RenderResult<FormHost>;
    const fseg = (r: FR, id: string) => r.query(`[data-testid="${id}"]`)!;
    const fillEndpoint = async (r: FR, which: Endpoint, h: string, m: string) => {
      for (const digit of h) pressKey(fseg(r, `${which}-hour`), digit);
      for (const digit of m) pressKey(fseg(r, `${which}-minute`), digit);
      await flush(r.fixture);
    };

    it('flows schema-driven required into aria-required', async () => {
      const r = renderHost(FormHost);
      await flush(r.fixture);
      expect(r.query('[forTimeRangeField]')!.getAttribute('aria-required')).toBe('true');
    });

    it('two-way binds the composed range with the field', async () => {
      const r = renderHost(FormHost);
      await fillEndpoint(r, 'start', '09', '00');
      await fillEndpoint(r, 'end', '17', '30');
      const hours = r.instance.model().hours!;
      expect(adapter.getHours(hours.start)).toBe(9);
      expect(adapter.getHours(hours.end)).toBe(17);
      expect(adapter.getMinutes(hours.end)).toBe(30);
    });
  });

  describe('time-capable adapter requirement', () => {
    it('throws under a day-only adapter', () => {
      @Component({
        imports: [ForTimeRangeField, ForTimeRangeFieldStart, ForTimeRangeFieldSegment],
        providers: [...provideInternationalizedDateAdapter()],
        template: `
          <div forTimeRangeField>
            <div forTimeRangeFieldStart #start="forTimeRangeFieldStart">
              @for (seg of start.segments(); track seg.id) {
                @if (!seg.isLiteral) {
                  <span forTimeRangeFieldSegment [segment]="seg.type!"></span>
                }
              }
            </div>
          </div>
        `,
      })
      class DayOnlyHost {}

      expect(() => renderHost(DayOnlyHost)).toThrow(
        /\[forty-cdk\/date-adapter\] ForTimeRangeField requires a time-capable DateAdapter/,
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

      const rootEl = host.querySelector('[forTimeRangeField]')!;
      expect(rootEl.getAttribute('data-empty')).toBe('');

      fixture.componentInstance.value.set({
        start: new Date(2026, 0, 9, 8, 5),
        end: new Date(2026, 0, 9, 18, 45),
      });
      await flush(fixture);
      expect(sg('start-hour').textContent?.trim()).toBe('08');
      expect(sg('start-minute').textContent?.trim()).toBe('05');
      expect(sg('end-hour').textContent?.trim()).toBe('18');
      expect(sg('end-minute').textContent?.trim()).toBe('45');
      expect(rootEl.getAttribute('data-empty')).toBeNull();

      fixture.componentInstance.value.set(null);
      await flush(fixture);
      expect(sg('start-hour').textContent?.trim()).toBe('hh');
      expect(sg('end-hour').textContent?.trim()).toBe('hh');
      expect(rootEl.getAttribute('data-empty')).toBe('');
    });
  });
});
