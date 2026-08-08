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
import { type DateRange } from 'forty-cdk/shared';
import { ForField, ForFieldDescription, ForLabel } from 'forty-cdk/field';
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
      [allowOvernight]="allowOvernight()"
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
  readonly value = signal<DateRange<Date> | null>(null);
  readonly minTime = signal<Date | null>(null);
  readonly maxTime = signal<Date | null>(null);
  readonly allowOvernight = signal(false);
  readonly hourCycle = signal<12 | 24 | null>(24);
  readonly granularity = signal<'hour' | 'minute' | 'second'>('minute');
  readonly disabled = signal(false);
  readonly readonly = signal(false);
  readonly required = signal(false);
  readonly locale = signal<string | null>('en-US');
  readonly ariaLabel = signal<string | null>('Opening hours');
  readonly dir = signal<'ltr' | 'rtl'>('ltr');
}

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
      [readonly]="isReadonly()"
      [required]="isRequired()"
      [invalid]="isInvalid()"
      [(touched)]="isTouched"
      [dirty]="isDirty()"
    >
      <div forTimeRangeFieldStart #start="forTimeRangeFieldStart">
        @for (s of start.segments(); track s.id) {
          @if (s.isLiteral) {
            <span forTimeRangeFieldLiteral>{{ s.text }}</span>
          } @else {
            <span forTimeRangeFieldSegment [segment]="s.type!">{{ s.text }}</span>
          }
        }
      </div>
      <div forTimeRangeFieldEnd #end="forTimeRangeFieldEnd">
        @for (s of end.segments(); track s.id) {
          @if (s.isLiteral) {
            <span forTimeRangeFieldLiteral>{{ s.text }}</span>
          } @else {
            <span forTimeRangeFieldSegment [segment]="s.type!">{{ s.text }}</span>
          }
        }
      </div>
    </div>
  `,
})
class TimeRangeFieldFormControlHost {
  readonly value = signal<DateRange<Date> | null>(null);
  readonly isReadonly = signal(false);
  readonly isRequired = signal(false);
  readonly isInvalid = signal(false);
  readonly isTouched = signal(false);
  readonly isDirty = signal(false);
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
  assertFormControlContract(
    () => {
      const r = renderHost(TimeRangeFieldFormControlHost);
      const result: FormControlMountResult = {
        control: r.query<HTMLElement>('[forTimeRangeField]')!,
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
      roleSupportsAriaRequired: false,
    },
  );

  describe('focus (focus-on-error)', () => {
    const fieldOf = (r: R) =>
      r.fixture.debugElement.query(By.directive(ForTimeRangeField)).injector.get(ForTimeRangeField);

    it('moves focus to the first segment of the start endpoint when both endpoints are empty', async () => {
      const r = renderHost(Host);
      await r.flush();
      fieldOf(r).focus();
      expect(document.activeElement).toBe(seg(r, 'start', 'hour'));
    });

    it('moves focus to the first segment of the end endpoint when the start is complete but the end is empty', async () => {
      const r = renderHost(Host);
      await r.flush();
      await fill(r, 'start', '09', '30');
      fieldOf(r).focus();
      expect(document.activeElement).toBe(seg(r, 'end', 'hour'));
    });

    it('keeps focus on the start endpoint when the start is incomplete even if the end is filled', async () => {
      const r = renderHost(Host);
      await r.flush();
      await fill(r, 'end', '09', '30');
      fieldOf(r).focus();
      expect(document.activeElement).toBe(seg(r, 'start', 'hour'));
    });

    it('falls back to the start endpoint when both endpoints are complete', async () => {
      const r = renderHost(Host);
      await r.flush();
      await fill(r, 'start', '09', '30');
      await fill(r, 'end', '17', '30');
      fieldOf(r).focus();
      expect(document.activeElement).toBe(seg(r, 'start', 'hour'));
    });
  });

  describe('[forField] integration (#1683)', () => {
    @Component({
      imports: [
        ForField,
        ForLabel,
        ForFieldDescription,
        ForTimeRangeField,
        ForTimeRangeFieldStart,
        ForTimeRangeFieldEnd,
        ForTimeRangeFieldSegment,
      ],
      providers: [...provideNativeDateAdapter()],
      template: `
        <button data-testid="outside">Elsewhere</button>
        <div forField>
          @if (nativeLabel()) {
            <label forLabel data-testid="label">Opening hours</label>
          } @else {
            <span forLabel data-testid="label">Opening hours</span>
          }
          <div
            forTimeRangeField
            [(value)]="value"
            [disabled]="disabled()"
            [hourCycle]="24"
            [locale]="'en-US'"
            data-testid="group"
          >
            <div forTimeRangeFieldStart #start="forTimeRangeFieldStart">
              @for (s of start.segments(); track s.id) {
                @if (!s.isLiteral) {
                  <span
                    forTimeRangeFieldSegment
                    [segment]="s.type!"
                    [attr.data-testid]="'start-' + s.type"
                    >{{ s.text }}</span
                  >
                }
              }
            </div>
            <div forTimeRangeFieldEnd #end="forTimeRangeFieldEnd">
              @for (s of end.segments(); track s.id) {
                @if (!s.isLiteral) {
                  <span
                    forTimeRangeFieldSegment
                    [segment]="s.type!"
                    [attr.data-testid]="'end-' + s.type"
                    >{{ s.text }}</span
                  >
                }
              }
            </div>
          </div>
          <p forFieldDescription data-testid="desc">Opening and closing time.</p>
        </div>
      `,
    })
    class LabelledFieldHost {
      readonly value = signal<DateRange<Date> | null>(null);
      readonly disabled = signal(false);
      readonly nativeLabel = signal(false);
    }

    const at = (r: RenderResult<LabelledFieldHost>, id: string) =>
      r.query(`[data-testid="${id}"]`)!;

    it('keeps the field association on the role=group host, off every segment', () => {
      const r = renderHost(LabelledFieldHost);
      const groupEl = at(r, 'group');

      expect(groupEl.getAttribute('aria-labelledby')).toBe(at(r, 'label').id);
      expect(groupEl.getAttribute('aria-describedby')).toBe(at(r, 'desc').id);
      expect(groupEl.id).toBeTruthy();
      for (const segment of r.queryAll('[forTimeRangeFieldSegment]')) {
        expect(segment.hasAttribute('aria-labelledby')).toBe(false);
        expect(segment.hasAttribute('aria-describedby')).toBe(false);
        expect(segment.hasAttribute('aria-errormessage')).toBe(false);
        expect(segment.id).not.toBe(groupEl.id);
      }
    });

    it('focuses the start endpoint first segment when a non-`<label>` host is clicked', () => {
      const r = renderHost(LabelledFieldHost);
      at(r, 'label').click();
      expect(document.activeElement).toBe(at(r, 'start-hour'));
    });

    it('focuses the start endpoint first segment when a native `<label>` is clicked', async () => {
      const r = renderHost(LabelledFieldHost);
      r.instance.nativeLabel.set(true);
      await r.flush();

      expect(at(r, 'label').getAttribute('for')).toBe(at(r, 'group').id);
      at(r, 'label').click();
      expect(document.activeElement).toBe(at(r, 'start-hour'));
    });

    it('ignores the label click while the field is disabled', async () => {
      const r = renderHost(LabelledFieldHost);
      r.instance.disabled.set(true);
      await r.flush();

      const outside = at(r, 'outside');
      outside.focus();
      at(r, 'label').click();
      expect(document.activeElement).toBe(outside);
    });
  });

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
      expect(root(r).getAttribute('data-empty')).toBeNull();

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

    it('clears the range to null when Delete clears one endpoint segment, keeping the other endpoint', async () => {
      const r = renderHost(Host);
      r.instance.value.set({
        start: new Date(2026, 5, 10, 9, 5),
        end: new Date(2026, 5, 10, 17, 30),
      });
      await flush(r.fixture);

      await key(r, 'start', 'minute', 'Delete');
      expect(r.instance.value()).toBeNull();
      expect(seg(r, 'start', 'minute').textContent?.trim()).toBe('mm');
      expect(seg(r, 'end', 'hour').textContent?.trim()).toBe('17');
      expect(seg(r, 'end', 'minute').textContent?.trim()).toBe('30');
    });

    it('pops the last entered digit of an endpoint segment on Backspace', async () => {
      const r = renderHost(Host);
      r.instance.value.set({
        start: new Date(2026, 5, 10, 9, 30),
        end: new Date(2026, 5, 10, 17, 45),
      });
      await flush(r.fixture);

      await key(r, 'start', 'minute', 'Backspace');
      expect(seg(r, 'start', 'minute').textContent?.trim()).toBe('3');
      expect(seg(r, 'end', 'minute').textContent?.trim()).toBe('45');
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

  describe('commit-on-settle (#16)', () => {
    it('does not rewrite the range value while re-typing one endpoint (transient)', async () => {
      const r = renderHost(Host);
      r.instance.value.set({
        start: new Date(2026, 5, 10, 9, 0),
        end: new Date(2026, 5, 10, 17, 0),
      });
      await flush(r.fixture);
      const before = r.instance.value();

      pressKey(seg(r, 'start', 'hour'), '1');
      await flush(r.fixture);
      expect(r.instance.value()).toBe(before);

      pressKey(seg(r, 'start', 'hour'), '0');
      await flush(r.fixture);
      expect(r.instance.value()).not.toBe(before);
      expect(adapter.getHours(r.instance.value()!.start)).toBe(10);
    });

    it('does not reclassify an overnight range on a transient keystroke', async () => {
      const r = renderHost(Host);
      r.instance.allowOvernight.set(true);
      await flush(r.fixture);
      await fill(r, 'start', '22', '00');
      await fill(r, 'end', '06', '00');
      const before = r.instance.value()!;
      expect(before.end.getTime() - before.start.getTime()).toBe(8 * 60 * 60 * 1000);

      pressKey(seg(r, 'end', 'hour'), '2');
      await flush(r.fixture);
      expect(r.instance.value()).toBe(before);

      pressKey(seg(r, 'end', 'hour'), '3');
      await flush(r.fixture);
      const range = r.instance.value()!;
      expect(range).not.toBe(before);
      expect(adapter.getHours(range.end)).toBe(23);
      expect(range.end.getTime() - range.start.getTime()).toBe(60 * 60 * 1000);
    });

    it('does not rewrite the range value on a transient keystroke', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(Host);
      await flush(fixture);
      const host = fixture.nativeElement as HTMLElement;

      fixture.componentInstance.value.set({
        start: new Date(2026, 5, 10, 9, 0),
        end: new Date(2026, 5, 10, 17, 0),
      });
      await flush(fixture);
      const before = fixture.componentInstance.value();

      const startHour = host.querySelector('[data-testid="start-hour"]')! as HTMLElement;
      pressKey(startHour, '1');
      await flush(fixture);
      expect(fixture.componentInstance.value()).toBe(before);
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
      expect(root(r).getAttribute('data-empty')).toBeNull();
      expect(root(r).getAttribute('data-invalid')).toBe('');
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
      expect(root(r).getAttribute('data-invalid')).toBeNull();
    });
  });

  describe('overnight ranges', () => {
    it('commits a midnight-crossing range when the start falls after the end', async () => {
      const r = renderHost(Host);
      r.instance.allowOvernight.set(true);
      await flush(r.fixture);

      await fill(r, 'start', '22', '00');
      await fill(r, 'end', '06', '00');

      const range = r.instance.value()!;
      expect(adapter.getHours(range.start)).toBe(22);
      expect(adapter.getHours(range.end)).toBe(6);
      expect(range.end.getTime() - range.start.getTime()).toBe(8 * 60 * 60 * 1000);
      expect(root(r).getAttribute('aria-invalid')).toBeNull();
      expect(root(r).getAttribute('data-range-error')).toBeNull();
    });

    it('re-editing the end to a same-day time drops the midnight crossing', async () => {
      const r = renderHost(Host);
      r.instance.allowOvernight.set(true);
      await flush(r.fixture);

      await fill(r, 'start', '22', '00');
      await fill(r, 'end', '06', '00');
      expect(r.instance.value()!.end.getTime() - r.instance.value()!.start.getTime()).toBe(
        8 * 60 * 60 * 1000,
      );

      await type(r, 'end', 'hour', '23');

      const range = r.instance.value()!;
      expect(adapter.getHours(range.start)).toBe(22);
      expect(adapter.getHours(range.end)).toBe(23);
      expect(range.end.getTime() - range.start.getTime()).toBe(60 * 60 * 1000);
    });

    it('displays a bound midnight-crossing range without flagging disorder', async () => {
      const r = renderHost(Host);
      r.instance.allowOvernight.set(true);
      r.instance.value.set({
        start: new Date(2026, 5, 10, 22, 0),
        end: new Date(2026, 5, 11, 6, 0),
      });
      await flush(r.fixture);

      expect(seg(r, 'start', 'hour').textContent?.trim()).toBe('22');
      expect(seg(r, 'end', 'hour').textContent?.trim()).toBe('06');
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

    it('read-only field reflects data-readonly on the groups, aria-readonly on the segments', async () => {
      const r = renderHost(Host);
      r.instance.value.set({
        start: new Date(2026, 5, 10, 9, 0),
        end: new Date(2026, 5, 10, 17, 0),
      });
      r.instance.readonly.set(true);
      await flush(r.fixture);
      expect(root(r).hasAttribute('aria-readonly')).toBe(false);
      expect(root(r).getAttribute('data-readonly')).toBe('');
      expect(group(r, 'start').hasAttribute('aria-readonly')).toBe(false);
      expect(group(r, 'start').getAttribute('data-readonly')).toBe('');
      expect(seg(r, 'start', 'hour').getAttribute('aria-readonly')).toBe('true');
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
      hours: DateRange<Date> | null;
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

    it('flows schema-driven required into data-required (role="group" has no aria-required)', async () => {
      const r = renderHost(FormHost);
      await flush(r.fixture);
      const field = r.query('[forTimeRangeField]')!;
      expect(field.getAttribute('data-required')).toBe('');
      expect(field.hasAttribute('aria-required')).toBe(false);
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
        /\[forty-cdk\/time-field\] FORCDK-CORE-003: ForTimeRangeField requires a time-capable DateAdapter/,
      );
    });
  });

  describe('reactive updates', () => {
    it('rehydrates both endpoints from an external value write', async () => {
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
