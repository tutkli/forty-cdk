import { inject, InjectionToken, type Signal } from '@angular/core';
import type { ReferenceElement } from '@floating-ui/dom';

import type { FloatingAlign, FloatingSide } from '../_internal/floating/floating';
import type { VetoableNativeEvent } from '../_internal/vetoable-event/vetoable-event';

/**
 * Coordination contract owned by `[forDatePicker]` (the root). The trigger,
 * content surface, and value pieces inject this token to read state and
 * delegate behavior — they never import the root class directly.
 *
 * The root is the `FormValueControl<D | null>`; the trigger is the focusable
 * element that carries `name` / `disabled` / `invalid` for `[formField]`
 * autowiring. The projected `ForCalendar` is two-way bound by the consumer and
 * its selection drives the picker through the root's `contentChild` query — not
 * through this context — so the calendar contract stays untouched.
 *
 * Pieces only ever read `open` and route writes through `toggle()` / `close()`,
 * so the context exposes it read-only and never surfaces the date `value`
 * (the value piece renders the pre-formatted {@link formattedValue}).
 */
export interface ForDatePickerContext {
  /** Whether the surface is open. */
  readonly open: Signal<boolean>;

  readonly disabled: Signal<boolean>;
  readonly readonly: Signal<boolean>;
  readonly required: Signal<boolean>;
  readonly invalid: Signal<boolean>;
  readonly pending: Signal<boolean>;

  /** When `true`, the surface is a trapped / inert / scroll-locked modal dialog. */
  readonly modal: Signal<boolean>;
  /** When `true`, Escape / outside-pointer dismiss the surface. */
  readonly dismissible: Signal<boolean>;
  /** When `true`, focus returns to the trigger on close. */
  readonly returnFocus: Signal<boolean>;
  /** Close the surface after a date is selected in the projected calendar. */
  readonly closeOnSelect: Signal<boolean>;

  readonly side: Signal<FloatingSide | undefined>;
  readonly align: Signal<FloatingAlign | undefined>;
  readonly sideOffset: Signal<number>;
  readonly alignOffset: Signal<number>;
  readonly avoidCollisions: Signal<boolean>;
  readonly collisionPadding: Signal<number>;
  readonly sticky: Signal<'partial' | 'always' | false>;
  readonly hideWhenDetached: Signal<boolean>;

  readonly triggerId: Signal<string>;
  readonly contentId: Signal<string>;
  /** Accessible name for the dialog surface. Emits no `aria-label` while `null`. */
  readonly ariaLabel: Signal<string | null>;

  /** Formatted current value via the adapter, or `null` when empty. Read by `[forDatePickerValue]`. */
  readonly formattedValue: Signal<string | null>;
  /** Placeholder shown by `[forDatePickerValue]` when no date is selected. */
  readonly placeholder: Signal<string>;

  /** Element floating-ui anchors against (the trigger). */
  readonly reference: Signal<ReferenceElement | null>;
  /** The trigger button — exempt from outside-pointer checks and the return-focus target. */
  readonly trigger: Signal<HTMLElement | null>;
  registerTrigger(el: HTMLElement): void;
  unregisterTrigger(el: HTMLElement): void;

  /** The mounted `[forDatePickerContent]` element. */
  readonly content: Signal<HTMLElement | null>;
  registerContent(el: HTMLElement): void;
  unregisterContent(el: HTMLElement): void;

  /** Toggle from a trigger click. Honours `disabled`. */
  toggle(): void;
  /** Close the surface (Escape, outside-pointer, post-selection). Flips `touched`. */
  close(): void;
  /** Flip the `touched` model. Called by the trigger on blur-to-outside. */
  markTouched(): void;

  /**
   * Move focus to the projected calendar's roving cell (`tabindex="0"`) when
   * the surface mounts. Returns `false` when no cell is found so the overlay
   * shell can fall back to the first focusable descendant.
   */
  focusCalendarCell(): boolean;

  /**
   * Dismiss coordination — the overlay-shell hands a raw DOM event; the
   * directive builds the veto, emits the matching `output()`, and — for the
   * outside family — shares the veto so the immediately-following composite
   * `interactOutside` cannot trigger a second close.
   */
  emitEscapeKeyDown(event: KeyboardEvent): void;
  emitPointerDownOutside(event: PointerEvent): void;
  emitFocusOutside(event: FocusEvent): void;
  emitInteractOutside(event: PointerEvent | FocusEvent): void;

  /**
   * Dismiss coordination — the modal-shell builds the veto itself, then hands
   * it back so it flows through the same `output()` + shared-veto logic the
   * overlay path uses. A single internal coordination surface backs both paths,
   * so double-close prevention is identical regardless of mode.
   */
  forwardEscapeKeyDown(veto: VetoableNativeEvent<KeyboardEvent>): void;
  forwardPointerDownOutside(veto: VetoableNativeEvent<PointerEvent>): void;
  forwardFocusOutside(veto: VetoableNativeEvent<FocusEvent>): void;
  forwardInteractOutside(veto: VetoableNativeEvent<PointerEvent | FocusEvent>): void;

  /**
   * Auto-focus hooks. Content fires these just before its imperative `.focus()`
   * (open) or the trigger return-focus (close); `event.preventDefault()` skips
   * the move. Returns `true` when the consumer vetoed.
   */
  emitAutoFocusOnOpen(): boolean;
  emitAutoFocusOnClose(): boolean;
}

/** Injection token for {@link ForDatePickerContext}, provided by `ForDatePicker`. */
export const FOR_DATE_PICKER_CONTEXT = new InjectionToken<ForDatePickerContext>(
  'FOR_DATE_PICKER_CONTEXT',
);

/**
 * Injects the nearest {@link ForDatePickerContext}, throwing a descriptive
 * error when used outside a `[forDatePicker]` element.
 *
 * @param piece Name of the calling directive, used in the error message.
 */
export function injectDatePickerContext(piece: string): ForDatePickerContext {
  const ctx = inject(FOR_DATE_PICKER_CONTEXT, { optional: true });
  if (!ctx) {
    throw new Error(
      `[forty-cdk/date-picker] ${piece} must be used inside a [forDatePicker] element.`,
    );
  }
  return ctx;
}
