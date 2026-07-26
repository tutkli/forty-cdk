import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { form, FormField, required as requiredRule } from '@angular/forms/signals';

import { flush, pressKey, renderHost, type RenderResult } from '../../src/test-utils';
import {
  assertFormControlContract,
  type FormControlMountResult,
} from '../../src/test-utils/contract';
import { NativeDateAdapter, provideNativeDateAdapter } from 'forty-cdk/calendar';
import type { TimeSegmentType } from './build-time-segments';
import { ForTimeField } from './time-field';
import { provideForTimeFieldDefaults } from './time-field-defaults';
import { ForTimeFieldLiteral } from './time-field-literal';
import { ForTimeFieldSegment } from './time-field-segment';

const adapter = new NativeDateAdapter();

type Placeholders = Partial<Record<TimeSegmentType, string>>;

@Component({
  imports: [ForTimeField, ForTimeFieldSegment, ForTimeFieldLiteral],
  providers: [...provideNativeDateAdapter()],
  template: `
    <div
      forTimeField
      [(value)]="value"
      [minTime]="minTime()"
      [maxTime]="maxTime()"
      [hourCycle]="hourCycle()"
      [granularity]="granularity()"
      [disabled]="disabled()"
      [readonly]="readonly()"
      [required]="required()"
      [locale]="locale()"
      [placeholder]="placeholder()"
      [ariaLabel]="ariaLabel()"
      [dir]="dir()"
      name="appt"
      #field="forTimeField"
    >
      @for (seg of field.segments(); track seg.id) {
        @if (seg.isLiteral) {
          <span forTimeFieldLiteral data-testid="literal">{{ seg.text }}</span>
        } @else {
          <span forTimeFieldSegment [segment]="seg.type!" [attr.data-testid]="seg.type">{{
            seg.text
          }}</span>
        }
      }
    </div>
  `,
})
class Host {
  readonly value = signal<Date | null>(null);
  readonly minTime = signal<Date | null>(null);
  readonly maxTime = signal<Date | null>(null);
  readonly hourCycle = signal<12 | 24 | null>(24);
  readonly granularity = signal<'hour' | 'minute' | 'second'>('minute');
  readonly disabled = signal(false);
  readonly readonly = signal(false);
  readonly required = signal(false);
  readonly locale = signal<string | null>('en-US');
  readonly placeholder = signal<Placeholders>({});
  readonly ariaLabel = signal<string | null>('Appointment time');
  readonly dir = signal<'ltr' | 'rtl'>('ltr');
}

@Component({
  imports: [ForTimeField, ForTimeFieldSegment, ForTimeFieldLiteral],
  providers: [...provideNativeDateAdapter()],
  template: `
    <div
      forTimeField
      [(value)]="value"
      [readonly]="isReadonly()"
      [required]="isRequired()"
      [invalid]="isInvalid()"
      [(touched)]="isTouched"
      [dirty]="isDirty()"
      #field="forTimeField"
    >
      @for (s of field.segments(); track s.id) {
        @if (s.isLiteral) {
          <span forTimeFieldLiteral>{{ s.text }}</span>
        } @else {
          <span forTimeFieldSegment [segment]="s.type!">{{ s.text }}</span>
        }
      }
    </div>
  `,
})
class TimeFieldFormControlHost {
  readonly value = signal<Date | null>(null);
  readonly isReadonly = signal(false);
  readonly isRequired = signal(false);
  readonly isInvalid = signal(false);
  readonly isTouched = signal(false);
  readonly isDirty = signal(false);
}

type R = RenderResult<Host>;

const root = (r: R) => r.query('[forTimeField]')!;
const seg = (r: R, type: TimeSegmentType) => r.query(`[data-testid="${type}"]`)!;
const segmentsInOrder = (r: R) =>
  r.queryAll('[forTimeFieldSegment]').map((s) => s.getAttribute('data-testid'));

async function type(r: R, segment: TimeSegmentType, digits: string): Promise<void> {
  for (const digit of digits) {
    pressKey(seg(r, segment), digit);
  }
  await flush(r.fixture);
}

