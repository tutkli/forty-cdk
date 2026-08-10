import {
  booleanAttribute,
  computed,
  contentChild,
  Directive,
  inject,
  input,
  isDevMode,
  model,
  output,
  signal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import type { ReferenceElement } from '@floating-ui/dom';

import {
  adoptHostId,
  createVetoableNativeEvent,
  type DateAdapter,
  emitVetoableEvent,
  fortyError,
  IdGenerator,
  injectTextDirection,
  type VetoableEvent,
  type VetoableNativeEvent,
  type WritingDirection,
} from 'forty-cdk/core';
import { AnchoredFormValueControlBase } from 'forty-cdk/core-overlay';
import { ForCalendar } from 'forty-cdk/calendar';
import type { ForDatePickerContext } from './date-picker-context';

/**
 * Shared overlay / trigger / anchor / content / dismiss / focus machinery for
 * the date-picker roots. Both the single-date `ForDatePicker` and the
 * range-form `ForDateRangePicker` extend it, so the floating surface, the
 * dismissible-layer wiring, the optional positioning anchor, the trigger /
 * content registration, return-focus, and the vetoable dismiss / auto-focus
 * outputs live in one place instead of being duplicated per root.
 *
 * It implements the full {@link ForDatePickerContext} except `formattedValue`,
 * which depends on the concrete value type (single date vs `start – end`).
 * That, plus the `adapter`, the per-root `positioningDefaults` token, and the
 * generated `triggerId` / `contentId`, are declared abstract so each concrete
 * root owns them; everything else is concrete and inherited.
 *
 * Each concrete root keeps ownership of its `value` model (the
 * `FormValueControl` backing), its hidden-input serialization, and its
 * calendar-selection bridge — those are value-type specific and never shared.
 *
 * Internal — not re-exported from `public-api.ts`.
 *
 * @typeParam D The adapter's immutable date type.
 */
@Directive()
export abstract class DatePickerBase<D>
  extends AnchoredFormValueControlBase
  implements ForDatePickerContext
{
  /** Shared id generator; concrete roots seed {@link triggerId} / {@link contentId} from it. */
  protected readonly idGen = inject(IdGenerator);

  /** The active date adapter, resolved from `FOR_DATE_ADAPTER` (shared with `ForCalendar`). */
  abstract readonly adapter: DateAdapter<D>;

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
   * Close the surface after a selection is committed in the projected calendar.
   * Default `true`.
   */
  readonly closeOnSelect = input(true, { transform: booleanAttribute });

  /**
   * When `true`, the surface is a trapped / inert / scroll-locked modal dialog
   * (routed through `core-overlay/modal-shell`) instead of the default non-modal
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

  /**
   * BCP 47 locale tag driving the text rendered by `[forDatePickerValue]`. When
   * `null` (default), the adapter formats through the runtime's default locale.
   * The projected `ForCalendar` is not forwarded this value — bind its own
   * `[locale]` directly, mirroring how `minDate` / `maxDate` are forwarded.
   */
  readonly locale = input<string | null>(null);

  /** Text rendered by `[forDatePickerValue]` when nothing is selected. */
  readonly placeholder = input<string>('');

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
   * dismissible layer. Call `preventDefault()` on the veto to suppress the
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

  /** The trigger's `id` for `aria-controls` wiring; concrete roots seed it from {@link idGen}. */
  abstract readonly triggerId: WritableSignal<string>;

  /** The surface's `id` for `aria-labelledby` wiring; concrete roots seed it from {@link idGen}. */
  abstract readonly contentId: WritableSignal<string>;

  /** Formatted current value via the adapter, or `null` when empty. */
  abstract readonly formattedValue: Signal<string | null>;

  readonly #triggerEl = signal<HTMLElement | null>(null);
  readonly trigger = this.#triggerEl.asReadonly();

  readonly #anchorEl = signal<HTMLElement | null>(null);

  /**
   * Element floating-ui anchors the surface against. Prefers an optional
   * `[forDatePickerAnchor]` when registered, otherwise falls back to the
   * trigger so existing pickers without an anchor keep their behavior.
   * Decoupled from `trigger` so the trigger keeps driving `aria-controls`, the
   * click toggle, focus return, and its dismissal exemption regardless of where
   * the surface paints.
   */
  readonly reference = computed<ReferenceElement | null>(
    () => this.#anchorEl() ?? this.#triggerEl(),
  );

  readonly #contentEl = signal<HTMLElement | null>(null);
  readonly content = this.#contentEl.asReadonly();

  /**
   * The projected `ForCalendar`. Mounts only while the surface is open, so the
   * query resolves to the live instance on open and to `undefined` on close.
   * Its `valueChange` / `rangeChange` is the single signal that a selection
   * happened inside the grid — each concrete root wires the matching one in its
   * constructor.
   *
   * Invariant: the projected calendar MUST resolve the same `DateAdapter` as
   * this root (the same `FOR_DATE_ADAPTER` scope). Angular's `contentChild`
   * erases the generic, so a bridge reads `calendar.value` / `calendar.range`
   * via a cast; a mismatched adapter would leak a wrong-shaped date through that
   * seam. {@link assertSameAdapter} catches it early in dev mode.
   */
  protected readonly calendar = contentChild(ForCalendar, { descendants: true });

  /**
   * Dev-mode guard for a concrete root's calendar-selection bridge: throws when
   * the projected `ForCalendar` resolved a different `DateAdapter` than this
   * root, which would leak a wrong-shaped date through the generic-erased
   * `contentChild` seam.
   */
  protected assertSameAdapter(calendar: ForCalendar<unknown>): void {
    if (isDevMode() && calendar.adapter !== (this.adapter as DateAdapter<unknown>)) {
      throw fortyError({
        code: 'FORCDK-DATE-PICKER-001',
        message: 'The projected ForCalendar uses a different DateAdapter than the date picker.',
        cause:
          'The calendar is read through a generic-erased contentChild, so a second adapter would ' +
          'leak a wrong-shaped date value into the picker.',
        fix: 'Provide one DateAdapter for both, or move the calendar under the picker’s providers.',
      });
    }
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

  registerAnchor(el: HTMLElement): void {
    const current = this.#anchorEl();
    if (current !== null && current !== el) {
      throw fortyError({
        code: 'FORCDK-DATE-PICKER-002',
        message: 'A picker root registered a second [forDatePickerAnchor]; only one is allowed.',
        fix: 'Keep a single [forDatePickerAnchor] per picker root.',
      });
    }
    this.#anchorEl.set(el);
  }
  unregisterAnchor(el: HTMLElement): void {
    if (this.#anchorEl() === el) {
      this.#anchorEl.set(null);
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

  protected override fieldLabelledElement(): HTMLElement | null {
    return this.#triggerEl();
  }

  protected override fieldLabelledElementId(): string {
    return this.triggerId();
  }

  /**
   * Move focus to the trigger, implementing `FormValueControl.focus` from
   * `@angular/forms/signals`. Without this override Signal Forms would focus the
   * host `[forDatePicker]` / `[forDateRangePicker]` wrapper — which carries no
   * focusable role — so focus-on-error would silently go nowhere. No-op when
   * disabled or before the trigger has registered.
   */
  override focus(options?: FocusOptions): void {
    if (this.effectiveDisabled()) {
      return;
    }
    this.#triggerEl()?.focus(options);
  }

  toggle(): void {
    if (this.effectiveDisabled()) {
      return;
    }
    this.open.update((v) => !v);
  }

  close(): void {
    this.markTouched();
    this.open.set(false);
  }

  override markTouched(): void {
    super.markTouched();
  }

  focusCalendarCell(): boolean {
    return this.calendar()?.focusActiveCell() ?? false;
  }

  // Both the anchored (`injectOverlayShell`) and modal (`injectModalShell`)
  // surfaces own the shared `#pendingOutsideVeto` reuse between the specific
  // outside channels and the composite `interactOutside`, so this root only
  // forwards the shell-built veto to the matching `output()` and owns the close
  // decision via `requestClose`. Escape is the one channel this root still owns
  // end-to-end on the anchored path (the modal path routes it through
  // `emitEscapeKeyDown` on the shell, which builds the veto and calls
  // `requestClose` itself).

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
   * Outside-interaction emit forwarders shared by both shells. The shell builds
   * and reuses the veto; these only fire the matching output.
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
   * interaction (or, on the modal path, an un-vetoed Escape). Marks the control
   * touched and closes.
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
