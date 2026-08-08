import { NgTemplateOutlet } from '@angular/common';
import { Component, Directive, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { form, FormField, required as requiredRule } from '@angular/forms/signals';

import {
  afterEachOverlayCleanup,
  flush,
  pressKey,
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
  type DateAdapter,
  FOR_TIME_VALUE_SOURCE,
  type VetoableNativeEvent,
} from 'forty-cdk/core';
import {
  ForCalendar,
  ForCalendarCell,
  ForCalendarGrid,
  ForCalendarGridHeader,
  NativeDateAdapter,
  provideNativeDateAdapter,
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

import { ForDatePicker } from './date-picker';
import { ForDatePickerAnchor } from './date-picker-anchor';
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

    it('throws when two [forDatePickerAnchor] are registered inside the same [forDatePicker]', () => {
      @Component({
        imports: [ForDatePicker, ForDatePickerAnchor, ForDatePickerTrigger],
        providers: [...provideNativeDateAdapter()],
        template: `
          @if (show()) {
            <div forDatePicker>
              <div forDatePickerAnchor></div>
              <div forDatePickerAnchor></div>
              <button forDatePickerTrigger>Open</button>
            </div>
          }
        `,
      })
      class TwoAnchorsHost {
        readonly show = signal(true);
      }

      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(TwoAnchorsHost);
      expect(() => fixture.detectChanges()).toThrow(
        /\[forty-cdk\/date-picker\] FORCDK-DATE-PICKER-002: A picker root registered a second \[forDatePickerAnchor\]/,
      );
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
      selector: '[mtxTimeField]',
      exportAs: 'mtxTimeField',
      providers: [
        { provide: FOR_TIME_FIELD_CONTEXT, useExisting: MtxTimeField },
        { provide: FOR_TIME_VALUE_SOURCE, useExisting: MtxTimeField },
      ],
    })
    class MtxTimeField extends ForTimeField<Date> {}

    @Component({
      imports: [
        ForDatePicker,
        ForDatePickerTrigger,
        ForDatePickerContent,
        ForDatePickerValue,
        MtxTimeField,
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
                mtxTimeField
                [value]="value()"
                [hourCycle]="24"
                [locale]="'en-US'"
                #tf="mtxTimeField"
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
});
