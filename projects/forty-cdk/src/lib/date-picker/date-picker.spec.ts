import { Component, signal } from '@angular/core';
import { form, FormField, required as requiredRule } from '@angular/forms/signals';

import {
  afterEachOverlayCleanup,
  flush,
  pressKey,
  renderHost,
  type RenderResult,
} from '../../test-utils';
import { assertTimeCapable, type DateAdapter } from '../_internal/date-adapter/date-adapter';
import { ForCalendar } from '../calendar/calendar';
import { ForCalendarCell } from '../calendar/calendar-cell';
import { ForCalendarGrid } from '../calendar/calendar-grid';
import { ForCalendarGridHeader } from '../calendar/calendar-grid-header';
import { NativeDateAdapter, provideNativeDateAdapter } from '../calendar/native-date-adapter';
import { ForTimeField } from '../time-field/time-field';
import { ForTimeFieldLiteral } from '../time-field/time-field-literal';
import { ForTimeFieldSegment } from '../time-field/time-field-segment';
import { ForDatePicker } from './date-picker';
import { ForDatePickerContent } from './date-picker-content';
import { ForDatePickerTrigger } from './date-picker-trigger';
import { ForDatePickerValue } from './date-picker-value';

const adapter = new NativeDateAdapter();

const CALENDAR_PIECES = [ForCalendar, ForCalendarGrid, ForCalendarGridHeader, ForCalendarCell];

