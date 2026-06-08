import {
  booleanAttribute,
  computed,
  contentChild,
  Directive,
  effect,
  inject,
  input,
  isDevMode,
  model,
  numberAttribute,
  output,
  signal,
} from '@angular/core';
import type { ReferenceElement } from '@floating-ui/dom';
import type { FormValueControl } from '@angular/forms/signals';

import {
  assertTimeCapable,
  type DateAdapter,
  injectDateAdapter,
} from '../_internal/date-adapter/date-adapter';
import type { FloatingAlign, FloatingSide } from '../_internal/floating/floating';
import { FormUiControlBase } from '../_internal/form-ui-control/form-ui-control-base';
import { injectHiddenInput } from '../_internal/hidden-input/hidden-input';
import { IdGenerator } from '../_internal/id-generator/id-generator';
import type { WritingDirection } from '../_internal/keyboard-navigation/keyboard-navigation';
import { injectTextDirection } from '../_internal/text-direction/text-direction';
import {
  createVetoableNativeEvent,
  emitVetoableEvent,
  type VetoableEvent,
  type VetoableNativeEvent,
} from '../_internal/vetoable-event/vetoable-event';
import { ForCalendar } from '../calendar/calendar';
import { ForTimeField } from '../time-field/time-field';
import { FOR_DATE_PICKER_CONTEXT, type ForDatePickerContext } from './date-picker-context';
import { FOR_DATE_PICKER_DEFAULTS } from './date-picker-defaults';

/** Date-time precision; `'day'` keeps a pure calendar picker, anything more composes a time field. */
type DatePickerGranularity = 'day' | 'hour' | 'minute' | 'second';

/**
 * Headless date picker — the [WAI-ARIA Date Picker Dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/)
 * reinterpreted idiomatically for modern Angular, the way React Aria's
 * `DatePicker` and Ark UI's `DatePicker` do it: a focusable trigger that opens
 * a floating surface wrapping a projected `ForCalendar`.
 *
 * `ForDatePicker` is the root and the form value: it implements
 * `FormValueControl<D | null>` from `@angular/forms/signals`, so it auto-wires
 * with `[formField]` and auto-associates inside a `[forField]`. The trigger is
 * the focusable control that carries `name` / `disabled` / `invalid`; selection
 * state flows root → projected calendar via `[(value)]`.
 *
 * The surface defaults to a **non-modal popover** (anchored to the trigger,
 * dismiss on Escape / outside-pointer, return focus on close), matching React
 * Aria / Ark UI; set `modal` for the trapped / inert / scroll-locked dialog
 * variant. Mount/unmount of the surface is the consumer's job — wrap
 * `[forDatePickerContent]` with `@if (open())`.
 *
 * The projected `ForCalendar` is two-way bound by the consumer (`[(value)]`)
 * and forwarded `[min]` / `[max]` / `[isDateUnavailable]` from the picker's
 * accessors. A selection inside the grid is observed through a `contentChild`
 * query on the calendar's `valueChange`, so the calendar primitive stays
 * untouched; on selection the picker mirrors the value, flips `touched`, and —
 * when `closeOnSelect` is on (default) — closes the surface.
 *
 * Set `granularity` coarser-than-a-day off (`'hour'` / `'minute'` / `'second'`)
 * to make it a **date-time picker**: the consumer projects a `[forTimeField]`
 * beside the calendar (binding both children **one-way** to `picker.value()` so
 * their internal writes don't clobber each other), and the picker grafts the
 * entered time onto each calendar selection. This needs a time-capable adapter
 * (`provideNativeDateAdapter()` / `provideInternationalizedDateTimeAdapter()`).
 *
 * @typeParam D The adapter's immutable date (or, with `granularity > 'day'`,
 *   date-time) type.
 *
 * Note: the date bounds are named `minDate` / `maxDate`, not `min` / `max` —
 * the latter are reserved `FormUiControl` members typed `number | undefined`
 * for numeric validators, so a date-typed `min` / `max` would break the
 * `FormValueControl` contract.
 *
 * @example
 * ```html
 * <div forDatePicker [(value)]="date" [(open)]="open" [minDate]="min" [maxDate]="max"
 *      name="dob" [ariaLabel]="'Choose date'" #picker="forDatePicker">
 *   <button forDatePickerTrigger>
 *     <span forDatePickerValue>Pick a date</span>
 *   </button>
 *
 *   @if (open()) {
 *     <div forDatePickerContent>
 *       <div forCalendar [(value)]="date" [min]="picker.minDate()" [max]="picker.maxDate()">
 *         <!-- …calendar header + grid… -->
 *       </div>
 *     </div>
 *   }
 * </div>
 * ```
 *
 * @example Date-time picker (`granularity="minute"`), children bound one-way:
 * ```html
 * <div forDatePicker [(value)]="when" [(open)]="open" granularity="minute"
 *      [hourCycle]="24" #picker="forDatePicker">
 *   <button forDatePickerTrigger><span forDatePickerValue>Pick date & time</span></button>
 *   @if (open()) {
 *     <div forDatePickerContent>
 *       <div forCalendar [value]="picker.value()" [min]="picker.minDate()">…</div>
 *       <div forTimeField [value]="picker.value()" [hourCycle]="picker.hourCycle()">…</div>
 *     </div>
 *   }
 * </div>
 * ```
 */
