import { Component, signal } from '@angular/core';
import { form, FormField, required as requiredRule } from '@angular/forms/signals';

import {
  afterEachOverlayCleanup,
  flush,
  renderHost,
  type RenderResult,
} from '../../src/test-utils';
import {
  assertFormControlContract,
  assertOverlayTriggerAriaContract,
  type FormControlMountResult,
} from '../../src/test-utils/contract';
import {
  ForCalendar,
  ForCalendarCell,
  ForCalendarGrid,
  NativeDateAdapter,
  provideNativeDateAdapter,
} from 'forty-cdk/calendar';
import { type DateRange } from 'forty-cdk/shared';

import { ForDatePickerContent } from './date-picker-content';
import { ForDatePickerTrigger } from './date-picker-trigger';
import { ForDatePickerValue } from './date-picker-value';
import { ForDateRangePicker } from './date-range-picker';

const adapter = new NativeDateAdapter();

const CALENDAR_PIECES = [ForCalendar, ForCalendarGrid, ForCalendarCell];

@Component({
  imports: [
    ForDateRangePicker,
    ForDatePickerTrigger,
    ForDatePickerContent,
    ForDatePickerValue,
    ...CALENDAR_PIECES,
  ],
  providers: [...provideNativeDateAdapter()],
  template: `
    <div
      forDateRangePicker
      [(value)]="value"
      [(open)]="open"
      (openChange)="openChanges.push($event)"
      [minDate]="minDate()"
      [maxDate]="maxDate()"
      [disabled]="disabled()"
      [readonly]="readonly()"
      [closeOnSelect]="closeOnSelect()"
      [rangeSeparator]="separator()"
      [locale]="locale()"
      [ariaLabel]="ariaLabel()"
      name="stay"
      #picker="forDateRangePicker"
    >
      <button data-testid="trigger" forDatePickerTrigger>
        <span forDatePickerValue [placeholder]="'Pick a range'"></span>
      </button>

      @if (open()) {
        <div forDatePickerContent data-testid="content">
          <div
            forCalendar
            selectionMode="range"
            [(range)]="value"
            [min]="picker.minDate()"
            [max]="picker.maxDate()"
          >
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
class Host {
  readonly value = signal<DateRange<Date> | null>(null);
  readonly open = signal(false);
  readonly minDate = signal<Date | null>(null);
  readonly maxDate = signal<Date | null>(null);
  readonly disabled = signal(false);
  readonly readonly = signal(false);
  readonly closeOnSelect = signal(true);
  readonly separator = signal(' – ');
  readonly locale = signal<string | null>(null);
  readonly ariaLabel = signal<string | null>('Choose date range');
  readonly openChanges: boolean[] = [];
}

@Component({
  imports: [ForDateRangePicker, ForDatePickerTrigger],
  providers: [...provideNativeDateAdapter()],
  template: `
    <div
      forDateRangePicker
      [(value)]="value"
      [disabled]="isDisabled()"
      [required]="isRequired()"
      ariaLabel="Choose date range"
    >
      <button forDatePickerTrigger>Open</button>
    </div>
  `,
})
class RangeFormControlHost {
  readonly value = signal<DateRange<Date> | null>(null);
  readonly isDisabled = signal(false);
  readonly isRequired = signal(false);
}

type R = RenderResult<Host>;

const trigger = (r: R) => r.query<HTMLButtonElement>('[forDatePickerTrigger]')!;
const valueEl = (r: R) => r.query('[forDatePickerValue]')!;
const content = () => document.querySelector<HTMLElement>('[forDatePickerContent]');
const cell = (key: string) => document.querySelector<HTMLElement>(`[data-testid="cell-${key}"]`)!;
const touched = (r: R) => r.query('[forDateRangePicker]')!.hasAttribute('data-touched');

async function open(r: R): Promise<void> {
  trigger(r).click();
  await flush(r.fixture);
}

describe('ForDateRangePicker', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 5, 15));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  afterEachOverlayCleanup();

  assertFormControlContract(
    () => {
      const r = renderHost(RangeFormControlHost);
      const result: FormControlMountResult = {
        control: r.query<HTMLButtonElement>('[forDatePickerTrigger]')!,
        flush: r.flush,
        setFlag: (flag, flagValue) => {
          switch (flag) {
            case 'disabled':
              r.instance.isDisabled.set(flagValue);
              return;
            case 'required':
              r.instance.isRequired.set(flagValue);
              return;
          }
        },
      };
      return result;
    },
    { flags: ['disabled', 'required'] },
  );

  assertOverlayTriggerAriaContract(
    {
      mount: async () => {
        const r = renderHost(Host);
        await flush(r.fixture);
        return {
          trigger: trigger(r),
          flush: () => flush(r.fixture),
          open: () => r.instance.open.set(true),
          surface: () => content()!,
        };
      },
    },
    { haspopup: 'dialog' },
  );

  describe('structure & ARIA', () => {
    it('wires the trigger as a native button', () => {
      const r = renderHost(Host);
      expect(trigger(r).getAttribute('type')).toBe('button');
    });

    it('gives the open surface role=dialog and the configured accessible name', async () => {
      const r = renderHost(Host);
      await open(r);

      const surface = content()!;
      expect(surface.getAttribute('role')).toBe('dialog');
      expect(surface.getAttribute('aria-label')).toBe('Choose date range');
    });

    it('reflects data-state on the root and trigger', async () => {
      const r = renderHost(Host);
      const root = r.query('[forDateRangePicker]')!;
      expect(root.getAttribute('data-state')).toBe('closed');
      expect(trigger(r).getAttribute('data-state')).toBe('closed');

      await open(r);
      expect(root.getAttribute('data-state')).toBe('open');
      expect(content()!.getAttribute('data-state')).toBe('open');
    });

    it('portals the surface directly under document.body', async () => {
      const r = renderHost(Host);
      await open(r);
      expect(content()!.parentElement).toBe(document.body);
    });
  });

  describe('two-click commit (range as the form value)', () => {
    it('keeps value null on the first click and commits the ordered range on the second, then closes', async () => {
      const r = renderHost(Host);
      await open(r);

      cell('2026-6-10').click();
      await flush(r.fixture);
      expect(r.instance.value()).toBeNull();
      expect(content()).not.toBeNull();

      cell('2026-6-15').click();
      await flush(r.fixture);

      const range = r.instance.value();
      expect(adapter.isSameDay(range!.start, new Date(2026, 5, 10))).toBe(true);
      expect(adapter.isSameDay(range!.end, new Date(2026, 5, 15))).toBe(true);
      expect(content()).toBeNull();
      expect(touched(r)).toBe(true);
    });

    it('keeps the surface open after commit when closeOnSelect is false', async () => {
      const r = renderHost(Host);
      r.instance.closeOnSelect.set(false);
      await open(r);

      cell('2026-6-10').click();
      await flush(r.fixture);
      cell('2026-6-15').click();
      await flush(r.fixture);

      expect(r.instance.value()).not.toBeNull();
      expect(r.instance.open()).toBe(true);
    });
  });

  describe('disabled', () => {
    it('reflects native disabled / data-disabled — never aria-disabled — and blocks opening', async () => {
      const r = renderHost(Host);
      r.instance.disabled.set(true);
      await flush(r.fixture);

      const t = trigger(r);
      expect(t.hasAttribute('aria-disabled')).toBe(false);
      expect(t.hasAttribute('disabled')).toBe(true);
      expect(r.query('[forDateRangePicker]')!.getAttribute('data-disabled')).toBe('');

      t.click();
      await flush(r.fixture);
      expect(r.instance.open()).toBe(false);
    });
  });

  describe('selection bridge ignores readonly / disabled', () => {
    // The calendar is bound one-way (`[range]="picker.value()"`) so the picker's
    // bridge is the sole write path — the bridge's readonly / disabled guard is
    // what blocks the commit (a two-way `[(range)]` would let the un-disabled
    // calendar write straight through, bypassing the guard).
    @Component({
      imports: [ForDateRangePicker, ForDatePickerTrigger, ForDatePickerContent, ...CALENDAR_PIECES],
      providers: [...provideNativeDateAdapter()],
      template: `
        <div
          forDateRangePicker
          [(value)]="value"
          [(open)]="open"
          [disabled]="disabled()"
          [readonly]="readonly()"
          #picker="forDateRangePicker"
        >
          <button data-testid="trigger" forDatePickerTrigger>Open</button>
          @if (open()) {
            <div forDatePickerContent>
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
    class GuardHost {
      readonly value = signal<DateRange<Date> | null>(null);
      readonly open = signal(false);
      readonly disabled = signal(false);
      readonly readonly = signal(false);
    }

    type GR = RenderResult<GuardHost>;
    const guardTouched = (r: GR) => r.query('[forDateRangePicker]')!.hasAttribute('data-touched');

    async function commit(r: GR): Promise<void> {
      cell('2026-6-10').click();
      await flush(r.fixture);
      cell('2026-6-15').click();
      await flush(r.fixture);
    }

    it('a readonly picker ignores a committed range (no value/touched change)', async () => {
      const r = renderHost(GuardHost);
      r.instance.readonly.set(true);
      r.instance.open.set(true);
      await flush(r.fixture);

      await commit(r);

      expect(r.instance.value()).toBeNull();
      expect(guardTouched(r)).toBe(false);
    });

    it('a disabled picker ignores a committed range (no value/touched change)', async () => {
      const r = renderHost(GuardHost);
      r.instance.disabled.set(true);
      r.instance.open.set(true);
      await flush(r.fixture);

      await commit(r);

      expect(r.instance.value()).toBeNull();
      expect(guardTouched(r)).toBe(false);
    });
  });

  describe('value rendering', () => {
    it('shows the placeholder while empty and start – end once committed', async () => {
      const r = renderHost(Host);
      expect(valueEl(r).textContent?.trim()).toBe('Pick a range');
      expect(valueEl(r).getAttribute('data-placeholder')).toBe('');

      r.instance.value.set({ start: new Date(2026, 5, 10), end: new Date(2026, 5, 15) });
      await flush(r.fixture);

      const text = valueEl(r).textContent ?? '';
      expect(text).toContain('2026');
      expect(text).toContain(' – ');
      expect(valueEl(r).hasAttribute('data-placeholder')).toBe(false);
    });

    it('honours a custom rangeSeparator', async () => {
      const r = renderHost(Host);
      r.instance.separator.set(' to ');
      r.instance.value.set({ start: new Date(2026, 5, 10), end: new Date(2026, 5, 15) });
      await flush(r.fixture);

      expect(valueEl(r).textContent ?? '').toContain(' to ');
    });

    it('formats both endpoints through [locale] (#1247)', async () => {
      const r = renderHost(Host);
      r.instance.value.set({ start: new Date(2026, 0, 10), end: new Date(2026, 2, 15) });

      r.instance.locale.set('en-US');
      await flush(r.fixture);
      const en = valueEl(r).textContent!.trim();

      r.instance.locale.set('fr-FR');
      await flush(r.fixture);
      const fr = valueEl(r).textContent!.trim();

      expect(en).toContain('January');
      expect(en).toContain('March');
      expect(fr).toContain('janvier');
      expect(fr).toContain('mars');
      expect(en).not.toBe(fr);
    });

    it('leaves the default (null locale) output identical to a locale-less adapter format (#1247)', async () => {
      const r = renderHost(Host);
      const start = new Date(2026, 0, 10);
      const end = new Date(2026, 2, 15);
      r.instance.value.set({ start, end });
      await flush(r.fixture);

      const fmtOpts = { year: 'numeric', month: 'long', day: 'numeric' } as const;
      const sep = r.instance.separator();
      expect(valueEl(r).textContent!.trim()).toBe(
        `${adapter.format(start, fmtOpts)}${sep}${adapter.format(end, fmtOpts)}`,
      );
    });
  });

  describe('bounds forwarding', () => {
    it('forwards minDate to the projected calendar', async () => {
      const r = renderHost(Host);
      r.instance.minDate.set(new Date(2026, 5, 10));
      await open(r);

      expect(cell('2026-6-5').getAttribute('aria-disabled')).toBe('true');
      expect(cell('2026-6-20').hasAttribute('aria-disabled')).toBe(false);
    });
  });

  describe('native hidden inputs', () => {
    it('mirrors the committed range into <name>-start / <name>-end inputs', async () => {
      const r = renderHost(Host);
      r.instance.value.set({ start: new Date(2026, 5, 10), end: new Date(2026, 5, 15) });
      await flush(r.fixture);

      const start = document.querySelector<HTMLInputElement>('input[name="stay-start"]');
      const end = document.querySelector<HTMLInputElement>('input[name="stay-end"]');
      expect(start!.value).toBe('2026-06-10');
      expect(end!.value).toBe('2026-06-15');
    });

    it('mounts no hidden inputs while the range is null', async () => {
      const r = renderHost(Host);
      await flush(r.fixture);
      expect(document.querySelector('input[name="stay-start"]')).toBeNull();
      expect(document.querySelector('input[name="stay-end"]')).toBeNull();
    });
  });

  describe('Signal Forms via [formField]', () => {
    interface Booking {
      stay: DateRange<Date> | null;
    }

    @Component({
      imports: [
        ForDateRangePicker,
        ForDatePickerTrigger,
        ForDatePickerContent,
        ForDatePickerValue,
        FormField,
        ...CALENDAR_PIECES,
      ],
      providers: [...provideNativeDateAdapter()],
      template: `
        <div
          forDateRangePicker
          [formField]="booking.stay"
          [(open)]="open"
          [ariaLabel]="'Choose date range'"
          #picker="forDateRangePicker"
        >
          <button data-testid="trigger" forDatePickerTrigger>
            <span forDatePickerValue [placeholder]="'Pick a range'"></span>
          </button>
          @if (open()) {
            <div forDatePickerContent>
              <div forCalendar selectionMode="range" [(range)]="picker.value">
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
    class FormHost {
      readonly open = signal(false);
      readonly model = signal<Booking>({ stay: null });
      readonly booking = form(this.model, (p) => {
        requiredRule(p.stay);
      });
    }

    it('flows schema-driven required onto the trigger', async () => {
      const r = renderHost(FormHost);
      await flush(r.fixture);
      expect(r.query('[forDatePickerTrigger]')!.getAttribute('aria-required')).toBe('true');
    });

    it('writes a committed grid range back into the bound composite form model', async () => {
      const r = renderHost(FormHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      cell('2026-6-10').click();
      await flush(r.fixture);
      cell('2026-6-15').click();
      await flush(r.fixture);

      const stay = r.instance.model().stay;
      expect(adapter.isSameDay(stay!.start, new Date(2026, 5, 10))).toBe(true);
      expect(adapter.isSameDay(stay!.end, new Date(2026, 5, 15))).toBe(true);
      expect(r.instance.open()).toBe(false);
    });
  });

  describe('zoneless reactivity', () => {
    it('commits a range via the grid and reflects it without Zone.js', async () => {
      const r = renderHost(Host);
      r.instance.open.set(true);
      await flush(r.fixture);

      cell('2026-6-10').click();
      await flush(r.fixture);
      cell('2026-6-15').click();
      await flush(r.fixture);

      const range = r.instance.value();
      expect(adapter.isSameDay(range!.start, new Date(2026, 5, 10))).toBe(true);
      expect(adapter.isSameDay(range!.end, new Date(2026, 5, 15))).toBe(true);

      r.instance.open.set(false);
      await flush(r.fixture);
      expect(content()).toBeNull();
    });
  });
});
