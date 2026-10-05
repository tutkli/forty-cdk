import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  Directive,
  ErrorHandler,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import {
  disabled as disabledRule,
  form,
  FormField,
  readonly as readonlyRule,
  required as requiredRule,
} from '@angular/forms/signals';

import {
  afterEachOverlayCleanup,
  flush,
  renderHost,
  type RenderResult,
} from '../../src/test-utils';
import {
  assertDataStateContract,
  assertDismissibleLayerContract,
  assertFormControlContract,
  assertOverlayTriggerAriaContract,
  type DismissibleLayerMountOptions,
  type FormControlMountResult,
} from '../../src/test-utils/contract';
import {
  assertTimeCapable,
  type FieldGranularity,
  FOR_TIME_VALUE_SOURCE,
  type VetoableNativeEvent,
} from 'forty-cdk/core';
import { type DateAdapter } from 'forty-cdk/date-adapter';
import { ForDateField, ForDateFieldLiteral, ForDateFieldSegment } from 'forty-cdk/date-field';
import { NativeDateAdapter, provideNativeDateAdapter } from 'forty-cdk/shared';
import {
  FOR_CALENDAR_CONTEXT,
  ForCalendar,
  ForCalendarCell,
  ForCalendarGrid,
  ForCalendarGridHeader,
} from 'forty-cdk/calendar';
import {
  FOR_TIME_FIELD_CONTEXT,
  ForTimeField,
  ForTimeFieldLiteral,
  ForTimeFieldSegment,
} from 'forty-cdk/time-field';
import {
  ForTimePicker,
  ForTimePickerContent,
  ForTimePickerOption,
  ForTimePickerTrigger,
} from 'forty-cdk/time-picker';
import { ForField, ForFieldDescription, ForFieldError, ForLabel } from 'forty-cdk/field';
import { provideInternationalizedDateAdapter } from 'forty-cdk/internationalized-date';
import { pressKey, pressWithMouse } from 'forty-cdk/testing';

import { ForDatePicker } from './date-picker';
import { ForDatePickerAnchor } from './date-picker-anchor';
import { ForDatePickerContent } from './date-picker-content';
import { provideForDatePickerDefaults } from 'forty-cdk/defaults';
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
      [locale]="locale()"
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
  readonly locale = signal<string | null>(null);
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

@Component({
  imports: [ForDatePicker, ForDatePickerTrigger],
  providers: [...provideNativeDateAdapter()],
  template: `
    <div
      forDatePicker
      [(value)]="value"
      [disabled]="isDisabled()"
      [readonly]="isReadonly()"
      [required]="isRequired()"
      ariaLabel="Choose date"
    >
      <button forDatePickerTrigger>Open</button>
    </div>
  `,
})
class DatePickerFormControlHost {
  readonly value = signal<Date | null>(null);
  readonly isDisabled = signal(false);
  readonly isReadonly = signal(false);
  readonly isRequired = signal(false);
}