@Component({
  imports: [
    ForDatePicker,
    ForDatePickerTrigger,
    ForDatePickerContent,
    ForDatePickerValue,
    ...CALENDAR_PIECES,
  ],
  providers: [...provideNativeDateAdapter()],
  template: `
    <div
      forDatePicker
      [(value)]="value"
      [(open)]="open"
      (openChange)="openChanges.push($event)"
      (pointerDownOutside)="onPointerDownOutside($event)"
      (interactOutside)="interactOutsideCount = interactOutsideCount + 1"
      [minDate]="minDate()"
      [maxDate]="maxDate()"
      [disabled]="disabled()"
      [readonly]="readonly()"
      [closeOnSelect]="closeOnSelect()"
      [modal]="modal()"
      [ariaLabel]="ariaLabel()"
      name="dob"
      #picker="forDatePicker"
    >
      <button data-testid="trigger" forDatePickerTrigger>
        <span forDatePickerValue [placeholder]="'Pick a date'"></span>
      </button>

      @if (open()) {
        <div forDatePickerContent data-testid="content">
          <div forCalendar [(value)]="value" [min]="picker.minDate()" [max]="picker.maxDate()">
            <table forCalendarGrid #grid="forCalendarGrid">
              <thead forCalendarGridHeader>
                <tr>
                  @for (day of grid.weekDays(); track day.key) {
                    <th scope="col">{{ day.short }}</th>
                  }
                </tr>
              </thead>
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
class Host {
  readonly value = signal<Date | null>(null);
  readonly open = signal(false);
  readonly minDate = signal<Date | null>(null);
  readonly maxDate = signal<Date | null>(null);
  readonly disabled = signal(false);
  readonly readonly = signal(false);
  readonly closeOnSelect = signal(true);
  readonly modal = signal(false);
  readonly ariaLabel = signal<string | null>('Choose date');
  readonly openChanges: boolean[] = [];
  interactOutsideCount = 0;
  vetoPointerDownOutside = false;
  onPointerDownOutside(event: { preventDefault(): void }): void {
    if (this.vetoPointerDownOutside) {
      event.preventDefault();
    }
  }
}

type R = RenderResult<Host>;

const trigger = (r: R) => r.query<HTMLButtonElement>('[forDatePickerTrigger]')!;
const value = (r: R) => r.query('[forDatePickerValue]')!;
const content = () => document.querySelector<HTMLElement>('[forDatePickerContent]');
const cell = (key: string) => document.querySelector<HTMLElement>(`[data-testid="cell-${key}"]`);

async function openPicker(r: R): Promise<void> {
  trigger(r).click();
  await flush(r.fixture);
}

describe('ForDatePicker', () => {
  afterEachOverlayCleanup();

  describe('structure & ARIA', () => {
    it('wires the trigger as a dialog disclosure button', () => {
      const r = renderHost(Host);
      const t = trigger(r);
      expect(t.getAttribute('type')).toBe('button');
      expect(t.getAttribute('aria-haspopup')).toBe('dialog');
      expect(t.getAttribute('aria-expanded')).toBe('false');
      expect(t.hasAttribute('aria-controls')).toBe(false);
    });

    it('reflects aria-expanded / aria-controls and role=dialog when open', async () => {
      const r = renderHost(Host);
      await openPicker(r);

      const surface = content()!;
      expect(trigger(r).getAttribute('aria-expanded')).toBe('true');
      expect(trigger(r).getAttribute('aria-controls')).toBe(surface.id);
      expect(surface.getAttribute('role')).toBe('dialog');
      expect(surface.getAttribute('aria-label')).toBe('Choose date');
    });

    it('labels the surface by the trigger when no ariaLabel is set', async () => {
      const r = renderHost(Host);
      r.instance.ariaLabel.set(null);
      await openPicker(r);

      const surface = content()!;
      expect(surface.hasAttribute('aria-label')).toBe(false);
      expect(surface.getAttribute('aria-labelledby')).toBe(trigger(r).id);
    });

    it('portals the surface directly under document.body', async () => {
      const r = renderHost(Host);
      await openPicker(r);
      expect(content()!.parentElement).toBe(document.body);
    });

    it('reflects data-state on the root and trigger', async () => {
      const r = renderHost(Host);
      const root = r.query('[forDatePicker]')!;
      expect(root.getAttribute('data-state')).toBe('closed');
      expect(trigger(r).getAttribute('data-state')).toBe('closed');

      await openPicker(r);
      expect(root.getAttribute('data-state')).toBe('open');
      expect(trigger(r).getAttribute('data-state')).toBe('open');
      expect(content()!.getAttribute('data-state')).toBe('open');
    });
  });

  describe('open / close', () => {
    it('toggles open on trigger click', async () => {
      const r = renderHost(Host);
      await openPicker(r);
      expect(r.instance.open()).toBe(true);

      await openPicker(r);
      expect(r.instance.open()).toBe(false);
      expect(content()).toBeNull();
    });

    it('closes on Escape and emits the vetoable event', async () => {
      const r = renderHost(Host);
      await openPicker(r);

      content()!.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      );
      await flush(r.fixture);
      expect(r.instance.open()).toBe(false);
    });

    it('closes exactly once on an outside pointer-down (shared veto, no double-close)', async () => {
      const r = renderHost(Host);
      await openPicker(r);
      expect(r.instance.openChanges).toEqual([true]);

      // A real outside pointer-down routes through the dismissable layer's
      // `onPointerDownOutside` AND the composite `onInteractOutside` for the
      // same physical event; the shared veto must collapse them into a single
      // close.
      document.body.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, cancelable: true }),
      );
      await flush(r.fixture);

      expect(r.instance.open()).toBe(false);
      expect(content()).toBeNull();
      // The single physical interaction surfaces the composite output once …
      expect(r.instance.interactOutsideCount).toBe(1);
      // … and produces exactly one open→closed transition, not two.
      expect(r.instance.openChanges).toEqual([true, false]);
    });

    it('preventDefault in (pointerDownOutside) vetoes the composite close (shared veto)', async () => {
      const r = renderHost(Host);
      r.instance.vetoPointerDownOutside = true;
      await openPicker(r);

      // The pointer handler vetoes; because the same veto wrapper is reused for
      // the composite `interactOutside`, the close is suppressed even though
      // both channels fire for this one event.
      document.body.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, cancelable: true }),
      );
      await flush(r.fixture);

      expect(r.instance.interactOutsideCount).toBe(1);
      expect(r.instance.open()).toBe(true);
      expect(content()).not.toBeNull();
      expect(r.instance.openChanges).toEqual([true]);
    });
  });

  describe('selection (closeOnSelect)', () => {
    it('mirrors a grid selection onto the value and closes by default', async () => {
      const r = renderHost(Host);
      r.instance.value.set(new Date(2026, 5, 15));
      await openPicker(r);

      cell('2026-6-20')!.click();
      await flush(r.fixture);

      expect(r.instance.value()?.getTime()).toBe(new Date(2026, 5, 20).getTime());
      expect(r.instance.open()).toBe(false);
      expect(content()).toBeNull();
    });

    it('keeps the surface open after selection when closeOnSelect is false', async () => {
      const r = renderHost(Host);
      r.instance.closeOnSelect.set(false);
      r.instance.value.set(new Date(2026, 5, 15));
      await openPicker(r);

      cell('2026-6-20')!.click();
      await flush(r.fixture);

      expect(r.instance.value()?.getTime()).toBe(new Date(2026, 5, 20).getTime());
      expect(r.instance.open()).toBe(true);
    });
  });

  describe('selection bridge ignores readonly / disabled', () => {
    @Component({
      imports: [
        ForDatePicker,
        ForDatePickerTrigger,
        ForDatePickerContent,
        ForDatePickerValue,
        ForCalendar,
        ForCalendarGrid,
        ForCalendarCell,
      ],
      providers: [...provideNativeDateAdapter()],
      template: `
        <div
          forDatePicker
          [(value)]="value"
          [(open)]="open"
          [disabled]="disabled()"
          [readonly]="readonly()"
          [closeOnSelect]="false"
          name="dob"
          #picker="forDatePicker"
        >
          <button data-testid="trigger" forDatePickerTrigger>
            <span forDatePickerValue [placeholder]="'Pick a date'"></span>
          </button>

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
    class GuardHost {
      readonly value = signal<Date | null>(null);
      readonly open = signal(false);
      readonly disabled = signal(false);
      readonly readonly = signal(false);
    }

    type GR = RenderResult<GuardHost>;
    const touched = (r: GR) => r.query('[forDatePicker]')!.hasAttribute('data-touched');

    it('a readonly picker ignores a grid selection (no value/touched change)', async () => {
      const r = renderHost(GuardHost);
      r.instance.readonly.set(true);
      r.instance.value.set(new Date(2026, 5, 15));
      r.instance.open.set(true);
      await flush(r.fixture);

      cell('2026-6-20')!.click();
      await flush(r.fixture);

      expect(r.instance.value()?.getTime()).toBe(new Date(2026, 5, 15).getTime());
      expect(touched(r)).toBe(false);
    });

    it('a disabled picker ignores a grid selection (no value/touched change)', async () => {
      const r = renderHost(GuardHost);
      r.instance.disabled.set(true);
      r.instance.value.set(new Date(2026, 5, 15));
      r.instance.open.set(true);
      await flush(r.fixture);

      cell('2026-6-20')!.click();
      await flush(r.fixture);

      expect(r.instance.value()?.getTime()).toBe(new Date(2026, 5, 15).getTime());
      expect(touched(r)).toBe(false);
    });

    it('flipping readonly on after opening blocks subsequent grid selections', async () => {
      const r = renderHost(GuardHost);
      r.instance.value.set(new Date(2026, 5, 15));
      r.instance.open.set(true);
      await flush(r.fixture);

      cell('2026-6-20')!.click();
      await flush(r.fixture);
      expect(r.instance.value()?.getTime()).toBe(new Date(2026, 5, 20).getTime());

      r.instance.readonly.set(true);
      await flush(r.fixture);

      cell('2026-6-25')!.click();
      await flush(r.fixture);
      expect(r.instance.value()?.getTime()).toBe(new Date(2026, 5, 20).getTime());
    });
  });

  describe('value rendering', () => {
    it('shows the placeholder while empty and the formatted date once set', async () => {
      const r = renderHost(Host);
      expect(value(r).textContent?.trim()).toBe('Pick a date');
      expect(value(r).getAttribute('data-placeholder')).toBe('');

      r.instance.value.set(new Date(2026, 5, 15));
      await flush(r.fixture);
      expect(value(r).getAttribute('data-placeholder')).toBeNull();
      expect(value(r).textContent).toContain('2026');
    });
  });

  describe('bounds forwarding', () => {
    it('forwards minDate to the projected calendar', async () => {
      const r = renderHost(Host);
      r.instance.value.set(new Date(2026, 5, 15));
      r.instance.minDate.set(new Date(2026, 5, 10));
      await openPicker(r);

      // A day before the minimum is unavailable in the projected grid.
      expect(cell('2026-6-5')!.getAttribute('aria-disabled')).toBe('true');
      // A day on/after the minimum stays selectable.
      expect(cell('2026-6-20')!.hasAttribute('aria-disabled')).toBe(false);
    });
  });

  describe('disabled', () => {
    it('reflects aria-disabled and blocks opening', async () => {
      const r = renderHost(Host);
      r.instance.disabled.set(true);
      await flush(r.fixture);

      const t = trigger(r);
      expect(t.getAttribute('aria-disabled')).toBe('true');
      expect(t.hasAttribute('disabled')).toBe(true);
      expect(r.query('[forDatePicker]')!.getAttribute('data-disabled')).toBe('');

      t.click();
      await flush(r.fixture);
      expect(r.instance.open()).toBe(false);
    });
  });

  describe('modal', () => {
    it('emits aria-modal="true" on the surface in modal mode', async () => {
      const r = renderHost(Host);
      r.instance.modal.set(true);
      await openPicker(r);
      expect(content()!.getAttribute('aria-modal')).toBe('true');
    });

    it('omits aria-modal in the default non-modal mode', async () => {
      const r = renderHost(Host);
      await openPicker(r);
      expect(content()!.hasAttribute('aria-modal')).toBe(false);
    });
  });

  describe('date-time (granularity > day)', () => {
    @Component({
      imports: [
        ForDatePicker,
        ForDatePickerTrigger,
        ForDatePickerContent,
        ForDatePickerValue,
        ForTimeField,
        ForTimeFieldSegment,
        ForTimeFieldLiteral,
        ForCalendar,
        ForCalendarGrid,
        ForCalendarCell,
      ],
      providers: [...provideNativeDateAdapter()],
      template: `
        <div
          forDatePicker
          [(value)]="value"
          [(open)]="open"
          granularity="minute"
          [hourCycle]="24"
          [minDate]="minDate()"
          [maxDate]="maxDate()"
          [disabled]="disabled()"
          [readonly]="readonly()"
          #picker="forDatePicker"
        >
          <button data-testid="trigger" forDatePickerTrigger>
            <span forDatePickerValue [placeholder]="'Pick date & time'"></span>
          </button>
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
              <div
                forTimeField
                [value]="picker.value()"
                [hourCycle]="24"
                [locale]="'en-US'"
                #tf="forTimeField"
              >
                @for (seg of tf.segments(); track seg.id) {
                  @if (seg.isLiteral) {
                    <span forTimeFieldLiteral>{{ seg.text }}</span>
                  } @else {
                    <span
                      forTimeFieldSegment
                      [segment]="seg.type!"
                      [attr.data-testid]="'time-' + seg.type"
                      >{{ seg.text }}</span
                    >
                  }
                }
              </div>
            </div>
          }
        </div>
      `,
    })
    class DateTimeHost {
      readonly value = signal<Date | null>(null);
      readonly open = signal(false);
      readonly minDate = signal<Date | null>(null);
      readonly maxDate = signal<Date | null>(null);
      readonly disabled = signal(false);
      readonly readonly = signal(false);
    }

    type DR = RenderResult<DateTimeHost>;
    const timeSeg = (type: string) =>
      document.querySelector<HTMLElement>(`[data-testid="time-${type}"]`)!;

    async function open(r: DR): Promise<void> {
      r.query<HTMLButtonElement>('[forDatePickerTrigger]')!.click();
      await flush(r.fixture);
    }

    it('grafts the entered time onto a calendar selection and stays open', async () => {
      const r = renderHost(DateTimeHost);
      r.instance.value.set(new Date(2026, 5, 15, 14, 30));
      await open(r);

      cell('2026-6-20')!.click();
      await flush(r.fixture);

      const value = r.instance.value()!;
      expect(adapter.getDate(value)).toBe(20);
      expect(adapter.getHours(value)).toBe(14);
      expect(adapter.getMinutes(value)).toBe(30);
      // A date-time picker never closes on a day selection.
      expect(r.instance.open()).toBe(true);
    });

    it('edits the time through the projected field without losing the date', async () => {
      const r = renderHost(DateTimeHost);
      r.instance.value.set(new Date(2026, 5, 15, 14, 30));
      await open(r);

      pressKey(timeSeg('hour'), 'ArrowUp');
      await flush(r.fixture);

      const value = r.instance.value()!;
      expect(adapter.getHours(value)).toBe(15);
      expect(adapter.getDate(value)).toBe(15);
      expect(adapter.getMinutes(value)).toBe(30);
    });

    it('a readonly picker ignores a time-field edit (no value/touched change)', async () => {
      const r = renderHost(DateTimeHost);
      r.instance.readonly.set(true);
      r.instance.value.set(new Date(2026, 5, 15, 14, 30));
      await open(r);

      pressKey(timeSeg('hour'), 'ArrowUp');
      await flush(r.fixture);

      expect(r.instance.value()!.getTime()).toBe(new Date(2026, 5, 15, 14, 30).getTime());
      expect(r.query('[forDatePicker]')!.hasAttribute('data-touched')).toBe(false);
    });

    it('a disabled picker ignores a time-field edit (no value/touched change)', async () => {
      const r = renderHost(DateTimeHost);
      r.instance.disabled.set(true);
      r.instance.value.set(new Date(2026, 5, 15, 14, 30));
      await open(r);

      pressKey(timeSeg('hour'), 'ArrowUp');
      await flush(r.fixture);

      expect(r.instance.value()!.getTime()).toBe(new Date(2026, 5, 15, 14, 30).getTime());
      expect(r.query('[forDatePicker]')!.hasAttribute('data-touched')).toBe(false);
    });

    it('flipping readonly on after opening blocks subsequent time-field edits', async () => {
      const r = renderHost(DateTimeHost);
      r.instance.value.set(new Date(2026, 5, 15, 14, 30));
      await open(r);

      pressKey(timeSeg('hour'), 'ArrowUp');
      await flush(r.fixture);
      expect(adapter.getHours(r.instance.value()!)).toBe(15);

      r.instance.readonly.set(true);
      await flush(r.fixture);

      pressKey(timeSeg('hour'), 'ArrowUp');
      await flush(r.fixture);
      expect(adapter.getHours(r.instance.value()!)).toBe(15);
    });

    it('clamps a time-field commit to the picker date bounds', async () => {
      const r = renderHost(DateTimeHost);
      const max = new Date(2026, 5, 15, 14, 30);
      r.instance.maxDate.set(max);
      r.instance.value.set(new Date(2026, 5, 15, 14, 30));
      await open(r);

      pressKey(timeSeg('hour'), 'ArrowUp');
      await flush(r.fixture);

      expect(r.instance.value()!.getTime()).toBe(max.getTime());
    });

    it('renders the value with its time component', async () => {
      const r = renderHost(DateTimeHost);
      r.instance.value.set(new Date(2026, 5, 20, 14, 30));
      await flush(r.fixture);
      expect(r.query('[forDatePickerValue]')!.textContent).toContain('14:30');
    });

    it('requires a time-capable adapter (assertTimeCapable contract)', () => {
      const dayOnly = {
        today: () => new Date(),
      } as unknown as DateAdapter<Date>;
      expect(() => assertTimeCapable(dayOnly, 'ForDatePicker')).toThrow(/time-capable/);
    });
  });

  describe('Signal Forms via [formField]', () => {
    interface Profile {
      dob: Date | null;
    }

    @Component({
      imports: [
        ForDatePicker,
        ForDatePickerTrigger,
        ForDatePickerContent,
        ForDatePickerValue,
        FormField,
        ...CALENDAR_PIECES,
      ],
      providers: [...provideNativeDateAdapter()],
      template: `
        <div
          forDatePicker
          [formField]="profile.dob"
          [(open)]="open"
          [ariaLabel]="'Choose date'"
          #picker="forDatePicker"
        >
          <button data-testid="trigger" forDatePickerTrigger>
            <span forDatePickerValue [placeholder]="'Pick a date'"></span>
          </button>
          @if (open()) {
            <div forDatePickerContent>
              <div forCalendar [(value)]="picker.value">
                <table forCalendarGrid #grid="forCalendarGrid">
                  <thead forCalendarGridHeader>
                    <tr>
                      @for (day of grid.weekDays(); track day.key) {
                        <th scope="col">{{ day.short }}</th>
                      }
                    </tr>
                  </thead>
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
    class FormHost {
      readonly open = signal(false);
      readonly model = signal<Profile>({ dob: null });
      readonly profile = form(this.model, (p) => {
        requiredRule(p.dob);
      });
    }

    it('flows schema-driven required onto the trigger', async () => {
      const r = renderHost(FormHost);
      await flush(r.fixture);
      expect(r.query('[forDatePickerTrigger]')!.getAttribute('aria-required')).toBe('true');
    });

    it('writes a grid selection back into the bound form model', async () => {
      const r = renderHost(FormHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      // June 2026 is visible (focused date defaults to today, 2026-06-03).
      cell('2026-6-12')!.click();
      await flush(r.fixture);

      expect(r.instance.model().dob?.getTime()).toBe(new Date(2026, 5, 12).getTime());
      expect(r.instance.open()).toBe(false);
    });
  });

  describe('zoneless reactivity', () => {
    it('reflects open + value transitions without Zone.js', async () => {
      const r = renderHost(Host);
      r.instance.open.set(true);
      await flush(r.fixture);
      expect(content()).not.toBeNull();

      r.instance.value.set(new Date(2026, 0, 9));
      await flush(r.fixture);
      expect(value(r).textContent).toContain('2026');

      r.instance.open.set(false);
      await flush(r.fixture);
      expect(content()).toBeNull();
    });
  });
});
