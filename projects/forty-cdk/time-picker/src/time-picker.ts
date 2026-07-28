import {
  booleanAttribute,
  computed,
  Directive,
  inject,
  input,
  model,
  numberAttribute,
  output,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

import {
  assertTimeCapable,
  injectDateAdapter,
  type TimeCapableDateAdapter,
  IdGenerator,
  type FloatingAlign,
  type FloatingSide,
  type WritingDirection,
  ListboxOverlayController,
  FormUiControlBase,
  injectHiddenInput,
  type VetoableEvent,
  type VetoableNativeEvent,
  injectTextDirection,
  FOR_TIME_VALUE_SOURCE,
  serializeISOTime,
  timeSentinel,
  composeWithTime,
} from 'forty-cdk/core';
import {
  buildTimeSlots,
  timeOfDaySeconds,
  type ForTimeSlot,
  type TimePickerGranularity,
} from './build-time-slots';
import {
  FOR_TIME_PICKER_CONTEXT,
  type ForTimePickerCloseReason,
  type ForTimePickerContext,
  type ForTimePickerInitialFocus,
  type ForTimePickerOptionHandle,
  type ForTimePickerOverlayContext,
} from './time-picker-context';
import { FOR_TIME_PICKER_DEFAULTS } from './time-picker-defaults';

/**
 * Root of the headless time picker, implementing the
 * [WAI-ARIA Listbox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/)
 * for a slot-based time selection. Generates a full-day list of time slots at
 * a configurable `step` (in minutes), displayed in a floating listbox.
 *
 * Implements `FormValueControl<D | null>` from `@angular/forms/signals` for
 * `[formField]` auto-wiring. Requires a time-capable adapter
 * (`provideNativeDateAdapter()` or `provideInternationalizedDateTimeAdapter()`).
 *
 * @typeParam D The adapter's immutable date-time type.
 */
@Directive({
  selector: '[forTimePicker]',
  exportAs: 'forTimePicker',
  host: {
    '[attr.data-state]': 'open() ? "open" : "closed"',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
    '[attr.dir]': 'dir()',
  },
  providers: [
    { provide: FOR_TIME_PICKER_CONTEXT, useExisting: ForTimePicker },
    { provide: FOR_TIME_VALUE_SOURCE, useExisting: ForTimePicker },
  ],
})
export class ForTimePicker<D>
  extends FormUiControlBase
  implements FormValueControl<D | null>, ForTimePickerContext<D>
{
  readonly #idGen = inject(IdGenerator);
  readonly #defaults = inject(FOR_TIME_PICKER_DEFAULTS);

  /**
   * The active, time-capable date adapter. Throws when the provided adapter is
   * day-only.
   */
  readonly adapter: TimeCapableDateAdapter<D> = assertTimeCapable(
    injectDateAdapter<D>('ForTimePicker'),
    'ForTimePicker',
  );

  /**
   * Two-way bindable selected time, or `null`. Required by
   * `FormValueControl<D | null>`. The `model()` change emitter
   * (`(valueChange)`) fires only on internal selection changes, never on
   * consumer writes via `[(value)]`.
   */
  readonly value = model<D | null>(null);

  /**
   * Two-way bindable. Whether the listbox is currently shown. The `model()`
   * change emitter (`(openChange)`) fires only on internal transitions, never
   * on consumer writes via `[(open)]`.
   */
  readonly open = model<boolean>(false);

  /**
   * Earliest selectable time-of-day (inclusive). Slots earlier in the day are
   * disabled. Named `minTime` (not `min`) because `FormUiControl.min` is
   * reserved for a numeric validator.
   */
  readonly minTime = input<D | null>(null);

  /**
   * Latest selectable time-of-day (inclusive). Slots later in the day are
   * disabled. Named `maxTime` for the same reason as {@link minTime}.
   */
  readonly maxTime = input<D | null>(null);

  /**
   * Slot interval in whole minutes. Default `30`. Clamped to ≥ 1 internally.
   * Use `60` for hourly slots, `15` for quarter-hour slots.
   */
  readonly step = input(30, { transform: numberAttribute });

  /**
   * Finest time unit compared when determining if a slot is selected.
   * Default `'minute'`. Use `'second'` when the value carries seconds.
   */
  readonly granularity = input<TimePickerGranularity>('minute');

  /**
   * 12- or 24-hour cycle for slot label formatting. When `null` (default) it
   * is derived from the runtime locale.
   */
  readonly hourCycle = input<12 | 24 | null>(null);

  /**
   * BCP 47 locale driving slot label formatting. Defaults to the runtime locale.
   */
  readonly locale = input<string | null>(null);

  /**
   * Close the listbox after a slot is selected. Default `true`.
   */
  readonly closeOnSelect = input(true, { transform: booleanAttribute });

  /**
   * When `true`, the listbox mounts as a trapped / inert / scroll-locked modal
   * surface instead of the default anchored popover. Read once when the content
   * mounts.
   */
  readonly modal = input(false, { transform: booleanAttribute });

  /** When `true` (default), Escape, pointer-down outside, and focus outside close the listbox. */
  readonly dismissible = input(true, { transform: booleanAttribute });

  /** When `true` (default), focus returns to the trigger on close. */
  readonly returnFocus = input(true, { transform: booleanAttribute });

  /** Placeholder shown by `[forTimePickerValue]` when no time is selected. */
  readonly placeholder = input<string>('');

  /**
   * `Intl.DateTimeFormat` options driving slot label formatting. When none of
   * `hour` / `minute` / `second` are specified, sensible defaults are filled in
   * automatically based on `granularity` and `hourCycle`.
   */
  readonly formatOptions = input<Intl.DateTimeFormatOptions>({});

  /** Manual `aria-label` on `[forTimePickerContent]` when the trigger isn't a meaningful name. */
  readonly ariaLabel = input<string | null>(null);

  /** When `true` (default), keyboard navigation wraps at the ends of the option list. */
  readonly loop = input(true, { transform: booleanAttribute });

  /** Orientation of the listbox for keyboard navigation. Default `'vertical'`. */
  readonly orientation = input<'vertical' | 'horizontal'>('vertical');

  /**
   * Side the listbox is anchored to. Defaults to `'bottom'`. Ignored in
   * `modal` mode.
   */
  readonly side = input<FloatingSide | undefined>('bottom');

  /** Alignment along the chosen `side`. Defaults to `'start'`. */
  readonly align = input<FloatingAlign | undefined>('start');

  /**
   * Gap (px) between trigger and listbox along the main axis. Default `4`.
   * The default is read from `provideForTimePickerDefaults` for the surrounding
   * scope.
   */
  readonly sideOffset = input(this.#defaults.sideOffset, { transform: numberAttribute });

  /** Gap (px) along the cross axis. Default `0`. */
  readonly alignOffset = input(0, { transform: numberAttribute });

  /** When `true` (default), `flip` and `shift` keep the listbox inside the viewport. */
  readonly avoidCollisions = input(true, { transform: booleanAttribute });

  /**
   * Padding (px) applied uniformly to flip / shift / size. Default `8`.
   * The default is read from `provideForTimePickerDefaults` for the surrounding
   * scope.
   */
  readonly collisionPadding = input(this.#defaults.collisionPadding, {
    transform: numberAttribute,
  });

  /** Padding (px) for the `arrow` middleware. Default `0`. */
  readonly arrowPadding = input(0, { transform: numberAttribute });

  /** Stickiness behaviour for `shift`. Default `'partial'`. */
  readonly sticky = input<'partial' | 'always' | false>('partial');

  /** When `true`, sets `data-detached=""` while the trigger is scrolled off-screen. */
  readonly hideWhenDetached = input(false, { transform: booleanAttribute });

  /**
   * When `true` (default), the content is clipped until floating-ui resolves
   * its first position, preventing a flash at the viewport corner.
   */
  readonly clipUntilPositioned = input(true, { transform: booleanAttribute });

  /**
   * Writing direction. When unset (default `null`), the inherited ambient
   * direction is resolved from the nearest ancestor carrying a `dir` attribute
   * (or `<html dir>`), defaulting to `'ltr'`. An explicit `[dir]` always wins.
   */
  readonly _dirInput = input<WritingDirection | null>(null, { alias: 'dir' });
  readonly dir = injectTextDirection(this._dirInput);

  /**
   * Fires when the user presses Escape while this listbox is the topmost
   * dismissible layer. Call `preventDefault()` on the veto to suppress the
   * automatic close.
   */
  readonly escapeKeyDown = output<VetoableNativeEvent<KeyboardEvent>>();

  /** Fires when a pointer goes down outside the listbox. Vetoable. */
  readonly pointerDownOutside = output<VetoableNativeEvent<PointerEvent>>();

  /** Fires when focus moves outside the listbox. Vetoable. */
  readonly focusOutside = output<VetoableNativeEvent<FocusEvent>>();

  /** Composite event: shares veto state with `pointerDownOutside` / `focusOutside`. */
  readonly interactOutside = output<VetoableNativeEvent<PointerEvent | FocusEvent>>();

  /**
   * Fires just before the listbox sends focus to the selected slot (or first
   * enabled) on open. Call `preventDefault()` on the veto to skip the focus
   * move.
   */
  readonly autoFocusOnOpen = output<VetoableEvent>();

  /**
   * Fires just before focus returns to the trigger on close. Call
   * `preventDefault()` on the veto to suppress the return-focus.
   */
  readonly autoFocusOnClose = output<VetoableEvent>();

  /**
   * Shared overlay-listbox state machine: option collection, trigger / anchor /
   * content registries + ids, DOM-focus navigation, the open / close machine,
   * the initial-focus / close-reason state, and the dismiss / auto-focus emit
   * forwarders. The value-specific behaviour (`isSelected`, `activate`,
   * `focusSelectedOption`, `commitOnTab`) stays in this root.
   */
  readonly #controller = new ListboxOverlayController<
    ForTimePickerOptionHandle,
    ForTimePickerInitialFocus,
    ForTimePickerCloseReason
  >(this.#idGen, {
    idPrefix: 'for-time-picker',
    multipleAnchorsError:
      '[forty-cdk/time-picker] Multiple [forTimePickerAnchor] inside the same [forTimePicker]; only one is allowed.',
    defaultInitialFocus: 'selected',
    effectiveDisabled: this.effectiveDisabled,
    setOpen: (open) => this.open.set(open),
    isOpen: () => this.open(),
    emit: {
      escapeKeyDown: this.escapeKeyDown,
      pointerDownOutside: this.pointerDownOutside,
      focusOutside: this.focusOutside,
      interactOutside: this.interactOutside,
      autoFocusOnOpen: this.autoFocusOnOpen,
      autoFocusOnClose: this.autoFocusOnClose,
    },
    loop: this.loop,
    dismissible: this.dismissible,
    escapeReason: 'escape',
    programmaticReason: 'programmatic',
    markTouched: () => this.markTouched(),
  });

  /**
   * The shared overlay-listbox coordination surface (trigger / anchor / content
   * registration + ids, DOM-focus navigation, the open / close machine, the
   * initial-focus / close-reason state, and the dismiss + auto-focus emit
   * forwarders). Exposed on the context so child directives read the overlay
   * machinery here — the root no longer re-forwards each member. The optional
   * `[forTimePickerAnchor]` (reached via `overlay.anchor`) is preferred when
   * registered, otherwise floating-ui falls back to the trigger.
   */
  readonly overlay: ForTimePickerOverlayContext = this.#controller;

  readonly #sentinel = computed(() => timeSentinel(this.adapter));

  readonly #effectiveFormatOptions = computed<Intl.DateTimeFormatOptions>(() => {
    const options = this.formatOptions();
    if (
      options.hour !== undefined ||
      options.minute !== undefined ||
      options.second !== undefined
    ) {
      return options;
    }
    const cycle = this.hourCycle();
    const granularity = this.granularity();
    return {
      ...options,
      hour: 'numeric',
      minute: '2-digit',
      ...(granularity === 'second' ? { second: '2-digit' } : {}),
      ...(cycle !== null ? { hour12: cycle === 12 } : {}),
    };
  });

  /**
   * The generated list of time slots for the full day. Each slot's `value` is
   * anchored to a fixed DST-stable sentinel date; `activate` grafts the picked
   * wall-clock onto the current `value()` date, so selecting a slot preserves
   * the calendar date when used inside a date-time picker.
   *
   * Pure derivation — never written from inside an `effect()`.
   */
  readonly slots = computed<readonly ForTimeSlot<D>[]>(() => {
    return buildTimeSlots({
      adapter: this.adapter,
      selected: this.value(),
      minTime: this.minTime(),
      maxTime: this.maxTime(),
      step: this.step(),
      granularity: this.granularity(),
      formatOptions: this.#effectiveFormatOptions(),
      locale: this.locale() ?? undefined,
    });
  });

  /** Formatted display of the current value, or `null` when empty. */
  readonly formattedValue = computed<string | null>(() => {
    const v = this.value();
    return v === null
      ? null
      : this.adapter.format(v, this.#effectiveFormatOptions(), this.locale() ?? undefined);
  });

  protected override fieldLabelledElement(): HTMLElement | null {
    return this.#controller.trigger();
  }

  protected override fieldLabelledElementId(): string {
    return this.#controller.triggerId();
  }

  constructor() {
    super();
    injectHiddenInput({
      name: this.name,
      values: computed(() => {
        const current = this.value();
        if (current === null) {
          return [];
        }
        return [serializeISOTime(this.adapter, current, this.granularity())];
      }),
      disabled: this.effectiveDisabled,
    });
  }

  #sameTimeOfDay(a: D, b: D): boolean {
    const g = this.granularity();
    return timeOfDaySeconds(this.adapter, a, g) === timeOfDaySeconds(this.adapter, b, g);
  }

  isSelected(v: D): boolean {
    const current = this.value();
    if (current === null) {
      return false;
    }
    return this.#sameTimeOfDay(v, current);
  }

  activate(v: D): void {
    if (this.effectiveDisabled() || this.readonly()) {
      return;
    }
    this.value.set(composeWithTime(this.adapter, this.value() ?? this.#sentinel(), v));
    if (this.closeOnSelect()) {
      this.#controller.closeMenu('select');
    }
  }

  focusSelectedOption(): boolean {
    const current = this.value();
    if (current === null) {
      return false;
    }
    const items = this.#controller.options();
    const opt = items.find((o) => {
      if (o.disabled()) {
        return false;
      }
      const v = o.value() as D;
      return this.#sameTimeOfDay(v, current);
    });
    if (opt) {
      opt.host.focus();
      return true;
    }
    return false;
  }

  commitOnTab(value: D): void {
    if (this.effectiveDisabled()) {
      return;
    }
    if (!this.readonly()) {
      this.value.set(composeWithTime(this.adapter, this.value() ?? this.#sentinel(), value));
    }
    this.#controller.focusTrigger();
    this.#controller.closeMenu('tab');
  }

  override markTouched(): void {
    super.markTouched();
  }
}
