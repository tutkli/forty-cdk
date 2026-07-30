import { computed, inject, InjectionToken, type Signal } from '@angular/core';
import type { ReferenceElement } from '@floating-ui/dom';

import { type FloatingAlign, type FloatingSide, type VetoableNativeEvent } from 'forty-cdk/core';

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

  /**
   * The picker's effective disabled — its own `disabled` input OR'd with a
   * surrounding disabled `[forFieldset]`. The trigger reads this so a disabled
   * picker (or fieldset) is inert and reflects the native `disabled` attribute
   * (its single channel, #561 D2).
   */
  readonly effectiveDisabled: Signal<boolean>;
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
  readonly clipUntilPositioned: Signal<boolean>;

  readonly triggerId: Signal<string>;
  readonly contentId: Signal<string>;
  /** Accessible name for the dialog surface. Emits no `aria-label` while `null`. */
  readonly ariaLabel: Signal<string | null>;

  /** Formatted current value via the adapter, or `null` when empty. Read by `[forDatePickerValue]`. */
  readonly formattedValue: Signal<string | null>;
  /** Placeholder shown by `[forDatePickerValue]` when no date is selected. */
  readonly placeholder: Signal<string>;

  /**
   * Element floating-ui anchors the surface against. Prefers an optional
   * `[forDatePickerAnchor]` when registered, otherwise falls back to the
   * trigger. Decoupled from `trigger` so the trigger keeps driving
   * `aria-controls`, the click toggle, focus return, and its outside-pointer
   * exemption regardless of where the surface paints.
   */
  readonly reference: Signal<ReferenceElement | null>;
  /** The trigger button — exempt from outside-pointer checks and the return-focus target. */
  readonly trigger: Signal<HTMLElement | null>;
  registerTrigger(el: HTMLElement): void;
  unregisterTrigger(el: HTMLElement): void;

  /**
   * Register / unregister an optional `[forDatePickerAnchor]` positioning
   * element. At most one anchor per root; a second registration throws.
   * Reference-based unregister, so an anchor torn down inside `@if` restores
   * the trigger fallback cleanly.
   */
  registerAnchor(el: HTMLElement): void;
  unregisterAnchor(el: HTMLElement): void;

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
   * Anchored-path Escape — consumer-owned. Builds the veto, emits
   * `(escapeKeyDown)`, and closes unless vetoed (or `dismissible` is off).
   */
  emitEscapeKeyDown(event: KeyboardEvent): void;
  /**
   * Outside-interaction emit forwarders shared by both shells. The shell
   * builds and reuses one `VetoableNativeEvent` across the specific and
   * composite channels; these only fire the matching `output()` and the shell
   * calls `requestClose` when un-vetoed.
   */
  emitPointerDownOutside(veto: VetoableNativeEvent<PointerEvent>): void;
  emitFocusOutside(veto: VetoableNativeEvent<FocusEvent>): void;
  emitInteractOutside(veto: VetoableNativeEvent<PointerEvent | FocusEvent>): void;
  /** Implicit close requested by either shell after an un-vetoed dismissal. */
  requestClose(): void;

  /**
   * Modal-path Escape forwarder — the modal-shell builds the veto and owns the
   * close; this only fires `(escapeKeyDown)`.
   */
  forwardEscapeKeyDown(veto: VetoableNativeEvent<KeyboardEvent>): void;

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
      `[forty-cdk/date-picker] ${piece} must be used inside a [forDatePicker] element. ` +
        "If it is declared inside an ng-template, DI resolves at the template's declaration site — " +
        'not where it is stamped (e.g. via ngTemplateOutlet) — so declare the template inside the ' +
        '[forDatePicker] root.',
    );
  }
  return ctx;
}

/**
 * Resolves the trigger's root context: the explicit reference when the
 * `[forDatePickerTrigger]` input carries one, the injected
 * `FOR_DATE_PICKER_CONTEXT` otherwise. The orphan error only fires when neither
 * resolves, on first read of the returned signal. Must be called in an
 * injection context.
 */
export function injectDatePickerTriggerContext(
  explicitRoot: Signal<ForDatePickerContext | ''>,
): Signal<ForDatePickerContext> {
  const injected = inject(FOR_DATE_PICKER_CONTEXT, { optional: true });
  return computed(() => {
    const explicit = explicitRoot();
    if (explicit !== '') {
      return explicit;
    }
    if (injected) {
      return injected;
    }
    throw new Error(
      '[forty-cdk/date-picker] ForDatePickerTrigger could not resolve its [forDatePicker] root: ' +
        'no FOR_DATE_PICKER_CONTEXT provider is visible and no explicit root reference was passed. ' +
        "If this trigger is declared inside an ng-template, DI resolves at the template's declaration " +
        'site — not where it is stamped — so either declare the template inside the root or pass the ' +
        'root explicitly: [forDatePickerTrigger]="root" with #root="forDatePicker".',
    );
  });
}