@Component({
  imports: [ForDatePicker, ForDatePickerTrigger, ForDatePickerContent, ...CALENDAR_PIECES],
  providers: [...provideNativeDateAdapter()],
  template: `
    <div
      forDatePicker
      [(open)]="open"
      [modal]="modal()"
      [dismissible]="dismissible()"
      (escapeKeyDown)="onEscape($event)"
      (pointerDownOutside)="onPointer($event)"
      (focusOutside)="onFocus($event)"
      (interactOutside)="onInteract($event)"
      ariaLabel="Choose date"
    >
      <button forDatePickerTrigger>Open</button>
      @if (open()) {
        <div forDatePickerContent>
          <div forCalendar>
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
                      <td forCalendarCell [date]="c.date">{{ c.label }}</td>
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
class DatePickerDismissContractHost {
  readonly open = signal(false);
  readonly modal = signal(false);
  readonly dismissible = signal(true);
  escapeVeto = false;
  pointerVeto = false;
  eCount = 0;
  pCount = 0;
  fCount = 0;
  iCount = 0;
  onEscape(event: VetoableNativeEvent<KeyboardEvent>): void {
    this.eCount += 1;
    if (this.escapeVeto) event.preventDefault();
  }
  onPointer(event: VetoableNativeEvent<PointerEvent>): void {
    this.pCount += 1;
    if (this.pointerVeto) event.preventDefault();
  }
  onFocus(_event: VetoableNativeEvent<FocusEvent>): void {
    this.fCount += 1;
  }
  onInteract(_event: VetoableNativeEvent<PointerEvent | FocusEvent>): void {
    this.iCount += 1;
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
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 5, 15));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  afterEachOverlayCleanup();

  assertDataStateContract({
    vocabulary: ['closed', 'open'],
    mount: () => {
      const r = renderHost(Host);
      return {
        pieces: () => ({
          root: r.query<HTMLElement>('[forDatePicker]'),
          trigger: r.query<HTMLElement>('[forDatePickerTrigger]'),
          content: content(),
        }),
        setState: (state) => r.instance.open.set(state === 'open'),
        flush: r.flush,
      };
    },
  });

  // Two shells, two layers: `[modal]` swaps `injectOverlayShell` for
  // `injectModalShell`, and the modal one has the shell decide the close that
  // the root decides on the anchored path. The `describe('modal')` block below
  // asserted `aria-modal` and nothing about dismissal
  // ([#1655](https://github.com/tutkli/forty-cdk/issues/1655)).
  const mountDismissContract =
    (modal: boolean) =>
    async (options: DismissibleLayerMountOptions = {}) => {
      const r = renderHost(DatePickerDismissContractHost);
      r.instance.modal.set(modal);
      r.instance.dismissible.set(options.dismissible ?? true);
      r.instance.escapeVeto = options.escapeVeto ?? false;
      r.instance.pointerVeto = options.pointerVeto ?? false;
      r.instance.open.set(true);
      await flush(r.fixture);
      return {
        flush: () => flush(r.fixture),
        isOpen: () => r.instance.open(),
        escapeCount: () => r.instance.eCount,
        pointerOutsideCount: () => r.instance.pCount,
        focusOutsideCount: () => r.instance.fCount,
        interactOutsideCount: () => r.instance.iCount,
      };
    };

  assertDismissibleLayerContract({ mount: mountDismissContract(false) }, { label: 'anchored' });
  assertDismissibleLayerContract({ mount: mountDismissContract(true) }, { label: 'modal' });

  assertFormControlContract(
    () => {
      const r = renderHost(DatePickerFormControlHost);
      const result: FormControlMountResult = {
        control: r.query<HTMLButtonElement>('[forDatePickerTrigger]')!,
        flush: r.flush,
        setFlag: (flag, flagValue) => {
          switch (flag) {
            case 'disabled':
              r.instance.isDisabled.set(flagValue);
              return;
            case 'readonly':
              r.instance.isReadonly.set(flagValue);
              return;
            case 'required':
              r.instance.isRequired.set(flagValue);
              return;
          }
        },
      };
      return result;
    },
    { flags: ['disabled', 'readonly', 'required'] },
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

    it('gives the trigger role=combobox so its form-control ARIA is supported', () => {
      const r = renderHost(Host);
      expect(trigger(r).getAttribute('role')).toBe('combobox');
    });

    it('gives the open surface role=dialog and the configured accessible name', async () => {
      const r = renderHost(Host);
      await openPicker(r);

      const surface = content()!;
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
  });

  describe('orphan errors', () => {
    it('throws from ForDatePickerTrigger on first change detection', () => {
      @Component({
        imports: [ForDatePickerTrigger],
        template: `<button forDatePickerTrigger></button>`,
      })
      class Orphan {}

      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(Orphan);
      let error: unknown;
      try {
        fixture.detectChanges();
      } catch (e) {
        error = e;
      }
      expect(error).toBeInstanceOf(Error);
      const message = (error as Error).message;
      expect(message).toMatch(
        /\[forty-cdk\/date-picker\] FORCDK-DATE-PICKER-004: \[forDatePickerTrigger\] could not resolve/,
      );
      expect(message).toMatch(/declaration site/);
      expect(message).toMatch(/\[forDatePickerTrigger\]="root"/);
      expect(message).toMatch(/#root="forDatePicker"/);
    });

    it('throws when [forDatePickerAnchor] is used outside [forDatePicker]', () => {
      @Component({
        imports: [ForDatePickerAnchor],
        template: `<div forDatePickerAnchor></div>`,
      })
      class Orphan {}

      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      expect(() => TestBed.createComponent(Orphan)).toThrow(
        /\[forty-cdk\/date-picker\] FORCDK-DATE-PICKER-003: ForDatePickerAnchor must be used inside a \[forDatePicker\] element\./,
      );
    });
  });

  describe('anchor (separate positioning element)', () => {
    @Component({
      imports: [ForDatePicker, ForDatePickerAnchor, ForDatePickerTrigger, ForDatePickerContent],
      providers: [...provideNativeDateAdapter()],
      template: `
        <div forDatePicker [(open)]="open" [(value)]="value">
          @if (showAnchor()) {
            <div data-testid="anchor" forDatePickerAnchor>
              <button forDatePickerTrigger>Open</button>
            </div>
          } @else {
            <button forDatePickerTrigger>Open</button>
          }
          @if (open()) {
            <div forDatePickerContent>surface</div>
          }
        </div>
      `,
    })
    class AnchorHost {
      readonly open = signal(false);
      readonly value = signal<Date | null>(null);
      readonly showAnchor = signal(true);
    }

    it('mounts the surface with [forDatePickerAnchor] registered alongside the trigger', async () => {
      const r = renderHost(AnchorHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      expect(r.query<HTMLElement>('[data-testid="anchor"]')).not.toBeNull();
      expect(r.query<HTMLButtonElement>('[forDatePickerTrigger]')).not.toBeNull();
      expect(document.querySelector<HTMLElement>('[forDatePickerContent]')).not.toBeNull();
    });

    it('lets the trigger keep driving aria-controls and the toggle even with an anchor', async () => {
      const r = renderHost(AnchorHost);
      const t = r.query<HTMLButtonElement>('[forDatePickerTrigger]')!;
      expect(t.getAttribute('aria-haspopup')).toBe('dialog');

      t.click();
      await flush(r.fixture);

      const surface = document.querySelector<HTMLElement>('[forDatePickerContent]')!;
      expect(t.getAttribute('aria-expanded')).toBe('true');
      expect(t.getAttribute('aria-controls')).toBe(surface.id);
    });

    it('restores the trigger fallback after the anchor is torn down inside @if', async () => {
      const r = renderHost(AnchorHost);
      r.instance.open.set(true);
      await flush(r.fixture);
      expect(r.query<HTMLElement>('[data-testid="anchor"]')).not.toBeNull();

      r.instance.open.set(false);
      r.instance.showAnchor.set(false);
      await flush(r.fixture);
      expect(r.query<HTMLElement>('[data-testid="anchor"]')).toBeNull();

      r.query<HTMLButtonElement>('[forDatePickerTrigger]')!.click();
      await flush(r.fixture);
      expect(document.querySelector<HTMLElement>('[forDatePickerContent]')).not.toBeNull();
    });

    it('reacts to anchor registration', async () => {
      const r = renderHost(AnchorHost);
      r.instance.showAnchor.set(false);
      await flush(r.fixture);
      r.instance.open.set(true);
      await flush(r.fixture);
      expect(document.querySelector<HTMLElement>('[forDatePickerContent]')).not.toBeNull();

      r.instance.open.set(false);
      r.instance.showAnchor.set(true);
      await flush(r.fixture);
      r.instance.open.set(true);
      await flush(r.fixture);
      expect(r.query<HTMLElement>('[data-testid="anchor"]')).not.toBeNull();
      expect(document.querySelector<HTMLElement>('[forDatePickerContent]')).not.toBeNull();
    });

    it('warns once when two [forDatePickerAnchor] are registered inside the same [forDatePicker]', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      @Component({
        imports: [ForDatePicker, ForDatePickerAnchor, ForDatePickerTrigger],
        providers: [...provideNativeDateAdapter()],
        template: `
          <div forDatePicker>
            <div forDatePickerAnchor></div>
            <div forDatePickerAnchor></div>
            <button forDatePickerTrigger>Open</button>
          </div>
        `,
      })
      class TwoAnchorsHost {}

      renderHost(TwoAnchorsHost);

      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0]![0]).toMatch(
        /\[forty-cdk\/date-picker\] FORCDK-CORE-005: A picker root coordinates a single \[forDatePickerAnchor\], but 2 are registered/,
      );
    });

    it('does not warn when a structural swap mounts the replacement [forDatePickerAnchor] first', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      @Component({
        imports: [ForDatePicker, ForDatePickerAnchor, ForDatePickerTrigger],
        providers: [...provideNativeDateAdapter()],
        template: `
          <div forDatePicker>
            @if (mode() === 'a') {
              <div forDatePickerAnchor data-test-id="a"></div>
            }
            @if (mode() === 'b') {
              <div forDatePickerAnchor data-test-id="b"></div>
            }
            <button forDatePickerTrigger>Open</button>
          </div>
        `,
      })
      class AnchorSwapHost {
        readonly mode = signal<'a' | 'b'>('b');
      }

      const swap = renderHost(AnchorSwapHost);
      swap.instance.mode.set('a');
      await swap.flush();

      expect(swap.query('[data-test-id="a"]')).not.toBeNull();
      expect(warn).not.toHaveBeenCalled();
    });
  });

  describe('explicit root reference (stamped templates)', () => {
    @Component({
      imports: [
        ForDatePicker,
        ForDatePickerTrigger,
        ForDatePickerContent,
        ForCalendar,
        ForCalendarGrid,
        ForCalendarCell,
        NgTemplateOutlet,
      ],
      providers: [...provideNativeDateAdapter()],
      template: `
        <ng-template #trig let-root="root">
          <button type="button" [forDatePickerTrigger]="root">Pick</button>
        </ng-template>

        <div forDatePicker [(value)]="value" [(open)]="open" #root="forDatePicker">
          <ng-container [ngTemplateOutlet]="trig" [ngTemplateOutletContext]="{ root }" />
          @if (open()) {
            <div forDatePickerContent>
              <div forCalendar [(value)]="value">
                <table forCalendarGrid #grid="forCalendarGrid">
                  <tbody>
                    @for (week of grid.weeks(); track week.key) {
                      <tr>
                        @for (c of week.days; track c.key) {
                          <td forCalendarCell [date]="c.date">{{ c.label }}</td>
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
    class StampedHost {
      readonly value = signal<Date | null>(null);
      readonly open = signal(false);
    }

    it('opens on click when the root is passed explicitly', async () => {
      const r = renderHost(StampedHost);
      const t = r.query<HTMLButtonElement>('button')!;

      t.click();
      await flush(r.fixture);

      expect(r.instance.open()).toBe(true);
      expect(t.getAttribute('data-state')).toBe('open');
      expect(t.getAttribute('aria-expanded')).toBe('true');
      expect(document.querySelector('[forDatePickerContent]')).not.toBeNull();
    });

    it('open state stays reactive through the explicit reference', async () => {
      const r = renderHost(StampedHost);
      const t = r.query<HTMLButtonElement>('button')!;

      r.instance.open.set(true);
      await flush(r.fixture);
      expect(t.getAttribute('data-state')).toBe('open');
      expect(t.getAttribute('aria-controls')).not.toBeNull();

      r.instance.open.set(false);
      await flush(r.fixture);
      expect(t.getAttribute('data-state')).toBe('closed');
      expect(t.hasAttribute('aria-controls')).toBe(false);
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

      // A real outside pointer-down routes through the dismissible layer's
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

    it('a readonly picker keeps the committed cell selected in its one-way bound calendar', async () => {
      const r = renderHost(GuardHost);
      r.instance.readonly.set(true);
      r.instance.value.set(new Date(2026, 5, 15));
      r.instance.open.set(true);
      await flush(r.fixture);

      cell('2026-6-20')!.click();
      await flush(r.fixture);

      expect(cell('2026-6-20')!.getAttribute('aria-selected')).toBe('false');
      expect(cell('2026-6-20')!.hasAttribute('data-selected')).toBe(false);
      expect(cell('2026-6-15')!.getAttribute('aria-selected')).toBe('true');
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

    it('formats the value through [locale] (#1247)', async () => {
      const r = renderHost(Host);
      r.instance.value.set(new Date(2026, 0, 15));

      r.instance.locale.set('en-US');
      await flush(r.fixture);
      const en = value(r).textContent!.trim();

      r.instance.locale.set('fr-FR');
      await flush(r.fixture);
      const fr = value(r).textContent!.trim();

      expect(en).toContain('January');
      expect(fr).toContain('janvier');
      expect(en).not.toBe(fr);
    });

    it('leaves the default (null locale) output identical to a locale-less adapter format (#1247)', async () => {
      const r = renderHost(Host);
      const date = new Date(2026, 0, 15);
      r.instance.value.set(date);
      await flush(r.fixture);

      expect(value(r).textContent!.trim()).toBe(
        adapter.format(date, { year: 'numeric', month: 'long', day: 'numeric' }),
      );
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

    it('opens on the minDate month and focuses the minDate when today is before it', async () => {
      const r = renderHost(Host);
      r.instance.minDate.set(new Date(2026, 7, 10));
      await openPicker(r);

      expect(document.activeElement).toBe(cell('2026-8-10'));
      expect(cell('2026-8-10')!.getAttribute('tabindex')).toBe('0');
      expect(cell('2026-8-10')!.hasAttribute('aria-disabled')).toBe(false);
    });

    it('opens on the maxDate month and focuses the maxDate when today is after it', async () => {
      const r = renderHost(Host);
      r.instance.maxDate.set(new Date(2008, 2, 10));
      await openPicker(r);

      expect(document.activeElement).toBe(cell('2008-3-10'));
      expect(cell('2008-3-10')!.getAttribute('tabindex')).toBe('0');
      expect(cell('2008-3-10')!.hasAttribute('aria-disabled')).toBe(false);
    });
  });

  describe('disabled', () => {
    it('reflects native disabled only — never aria-disabled — and blocks opening', async () => {
      const r = renderHost(Host);
      r.instance.disabled.set(true);
      await flush(r.fixture);

      const t = trigger(r);
      expect(t.hasAttribute('aria-disabled')).toBe(false);
      expect(t.hasAttribute('disabled')).toBe(true);
      expect(r.query('[forDatePicker]')!.getAttribute('data-disabled')).toBe('');

      t.click();
      await flush(r.fixture);
      expect(r.instance.open()).toBe(false);
    });
  });

  describe('readonly', () => {
    it('reflects data-readonly on the root while read-only, and clears it', async () => {
      const r = renderHost(Host);
      const root = r.query('[forDatePicker]')!;
      expect(root.hasAttribute('data-readonly')).toBe(false);

      r.instance.readonly.set(true);
      await flush(r.fixture);
      expect(root.getAttribute('data-readonly')).toBe('');

      r.instance.readonly.set(false);
      await flush(r.fixture);
      expect(root.hasAttribute('data-readonly')).toBe(false);
    });

    it('makes a two-way bound calendar read-only: a pick commits nothing and selects no cell', async () => {
      const r = renderHost(Host);
      r.instance.readonly.set(true);
      await openPicker(r);

      expect(document.querySelector('[forCalendar]')!.getAttribute('data-readonly')).toBe('');

      cell('2026-6-20')!.click();
      await flush(r.fixture);
      pressKey(cell('2026-6-15')!, 'Enter');
      await flush(r.fixture);

      expect(r.instance.value()).toBeNull();
      expect(cell('2026-6-20')!.getAttribute('aria-selected')).toBe('false');
      expect(cell('2026-6-15')!.getAttribute('aria-selected')).toBe('false');
      expect(r.instance.open()).toBe(true);
    });

    it('makes a two-way bound calendar disabled while the picker is disabled', async () => {
      const r = renderHost(Host);
      r.instance.disabled.set(true);
      r.instance.open.set(true);
      await flush(r.fixture);

      expect(document.querySelector('[forCalendar]')!.getAttribute('data-disabled')).toBe('');
      expect(cell('2026-6-20')!.getAttribute('aria-disabled')).toBe('true');

      cell('2026-6-20')!.click();
      await flush(r.fixture);

      expect(r.instance.value()).toBeNull();
      expect(cell('2026-6-20')!.getAttribute('aria-selected')).toBe('false');
    });
  });

  describe('trigger keyboard', () => {
    for (const [label, key, options] of [
      ['ArrowDown', 'ArrowDown', {}],
      ['Alt+ArrowDown', 'ArrowDown', { altKey: true }],
      ['ArrowUp', 'ArrowUp', {}],
    ] as const) {
      it(`${label} opens the surface and focuses the calendar's active cell`, async () => {
        const r = renderHost(Host);
        r.instance.value.set(new Date(2026, 5, 18));
        await flush(r.fixture);

        const event = pressKey(trigger(r), key, options);
        await flush(r.fixture);

        expect(event.defaultPrevented).toBe(true);
        expect(r.instance.open()).toBe(true);
        expect(document.activeElement).toBe(cell('2026-6-18'));
      });
    }

    it('ArrowDown keeps an open surface open', async () => {
      const r = renderHost(Host);
      await openPicker(r);

      pressKey(trigger(r), 'ArrowDown');
      await flush(r.fixture);

      expect(r.instance.open()).toBe(true);
    });

    it('ArrowDown does not open a disabled picker', async () => {
      const r = renderHost(Host);
      r.instance.disabled.set(true);
      await flush(r.fixture);

      const event = pressKey(trigger(r), 'ArrowDown');
      await flush(r.fixture);

      expect(event.defaultPrevented).toBe(false);
      expect(r.instance.open()).toBe(false);
    });

    it('ignores other keys', async () => {
      const r = renderHost(Host);

      pressKey(trigger(r), 'ArrowLeft');
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

    it('keeps the picked day when a time segment is cleared then retyped (#1130)', async () => {
      const r = renderHost(DateTimeHost);
      r.instance.value.set(new Date(2026, 5, 15, 14, 30));
      await open(r);

      pressKey(timeSeg('minute'), 'Delete');
      await flush(r.fixture);

      const afterClear = r.instance.value();
      expect(adapter.getDate(afterClear!)).toBe(15);

      pressKey(timeSeg('minute'), 'ArrowUp');
      await flush(r.fixture);

      const value = r.instance.value()!;
      expect(adapter.getYear(value)).toBe(2026);
      expect(adapter.getMonth(value)).toBe(6);
      expect(adapter.getDate(value)).toBe(15);
      expect(adapter.getHours(value)).toBe(14);
    });

    it('grafts a time entered before any day onto today, never the sentinel (#1130)', async () => {
      const r = renderHost(DateTimeHost);
      await open(r);

      pressKey(timeSeg('hour'), '1');
      pressKey(timeSeg('hour'), '4');
      pressKey(timeSeg('minute'), '3');
      pressKey(timeSeg('minute'), '0');
      await flush(r.fixture);

      const value = r.instance.value();
      expect(adapter.getYear(value!)).toBe(2026);
      expect(adapter.getMonth(value!)).toBe(6);
      expect(adapter.getDate(value!)).toBe(15);
      expect(adapter.getHours(value!)).toBe(14);
      expect(adapter.getMinutes(value!)).toBe(30);
    });

    it('does not rewrite the picker value while typing a multi-digit hour (item 2, #16)', async () => {
      const r = renderHost(DateTimeHost);
      r.instance.maxDate.set(new Date(2026, 5, 15, 23, 59));
      r.instance.value.set(new Date(2026, 5, 15, 10, 30));
      await open(r);
      const before = r.instance.value();

      pressKey(timeSeg('hour'), '1');
      await flush(r.fixture);
      expect(r.instance.value()).toBe(before);

      pressKey(timeSeg('hour'), '4');
      await flush(r.fixture);
      expect(r.instance.value()).not.toBe(before);
      expect(adapter.getHours(r.instance.value()!)).toBe(14);
      expect(adapter.getDate(r.instance.value()!)).toBe(15);
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

  describe('date-time granularity on a day-only adapter', () => {
    @Component({
      imports: [ForDatePicker, ForDatePickerTrigger, ForDatePickerContent, ...CALENDAR_PIECES],
      providers: [...provideInternationalizedDateAdapter()],
      template: `
        <div
          forDatePicker
          [(open)]="open"
          [granularity]="granularity()"
          ariaLabel="Choose date"
          #picker="forDatePicker"
        >
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
    class DayOnlyHost {
      readonly open = signal(false);
      readonly granularity = signal<FieldGranularity>('minute');
    }

    function renderCapturing(): {
      fixture: ComponentFixture<DayOnlyHost>;
      messages: () => string;
    } {
      const captured: unknown[] = [];
      class CapturingHandler implements ErrorHandler {
        handleError(err: unknown): void {
          captured.push(err);
        }
      }
      TestBed.configureTestingModule({
        rethrowApplicationErrors: false,
        providers: [
          provideZonelessChangeDetection(),
          { provide: ErrorHandler, useClass: CapturingHandler },
        ],
      });
      const fixture = TestBed.createComponent(DayOnlyHost);
      return {
        fixture,
        messages: () => captured.map((err) => (err as Error).message).join('\n'),
      };
    }

    it('reports nothing while no value needs the time', async () => {
      const { fixture, messages } = renderCapturing();
      await flush(fixture);
      fixture.componentInstance.granularity.set('second');
      await flush(fixture);

      expect(messages()).not.toContain('FORCDK-CORE-003');
    });

    it('reports FORCDK-CORE-003 from the pick that composes the time', async () => {
      const { fixture, messages } = renderCapturing();
      fixture.componentInstance.open.set(true);
      await flush(fixture);

      cell('2026-6-20')!.click();
      await flush(fixture);

      expect(messages()).toContain('FORCDK-CORE-003');
    });
  });

  describe('date-time with projected ForTimePicker', () => {
    @Component({
      imports: [
        ForDatePicker,
        ForDatePickerTrigger,
        ForDatePickerContent,
        ForDatePickerValue,
        ForTimePicker,
        ForTimePickerTrigger,
        ForTimePickerContent,
        ForTimePickerOption,
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
                forTimePicker
                [value]="picker.value()"
                [step]="60"
                [hourCycle]="24"
                #tp="forTimePicker"
              >
                <button forTimePickerTrigger data-testid="tp-trigger"></button>
                @if (tp.open()) {
                  <div forTimePickerContent>
                    @for (slot of tp.slots(); track slot.id) {
                      <div
                        forTimePickerOption
                        [value]="slot.value"
                        [disabled]="slot.disabled"
                        [attr.data-testid]="'tp-slot-' + slot.id"
                      >
                        {{ slot.label }}
                      </div>
                    }
                  </div>
                }
              </div>
            </div>
          }
        </div>
      `,
    })
    class DateTimePickerHost {
      readonly value = signal<Date | null>(null);
      readonly open = signal(false);
    }

    it('selecting a time slot grafts the time onto the committed date', async () => {
      const r = renderHost(DateTimePickerHost);
      r.instance.value.set(new Date(2026, 5, 15, 0, 0));
      await flush(r.fixture);

      r.instance.open.set(true);
      await flush(r.fixture);

      const tpTrigger = document.querySelector<HTMLButtonElement>('[data-testid="tp-trigger"]')!;
      tpTrigger.click();
      await flush(r.fixture);

      const nineAm = document.querySelector<HTMLElement>('[data-testid="tp-slot-slot-32400"]');
      nineAm?.click();
      await flush(r.fixture);

      const value = r.instance.value();
      expect(adapter.getHours(value!)).toBe(9);
      expect(adapter.getDate(value!)).toBe(15);
    });
  });

  describe('date-time bridge resolves a subclassed time source', () => {
    @Directive({
      selector: '[myTimeField]',
      exportAs: 'myTimeField',
      providers: [
        { provide: FOR_TIME_FIELD_CONTEXT, useExisting: MyTimeField },
        { provide: FOR_TIME_VALUE_SOURCE, useExisting: MyTimeField },
      ],
    })
    class MyTimeField extends ForTimeField<Date> {}

    @Component({
      imports: [
        ForDatePicker,
        ForDatePickerTrigger,
        ForDatePickerContent,
        ForDatePickerValue,
        MyTimeField,
        ForTimeFieldSegment,
        ForTimeFieldLiteral,
      ],
      providers: [...provideNativeDateAdapter()],
      template: `
        <div forDatePicker [(value)]="value" [(open)]="open" granularity="minute" [hourCycle]="24">
          <button data-testid="trigger" forDatePickerTrigger>
            <span forDatePickerValue [placeholder]="'Pick date & time'"></span>
          </button>
          @if (open()) {
            <div forDatePickerContent>
              <div
                myTimeField
                [value]="value()"
                [hourCycle]="24"
                [locale]="'en-US'"
                #tf="myTimeField"
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
    class SubclassHost {
      readonly value = signal<Date | null>(null);
      readonly open = signal(false);
    }

    it('mirrors a subclassed time-field edit into the picker via the re-provided FOR_TIME_VALUE_SOURCE token', async () => {
      const r = renderHost(SubclassHost);
      r.instance.value.set(new Date(2026, 5, 15, 14, 30));
      r.instance.open.set(true);
      await flush(r.fixture);

      const hourSeg = document.querySelector<HTMLElement>('[data-testid="time-hour"]')!;
      pressKey(hourSeg, 'ArrowUp');
      await flush(r.fixture);

      const value = r.instance.value()!;
      expect(adapter.getHours(value)).toBe(15);
      expect(adapter.getDate(value)).toBe(15);
      expect(adapter.getMinutes(value)).toBe(30);
    });
  });

  describe('calendar bridge resolves a wrapped calendar', () => {
    @Directive({
      selector: '[myCalendar]',
      exportAs: 'myCalendar',
      providers: [{ provide: FOR_CALENDAR_CONTEXT, useExisting: MyCalendar }],
    })
    class MyCalendar extends ForCalendar<Date> {}

    @Component({
      selector: '[myHostCalendar]',
      hostDirectives: [{ directive: ForCalendar, inputs: ['value'] }],
      template: '<ng-content />',
    })
    class MyHostCalendar {}

    @Directive({
      selector: '[myForeignCalendar]',
      providers: [
        { provide: FOR_CALENDAR_CONTEXT, useExisting: MyForeignCalendar },
        ...provideNativeDateAdapter(),
      ],
    })
    class MyForeignCalendar extends ForCalendar<Date> {}

    @Component({
      imports: [
        ForDatePicker,
        ForDatePickerTrigger,
        ForDatePickerContent,
        ForCalendarGrid,
        ForCalendarCell,
        MyCalendar,
        MyHostCalendar,
        MyForeignCalendar,
      ],
      providers: [...provideNativeDateAdapter()],
      template: `
        <div forDatePicker [(value)]="value" [(open)]="open" #picker="forDatePicker">
          <button data-testid="trigger" forDatePickerTrigger>Pick</button>
          @if (open()) {
            <div forDatePickerContent>
              @switch (wrapper()) {
                @case ('subclass') {
                  <div myCalendar [value]="picker.value()">
                    <table forCalendarGrid #g="forCalendarGrid">
                      <tbody>
                        @for (week of g.weeks(); track week.key) {
                          <tr>
                            @for (c of week.days; track c.key) {
                              <td
                                forCalendarCell
                                [date]="c.date"
                                [attr.data-testid]="'cell-' + c.key"
                              >
                                {{ c.label }}
                              </td>
                            }
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                }
                @case ('hostDirectives') {
                  <div myHostCalendar [value]="picker.value()">
                    <table forCalendarGrid #g="forCalendarGrid">
                      <tbody>
                        @for (week of g.weeks(); track week.key) {
                          <tr>
                            @for (c of week.days; track c.key) {
                              <td
                                forCalendarCell
                                [date]="c.date"
                                [attr.data-testid]="'cell-' + c.key"
                              >
                                {{ c.label }}
                              </td>
                            }
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                }
                @case ('foreignAdapter') {
                  <div myForeignCalendar [value]="picker.value()">
                    <table forCalendarGrid #g="forCalendarGrid">
                      <tbody>
                        @for (week of g.weeks(); track week.key) {
                          <tr>
                            @for (c of week.days; track c.key) {
                              <td
                                forCalendarCell
                                [date]="c.date"
                                [attr.data-testid]="'cell-' + c.key"
                              >
                                {{ c.label }}
                              </td>
                            }
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                }
              }
            </div>
          }
        </div>
      `,
    })
    class WrappedCalendarHost {
      readonly value = signal<Date | null>(null);
      readonly open = signal(false);
      readonly wrapper = signal<'subclass' | 'hostDirectives' | 'foreignAdapter'>('subclass');
    }

    type WR = RenderResult<WrappedCalendarHost>;
    const pickerRoot = (r: WR) => r.query('[forDatePicker]')!;

    for (const wrapper of ['subclass', 'hostDirectives'] as const) {
      it(`a pick in a one-way bound ${wrapper} calendar sets the value, marks touched, and closes`, async () => {
        const r = renderHost(WrappedCalendarHost);
        r.instance.wrapper.set(wrapper);
        r.instance.open.set(true);
        await flush(r.fixture);

        cell('2026-6-20')!.click();
        await flush(r.fixture);

        expect(r.instance.value()?.getTime()).toBe(new Date(2026, 5, 20).getTime());
        expect(pickerRoot(r).hasAttribute('data-touched')).toBe(true);
        expect(r.instance.open()).toBe(false);
        expect(content()).toBeNull();
      });

      it(`opening focuses the ${wrapper} calendar's active cell`, async () => {
        const r = renderHost(WrappedCalendarHost);
        r.instance.wrapper.set(wrapper);
        r.instance.value.set(new Date(2026, 5, 18));
        await flush(r.fixture);

        r.query<HTMLElement>('[data-testid="trigger"]')!.click();
        await flush(r.fixture);

        expect(document.activeElement).toBe(cell('2026-6-18'));
      });
    }

    it('reports FORCDK-DATE-PICKER-001 for a subclassed calendar on a different adapter', async () => {
      const captured: unknown[] = [];
      class CapturingHandler implements ErrorHandler {
        handleError(err: unknown): void {
          captured.push(err);
        }
      }
      TestBed.configureTestingModule({
        rethrowApplicationErrors: false,
        providers: [
          provideZonelessChangeDetection(),
          { provide: ErrorHandler, useClass: CapturingHandler },
        ],
      });
      const fixture = TestBed.createComponent(WrappedCalendarHost);
      fixture.componentInstance.wrapper.set('foreignAdapter');
      fixture.componentInstance.open.set(true);
      try {
        await flush(fixture);
      } catch (err) {
        captured.push(err);
      }

      expect(captured.map((err) => (err as Error).message).join('\n')).toContain(
        'FORCDK-DATE-PICKER-001',
      );
    });
  });

  describe('scoped hourCycle default', () => {
    @Component({
      imports: [ForDatePicker, ForDatePickerTrigger, ForDatePickerValue],
      providers: [
        ...provideNativeDateAdapter(),
        ...provideForDatePickerDefaults({ hourCycle: 24 }),
      ],
      template: `
        <div
          forDatePicker
          [(value)]="value"
          granularity="minute"
          [hourCycle]="hourCycle()"
          [locale]="'en-US'"
        >
          <button forDatePickerTrigger><span forDatePickerValue></span></button>
        </div>
      `,
    })
    class ScopedHourCycleHost {
      readonly value = signal<Date | null>(new Date(2026, 5, 15, 14, 30));
      readonly hourCycle = signal<12 | 24 | null>(null);
    }

    it('formats the trigger value with the scope cycle, and a per-instance [hourCycle] over it', async () => {
      const r = renderHost(ScopedHourCycleHost);
      const text = () => r.query('[forDatePickerValue]')!.textContent!.trim();
      expect(text()).toContain('14:30');
      expect(text()).not.toMatch(/PM/);

      r.instance.hourCycle.set(12);
      await flush(r.fixture);

      expect(text()).toContain('2:30');
      expect(text()).toMatch(/PM/);
    });

    @Component({
      imports: [
        ForDatePicker,
        ForDatePickerTrigger,
        ForDatePickerContent,
        ForDatePickerValue,
        ForTimeField,
        ForTimeFieldSegment,
        ForTimeFieldLiteral,
      ],
      providers: [
        ...provideNativeDateAdapter(),
        ...provideForDatePickerDefaults({ hourCycle: 24 }),
      ],
      template: `
        <div
          forDatePicker
          [(value)]="value"
          [(open)]="open"
          granularity="minute"
          [hourCycle]="hourCycle()"
          [locale]="locale()"
          #picker="forDatePicker"
        >
          <button forDatePickerTrigger><span forDatePickerValue></span></button>
          @if (open()) {
            <div forDatePickerContent>
              <div
                forTimeField
                [value]="picker.value()"
                [hourCycle]="picker.resolvedHourCycle()"
                [locale]="locale()"
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
    class ScopedHourCycleTimeFieldHost {
      readonly value = signal<Date | null>(new Date(2026, 5, 15, 14, 30));
      readonly open = signal(true);
      readonly hourCycle = signal<12 | 24 | null>(null);
      readonly locale = signal('en-US');
    }

    function renderScopedTimeField(): {
      r: RenderResult<ScopedHourCycleTimeFieldHost>;
      trigger: () => string;
      segment: (type: string) => HTMLElement | null;
    } {
      const r = renderHost(ScopedHourCycleTimeFieldHost);
      return {
        r,
        trigger: () => r.query('[forDatePickerValue]')!.textContent!.trim(),
        segment: (type) => document.querySelector<HTMLElement>(`[data-testid="time-${type}"]`),
      };
    }

    it('shows the scope cycle on the trigger and the projected time field in en-US and de-DE', async () => {
      const { r, trigger, segment } = renderScopedTimeField();

      for (const locale of ['en-US', 'de-DE']) {
        r.instance.locale.set(locale);
        await flush(r.fixture);

        expect(trigger(), locale).toContain('14:30');
        expect(trigger(), locale).not.toMatch(/PM/);
        expect(segment('hour')?.textContent?.trim(), locale).toBe('14');
        expect(segment('dayPeriod'), locale).toBeNull();
      }
    });

    it('carries a per-instance [hourCycle] to the trigger and the projected time field', async () => {
      const { r, trigger, segment } = renderScopedTimeField();

      for (const locale of ['en-US', 'de-DE']) {
        r.instance.locale.set(locale);
        r.instance.hourCycle.set(12);
        await flush(r.fixture);

        expect(trigger(), locale).toMatch(/PM/);
        expect(segment('hour')?.textContent?.trim(), locale).not.toBe('14');
        expect(segment('dayPeriod')?.textContent?.trim(), locale).toBe('PM');
      }
    });
  });

  describe('date-time trigger value format (#2103)', () => {
    @Component({
      imports: [ForDatePicker, ForDatePickerTrigger, ForDatePickerValue],
      providers: [...provideNativeDateAdapter()],
      template: `
        <div
          forDatePicker
          [(value)]="value"
          granularity="minute"
          [hourCycle]="hourCycle()"
          [locale]="locale()"
          [formatOptions]="formatOptions()"
        >
          <button forDatePickerTrigger><span forDatePickerValue></span></button>
        </div>
      `,
    })
    class DateTimeFormatHost {
      readonly value = signal<Date | null>(new Date(2026, 5, 15, 1, 30));
      readonly hourCycle = signal<12 | 24 | null>(24);
      readonly locale = signal('en-US');
      readonly formatOptions = signal<Intl.DateTimeFormatOptions>({
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }

    it('pads the hour in es-ES, fr-FR, en-GB and en-US by default', async () => {
      const r = renderHost(DateTimeFormatHost);
      const text = () => r.query('[forDatePickerValue]')!.textContent!.trim();

      for (const locale of ['es-ES', 'fr-FR', 'en-GB', 'en-US']) {
        for (const cycle of [24, 12] as const) {
          r.instance.locale.set(locale);
          r.instance.hourCycle.set(cycle);
          await flush(r.fixture);

          expect(text(), `${locale} h${cycle}`).toMatch(/\b01\D30\b/);
        }
      }
    });

    it('keeps applying [hourCycle] to formatOptions that set only hour / minute', async () => {
      const r = renderHost(DateTimeFormatHost);
      const text = () => r.query('[forDatePickerValue]')!.textContent!.trim();
      r.instance.value.set(new Date(2026, 5, 15, 13, 0));
      r.instance.formatOptions.set({ hour: 'numeric', minute: '2-digit' });
      await flush(r.fixture);

      expect(text()).toBe('13:00');

      r.instance.hourCycle.set(12);
      await flush(r.fixture);

      expect(text()).toMatch(/^1:00\sPM$/);
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

  describe('[forField] integration', () => {
    @Component({
      imports: [
        ForDatePicker,
        ForDatePickerTrigger,
        ForDatePickerValue,
        ForField,
        ForLabel,
        ForFieldDescription,
        ForFieldError,
      ],
      providers: [...provideNativeDateAdapter()],
      template: `
        <div forField>
          <label forLabel data-testid="label">Date of birth</label>
          <div forDatePicker [(value)]="value" [invalid]="invalid()">
            <button forDatePickerTrigger data-testid="trigger">
              <span forDatePickerValue [placeholder]="'Pick a date'"></span>
            </button>
          </div>
          <p forFieldDescription data-testid="desc">Any date in the past.</p>
          <p forFieldError data-testid="error">Required.</p>
        </div>
      `,
    })
    class FieldHost {
      readonly value = signal<Date | null>(null);
      readonly invalid = signal(false);
    }

    @Component({
      imports: [ForDatePicker, ForDatePickerTrigger, ForField, ForLabel],
      providers: [...provideNativeDateAdapter()],
      template: `
        <div forField>
          <span forLabel data-testid="label">Date of birth</span>
          <div forDatePicker>
            <button forDatePickerTrigger data-testid="trigger">Open</button>
          </div>
        </div>
      `,
    })
    class SpanLabelHost {}

    const wrapper = (el: HTMLElement) => el.querySelector<HTMLElement>('[forDatePicker]')!;
    const fieldTrigger = (el: HTMLElement) =>
      el.querySelector<HTMLButtonElement>('[data-testid="trigger"]')!;
    const fieldLabel = (el: HTMLElement) => el.querySelector<HTMLElement>('[data-testid="label"]')!;

    it('lands aria-labelledby/aria-describedby on the trigger, not the wrapper', async () => {
      const r = renderHost(FieldHost);
      await r.flush();
      const t = fieldTrigger(r.el);
      const w = wrapper(r.el);

      expect(t.getAttribute('aria-labelledby')).toBe(fieldLabel(r.el).id);
      expect(t.getAttribute('aria-describedby')).toBe(
        r.el.querySelector('[data-testid="desc"]')!.id,
      );
      expect(w.hasAttribute('aria-labelledby')).toBe(false);
      expect(w.hasAttribute('aria-describedby')).toBe(false);
    });

    it('points the label `for` at the trigger id', async () => {
      const r = renderHost(FieldHost);
      await r.flush();
      expect(fieldLabel(r.el).getAttribute('for')).toBe(fieldTrigger(r.el).id);
    });

    it('clicks and focuses the trigger when a non-label [forLabel] is clicked', async () => {
      const r = renderHost(SpanLabelHost);
      const t = fieldTrigger(r.el);

      fieldLabel(r.el).click();
      await r.flush();

      expect(document.activeElement).toBe(t);
      expect(t.getAttribute('aria-expanded')).toBe('true');
    });

    it('targets aria-errormessage at the error on the trigger while invalid', async () => {
      const r = renderHost(FieldHost);
      const t = fieldTrigger(r.el);
      const error = r.el.querySelector<HTMLElement>('[data-testid="error"]')!;

      expect(t.hasAttribute('aria-errormessage')).toBe(false);
      r.instance.invalid.set(true);
      await r.flush();

      expect(t.getAttribute('aria-errormessage')).toBe(error.id);
      expect(t.getAttribute('aria-describedby')).toContain(error.id);
    });

    describe('pressing the label inside a focusable container (issue #2010)', () => {
      @Component({
        imports: [ForDatePicker, ForDatePickerTrigger, ForDatePickerContent, ForField, ForLabel],
        providers: [...provideNativeDateAdapter()],
        template: `
          <div role="dialog" tabindex="-1" aria-label="Filter">
            <div forField>
              <span forLabel data-testid="label">Date of birth</span>
              <div forDatePicker [open]="open()" (openChange)="onOpenChange($event)">
                <button forDatePickerTrigger data-testid="trigger">Pick a date</button>
                @if (open()) {
                  <div forDatePickerContent data-testid="content">
                    <button type="button">Today</button>
                  </div>
                }
              </div>
            </div>
          </div>
        `,
      })
      class FilterHost {
        readonly open = signal(false);
        readonly openChanges: boolean[] = [];
        onOpenChange(open: boolean): void {
          this.openChanges.push(open);
          this.open.set(open);
        }
      }

      const content = () => document.querySelector('[data-testid="content"]');

      it('toggles once per press, open or closed, and returns focus to the trigger', async () => {
        const r = renderHost(FilterHost);
        await r.flush();
        const press = async () => {
          pressWithMouse(fieldLabel(r.el));
          await r.flush();
        };

        await press();
        expect(r.instance.openChanges).toEqual([true]);
        expect(content()).not.toBeNull();

        await press();
        expect(r.instance.openChanges).toEqual([true, false]);
        expect(content()).toBeNull();
        expect(document.activeElement).toBe(fieldTrigger(r.el));

        await press();
        expect(r.instance.openChanges).toEqual([true, false, true]);
        expect(content()).not.toBeNull();
      });
    });

    describe('a date-time picker inside the field', () => {
      @Component({
        imports: [
          ForDatePicker,
          ForDatePickerTrigger,
          ForDatePickerContent,
          ForTimeField,
          ForTimeFieldSegment,
          ForTimeFieldLiteral,
          ForField,
          ForLabel,
          ForFieldError,
        ],
        providers: [...provideNativeDateAdapter()],
        template: `
          <div forField #field="forField">
            <span forLabel data-testid="label">Appointment</span>
            <div
              forDatePicker
              [(open)]="open"
              granularity="minute"
              [hourCycle]="24"
              [invalid]="true"
              [errors]="errors"
              #picker="forDatePicker"
            >
              <button forDatePickerTrigger data-testid="trigger">Pick date & time</button>
              @if (open()) {
                <div forDatePickerContent data-testid="content">
                  <div
                    forTimeField
                    [value]="picker.value()"
                    [hourCycle]="24"
                    [locale]="'en-US'"
                    data-testid="time-field"
                    #tf="forTimeField"
                  >
                    @for (seg of tf.segments(); track seg.id) {
                      @if (seg.isLiteral) {
                        <span forTimeFieldLiteral>{{ seg.text }}</span>
                      } @else {
                        <span forTimeFieldSegment [segment]="seg.type!">{{ seg.text }}</span>
                      }
                    }
                  </div>
                </div>
              }
            </div>
            <p forFieldError #err="forFieldError" data-testid="error">
              {{ err.messages().join(', ') }}
            </p>
          </div>
        `,
      })
      class DateTimeFieldHost {
        readonly open = signal(false);
        readonly errors = [{ kind: 'required', message: 'Pick an appointment' }];
      }

      it('keeps the picker as the field control while the time field is open', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const r = renderHost(DateTimeFieldHost);
        await r.flush();
        const field = r.fixture.debugElement.query(By.directive(ForField)).injector.get(ForField);
        const error = () => r.el.querySelector<HTMLElement>('[data-testid="error"]')!;
        const control = field.control();
        const controlId = field.controlId();
        expect(control?.host).toBe(wrapper(r.el));
        expect(error().textContent).toContain('Pick an appointment');

        pressWithMouse(fieldLabel(r.el));
        await r.flush();
        const timeField = document.querySelector<HTMLElement>('[data-testid="time-field"]');

        expect(field.control()).toBe(control);
        expect(field.controlId()).toBe(controlId);
        expect(field.invalid()).toBe(true);
        expect(error().textContent).toContain('Pick an appointment');
        expect(timeField!.hasAttribute('aria-labelledby')).toBe(false);
        expect(warn.mock.calls.flat().join(' ')).not.toContain('FORCDK-FIELD-002');

        pressWithMouse(fieldLabel(r.el));
        await r.flush();
        expect(r.instance.open()).toBe(false);
        expect(document.querySelector('[data-testid="content"]')).toBeNull();
      });
    });
  });

  describe('focus (focus-on-error)', () => {
    it('moves focus to the trigger, not the wrapper host', async () => {
      const r = renderHost(Host);
      await r.flush();
      const picker = r.fixture.debugElement
        .query(By.directive(ForDatePicker))
        .injector.get(ForDatePicker);

      picker.focus();

      expect(document.activeElement).toBe(trigger(r));
    });

    it('is a no-op while disabled', async () => {
      const r = renderHost(Host);
      r.instance.disabled.set(true);
      await r.flush();
      const picker = r.fixture.debugElement
        .query(By.directive(ForDatePicker))
        .injector.get(ForDatePicker);

      picker.focus();

      expect(document.activeElement).not.toBe(trigger(r));
    });
  });

  describe('reactive updates', () => {
    it('reflects open and value transitions', async () => {
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

  describe('field anatomy (#2041)', () => {
    interface Booking {
      when: Date | null;
    }

    @Component({
      imports: [
        ForDatePicker,
        ForDatePickerTrigger,
        ForDatePickerContent,
        ForDateField,
        ForDateFieldSegment,
        ForDateFieldLiteral,
        FormField,
        ForField,
        ForLabel,
        ForFieldError,
        ForCalendar,
        ForCalendarGrid,
        ForCalendarCell,
      ],
      providers: [...provideNativeDateAdapter()],
      template: `
        <button data-testid="outside">Elsewhere</button>
        <div forField>
          <span forLabel data-testid="label">Appointment</span>
          <div
            forDatePicker
            anatomy="field"
            [formField]="booking.when"
            [(open)]="open"
            [granularity]="granularity()"
            [hourCycle]="24"
            [locale]="locale()"
            [minDate]="minDate()"
            #picker="forDatePicker"
          >
            <div forDateField data-testid="group" #field="forDateField">
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
            <button forDatePickerTrigger data-testid="trigger" aria-label="Open calendar">
              Calendar
            </button>
            @if (open()) {
              <div forDatePickerContent>
                <div forCalendar [value]="picker.value()" [min]="picker.minDate()">
                  <table forCalendarGrid #grid="forCalendarGrid">
                    <tbody>
                      @for (week of grid.weeks(); track week.key) {
                        <tr>
                          @for (c of week.days; track c.key) {
                            <td
                              forCalendarCell
                              [date]="c.date"
                              [attr.data-testid]="'cell-' + c.key"
                            >
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
          <p forFieldError data-testid="error">Required.</p>
        </div>
      `,
    })
    class FieldAnatomyHost {
      readonly open = signal(false);
      readonly granularity = signal<FieldGranularity>('day');
      readonly locale = signal('en-US');
      readonly minDate = signal<Date | null>(null);
      readonly locked = signal(false);
      readonly off = signal(false);
      readonly model = signal<Booking>({ when: null });
      readonly booking = form(this.model, (p) => {
        requiredRule(p.when);
        readonlyRule(p.when, () => this.locked());
        disabledRule(p.when, () => this.off());
      });
    }

    type FR = RenderResult<FieldAnatomyHost>;
    const at = (r: FR, id: string) => r.query<HTMLElement>(`[data-testid="${id}"]`)!;
    const pickerOf = (r: FR) =>
      r.fixture.debugElement.query(By.directive(ForDatePicker)).injector.get(ForDatePicker);
    const segmentTypes = (r: FR) =>
      r.queryAll('[forDateFieldSegment]').map((s) => s.getAttribute('data-testid'));

    async function typeInto(r: FR, segment: string, digits: string): Promise<void> {
      for (const digit of digits) {
        pressKey(at(r, segment), digit);
      }
      await r.flush();
    }

    async function typeDate(r: FR, month: string, day: string, year: string): Promise<void> {
      await typeInto(r, 'month', month);
      await typeInto(r, 'day', day);
      await typeInto(r, 'year', year);
    }

    async function blurField(r: FR): Promise<void> {
      at(r, 'group').dispatchEvent(
        new FocusEvent('focusout', { bubbles: true, relatedTarget: at(r, 'outside') }),
      );
      await r.flush();
    }

    it('writes a typed date into the form bound on the picker, dirty then touched on blur', async () => {
      const r = renderHost(FieldAnatomyHost);
      await typeDate(r, '06', '20', '2026');

      const when = r.instance.booking.when();
      expect(r.instance.model().when?.getTime()).toBe(new Date(2026, 5, 20).getTime());
      expect(when.dirty()).toBe(true);
      expect(when.touched()).toBe(false);

      await blurField(r);
      expect(when.touched()).toBe(true);
    });

    it('writes a calendar pick into the form, marks it dirty and touched, and shows it in the field', async () => {
      const r = renderHost(FieldAnatomyHost);
      at(r, 'trigger').click();
      await r.flush();

      cell('2026-6-12')!.click();
      await r.flush();

      const when = r.instance.booking.when();
      expect(r.instance.model().when?.getTime()).toBe(new Date(2026, 5, 12).getTime());
      expect(when.dirty()).toBe(true);
      expect(when.touched()).toBe(true);
      expect(r.instance.open()).toBe(false);
      expect(at(r, 'day').getAttribute('aria-valuenow')).toBe('12');
    });

    it('shows a form value written from outside in the field', async () => {
      const r = renderHost(FieldAnatomyHost);
      r.instance.model.set({ when: new Date(2026, 2, 9) });
      await r.flush();

      expect(at(r, 'month').getAttribute('aria-valuenow')).toBe('3');
      expect(at(r, 'day').getAttribute('aria-valuenow')).toBe('9');
      expect(at(r, 'year').getAttribute('aria-valuenow')).toBe('2026');
    });

    it('applies the picker granularity and hourCycle to the field', async () => {
      const r = renderHost(FieldAnatomyHost);
      expect(segmentTypes(r)).toEqual(['month', 'day', 'year']);

      r.instance.granularity.set('minute');
      await r.flush();

      expect(segmentTypes(r)).toEqual(['month', 'day', 'year', 'hour', 'minute']);
    });

    it('applies the picker locale to the field segment order', async () => {
      const r = renderHost(FieldAnatomyHost);
      r.instance.locale.set('de-DE');
      await r.flush();

      expect(segmentTypes(r)).toEqual(['day', 'month', 'year']);
    });

    it('clamps a typed date to the picker minDate', async () => {
      const r = renderHost(FieldAnatomyHost);
      r.instance.minDate.set(new Date(2026, 5, 10));
      await r.flush();

      await typeDate(r, '06', '05', '2026');

      expect(r.instance.model().when?.getTime()).toBe(new Date(2026, 5, 10).getTime());
    });

    it('a read-only picker marks the segments read-only and blocks typing and picking', async () => {
      const r = renderHost(FieldAnatomyHost);
      r.instance.model.set({ when: new Date(2026, 5, 15) });
      r.instance.locked.set(true);
      await r.flush();

      expect(at(r, 'day').getAttribute('aria-readonly')).toBe('true');
      expect(at(r, 'group').hasAttribute('data-readonly')).toBe(true);

      pressKey(at(r, 'day'), 'ArrowUp');
      await r.flush();
      expect(r.instance.model().when?.getTime()).toBe(new Date(2026, 5, 15).getTime());

      at(r, 'trigger').click();
      await r.flush();
      cell('2026-6-20')!.click();
      await r.flush();
      expect(r.instance.model().when?.getTime()).toBe(new Date(2026, 5, 15).getTime());
    });

    it('a disabled picker disables the field and its segments', async () => {
      const r = renderHost(FieldAnatomyHost);
      r.instance.off.set(true);
      await r.flush();

      expect(at(r, 'group').getAttribute('aria-disabled')).toBe('true');
      expect(at(r, 'month').getAttribute('aria-disabled')).toBe('true');

      await typeInto(r, 'month', '06');
      expect(at(r, 'month').getAttribute('aria-valuenow')).toBeNull();
    });

    it('makes the trigger a plain popup button without the form-control state', async () => {
      const r = renderHost(FieldAnatomyHost);
      r.instance.locked.set(true);
      await r.flush();
      const trigger = at(r, 'trigger');

      expect(trigger.hasAttribute('role')).toBe(false);
      expect(trigger.hasAttribute('aria-required')).toBe(false);
      expect(trigger.hasAttribute('aria-invalid')).toBe(false);
      expect(trigger.hasAttribute('aria-readonly')).toBe(false);
      expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');
      expect(trigger.getAttribute('aria-expanded')).toBe('false');

      trigger.click();
      await r.flush();

      expect(trigger.getAttribute('aria-expanded')).toBe('true');
      expect(trigger.getAttribute('aria-controls')).toBe(content()!.id);
    });

    it('names and validates the date field group through [forField], not the trigger', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const r = renderHost(FieldAnatomyHost);
      await r.flush();
      const group = at(r, 'group');

      expect(group.getAttribute('aria-labelledby')).toBe(at(r, 'label').id);
      expect(group.getAttribute('aria-invalid')).toBe('true');
      expect(group.getAttribute('aria-errormessage')).toBe(at(r, 'error').id);
      expect(group.hasAttribute('data-required')).toBe(true);
      expect(at(r, 'trigger').hasAttribute('aria-labelledby')).toBe(false);
      expect(warn).not.toHaveBeenCalled();
    });

    it('focuses the first segment when the label is pressed', async () => {
      const r = renderHost(FieldAnatomyHost);
      await r.flush();

      at(r, 'label').click();

      expect(document.activeElement).toBe(at(r, 'month'));
      expect(r.instance.open()).toBe(false);
    });

    it('moves focus() to the first segment of the field', async () => {
      const r = renderHost(FieldAnatomyHost);
      await r.flush();

      pickerOf(r).focus();

      expect(document.activeElement).toBe(at(r, 'month'));
    });

    it('keeps the typed time on a day pick and closes at minute granularity', async () => {
      const r = renderHost(FieldAnatomyHost);
      r.instance.granularity.set('minute');
      r.instance.model.set({ when: new Date(2026, 5, 15, 14, 30) });
      await r.flush();

      at(r, 'trigger').click();
      await r.flush();
      cell('2026-6-20')!.click();
      await r.flush();

      const value = r.instance.model().when!;
      expect(adapter.getDate(value)).toBe(20);
      expect(adapter.getHours(value)).toBe(14);
      expect(adapter.getMinutes(value)).toBe(30);
      expect(r.instance.open()).toBe(false);
    });

    describe('without a projected [forDateField]', () => {
      @Component({
        imports: [ForDatePicker, ForDatePickerTrigger],
        providers: [...provideNativeDateAdapter()],
        template: `
          <div forDatePicker anatomy="field">
            <button forDatePickerTrigger data-testid="trigger">Open</button>
          </div>
        `,
      })
      class MissingFieldHost {}

      it('throws FORCDK-DATE-PICKER-007 from focus()', () => {
        const r = renderHost(MissingFieldHost);
        const picker = r.fixture.debugElement
          .query(By.directive(ForDatePicker))
          .injector.get(ForDatePicker);

        expect(() => picker.focus()).toThrow(/FORCDK-DATE-PICKER-007/);
      });

      it('reports FORCDK-DATE-PICKER-007 when the trigger opens the calendar', async () => {
        const captured: unknown[] = [];
        class CapturingHandler implements ErrorHandler {
          handleError(err: unknown): void {
            captured.push(err);
          }
        }
        TestBed.configureTestingModule({
          rethrowApplicationErrors: false,
          providers: [
            provideZonelessChangeDetection(),
            { provide: ErrorHandler, useClass: CapturingHandler },
          ],
        });
        const fixture = TestBed.createComponent(MissingFieldHost);
        fixture.detectChanges();

        fixture.nativeElement.querySelector('[data-testid="trigger"]').click();
        await flush(fixture);

        expect(captured.map((err) => (err as Error).message).join('\n')).toContain(
          'FORCDK-DATE-PICKER-007',
        );
      });
    });
  });
});
