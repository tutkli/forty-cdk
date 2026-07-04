import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { form, FormField, required as requiredRule } from '@angular/forms/signals';
import { CalendarDateTime } from '@internationalized/date';

import { flush, pressKey, renderHost, type RenderResult } from '../../src/test-utils';
import {
  InternationalizedDateTimeAdapter,
  provideInternationalizedDateAdapter,
  provideInternationalizedDateTimeAdapter,
} from 'forty-cdk/internationalized-date';
import { NativeDateAdapter, provideNativeDateAdapter } from 'forty-cdk/calendar';
import { ForDateField } from './date-field';
import { provideForDateFieldDefaults } from './date-field-defaults';
import { ForDateFieldLiteral } from './date-field-literal';
import { ForDateFieldSegment } from './date-field-segment';

const adapter = new NativeDateAdapter();

const marchLongName = adapter.format(adapter.createDate(2001, 3, 1), { month: 'long' });

type Placeholders = Partial<Record<'day' | 'month' | 'year', string>>;

@Component({
  imports: [ForDateField, ForDateFieldSegment, ForDateFieldLiteral],
  providers: [...provideNativeDateAdapter()],
  template: `
    <div
      forDateField
      [(value)]="value"
      [minDate]="minDate()"
      [maxDate]="maxDate()"
      [disabled]="disabled()"
      [readonly]="readonly()"
      [required]="required()"
      [locale]="locale()"
      [placeholder]="placeholder()"
      [ariaLabel]="ariaLabel()"
      [dir]="dir()"
      name="dob"
      #field="forDateField"
    >
      @for (seg of field.segments(); track seg.id) {
        @if (seg.isLiteral) {
          <span forDateFieldLiteral data-testid="literal">{{ seg.text }}</span>
        } @else {
          <span forDateFieldSegment [segment]="seg.type!" [attr.data-testid]="seg.type">{{
            seg.text
          }}</span>
        }
      }
    </div>
  `,
})
class Host {
  readonly value = signal<Date | null>(null);
  readonly minDate = signal<Date | null>(null);
  readonly maxDate = signal<Date | null>(null);
  readonly disabled = signal(false);
  readonly readonly = signal(false);
  readonly required = signal(false);
  readonly locale = signal<string | null>('en-US');
  readonly placeholder = signal<Placeholders>({});
  readonly ariaLabel = signal<string | null>('Date of birth');
  readonly dir = signal<'ltr' | 'rtl'>('ltr');
}

type R = RenderResult<Host>;

const root = (r: R) => r.query('[forDateField]')!;
const seg = (r: R, type: 'day' | 'month' | 'year') => r.query(`[data-testid="${type}"]`)!;
const segmentsInOrder = (r: R) =>
  r.queryAll('[forDateFieldSegment]').map((s) => s.getAttribute('data-testid'));

async function type(r: R, segment: 'day' | 'month' | 'year', digits: string): Promise<void> {
  for (const digit of digits) {
    pressKey(seg(r, segment), digit);
  }
  await flush(r.fixture);
}

async function key(r: R, segment: 'day' | 'month' | 'year', k: string): Promise<void> {
  pressKey(seg(r, segment), k);
  await flush(r.fixture);
}