async function key(r: R, segment: TimeSegmentType, k: string): Promise<void> {
  pressKey(seg(r, segment), k);
  await flush(r.fixture);
}

describe('ForTimeField', () => {
  assertFormControlContract(
    () => {
      const r = renderHost(TimeFieldFormControlHost);
      const result: FormControlMountResult = {
        control: r.query<HTMLElement>('[forTimeField]')!,
        flush: r.flush,
        setFlag: (flag, value) => {
          switch (flag) {
            case 'readonly':
              r.instance.isReadonly.set(value);
              return;
            case 'required':
              r.instance.isRequired.set(value);
              return;
            case 'invalid':
              r.instance.isInvalid.set(value);
              return;
            case 'touched':
              r.instance.isTouched.set(value);
              return;
            case 'dirty':
              r.instance.isDirty.set(value);
              return;
          }
        },
      };
      return result;
    },
    {
      flags: ['readonly', 'required', 'invalid', 'touched', 'dirty'],
      roleSupportsAriaReadonly: false,
    },
  );

  describe('focus (focus-on-error)', () => {
    it('moves focus to the first segment, not the group host', async () => {
      const r = renderHost(Host);
      await r.flush();
      const field = r.fixture.debugElement
        .query(By.directive(ForTimeField))
        .injector.get(ForTimeField);
      field.focus();
      expect(document.activeElement).toBe(seg(r, 'hour'));
    });
  });

  describe('structure & ARIA', () => {
    it('renders a role=group with one role=spinbutton per editable segment', () => {
      const r = renderHost(Host);
      expect(root(r).getAttribute('role')).toBe('group');
      // 24-hour, minute granularity → hour + minute.
      expect(r.queryAll('[role="spinbutton"]')).toHaveLength(2);
    });

    it('reflects ariaLabel on the group, emitting none when null', async () => {
      const r = renderHost(Host);
      expect(root(r).getAttribute('aria-label')).toBe('Appointment time');
      r.instance.ariaLabel.set(null);
      await flush(r.fixture);
      expect(root(r).getAttribute('aria-label')).toBeNull();
    });

    it('labels each segment by its part type by default', () => {
      const r = renderHost(Host);
      expect(seg(r, 'hour').getAttribute('aria-label')).toBe('hour');
      expect(seg(r, 'minute').getAttribute('aria-label')).toBe('minute');
    });

    it('exposes the value range per segment (24-hour)', () => {
      const r = renderHost(Host);
      expect(seg(r, 'hour').getAttribute('aria-valuemin')).toBe('0');
      expect(seg(r, 'hour').getAttribute('aria-valuemax')).toBe('23');
      expect(seg(r, 'minute').getAttribute('aria-valuemin')).toBe('0');
      expect(seg(r, 'minute').getAttribute('aria-valuemax')).toBe('59');
    });

    it('marks literals aria-hidden and keeps them out of the tab order', () => {
      const r = renderHost(Host);
      const literal = r.query('[data-testid="literal"]')!;
      expect(literal.getAttribute('aria-hidden')).toBe('true');
      expect(literal.getAttribute('tabindex')).toBeNull();
    });

    it('shows the placeholder while empty and an overridable one when set', async () => {
      const r = renderHost(Host);
      expect(seg(r, 'hour').textContent?.trim()).toBe('hh');
      expect(seg(r, 'minute').textContent?.trim()).toBe('mm');

      r.instance.placeholder.set({ hour: 'HH' });
      await flush(r.fixture);
      expect(seg(r, 'hour').textContent?.trim()).toBe('HH');
    });

    it('makes the first segment in locale order the single tab entry', () => {
      const r = renderHost(Host);
      expect(seg(r, 'hour').getAttribute('tabindex')).toBe('0');
      expect(seg(r, 'minute').getAttribute('tabindex')).toBe('-1');
    });

    it('renders a second segment at second granularity', async () => {
      const r = renderHost(Host);
      r.instance.granularity.set('second');
      await flush(r.fixture);
      expect(segmentsInOrder(r)).toEqual(['hour', 'minute', 'second']);
      expect(seg(r, 'second').getAttribute('aria-valuemax')).toBe('59');
    });
  });

  describe('value composition', () => {
    it('composes a time only once every visible segment is filled', async () => {
      const r = renderHost(Host);
      await type(r, 'hour', '13');
      expect(r.instance.value()).toBeNull();
      expect(root(r).getAttribute('data-empty')).toBeNull();

      await type(r, 'minute', '45');
      const value = r.instance.value()!;
      expect(adapter.getHours(value)).toBe(13);
      expect(adapter.getMinutes(value)).toBe(45);
      expect(adapter.getSeconds(value)).toBe(0);
      expect(root(r).getAttribute('data-empty')).toBeNull();
    });

    it('marks data-empty only while every segment is empty', async () => {
      const r = renderHost(Host);
      expect(root(r).getAttribute('data-empty')).toBe('');

      await type(r, 'hour', '13');
      expect(root(r).getAttribute('data-empty')).toBeNull();

      await key(r, 'hour', 'Delete');
      expect(root(r).getAttribute('data-empty')).toBe('');
    });

    it('anchors a value composed with no bound date on the DST-stable sentinel', async () => {
      const r = renderHost(Host);
      r.instance.granularity.set('second');
      await flush(r.fixture);
      await type(r, 'hour', '02');
      await type(r, 'minute', '30');
      await type(r, 'second', '15');
      const value = r.instance.value()!;
      expect(value.getFullYear()).toBe(2000);
      expect(value.getMonth()).toBe(0);
      expect(value.getDate()).toBe(1);
      expect(adapter.getHours(value)).toBe(2);
      expect(adapter.getMinutes(value)).toBe(30);
      expect(adapter.getSeconds(value)).toBe(15);
    });

    it('reflects aria-valuenow as segments are filled', async () => {
      const r = renderHost(Host);
      expect(seg(r, 'hour').getAttribute('aria-valuenow')).toBeNull();
      await type(r, 'hour', '09');
      expect(seg(r, 'hour').getAttribute('aria-valuenow')).toBe('9');
    });

    it('commits Devanagari digits typed into a segment (#1388)', async () => {
      const r = renderHost(Host);
      expect(seg(r, 'minute').getAttribute('aria-valuenow')).toBeNull();

      pressKey(seg(r, 'minute'), '०');
      pressKey(seg(r, 'minute'), '९');
      await flush(r.fixture);

      expect(seg(r, 'minute').getAttribute('aria-valuenow')).toBe('9');
    });

    it('announces an empty state on every empty segment', async () => {
      const r = renderHost(Host);
      expect(seg(r, 'hour').getAttribute('aria-valuenow')).toBeNull();
      expect(seg(r, 'hour').getAttribute('aria-valuetext')).toBe('Empty');
      expect(seg(r, 'minute').getAttribute('aria-valuetext')).toBe('Empty');

      await type(r, 'hour', '09');
      expect(seg(r, 'hour').getAttribute('aria-valuenow')).toBe('9');
      expect(seg(r, 'hour').getAttribute('aria-valuetext')).toBeNull();
      expect(seg(r, 'minute').getAttribute('aria-valuetext')).toBe('Empty');
    });

    it('rehydrates segments from an external value write', async () => {
      const r = renderHost(Host);
      r.instance.value.set(new Date(2026, 5, 15, 9, 30));
      await flush(r.fixture);
      expect(seg(r, 'hour').textContent?.trim()).toBe('09');
      expect(seg(r, 'minute').textContent?.trim()).toBe('30');
    });

    it('clears the value to null when Delete clears a filled segment', async () => {
      const r = renderHost(Host);
      r.instance.value.set(new Date(2026, 5, 15, 9, 30));
      await flush(r.fixture);
      await key(r, 'minute', 'Delete');
      expect(r.instance.value()).toBeNull();
      expect(seg(r, 'minute').textContent?.trim()).toBe('mm');
    });

    it('pops the last entered digit of a filled segment on Backspace', async () => {
      const r = renderHost(Host);
      r.instance.value.set(new Date(2026, 5, 15, 9, 30));
      await flush(r.fixture);
      await key(r, 'minute', 'Backspace');
      expect(seg(r, 'minute').textContent?.trim()).toBe('3');

      seg(r, 'minute').dispatchEvent(new FocusEvent('blur'));
      await flush(r.fixture);
      expect(r.instance.value()?.getMinutes()).toBe(3);
    });

    it('clamps a composed value up to minTime (time-of-day only)', async () => {
      const r = renderHost(Host);
      r.instance.minTime.set(new Date(2000, 0, 1, 10, 0));
      await flush(r.fixture);
      await type(r, 'hour', '09');
      await type(r, 'minute', '00');
      const value = r.instance.value()!;
      expect(adapter.getHours(value)).toBe(10);
      expect(adapter.getMinutes(value)).toBe(0);
    });

    it('clamps a composed value down to maxTime (time-of-day only)', async () => {
      const r = renderHost(Host);
      r.instance.maxTime.set(new Date(2000, 0, 1, 17, 0));
      await flush(r.fixture);
      await type(r, 'hour', '20');
      await type(r, 'minute', '00');
      const value = r.instance.value()!;
      expect(adapter.getHours(value)).toBe(17);
      expect(adapter.getMinutes(value)).toBe(0);
    });

    it('keeps the typed minute when the hour is entered last below minTime (#1129)', async () => {
      const r = renderHost(Host);
      r.instance.minTime.set(new Date(2000, 0, 1, 9, 0));
      await flush(r.fixture);
      await type(r, 'minute', '45');
      await type(r, 'hour', '09');
      const value = r.instance.value()!;
      expect(adapter.getHours(value)).toBe(9);
      expect(adapter.getMinutes(value)).toBe(45);
    });
  });

  describe('commit-on-settle (#16)', () => {
    it('emits no intermediate value while re-typing the hour of a complete time', async () => {
      const r = renderHost(Host);
      r.instance.value.set(new Date(2026, 5, 15, 10, 30));
      await flush(r.fixture);
      const before = r.instance.value();

      pressKey(seg(r, 'hour'), '1');
      await flush(r.fixture);
      expect(r.instance.value()).toBe(before);

      pressKey(seg(r, 'hour'), '4');
      await flush(r.fixture);
      expect(r.instance.value()).not.toBe(before);
      expect(adapter.getHours(r.instance.value()!)).toBe(14);
    });

    it('settles a partial hour on blur, clamping to minTime (item 1)', async () => {
      const r = renderHost(Host);
      r.instance.minTime.set(new Date(2000, 0, 1, 8, 0));
      await flush(r.fixture);
      await type(r, 'minute', '30');

      pressKey(seg(r, 'hour'), '2');
      await flush(r.fixture);
      expect(r.instance.value()).toBeNull();

      seg(r, 'hour').dispatchEvent(new FocusEvent('blur'));
      await flush(r.fixture);

      const value = r.instance.value()!;
      expect(value).not.toBeNull();
      expect(adapter.getHours(value)).toBe(8);
      expect(adapter.getMinutes(value)).toBe(0);
    });

    it('emits no intermediate value under zoneless change detection', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(Host);
      await flush(fixture);
      const host = fixture.nativeElement as HTMLElement;

      fixture.componentInstance.value.set(new Date(2026, 5, 15, 10, 30));
      await flush(fixture);
      const before = fixture.componentInstance.value();

      const hourSeg = host.querySelector('[data-testid="hour"]')! as HTMLElement;
      pressKey(hourSeg, '1');
      await flush(fixture);
      expect(fixture.componentInstance.value()).toBe(before);
    });
  });

  describe('keyboard editing', () => {
    it('steps the segment with ArrowUp / ArrowDown', async () => {
      const r = renderHost(Host);
      r.instance.value.set(new Date(2026, 5, 15, 13, 45));
      await flush(r.fixture);
      await key(r, 'hour', 'ArrowUp');
      expect(adapter.getHours(r.instance.value()!)).toBe(14);
      await key(r, 'hour', 'ArrowDown');
      await key(r, 'hour', 'ArrowDown');
      expect(adapter.getHours(r.instance.value()!)).toBe(12);
    });

    it('wraps hour stepping at the 24-hour boundary', async () => {
      const r = renderHost(Host);
      r.instance.value.set(new Date(2026, 5, 15, 23, 0));
      await flush(r.fixture);
      await key(r, 'hour', 'ArrowUp');
      expect(adapter.getHours(r.instance.value()!)).toBe(0);
    });

    it('wraps minute stepping at 59', async () => {
      const r = renderHost(Host);
      r.instance.value.set(new Date(2026, 5, 15, 13, 59));
      await flush(r.fixture);
      await key(r, 'minute', 'ArrowUp');
      expect(adapter.getMinutes(r.instance.value()!)).toBe(0);
    });

    it('seeds an empty hour to midnight on first step in 24-hour mode', async () => {
      const r = renderHost(Host);
      await key(r, 'hour', 'ArrowUp');
      expect(seg(r, 'hour').getAttribute('aria-valuenow')).toBe('0');
    });

    it('jumps to the segment bounds with Home / End', async () => {
      const r = renderHost(Host);
      r.instance.value.set(new Date(2026, 5, 15, 13, 45));
      await flush(r.fixture);
      await key(r, 'hour', 'Home');
      expect(adapter.getHours(r.instance.value()!)).toBe(0);
      await key(r, 'hour', 'End');
      expect(adapter.getHours(r.instance.value()!)).toBe(23);
    });

    it('restarts the digit buffer when the next digit would overflow', async () => {
      const r = renderHost(Host);
      await type(r, 'hour', '25'); // 2 then 5 → 25 > 23, restarts at 5
      expect(seg(r, 'hour').getAttribute('aria-valuenow')).toBe('5');
    });
  });

  describe('12-hour mode (dayPeriod)', () => {
    it('adds an AM/PM segment in 12-hour mode and drops it in 24-hour mode', async () => {
      const r = renderHost(Host);
      r.instance.hourCycle.set(12);
      await flush(r.fixture);
      expect(segmentsInOrder(r)).toEqual(['hour', 'minute', 'dayPeriod']);
      expect(seg(r, 'dayPeriod').getAttribute('aria-valuemin')).toBe('0');
      expect(seg(r, 'dayPeriod').getAttribute('aria-valuemax')).toBe('1');

      r.instance.hourCycle.set(24);
      await flush(r.fixture);
      expect(segmentsInOrder(r)).toEqual(['hour', 'minute']);
    });

    it('seeds an empty hour to 1 AM on first step in 12-hour mode', async () => {
      const r = renderHost(Host);
      r.instance.hourCycle.set(12);
      await flush(r.fixture);
      await key(r, 'hour', 'ArrowUp');
      expect(seg(r, 'hour').getAttribute('aria-valuenow')).toBe('1');
      expect(seg(r, 'hour').textContent?.trim()).toBe('01');
    });

    it('shows the 12-hour clock and the localized AM/PM for an afternoon time', async () => {
      const r = renderHost(Host);
      r.instance.hourCycle.set(12);
      r.instance.value.set(new Date(2026, 5, 15, 13, 0));
      await flush(r.fixture);
      expect(seg(r, 'hour').textContent?.trim()).toBe('01');
      expect(seg(r, 'dayPeriod').textContent?.trim()).toBe('PM');
      expect(seg(r, 'dayPeriod').getAttribute('aria-valuenow')).toBe('1');
    });

    it('typing a/p sets the AM/PM period of the entered hour', async () => {
      const r = renderHost(Host);
      r.instance.hourCycle.set(12);
      r.instance.value.set(new Date(2026, 5, 15, 9, 30));
      await flush(r.fixture);
      await key(r, 'dayPeriod', 'p');
      expect(adapter.getHours(r.instance.value()!)).toBe(21);
      expect(seg(r, 'dayPeriod').textContent?.trim()).toBe('PM');
    });

    it('ArrowUp / ArrowDown toggle the period', async () => {
      const r = renderHost(Host);
      r.instance.hourCycle.set(12);
      r.instance.value.set(new Date(2026, 5, 15, 9, 30));
      await flush(r.fixture);
      await key(r, 'dayPeriod', 'ArrowUp'); // → PM
      expect(adapter.getHours(r.instance.value()!)).toBe(21);
      await key(r, 'dayPeriod', 'ArrowDown'); // → AM
      expect(adapter.getHours(r.instance.value()!)).toBe(9);
    });

    it('composes a 12-hour entry against the default AM period', async () => {
      const r = renderHost(Host);
      r.instance.hourCycle.set(12);
      await flush(r.fixture);
      await type(r, 'hour', '08');
      await type(r, 'minute', '15');
      const value = r.instance.value()!;
      expect(adapter.getHours(value)).toBe(8);
      expect(adapter.getMinutes(value)).toBe(15);
    });

    it('stores the AM/PM period on an empty field without inventing an hour', async () => {
      const r = renderHost(Host);
      r.instance.hourCycle.set(12);
      await flush(r.fixture);
      await key(r, 'dayPeriod', 'p');
      expect(r.instance.value()).toBeNull();
      expect(seg(r, 'hour').textContent?.trim()).toBe('hh');
      expect(seg(r, 'dayPeriod').textContent?.trim()).toBe('PM');
    });

    it('composes a later typed hour against a period chosen while empty', async () => {
      const r = renderHost(Host);
      r.instance.hourCycle.set(12);
      await flush(r.fixture);
      await key(r, 'dayPeriod', 'p');
      await type(r, 'hour', '8');
      await type(r, 'minute', '30');
      expect(adapter.getHours(r.instance.value()!)).toBe(20);
    });
  });

  describe('segment aria-labels (#513)', () => {
    @Component({
      imports: [ForTimeField, ForTimeFieldSegment, ForTimeFieldLiteral],
      providers: [...provideNativeDateAdapter()],
      template: `
        <div
          forTimeField
          [hourCycle]="12"
          [granularity]="'second'"
          [locale]="'en-US'"
          #field="forTimeField"
        >
          @for (seg of field.segments(); track seg.id) {
            @if (seg.isLiteral) {
              <span forTimeFieldLiteral>{{ seg.text }}</span>
            } @else {
              <span
                forTimeFieldSegment
                [segment]="seg.type!"
                [ariaLabel]="seg.type === 'hour' ? customHour() : null"
                [attr.data-testid]="seg.type"
                >{{ seg.text }}</span
              >
            }
          }
        </div>
      `,
    })
    class LabelsHost {
      readonly customHour = signal<string | null>(null);
    }

    @Component({
      imports: [ForTimeField, ForTimeFieldSegment, ForTimeFieldLiteral],
      providers: [
        ...provideNativeDateAdapter(),
        ...provideForTimeFieldDefaults({
          segmentLabels: { dayPeriod: 'Día/Noche', hour: 'hora' },
        }),
      ],
      template: `
        <div
          forTimeField
          [hourCycle]="12"
          [granularity]="'second'"
          [locale]="'en-US'"
          #field="forTimeField"
        >
          @for (seg of field.segments(); track seg.id) {
            @if (seg.isLiteral) {
              <span forTimeFieldLiteral>{{ seg.text }}</span>
            } @else {
              <span forTimeFieldSegment [segment]="seg.type!" [attr.data-testid]="seg.type">{{
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
      expect(lseg(host, 'hour').getAttribute('aria-label')).toBe('hour');
      expect(lseg(host, 'minute').getAttribute('aria-label')).toBe('minute');
      expect(lseg(host, 'second').getAttribute('aria-label')).toBe('second');
    });

    it('lets an explicit ariaLabel win over the default', async () => {
      const r = renderHost(LabelsHost);
      const hour = lseg(r.fixture.nativeElement, 'hour');
      expect(hour.getAttribute('aria-label')).toBe('hour');
      r.instance.customHour.set('Start hour');
      await flush(r.fixture);
      expect(hour.getAttribute('aria-label')).toBe('Start hour');
    });

    it('localizes labels via provideForTimeFieldDefaults, keeping unset keys at the default', () => {
      const r = renderHost(LocalizedHost);
      const host = r.fixture.nativeElement;
      expect(lseg(host, 'dayPeriod').getAttribute('aria-label')).toBe('Día/Noche');
      expect(lseg(host, 'hour').getAttribute('aria-label')).toBe('hora');
      expect(lseg(host, 'minute').getAttribute('aria-label')).toBe('minute');
      expect(lseg(host, 'second').getAttribute('aria-label')).toBe('second');
    });
  });

  describe('disabled & readonly', () => {
    it('disables the field: segments leave the tab order and editing is blocked', async () => {
      const r = renderHost(Host);
      r.instance.disabled.set(true);
      await flush(r.fixture);
      expect(root(r).getAttribute('aria-disabled')).toBe('true');
      expect(root(r).getAttribute('data-disabled')).toBe('');
      expect(seg(r, 'hour').getAttribute('tabindex')).toBe('-1');

      await type(r, 'hour', '13');
      expect(seg(r, 'hour').getAttribute('aria-valuenow')).toBeNull();
    });

    it('read-only field reflects data-readonly on the group, aria-readonly on the segments', async () => {
      const r = renderHost(Host);
      r.instance.value.set(new Date(2026, 5, 15, 13, 45));
      r.instance.readonly.set(true);
      await flush(r.fixture);
      expect(root(r).hasAttribute('aria-readonly')).toBe(false);
      expect(root(r).getAttribute('data-readonly')).toBe('');
      expect(seg(r, 'hour').getAttribute('aria-readonly')).toBe('true');
      await key(r, 'hour', 'ArrowUp');
      expect(adapter.getHours(r.instance.value()!)).toBe(13);
    });
  });

  describe('locale ordering & direction', () => {
    it('orders segments and separators per the locale (en-US, 24-hour)', () => {
      const r = renderHost(Host);
      expect(segmentsInOrder(r)).toEqual(['hour', 'minute']);
      expect(r.query('[data-testid="literal"]')!.textContent?.trim()).toBe(':');
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
    interface Booking {
      time: Date | null;
    }

    @Component({
      imports: [ForTimeField, ForTimeFieldSegment, ForTimeFieldLiteral, FormField],
      providers: [...provideNativeDateAdapter()],
      template: `
        <div
          forTimeField
          [formField]="booking.time"
          [hourCycle]="24"
          [locale]="'en-US'"
          #field="forTimeField"
        >
          @for (seg of field.segments(); track seg.id) {
            @if (seg.isLiteral) {
              <span forTimeFieldLiteral>{{ seg.text }}</span>
            } @else {
              <span forTimeFieldSegment [segment]="seg.type!" [attr.data-testid]="seg.type">{{
                seg.text
              }}</span>
            }
          }
        </div>
      `,
    })
    class FormHost {
      readonly model = signal<Booking>({ time: null });
      readonly booking = form(this.model, (p) => {
        requiredRule(p.time);
      });
    }

    it('two-way binds the composed value with the field', async () => {
      const r = renderHost(FormHost);
      const segOf = (t: string) => r.query(`[data-testid="${t}"]`)!;
      for (const d of '13') pressKey(segOf('hour'), d);
      for (const d of '45') pressKey(segOf('minute'), d);
      await flush(r.fixture);
      const value = r.instance.model().time!;
      expect(adapter.getHours(value)).toBe(13);
      expect(adapter.getMinutes(value)).toBe(45);
    });

    it('flows schema-driven required into aria-required', async () => {
      const r = renderHost(FormHost);
      await flush(r.fixture);
      expect(r.query('[forTimeField]')!.getAttribute('aria-required')).toBe('true');
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

      fixture.componentInstance.value.set(new Date(2026, 0, 9, 8, 5));
      await flush(fixture);
      expect(segEl('hour').textContent?.trim()).toBe('08');
      expect(segEl('minute').textContent?.trim()).toBe('05');

      fixture.componentInstance.value.set(null);
      await flush(fixture);
      expect(segEl('hour').textContent?.trim()).toBe('hh');
      expect(host.querySelector('[forTimeField]')!.getAttribute('data-empty')).toBe('');
    });
  });
});
