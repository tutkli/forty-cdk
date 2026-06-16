import {
  booleanAttribute,
  computed,
  Directive,
  inject,
  input,
  model,
  numberAttribute,
  output,
  signal,
} from '@angular/core';
import type { ReferenceElement } from '@floating-ui/dom';
import type { FormValueControl } from '@angular/forms/signals';

import {
  assertTimeCapable,
  injectDateAdapter,
  type TimeCapableDateAdapter,
} from '../_internal/date-adapter/date-adapter';
import { Collection } from '../_internal/collection/collection';
import { adoptHostId } from '../_internal/host-id/host-id';
import { IdGenerator } from '../_internal/id-generator/id-generator';
import type { FloatingAlign, FloatingSide } from '../_internal/floating/floating';
import {
  type ListNavigationAction,
  moveIndex,
  type WritingDirection,
} from '../_internal/keyboard-navigation/keyboard-navigation';
import { FormUiControlBase } from '../_internal/form-ui-control/form-ui-control-base';
import { injectHiddenInput } from '../_internal/hidden-input/hidden-input';
import {
  emitVetoableEvent,
  emitVetoableNativeEvent,
  type VetoableEvent,
  type VetoableNativeEvent,
} from '../_internal/vetoable-event/vetoable-event';
import { injectTextDirection } from '../_internal/text-direction/text-direction';
import { FOR_TIME_VALUE_SOURCE } from '../_internal/datetime/time-value-source';
import { buildTimeSlots, type ForTimeSlot, type TimePickerGranularity } from './build-time-slots';
import {
  FOR_TIME_PICKER_CONTEXT,
  type ForTimePickerCloseReason,
  type ForTimePickerContext,
  type ForTimePickerInitialFocus,
  type ForTimePickerOptionHandle,
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
  readonly #items = new Collection<ForTimePickerOptionHandle>();
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
   * dismissable layer. Call `preventDefault()` on the veto to suppress the
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

  readonly triggerId = signal(this.#idGen.next('for-time-picker-trigger'));
  readonly contentId = signal(this.#idGen.next('for-time-picker-content'));

  readonly #initialFocus = signal<ForTimePickerInitialFocus>('selected');
  readonly initialFocus = this.#initialFocus.asReadonly();

  readonly #lastCloseReason = signal<ForTimePickerCloseReason | null>(null);
  readonly lastCloseReason = this.#lastCloseReason.asReadonly();

  readonly #triggerEl = signal<HTMLElement | null>(null);
  readonly trigger = this.#triggerEl.asReadonly();

  readonly anchor = computed<ReferenceElement | null>(() => this.#triggerEl());

  readonly #contentEl = signal<HTMLElement | null>(null);
  readonly content = this.#contentEl.asReadonly();

  readonly options = this.#items.items;

  readonly #sentinel = computed(() => this.adapter.createDate(2000, 1, 1));

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
   * anchored to the current `value()` date (or a sentinel), so selecting a
   * slot preserves the calendar date when used inside a date-time picker.
   *
   * Pure derivation — never written from inside an `effect()`.
   */
  readonly slots = computed<readonly ForTimeSlot<D>[]>(() => {
    const anchor = this.value() ?? this.#sentinel();
    return buildTimeSlots({
      adapter: this.adapter,
      anchor,
      selected: this.value(),
      minTime: this.minTime(),
      maxTime: this.maxTime(),
      step: this.step(),
      granularity: this.granularity(),
      formatOptions: this.#effectiveFormatOptions(),
    });
  });

  /** Formatted display of the current value, or `null` when empty. */
  readonly formattedValue = computed<string | null>(() => {
    const v = this.value();
    return v === null ? null : this.adapter.format(v, this.#effectiveFormatOptions());
  });

  protected override fieldLabelledElement(): HTMLElement | null {
    return this.trigger();
  }

  protected override fieldLabelledElementId(): string {
    return this.triggerId();
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
        const hour = String(this.adapter.getHours(current)).padStart(2, '0');
        const granularity = this.granularity();
        if (granularity === 'hour') {
          return [hour];
        }
        const minute = String(this.adapter.getMinutes(current)).padStart(2, '0');
        if (granularity === 'minute') {
          return [`${hour}:${minute}`];
        }
        const second = String(this.adapter.getSeconds(current)).padStart(2, '0');
        return [`${hour}:${minute}:${second}`];
      }),
      disabled: this.effectiveDisabled,
    });
  }

  setInitialFocus(target: ForTimePickerInitialFocus): void {
    this.#initialFocus.set(target);
  }

  registerTrigger(el: HTMLElement): void {
    adoptHostId(el, this.triggerId);
    this.#triggerEl.set(el);
  }
  unregisterTrigger(el: HTMLElement): void {
    if (this.#triggerEl() === el) {
      this.#triggerEl.set(null);
    }
  }

  registerContent(el: HTMLElement): void {
    adoptHostId(el, this.contentId);
    this.#contentEl.set(el);
  }
  unregisterContent(el: HTMLElement): void {
    if (this.#contentEl() === el) {
      this.#contentEl.set(null);
    }
  }

  registerOption(handle: ForTimePickerOptionHandle): void {
    this.#items.register(handle);
  }
  unregisterOption(handle: ForTimePickerOptionHandle): void {
    this.#items.unregister(handle);
  }

  #sameTimeOfDay(a: D, b: D): boolean {
    const g = this.granularity();
    const secA =
      this.adapter.getHours(a) * 3600 +
      (g !== 'hour' ? this.adapter.getMinutes(a) * 60 : 0) +
      (g === 'second' ? this.adapter.getSeconds(a) : 0);
    const secB =
      this.adapter.getHours(b) * 3600 +
      (g !== 'hour' ? this.adapter.getMinutes(b) * 60 : 0) +
      (g === 'second' ? this.adapter.getSeconds(b) : 0);
    return secA === secB;
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
    this.value.set(v);
    if (this.closeOnSelect()) {
      this.closeMenu('select');
    }
  }

  navigate(currentOption: HTMLElement, action: ListNavigationAction): void {
    if (this.effectiveDisabled()) {
      return;
    }
    const items = this.#items.items();
    if (items.length === 0) {
      return;
    }
    const currentIndex = items.findIndex((o) => o.host === currentOption);
    const next = moveIndex(currentIndex < 0 ? 0 : currentIndex, items.length, action, {
      loop: this.loop(),
      isDisabled: (i) => items[i]!.disabled(),
    });
    if (next === null) {
      return;
    }
    const target = items[next];
    if (!target) {
      return;
    }
    target.host.focus();
  }

  focusFirstEnabledOption(): boolean {
    const target = this.#items.items().find((o) => !o.disabled());
    if (!target) {
      return false;
    }
    target.host.focus();
    return true;
  }

  focusLastEnabledOption(): boolean {
    const items = this.#items.items();
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];
      if (item && !item.disabled()) {
        item.host.focus();
        return true;
      }
    }
    return false;
  }

  focusSelectedOption(): boolean {
    const current = this.value();
    if (current === null) {
      return false;
    }
    const items = this.#items.items();
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

  toggle(initialFocus: ForTimePickerInitialFocus = 'selected'): void {
    if (this.effectiveDisabled()) {
      return;
    }
    if (this.open()) {
      this.closeMenu('programmatic');
    } else {
      this.openMenu(initialFocus);
    }
  }

  openMenu(initialFocus: ForTimePickerInitialFocus = 'selected'): void {
    if (this.effectiveDisabled()) {
      return;
    }
    this.#initialFocus.set(initialFocus);
    this.#lastCloseReason.set(null);
    this.open.set(true);
  }

  closeMenu(reason: ForTimePickerCloseReason): void {
    this.#lastCloseReason.set(reason);
    this.open.set(false);
  }

  commitOnTab(value: D): void {
    if (this.effectiveDisabled()) {
      return;
    }
    if (!this.readonly()) {
      this.value.set(value);
    }
    this.#triggerEl()?.focus();
    this.closeMenu('tab');
  }

  emitEscapeKeyDown(event: KeyboardEvent): void {
    const vetoed = emitVetoableNativeEvent(this.escapeKeyDown, event);
    if (!vetoed && this.dismissible()) {
      event.stopPropagation();
      this.markTouched();
      this.closeMenu('escape');
    }
  }

  emitPointerDownOutside(veto: VetoableNativeEvent<PointerEvent>): void {
    this.pointerDownOutside.emit(veto);
  }
  emitFocusOutside(veto: VetoableNativeEvent<FocusEvent>): void {
    this.focusOutside.emit(veto);
  }
  emitInteractOutside(veto: VetoableNativeEvent<PointerEvent | FocusEvent>): void {
    this.interactOutside.emit(veto);
  }

  forwardEscapeKeyDown(veto: VetoableNativeEvent<KeyboardEvent>): void {
    this.escapeKeyDown.emit(veto);
  }

  requestClose(reason: 'pointerDownOutside' | 'focusOutside'): void {
    this.markTouched();
    this.closeMenu(reason);
  }

  emitAutoFocusOnOpen(): boolean {
    return emitVetoableEvent(this.autoFocusOnOpen);
  }

  emitAutoFocusOnClose(): boolean {
    return emitVetoableEvent(this.autoFocusOnClose);
  }

  override markTouched(): void {
    super.markTouched();
  }
}