describe('ForDateField', () => {
  describe('focus (focus-on-error)', () => {
    it('moves focus to the first segment, not the group host', async () => {
      const r = renderHost(Host);
      await r.flush();
      const field = r.fixture.debugElement
        .query(By.directive(ForDateField))
        .injector.get(ForDateField);
      field.focus();
      expect(document.activeElement).toBe(seg(r, 'month'));
    });
  });

  describe('typing buffer on blur (#1150)', () => {
    it('drops a partially typed digit when the segment loses focus', async () => {
      const r = renderHost(Host);
      await type(r, 'day', '1');
      expect(seg(r, 'day').textContent!.trim()).toBe('1');

      seg(r, 'day').dispatchEvent(new FocusEvent('blur'));
      await flush(r.fixture);

      expect(seg(r, 'day').textContent!.trim()).toBe('01');
    });
  });

  describe('structure & ARIA', () => {
    it('renders a role=group with one role=spinbutton per editable segment', () => {
      const r = renderHost(Host);
      expect(root(r).getAttribute('role')).toBe('group');
      const spinbuttons = r.queryAll('[role="spinbutton"]');
      expect(spinbuttons).toHaveLength(3);
    });

    it('reflects ariaLabel on the group, emitting none when null', async () => {
      const r = renderHost(Host);
      expect(root(r).getAttribute('aria-label')).toBe('Date of birth');
      r.instance.ariaLabel.set(null);
      await flush(r.fixture);
      expect(root(r).getAttribute('aria-label')).toBeNull();
    });

    it('labels each segment by its part type by default', () => {
      const r = renderHost(Host);
      expect(seg(r, 'day').getAttribute('aria-label')).toBe('day');
      expect(seg(r, 'month').getAttribute('aria-label')).toBe('month');
      expect(seg(r, 'year').getAttribute('aria-label')).toBe('year');
    });

    it('exposes the value range per segment', () => {
      const r = renderHost(Host);
      expect(seg(r, 'day').getAttribute('aria-valuemin')).toBe('1');
      expect(seg(r, 'day').getAttribute('aria-valuemax')).toBe('31');
      expect(seg(r, 'month').getAttribute('aria-valuemax')).toBe('12');
      expect(seg(r, 'year').getAttribute('aria-valuemax')).toBe('9999');
    });

    it('reports a February day max of 28 while the year is empty', async () => {
      const r = renderHost(Host);
      await type(r, 'month', '02');
      expect(seg(r, 'year').getAttribute('aria-valuenow')).toBeNull();
      expect(seg(r, 'day').getAttribute('aria-valuemax')).toBe('28');
    });

    it('marks literals aria-hidden and keeps them out of the tab order', () => {
      const r = renderHost(Host);
      const literal = r.query('[data-testid="literal"]')!;
      expect(literal.getAttribute('aria-hidden')).toBe('true');
      expect(literal.getAttribute('tabindex')).toBeNull();
    });

    it('shows the placeholder while empty and an overridable one when set', async () => {
      const r = renderHost(Host);
      expect(seg(r, 'day').textContent?.trim()).toBe('dd');
      expect(seg(r, 'month').textContent?.trim()).toBe('mm');
      expect(seg(r, 'year').textContent?.trim()).toBe('yyyy');

      r.instance.placeholder.set({ day: 'DD' });
      await flush(r.fixture);
      expect(seg(r, 'day').textContent?.trim()).toBe('DD');
    });

    it('makes the first segment in locale order the single tab entry', () => {
      const r = renderHost(Host);
      // en-US order is month / day / year.
      expect(seg(r, 'month').getAttribute('tabindex')).toBe('0');
      expect(seg(r, 'day').getAttribute('tabindex')).toBe('-1');
      expect(seg(r, 'year').getAttribute('tabindex')).toBe('-1');
    });
  });

  describe('value composition', () => {
    it('composes a date only once every segment is filled', async () => {
      const r = renderHost(Host);
      await type(r, 'month', '12');
      await type(r, 'day', '05');
      expect(r.instance.value()).toBeNull();
      expect(root(r).getAttribute('data-empty')).toBe('');

      await type(r, 'year', '2026');
      expect(r.instance.value()?.getTime()).toBe(new Date(2026, 11, 5).getTime());
      expect(root(r).getAttribute('data-empty')).toBeNull();
    });

    it('reflects aria-valuenow / valuetext as segments are filled', async () => {
      const r = renderHost(Host);
      expect(seg(r, 'month').getAttribute('aria-valuenow')).toBeNull();

      await type(r, 'month', '03');
      expect(seg(r, 'month').getAttribute('aria-valuenow')).toBe('3');
      expect(seg(r, 'month').getAttribute('aria-valuetext')).toBe(marchLongName);
    });

    it('announces an empty state on every empty numeric segment', async () => {
      const r = renderHost(Host);
      expect(seg(r, 'day').getAttribute('aria-valuenow')).toBeNull();
      expect(seg(r, 'day').getAttribute('aria-valuetext')).toBe('Empty');
      expect(seg(r, 'year').getAttribute('aria-valuetext')).toBe('Empty');
      expect(seg(r, 'month').getAttribute('aria-valuetext')).toBe('Empty');

      await type(r, 'day', '05');
      expect(seg(r, 'day').getAttribute('aria-valuenow')).toBe('5');
      expect(seg(r, 'day').getAttribute('aria-valuetext')).toBeNull();

      await type(r, 'month', '03');
      expect(seg(r, 'month').getAttribute('aria-valuetext')).toBe(marchLongName);
    });

    it('rehydrates segments from an external value write', async () => {
      const r = renderHost(Host);
      r.instance.value.set(new Date(2026, 11, 5));
      await flush(r.fixture);
      expect(seg(r, 'month').textContent?.trim()).toBe('12');
      expect(seg(r, 'day').textContent?.trim()).toBe('05');
      expect(seg(r, 'year').textContent?.trim()).toBe('2026');
    });

    it('clears the value to null when a filled segment is cleared', async () => {
      const r = renderHost(Host);
      r.instance.value.set(new Date(2026, 11, 5));
      await flush(r.fixture);
      await key(r, 'day', 'Backspace');
      expect(r.instance.value()).toBeNull();
      expect(seg(r, 'day').textContent?.trim()).toBe('dd');
    });

    it('clamps the day to the month length', async () => {
      const r = renderHost(Host);
      r.instance.value.set(new Date(2025, 0, 31)); // 31 Jan 2025
      await flush(r.fixture);
      await key(r, 'month', 'ArrowUp'); // → February
      const value = r.instance.value()!;
      expect(adapter.getMonth(value)).toBe(2);
      expect(adapter.getDate(value)).toBe(28); // clamped, 2025 is not a leap year
    });

    it('re-clamps the day segment so aria-valuenow never exceeds aria-valuemax on month step', async () => {
      // Incomplete field (no year): the value stays null, so the day part is
      // not re-derived from a clamped composed value — the segment itself must
      // be re-clamped on the month step to keep the spinbutton invariant.
      const r = renderHost(Host);
      await type(r, 'day', '31');
      await type(r, 'month', '01'); // 31 Jan
      expect(seg(r, 'day').getAttribute('aria-valuenow')).toBe('31');

      await key(r, 'month', 'ArrowUp'); // → February (28 days, empty year)

      const day = seg(r, 'day');
      const now = Number(day.getAttribute('aria-valuenow'));
      const max = Number(day.getAttribute('aria-valuemax'));
      expect(max).toBe(28);
      expect(now).toBe(28);
      expect(now).toBeLessThanOrEqual(max);
      expect(day.textContent?.trim()).toBe('28');
      // Field is still incomplete, so no value is composed.
      expect(r.instance.value()).toBeNull();
    });

    it('re-clamps the day on Home/End jump of the month into a shorter month', async () => {
      const r = renderHost(Host);
      await type(r, 'day', '31');
      await type(r, 'month', '01'); // 31 Jan, year empty

      await key(r, 'month', 'End'); // → December (31 days)
      expect(seg(r, 'day').getAttribute('aria-valuenow')).toBe('31');

      await type(r, 'month', '02'); // February (28 days, empty year)
      const day = seg(r, 'day');
      expect(Number(day.getAttribute('aria-valuenow'))).toBeLessThanOrEqual(
        Number(day.getAttribute('aria-valuemax')),
      );
      expect(day.getAttribute('aria-valuenow')).toBe('28');
    });

    it('clamps a composed value down to maxDate', async () => {
      const r = renderHost(Host);
      r.instance.maxDate.set(new Date(2026, 11, 1));
      await flush(r.fixture);
      await type(r, 'month', '12');
      await type(r, 'day', '05');
      await type(r, 'year', '2026');
      expect(r.instance.value()?.getTime()).toBe(new Date(2026, 11, 1).getTime());
    });

    it('keeps every typed segment when an intermediate year composition falls below minDate (#1129)', async () => {
      const r = renderHost(Host);
      r.instance.minDate.set(new Date(1900, 0, 1));
      await flush(r.fixture);
      await type(r, 'day', '15');
      await type(r, 'month', '06');
      await type(r, 'year', '1990');
      const value = r.instance.value()!;
      expect(adapter.getYear(value)).toBe(1990);
      expect(adapter.getMonth(value)).toBe(6);
      expect(adapter.getDate(value)).toBe(15);
    });

    it('composes the same in-range date when the year is typed first (#1129)', async () => {
      const r = renderHost(Host);
      r.instance.minDate.set(new Date(1900, 0, 1));
      await flush(r.fixture);
      await type(r, 'year', '1990');
      await type(r, 'day', '15');
      await type(r, 'month', '06');
      const value = r.instance.value()!;
      expect(adapter.getYear(value)).toBe(1990);
      expect(adapter.getMonth(value)).toBe(6);
      expect(adapter.getDate(value)).toBe(15);
    });

    it('clamps a fully entered below-min date up to minDate', async () => {
      const r = renderHost(Host);
      r.instance.minDate.set(new Date(2026, 11, 10));
      await flush(r.fixture);
      await type(r, 'month', '12');
      await type(r, 'day', '05');
      await type(r, 'year', '2026');
      expect(r.instance.value()?.getTime()).toBe(new Date(2026, 11, 10).getTime());
    });
  });

  describe('keyboard editing', () => {
    it('steps the segment with ArrowUp / ArrowDown', async () => {
      const r = renderHost(Host);
      r.instance.value.set(new Date(2026, 5, 15));
      await flush(r.fixture);
      await key(r, 'day', 'ArrowUp');
      expect(adapter.getDate(r.instance.value()!)).toBe(16);
      await key(r, 'day', 'ArrowDown');
      await key(r, 'day', 'ArrowDown');
      expect(adapter.getDate(r.instance.value()!)).toBe(14);
    });

    it('wraps day stepping within the month', async () => {
      const r = renderHost(Host);
      r.instance.value.set(new Date(2026, 5, 30)); // 30 Jun (June has 30 days)
      await flush(r.fixture);
      await key(r, 'day', 'ArrowUp'); // wraps to 1
      expect(adapter.getDate(r.instance.value()!)).toBe(1);
    });

    it('seeds an empty segment from today on first step', async () => {
      const r = renderHost(Host);
      const todayMonth = adapter.getMonth(adapter.today());
      await key(r, 'month', 'ArrowUp');
      expect(seg(r, 'month').getAttribute('aria-valuenow')).toBe(String(todayMonth));
    });

    it('jumps to the segment bounds with Home / End', async () => {
      const r = renderHost(Host);
      r.instance.value.set(new Date(2026, 5, 15));
      await flush(r.fixture);
      await key(r, 'day', 'Home');
      expect(adapter.getDate(r.instance.value()!)).toBe(1);
      await key(r, 'day', 'End');
      expect(adapter.getDate(r.instance.value()!)).toBe(30); // June length
    });

    it('restarts the digit buffer when the next digit would overflow', async () => {
      const r = renderHost(Host);
      await type(r, 'month', '13'); // 1 then 3 → 13 > 12, restarts at 3
      expect(seg(r, 'month').getAttribute('aria-valuenow')).toBe('3');
    });
  });

  describe('disabled & readonly', () => {
    it('disables the field: segments leave the tab order and editing is blocked', async () => {
      const r = renderHost(Host);
      r.instance.disabled.set(true);
      await flush(r.fixture);
      expect(root(r).getAttribute('aria-disabled')).toBe('true');
      expect(root(r).getAttribute('data-disabled')).toBe('');
      expect(seg(r, 'month').getAttribute('tabindex')).toBe('-1');

      await type(r, 'month', '12');
      expect(seg(r, 'month').getAttribute('aria-valuenow')).toBeNull();
    });

    it('read-only field reflects aria-readonly and blocks editing', async () => {
      const r = renderHost(Host);
      r.instance.value.set(new Date(2026, 5, 15));
      r.instance.readonly.set(true);
      await flush(r.fixture);
      expect(root(r).getAttribute('aria-readonly')).toBe('true');
      await key(r, 'day', 'ArrowUp');
      expect(adapter.getDate(r.instance.value()!)).toBe(15);
    });
  });

  describe('locale ordering & direction', () => {
    it('orders segments and separators per the locale (en-US)', () => {
      const r = renderHost(Host);
      expect(segmentsInOrder(r)).toEqual(['month', 'day', 'year']);
      expect(r.query('[data-testid="literal"]')!.textContent?.trim()).toBe('/');
    });

    it('orders segments and separators per the locale (de-DE)', async () => {
      const r = renderHost(Host);
      r.instance.locale.set('de-DE');
      await flush(r.fixture);
      expect(segmentsInOrder(r)).toEqual(['day', 'month', 'year']);
      expect(r.query('[data-testid="literal"]')!.textContent?.trim()).toBe('.');
    });

    it('reflects the resolved writing direction on the host', async () => {
      const r = renderHost(Host);
      expect(root(r).getAttribute('dir')).toBe('ltr');
      r.instance.dir.set('rtl');
      await flush(r.fixture);
      expect(root(r).getAttribute('dir')).toBe('rtl');
    });
  });

  describe('Signal Forms via [formField]', () => {
    interface Profile {
      dob: Date | null;
    }

    @Component({
      imports: [ForDateField, ForDateFieldSegment, ForDateFieldLiteral, FormField],
      providers: [...provideNativeDateAdapter()],
      template: `
        <div forDateField [formField]="profile.dob" [locale]="'en-US'" #field="forDateField">
          @for (seg of field.segments(); track seg.id) {
            @if (seg.isLiteral) {
              <span forDateFieldLiteral>{{ seg.text }}</span>
            } @else {
              <span forDateFieldSegment [segment]="seg.type!" [attr.data-testid]="seg.type">{{
                seg.text
              }}</span>
            }
          }
        </div>
      `,
    })
    class FormHost {
      readonly model = signal<Profile>({ dob: null });
      readonly profile = form(this.model, (p) => {
        requiredRule(p.dob);
      });
    }

    it('two-way binds the composed value with the field', async () => {
      const r = renderHost(FormHost);
      const segOf = (t: string) => r.query(`[data-testid="${t}"]`)!;
      for (const d of '12') pressKey(segOf('month'), d);
      for (const d of '05') pressKey(segOf('day'), d);
      for (const d of '2026') pressKey(segOf('year'), d);
      await flush(r.fixture);
      expect(r.instance.model().dob?.getTime()).toBe(new Date(2026, 11, 5).getTime());
    });

    it('flows schema-driven required into aria-required', async () => {
      const r = renderHost(FormHost);
      await flush(r.fixture);
      expect(r.query('[forDateField]')!.getAttribute('aria-required')).toBe('true');
    });
  });

  describe('date-time (granularity > day)', () => {
    @Component({
      imports: [ForDateField, ForDateFieldSegment, ForDateFieldLiteral],
      providers: [...provideNativeDateAdapter()],
      template: `
        <div
          forDateField
          [(value)]="value"
          [granularity]="granularity()"
          [hourCycle]="hourCycle()"
          [locale]="'en-US'"
          #field="forDateField"
        >
          @for (seg of field.segments(); track seg.id) {
            @if (seg.isLiteral) {
              <span forDateFieldLiteral>{{ seg.text }}</span>
            } @else {
              <span forDateFieldSegment [segment]="seg.type!" [attr.data-testid]="seg.type">{{
                seg.text
              }}</span>
            }
          }
        </div>
      `,
    })
    class DateTimeHost {
      readonly value = signal<Date | null>(null);
      readonly granularity = signal<'minute' | 'second'>('minute');
      readonly hourCycle = signal<12 | 24>(24);
    }

    type DR = RenderResult<DateTimeHost>;
    const dseg = (r: DR, type: string) => r.query(`[data-testid="${type}"]`)!;
    const order = (r: DR) =>
      r.queryAll('[forDateFieldSegment]').map((s) => s.getAttribute('data-testid'));
    const typeInto = async (r: DR, type: string, digits: string) => {
      for (const d of digits) pressKey(dseg(r, type), d);
      await flush(r.fixture);
    };

    it('appends the time segments after the date segments (en-US, 24-hour)', () => {
      const r = renderHost(DateTimeHost);
      expect(order(r)).toEqual(['month', 'day', 'year', 'hour', 'minute']);
    });

    it('composes a date-time only once every segment is filled', async () => {
      const r = renderHost(DateTimeHost);
      await typeInto(r, 'month', '12');
      await typeInto(r, 'day', '05');
      await typeInto(r, 'year', '2026');
      expect(r.instance.value()).toBeNull();

      await typeInto(r, 'hour', '14');
      await typeInto(r, 'minute', '30');
      const value = r.instance.value()!;
      expect(adapter.getYear(value)).toBe(2026);
      expect(adapter.getMonth(value)).toBe(12);
      expect(adapter.getDate(value)).toBe(5);
      expect(adapter.getHours(value)).toBe(14);
      expect(adapter.getMinutes(value)).toBe(30);
    });

    it('steps the hour without disturbing the date', async () => {
      const r = renderHost(DateTimeHost);
      r.instance.value.set(new Date(2026, 5, 15, 9, 30));
      await flush(r.fixture);
      pressKey(dseg(r, 'hour'), 'ArrowUp');
      await flush(r.fixture);
      const value = r.instance.value()!;
      expect(adapter.getHours(value)).toBe(10);
      expect(adapter.getDate(value)).toBe(15);
    });

    it('exposes a second segment at second granularity', async () => {
      const r = renderHost(DateTimeHost);
      r.instance.granularity.set('second');
      await flush(r.fixture);
      expect(order(r)).toEqual(['month', 'day', 'year', 'hour', 'minute', 'second']);
    });

    it('adds an AM/PM segment in 12-hour mode and a/p sets the period', async () => {
      const r = renderHost(DateTimeHost);
      r.instance.hourCycle.set(12);
      r.instance.value.set(new Date(2026, 5, 15, 9, 30));
      await flush(r.fixture);
      expect(order(r)).toEqual(['month', 'day', 'year', 'hour', 'minute', 'dayPeriod']);
      expect(dseg(r, 'hour').textContent?.trim()).toBe('09');
      expect(dseg(r, 'dayPeriod').textContent?.trim()).toBe('AM');

      pressKey(dseg(r, 'dayPeriod'), 'p');
      await flush(r.fixture);
      expect(adapter.getHours(r.instance.value()!)).toBe(21);
    });

    it('surfaces the time-capable-adapter requirement (not swallowed) under a day-only adapter (#590 F2)', () => {
      @Component({
        imports: [ForDateField, ForDateFieldSegment],
        providers: [...provideInternationalizedDateAdapter()],
        template: `
          <div forDateField granularity="minute" #field="forDateField">
            @for (seg of field.segments(); track seg.id) {
              @if (!seg.isLiteral) {
                <span forDateFieldSegment [segment]="seg.type!"></span>
              }
            }
          </div>
        `,
      })
      class DayOnlyHost {}

      // The eager-validation effect raises during change detection — the throw
      // is observed (propagated out of the initial render), never swallowed.
      expect(() => renderHost(DayOnlyHost)).toThrow(
        /\[forty-cdk\/date-adapter\] ForDateField requires a time-capable DateAdapter/,
      );
    });
  });

  describe('segment aria-labels (#513)', () => {
    @Component({
      imports: [ForDateField, ForDateFieldSegment, ForDateFieldLiteral],
      providers: [...provideNativeDateAdapter()],
      template: `
        <div
          forDateField
          [granularity]="'minute'"
          [hourCycle]="12"
          [locale]="'en-US'"
          #field="forDateField"
        >
          @for (seg of field.segments(); track seg.id) {
            @if (seg.isLiteral) {
              <span forDateFieldLiteral>{{ seg.text }}</span>
            } @else {
              <span
                forDateFieldSegment
                [segment]="seg.type!"
                [ariaLabel]="seg.type === 'day' ? customDay() : null"
                [attr.data-testid]="seg.type"
                >{{ seg.text }}</span
              >
            }
          }
        </div>
      `,
    })
    class LabelsHost {
      readonly customDay = signal<string | null>(null);
    }

    @Component({
      imports: [ForDateField, ForDateFieldSegment, ForDateFieldLiteral],
      providers: [
        ...provideNativeDateAdapter(),
        ...provideForDateFieldDefaults({
          segmentLabels: { dayPeriod: 'Día/Noche', day: 'día' },
        }),
      ],
      template: `
        <div
          forDateField
          [granularity]="'minute'"
          [hourCycle]="12"
          [locale]="'en-US'"
          #field="forDateField"
        >
          @for (seg of field.segments(); track seg.id) {
            @if (seg.isLiteral) {
              <span forDateFieldLiteral>{{ seg.text }}</span>
            } @else {
              <span forDateFieldSegment [segment]="seg.type!" [attr.data-testid]="seg.type">{{
                seg.text
              }}</span>
            }
          }
        </div>
      `,
    })
    class LocalizedHost {}

    const lseg = (el: HTMLElement, type: string) => el.querySelector(`[data-testid="${type}"]`)!;

    it('labels an unlabelled AM/PM segment "AM/PM", never the raw "dayPeriod" token', () => {
      const r = renderHost(LabelsHost);
      const dayPeriod = lseg(r.fixture.nativeElement, 'dayPeriod');
      expect(dayPeriod.getAttribute('aria-label')).toBe('AM/PM');
      expect(dayPeriod.getAttribute('aria-label')).not.toBe('dayPeriod');
    });

    it('labels the numeric segments by their part name by default', () => {
      const r = renderHost(LabelsHost);
      const host = r.fixture.nativeElement;
      expect(lseg(host, 'month').getAttribute('aria-label')).toBe('month');
      expect(lseg(host, 'day').getAttribute('aria-label')).toBe('day');
      expect(lseg(host, 'year').getAttribute('aria-label')).toBe('year');
      expect(lseg(host, 'hour').getAttribute('aria-label')).toBe('hour');
      expect(lseg(host, 'minute').getAttribute('aria-label')).toBe('minute');
    });

    it('lets an explicit ariaLabel win over the default', async () => {
      const r = renderHost(LabelsHost);
      const day = lseg(r.fixture.nativeElement, 'day');
      expect(day.getAttribute('aria-label')).toBe('day');
      r.instance.customDay.set('Day of birth');
      await flush(r.fixture);
      expect(day.getAttribute('aria-label')).toBe('Day of birth');
    });

    it('localizes labels via provideForDateFieldDefaults, keeping unset keys at the default', () => {
      const r = renderHost(LocalizedHost);
      const host = r.fixture.nativeElement;
      expect(lseg(host, 'dayPeriod').getAttribute('aria-label')).toBe('Día/Noche');
      expect(lseg(host, 'day').getAttribute('aria-label')).toBe('día');
      expect(lseg(host, 'month').getAttribute('aria-label')).toBe('month');
      expect(lseg(host, 'year').getAttribute('aria-label')).toBe('year');
    });
  });

  describe('date-time bounds clamping (#501)', () => {
    @Component({
      selector: 'native-date-time-host',
      imports: [ForDateField, ForDateFieldSegment, ForDateFieldLiteral],
      providers: [...provideNativeDateAdapter()],
      template: `
        <div
          forDateField
          [(value)]="value"
          [granularity]="'minute'"
          [minDate]="minDate()"
          [maxDate]="maxDate()"
          [locale]="'en-US'"
          #field="forDateField"
        >
          @for (seg of field.segments(); track seg.id) {
            @if (seg.isLiteral) {
              <span forDateFieldLiteral>{{ seg.text }}</span>
            } @else {
              <span forDateFieldSegment [segment]="seg.type!" [attr.data-testid]="seg.type">{{
                seg.text
              }}</span>
            }
          }
        </div>
      `,
    })
    class NativeDateTimeHost {
      readonly value = signal<Date | null>(null);
      readonly minDate = signal<Date | null>(null);
      readonly maxDate = signal<Date | null>(null);
    }

    @Component({
      selector: 'intl-date-time-host',
      imports: [ForDateField, ForDateFieldSegment, ForDateFieldLiteral],
      providers: [...provideInternationalizedDateTimeAdapter()],
      template: `
        <div
          forDateField
          [(value)]="value"
          [granularity]="'minute'"
          [minDate]="minDate()"
          [maxDate]="maxDate()"
          [locale]="'en-US'"
          #field="forDateField"
        >
          @for (seg of field.segments(); track seg.id) {
            @if (seg.isLiteral) {
              <span forDateFieldLiteral>{{ seg.text }}</span>
            } @else {
              <span forDateFieldSegment [segment]="seg.type!" [attr.data-testid]="seg.type">{{
                seg.text
              }}</span>
            }
          }
        </div>
      `,
    })
    class IntlDateTimeHost {
      readonly value = signal<CalendarDateTime | null>(null);
      readonly minDate = signal<CalendarDateTime | null>(null);
      readonly maxDate = signal<CalendarDateTime | null>(null);
    }

    const native = new NativeDateAdapter();
    const intl = new InternationalizedDateTimeAdapter();

    const nseg = <H>(r: RenderResult<H>, type: string) => r.query(`[data-testid="${type}"]`)!;
    const compose = async <H>(r: RenderResult<H>) => {
      const parts: [string, string][] = [
        ['month', '06'],
        ['day', '20'],
        ['year', '2026'],
        ['hour', '08'],
        ['minute', '00'],
      ];
      for (const [type, digits] of parts) {
        for (const d of digits) pressKey(nseg(r, type), d);
      }
      await flush(r.fixture);
    };

    it('clamps a sub-min time up to minDate on the native adapter (full instant)', async () => {
      const r = renderHost(NativeDateTimeHost);
      r.instance.minDate.set(new Date(2026, 5, 20, 9, 0));
      await flush(r.fixture);
      await compose(r);
      const value = r.instance.value()!;
      expect(native.getDate(value)).toBe(20);
      expect(native.getHours(value)).toBe(9);
      expect(native.getMinutes(value)).toBe(0);
    });

    it('clamps a sub-min time up to minDate on the internationalized date-time adapter', async () => {
      const r = renderHost(IntlDateTimeHost);
      r.instance.minDate.set(new CalendarDateTime(2026, 6, 20, 9, 0));
      await flush(r.fixture);
      await compose(r);
      const value = r.instance.value()!;
      expect(intl.getDate(value)).toBe(20);
      expect(intl.getHours(value)).toBe(9);
      expect(intl.getMinutes(value)).toBe(0);
    });

    it('clamps a past-max time down to maxDate on the native adapter (full instant)', async () => {
      const r = renderHost(NativeDateTimeHost);
      r.instance.value.set(new Date(2026, 5, 20, 8, 0));
      r.instance.maxDate.set(new Date(2026, 5, 20, 7, 0));
      await flush(r.fixture);
      pressKey(nseg(r, 'hour'), 'ArrowUp');
      await flush(r.fixture);
      const value = r.instance.value()!;
      expect(native.getHours(value)).toBe(7);
      expect(native.getMinutes(value)).toBe(0);
    });
  });

  describe('zoneless reactivity', () => {
    it('reflects an external value write without Zone.js', async () => {
      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });
      const fixture = TestBed.createComponent(Host);
      await flush(fixture);
      const host = fixture.nativeElement as HTMLElement;
      const segEl = (type: string) => host.querySelector(`[data-testid="${type}"]`)!;

      fixture.componentInstance.value.set(new Date(2026, 0, 9));
      await flush(fixture);
      expect(segEl('month').textContent?.trim()).toBe('01');
      expect(segEl('day').textContent?.trim()).toBe('09');
      expect(segEl('year').getAttribute('aria-valuenow')).toBe('2026');

      fixture.componentInstance.value.set(null);
      await flush(fixture);
      expect(segEl('day').textContent?.trim()).toBe('dd');
      expect(host.querySelector('[forDateField]')!.getAttribute('data-empty')).toBe('');
    });
  });
});
