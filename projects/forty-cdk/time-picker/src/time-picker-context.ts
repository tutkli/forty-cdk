import { computed, inject, InjectionToken, type Signal } from '@angular/core';

import {
  type CollectionHandle,
  type FloatingAlign,
  type FloatingSide,
  type ListboxOverlayContext,
  type WritingDirection,
} from 'forty-cdk/core';
import type { ForTimeSlot, TimePickerGranularity } from './build-time-slots';

/**
 * Why a time picker requested close.
 */
export type ForTimePickerCloseReason =
  | 'escape'
  | 'pointerDownOutside'
  | 'focusOutside'
  | 'select'
  | 'tab'
  | 'programmatic';

/**
 * Where focus lands when the listbox opens.
 * `'selected'` snaps to the selected slot (or first enabled if none selected).
 */
export type ForTimePickerInitialFocus = 'first' | 'last' | 'selected';

/**
 * Handle every `[forTimePickerOption]` registers with the root.
 */
export interface ForTimePickerOptionHandle extends CollectionHandle {
  /**
   * Narrowed from {@link CollectionHandle}'s `Node`: the root focuses the
   * option and scrolls it into view.
   */
  readonly host: HTMLElement;
  readonly value: Signal<unknown>;
  readonly disabled: Signal<boolean>;
}

/**
 * The shared overlay-listbox coordination surface a `[forTimePicker]` exposes on
 * its context (`ctx.overlay`): trigger / anchor / content registries + ids,
 * DOM-focus navigation, the open / close machine, the initial-focus /
 * close-reason state, and the dismiss / auto-focus emit forwarders. Backed by
 * the shared `ListboxOverlayController`, so child directives read it here
 * instead of the root re-forwarding each member.
 */
export type ForTimePickerOverlayContext = ListboxOverlayContext<
  ForTimePickerOptionHandle,
  ForTimePickerInitialFocus,
  ForTimePickerCloseReason
>;

/**
 * Coordination contract owned by `[forTimePicker]`. The shared overlay-listbox
 * surface (trigger / anchor / content registration, navigation, the open /
 * close machine, dismiss forwarders) is reached through
 * {@link ForTimePickerContext.overlay}.
 *
 * @typeParam D The adapter's date-time type.
 */
export interface ForTimePickerContext<D = unknown> {
  /**
   * The selected time, as a read-only signal. Mutate it through `activate` /
   * `commitOnTab` or the root's `[(value)]` binding — a direct write would
   * bypass the disabled / readonly guards and `markTouched`.
   */
  readonly value: Signal<D | null>;
  /**
   * Whether the listbox is open, as a read-only signal. Mutate it through
   * `overlay.toggle` / `overlay.openMenu` / `overlay.closeMenu` or the root's
   * `[(open)]` binding.
   */
  readonly open: Signal<boolean>;
  readonly effectiveDisabled: Signal<boolean>;
  readonly readonly: Signal<boolean>;
  readonly required: Signal<boolean>;
  readonly invalid: Signal<boolean>;
  readonly pending: Signal<boolean>;
  readonly modal: Signal<boolean>;
  readonly dismissible: Signal<boolean>;
  readonly returnFocus: Signal<boolean>;
  readonly side: Signal<FloatingSide | undefined>;
  readonly align: Signal<FloatingAlign | undefined>;
  readonly sideOffset: Signal<number>;
  readonly alignOffset: Signal<number>;
  readonly avoidCollisions: Signal<boolean>;
  readonly collisionPadding: Signal<number>;
  readonly arrowPadding: Signal<number>;
  readonly sticky: Signal<'partial' | 'always' | false>;
  readonly hideWhenDetached: Signal<boolean>;
  readonly clipUntilPositioned: Signal<boolean>;
  readonly loop: Signal<boolean>;
  readonly orientation: Signal<'horizontal' | 'vertical'>;
  readonly dir: Signal<WritingDirection>;
  readonly placeholder: Signal<string>;
  readonly granularity: Signal<TimePickerGranularity>;
  readonly formattedValue: Signal<string | null>;
  readonly ariaLabel: Signal<string | null>;

  /**
   * The shared overlay-listbox coordination surface (trigger / anchor / content
   * registration + ids, navigation, open / close machine, initial-focus /
   * close-reason state, dismiss + auto-focus emit forwarders). Child directives
   * read the overlay machinery here instead of the root re-forwarding each
   * member; the value-specific behavior below stays on the context directly.
   */
  readonly overlay: ForTimePickerOverlayContext;

  readonly slots: Signal<readonly ForTimeSlot<D>[]>;
  isSelected(value: D): boolean;
  activate(value: D): void;
  focusSelectedOption(): boolean;
  commitOnTab(value: D): void;
  markTouched(): void;
}

export const FOR_TIME_PICKER_CONTEXT = new InjectionToken<ForTimePickerContext>(
  'FOR_TIME_PICKER_CONTEXT',
);

export function injectTimePickerContext<D = unknown>(piece: string): ForTimePickerContext<D> {
  const ctx = inject(FOR_TIME_PICKER_CONTEXT, { optional: true });
  if (!ctx) {
    throw new Error(
      `[forty-cdk/time-picker] ${piece} must be used inside a [forTimePicker] element. ` +
        "If it is declared inside an ng-template, DI resolves at the template's declaration site — " +
        'not where it is stamped (e.g. via ngTemplateOutlet) — so declare the template inside the ' +
        '[forTimePicker] root.',
    );
  }
  return ctx as unknown as ForTimePickerContext<D>;
}

export function injectTimePickerTriggerContext<D = unknown>(
  explicitRoot: Signal<ForTimePickerContext<D> | ''>,
): Signal<ForTimePickerContext<D>> {
  const injected = inject(FOR_TIME_PICKER_CONTEXT, { optional: true });
  return computed(() => {
    const explicit = explicitRoot();
    if (explicit !== '') {
      return explicit;
    }
    if (injected) {
      return injected as unknown as ForTimePickerContext<D>;
    }
    throw new Error(
      '[forty-cdk/time-picker] ForTimePickerTrigger could not resolve its [forTimePicker] root: ' +
        'no FOR_TIME_PICKER_CONTEXT provider is visible and no explicit root reference was passed. ' +
        "If this trigger is declared inside an ng-template, DI resolves at the template's declaration " +
        'site — not where it is stamped — so either declare the template inside the root or pass the ' +
        'root explicitly: [forTimePickerTrigger]="root" with #root="forTimePicker".',
    );
  });
}