@Directive({
  selector: '[forDatePicker]',
  exportAs: 'forDatePicker',
  host: {
    '[attr.dir]': 'dir()',
    '[attr.data-state]': 'open() ? "open" : "closed"',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
  },
  providers: [{ provide: FOR_DATE_PICKER_CONTEXT, useExisting: ForDatePicker }],
})
export class ForDatePicker<D>
  extends FormUiControlBase
  implements FormValueControl<D | null>, ForDatePickerContext
{
  readonly #idGen = inject(IdGenerator);
  readonly #defaults = inject(FOR_DATE_PICKER_DEFAULTS);

  /** The active date adapter, resolved from `FOR_DATE_ADAPTER` (shared with `ForCalendar`). */
  readonly adapter: DateAdapter<D> = injectDateAdapter<D>('ForDatePicker');

  /**
   * Two-way bindable selected date, or `null`. Required by
   * `FormValueControl<D | null>`. The `model()` change emitter (`(valueChange)`)
   * fires only when the picker itself commits a selection, never on consumer
   * writes via `[(value)]`.
   */
  readonly value = model<D | null>(null);

  /**
   * Two-way bindable. Whether the surface is open. The `model()` change emitter
   * (`(openChange)`) fires only on internal transitions (trigger toggle,
   * Escape, outside dismissal, selection), never on consumer writes via
   * `[(open)]`.
   */
  readonly open = model<boolean>(false);

  /**
   * Minimum selectable date (inclusive). Forward to the projected calendar's
   * `[min]`. Named `minDate` (not `min`) because `FormUiControl.min` is reserved
   * for a numeric validator bound by `[formField]`.
   */
  readonly minDate = input<D | null>(null);

  /**
   * Maximum selectable date (inclusive). Forward to the projected calendar's
   * `[max]`. Named `maxDate` (not `max`) for the same reason as {@link minDate}.
   */
  readonly maxDate = input<D | null>(null);

  /** Per-date predicate. Forward to the projected calendar's `[isDateUnavailable]`. */
  readonly isDateUnavailable = input<(date: D) => boolean>(() => false);

  /**
   * Close the surface after a date is selected in the projected calendar.
   * Default `true`. Honoured only at `granularity="day"` — a date-time picker
   * (`granularity > 'day'`) never closes on a calendar selection, so the user
   * can go on to edit the time.
   */
  readonly closeOnSelect = input(true, { transform: booleanAttribute });

  /**
   * Date-time precision. `'day'` (default, **non-breaking**) keeps a pure
   * calendar picker. Anything coarser-than-a-day off — `'hour'` / `'minute'` /
   * `'second'` — turns it into a date-time picker: the consumer projects a
   * `[forTimeField]` beside the calendar, a calendar selection preserves the
   * entered time, and the value carries a time component. Requires a
   * time-capable adapter (`provideNativeDateAdapter()` or
   * `provideInternationalizedDateTimeAdapter()`).
   */
  readonly granularity = input<DatePickerGranularity>('day');

  /**
   * 12- or 24-hour cycle forwarded to `[forDatePickerValue]`'s formatting (and
   * typically to the projected `[forTimeField][hourCycle]`). When `null`
   * (default) it is derived from the runtime locale. Only meaningful when
   * `granularity > 'day'`.
   */
  readonly hourCycle = input<12 | 24 | null>(null);

  /**
   * When `true`, the surface is a trapped / inert / scroll-locked modal dialog
   * (routed through `_internal/modal-shell`) instead of the default non-modal
   * anchored popover. Read once when the content mounts.
   */
  readonly modal = input(false, { transform: booleanAttribute });

  /** When true (default), Escape, pointer-down outside, and focus outside close the surface. */
  readonly dismissible = input(true, { transform: booleanAttribute });

  /** When true (default), focus returns to the trigger on close. */
  readonly returnFocus = input(true, { transform: booleanAttribute });

  /**
   * `Intl.DateTimeFormat` options driving the text rendered by
   * `[forDatePickerValue]`. Default `{ year: 'numeric', month: 'long', day: 'numeric' }`.
   */
  readonly formatOptions = input<Intl.DateTimeFormatOptions>({
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  /** Text rendered by `[forDatePickerValue]` when no date is selected. */
  readonly placeholder = input<string>('');

  /** Side the surface is anchored to. Defaults to `'bottom'`. Ignored in `modal` mode. */
  readonly side = input<FloatingSide | undefined>('bottom');

  /** Alignment along the chosen `side`. Defaults to `'start'`. Ignored in `modal` mode. */
  readonly align = input<FloatingAlign | undefined>('start');

  /** Gap (px) between trigger and surface along the main axis. Default from `provideForDatePickerDefaults`. */
  readonly sideOffset = input(this.#defaults.sideOffset, { transform: numberAttribute });

  /** Gap (px) along the cross axis. Default `0`. */
  readonly alignOffset = input(0, { transform: numberAttribute });

  /** When `true` (default), `flip` and `shift` keep the surface inside the viewport. */
  readonly avoidCollisions = input(true, { transform: booleanAttribute });

  /** Padding (px) applied uniformly to flip / shift / size. Default from `provideForDatePickerDefaults`. */
  readonly collisionPadding = input(this.#defaults.collisionPadding, {
    transform: numberAttribute,
  });

  /** Stickiness behaviour for `shift`. Default `'partial'`. */
  readonly sticky = input<'partial' | 'always' | false>('partial');

  /** When `true`, sets `data-detached=""` while the trigger is scrolled off-screen. */
  readonly hideWhenDetached = input(false, { transform: booleanAttribute });

  /** Accessible name for the dialog surface. Emits no `aria-label` while `null`. */
  readonly ariaLabel = input<string | null>(null);

  /**
   * Writing direction. When unset (default `null`), the inherited ambient
   * direction is resolved from the nearest ancestor carrying a `dir` attribute
   * (or `<html dir>`), defaulting to `'ltr'`. An explicit `[dir]` always wins.
   * The resolved value is reflected to the host `dir` attribute.
   */
  readonly _dirInput = input<WritingDirection | null>(null, { alias: 'dir' });
  readonly dir = injectTextDirection(this._dirInput);

  /**
   * Fires when the user presses Escape while this surface is the topmost
   * dismissable layer. Call `preventDefault()` on the veto to suppress the
   * automatic close.
   */
  readonly escapeKeyDown = output<VetoableNativeEvent<KeyboardEvent>>();

  /** Fires when a pointer goes down outside the surface (and trigger). Vetoable. */
  readonly pointerDownOutside = output<VetoableNativeEvent<PointerEvent>>();

  /** Fires when focus moves outside the surface (and trigger). Vetoable. */
  readonly focusOutside = output<VetoableNativeEvent<FocusEvent>>();

  /** Composite event: shares veto state with `pointerDownOutside` / `focusOutside`. */
  readonly interactOutside = output<VetoableNativeEvent<PointerEvent | FocusEvent>>();

  /** Fires just before the surface sends focus into itself on open. Vetoable. */
  readonly autoFocusOnOpen = output<VetoableEvent>();

  /** Fires just before focus returns to the trigger on close. Vetoable. */
  readonly autoFocusOnClose = output<VetoableEvent>();

  readonly triggerId = signal(this.#idGen.next('for-date-picker-trigger'));
  readonly contentId = signal(this.#idGen.next('for-date-picker-content'));

  readonly #triggerEl = signal<HTMLElement | null>(null);
  readonly trigger = this.#triggerEl.asReadonly();
  readonly reference = computed<ReferenceElement | null>(() => this.#triggerEl());

  readonly #contentEl = signal<HTMLElement | null>(null);
  readonly content = this.#contentEl.asReadonly();

  /**
   * `formatOptions` augmented with time fields when `granularity > 'day'` and
   * the consumer hasn't already specified any — so a date-time picker's value
   * display shows the time without extra wiring, while an explicit
   * `formatOptions` is always honoured verbatim.
   */
  readonly #effectiveFormatOptions = computed<Intl.DateTimeFormatOptions>(() => {
    const options = this.formatOptions();
    const granularity = this.granularity();
    if (
      granularity === 'day' ||
      options.hour !== undefined ||
      options.minute !== undefined ||
      options.second !== undefined
    ) {
      return options;
    }
    const cycle = this.hourCycle();
    return {
      ...options,
      hour: 'numeric',
      minute: '2-digit',
      ...(granularity === 'second' ? { second: '2-digit' } : {}),
      ...(cycle !== null ? { hour12: cycle === 12 } : {}),
    };
  });

  /** Formatted current value via the adapter, or `null` when empty. */
  readonly formattedValue = computed<string | null>(() => {
    const value = this.value();
    return value === null ? null : this.adapter.format(value, this.#effectiveFormatOptions());
  });

  /**
   * The projected `ForCalendar`. Mounts only while the surface is open, so the
   * query resolves to the live instance on open and to `undefined` on close.
   * Its `valueChange` is the single signal that a date was selected inside the
   * grid — wired in the constructor.
   *
   * Invariant: the projected calendar MUST resolve the same `DateAdapter` as
   * this picker (the same `FOR_DATE_ADAPTER` scope). Angular's `contentChild`
   * erases the generic, so the bridge reads `calendar.value` as `D | null` via
   * a cast; a mismatched adapter would leak a wrong-shaped date through that
   * seam. A dev-mode assertion in the bridge effect catches it early.
   */
  private readonly calendar = contentChild(ForCalendar, { descendants: true });

  /**
   * The projected `ForTimeField`, present only in a date-time picker
   * (`granularity > 'day'`). Like the calendar, it mounts with the surface; its
   * `valueChange` (a composed date-time, anchored on the picker's current
   * value) is mirrored straight into the picker's value.
   *
   * Invariant: the projected time field MUST resolve the same `DateAdapter` as
   * this picker (see {@link calendar}). The bridge casts its `value` to
   * `D | null` because `contentChild` erases the generic; a dev-mode assertion
   * guards the same-adapter contract.
   */
  private readonly timeField = contentChild(ForTimeField, { descendants: true });

  constructor() {
    super();
    injectHiddenInput({
      name: this.name,
      values: computed(() => {
        const value = this.value();
        if (value === null) {
          return [];
        }
        const year = String(this.adapter.getYear(value)).padStart(4, '0');
        const month = String(this.adapter.getMonth(value)).padStart(2, '0');
        const day = String(this.adapter.getDate(value)).padStart(2, '0');
        const date = `${year}-${month}-${day}`;
        const granularity = this.granularity();
        if (granularity === 'day') {
          return [date];
        }
        const time = this.#time();
        const hour = String(time.getHours(value)).padStart(2, '0');
        const minute = String(time.getMinutes(value)).padStart(2, '0');
        if (granularity === 'second') {
          const second = String(time.getSeconds(value)).padStart(2, '0');
          return [`${date}T${hour}:${minute}:${second}`];
        }
        return [`${date}T${hour}:${minute}`];
      }),
      disabled: this.effectiveDisabled,
    });

    // Eager validation: a date-time picker needs a time-capable adapter. Fail
    // loudly as soon as the granularity input settles, rather than on first
    // selection deep in a subscription. The throw is raised during change
    // detection (inside this `effect`) and propagates through Angular's error
    // handling, so a day-only adapter misconfiguration is surfaced — never
    // silently swallowed.
    effect(() => {
      if (this.granularity() !== 'day') {
        this.#time();
      }
    });

    // Calendar selection bridge. This `effect` does no state derivation — it
    // only (re)subscribes to the projected calendar's `valueChange` as the
    // surface mounts / unmounts. The writes happen asynchronously in the
    // subscription callback (a discrete selection event), exactly like a click
    // handler, never during the effect's reactive computation.
    effect((onCleanup) => {
      const calendar = this.calendar();
      if (!calendar) {
        return;
      }
      if (isDevMode() && calendar.adapter !== this.adapter) {
        throw new Error(
          '[forty-cdk/date-picker] The projected ForCalendar must use the same DateAdapter as the ForDatePicker.',
        );
      }
      const sub = calendar.value.subscribe((date) => {
        if (this.readonly() || this.effectiveDisabled()) {
          return;
        }
        const selected = date as D | null;
        // The calendar emits the picked day at midnight (its cells are built
        // with `createDate`). For a date-time picker, graft the previously
        // entered time-of-day back onto it; reading `value()` here is safe
        // because the projected calendar is one-way bound (`[value]`), so its
        // own write didn't clobber the picker's value.
        if (selected !== null && this.granularity() !== 'day') {
          const time = this.#time();
          const base = this.value() ?? selected;
          this.value.set(
            this.#clampToBounds(
              time.setTime(
                selected,
                time.getHours(base),
                time.getMinutes(base),
                time.getSeconds(base),
              ),
            ),
          );
        } else {
          this.value.set(selected === null ? null : this.#clampToBounds(selected));
        }
        this.touched.set(true);
        // A date-time picker stays open after a day is picked so the time can
        // still be edited; only a pure day picker honours `closeOnSelect`.
        if (this.closeOnSelect() && this.granularity() === 'day') {
          this.close();
        }
      });
      onCleanup(() => sub.unsubscribe());
    });

    // Time-field bridge (date-time pickers only). The projected `ForTimeField`
    // is bound one-way to the picker's value, so its composed `valueChange`
    // already carries the correct day plus the new time — mirror it straight in.
    effect((onCleanup) => {
      const timeField = this.timeField();
      if (!timeField) {
        return;
      }
      if (isDevMode() && timeField.adapter !== this.adapter) {
        throw new Error(
          '[forty-cdk/date-picker] The projected ForTimeField must use the same DateAdapter as the ForDatePicker.',
        );
      }
      const sub = timeField.value.subscribe((value) => {
        if (this.readonly() || this.effectiveDisabled()) {
          return;
        }
        const next = value as D | null;
        this.value.set(next === null ? null : this.#clampToBounds(next));
        this.touched.set(true);
      });
      onCleanup(() => sub.unsubscribe());
    });
  }

  /** The active adapter, narrowed to a time-capable one; throws when it is day-only. */
  #time() {
    return assertTimeCapable(this.adapter, 'ForDatePicker');
  }

  #clampToBounds(date: D): D {
    const min = this.minDate();
    if (min !== null && this.adapter.compare(date, min) < 0) {
      return min;
    }
    const max = this.maxDate();
    if (max !== null && this.adapter.compare(date, max) > 0) {
      return max;
    }
    return date;
  }

  registerTrigger(el: HTMLElement): void {
    this.#triggerEl.set(el);
  }
  unregisterTrigger(el: HTMLElement): void {
    if (this.#triggerEl() === el) {
      this.#triggerEl.set(null);
    }
  }

  registerContent(el: HTMLElement): void {
    this.#contentEl.set(el);
  }
  unregisterContent(el: HTMLElement): void {
    if (this.#contentEl() === el) {
      this.#contentEl.set(null);
    }
  }

  toggle(): void {
    if (this.effectiveDisabled()) {
      return;
    }
    this.open.update((v) => !v);
  }

  close(): void {
    this.touched.set(true);
    this.open.set(false);
  }

  markTouched(): void {
    this.touched.set(true);
  }

  focusCalendarCell(): boolean {
    return this.calendar()?.focusActiveCell() ?? false;
  }

  // Both the anchored (`injectOverlayShell`) and modal (`injectModalShell`)
  // surfaces now own the shared `#pendingOutsideVeto` reuse between the
  // specific outside channels and the composite `interactOutside`, so this
  // directive only forwards the shell-built veto to the matching `output()`
  // and owns the close decision via `requestClose`. Escape is the one channel
  // this directive still owns end-to-end on the anchored path (the modal path
  // routes it through `emitEscapeKeyDown` on the shell, which builds the veto
  // and calls `requestClose` itself).

  /**
   * Anchored-path Escape. Builds the veto, emits `(escapeKeyDown)`, and —
   * unless vetoed and `dismissible` is off — stops propagation and closes.
   */
  emitEscapeKeyDown(event: KeyboardEvent): void {
    const veto = createVetoableNativeEvent(event);
    this.escapeKeyDown.emit(veto);
    if (!veto.defaultPrevented && this.dismissible()) {
      event.stopPropagation();
      this.close();
    }
  }

  /**
   * Outside-interaction emit forwarders shared by both shells. The shell
   * builds and reuses the veto; these only fire the matching output.
   */
  emitPointerDownOutside(veto: VetoableNativeEvent<PointerEvent>): void {
    this.pointerDownOutside.emit(veto);
  }
  emitFocusOutside(veto: VetoableNativeEvent<FocusEvent>): void {
    this.focusOutside.emit(veto);
  }
  emitInteractOutside(veto: VetoableNativeEvent<PointerEvent | FocusEvent>): void {
    this.interactOutside.emit(veto);
  }

  /** Modal-path Escape forwarder: emit only; the modal shell owns the close. */
  forwardEscapeKeyDown(veto: VetoableNativeEvent<KeyboardEvent>): void {
    this.escapeKeyDown.emit(veto);
  }

  /**
   * Implicit close requested by either shell after an un-vetoed outside
   * interaction (or, on the modal path, an un-vetoed Escape). Marks the
   * control touched and closes.
   */
  requestClose(): void {
    this.close();
  }

  emitAutoFocusOnOpen(): boolean {
    return emitVetoableEvent(this.autoFocusOnOpen);
  }

  emitAutoFocusOnClose(): boolean {
    return emitVetoableEvent(this.autoFocusOnClose);
  }
}
