import { computed, inject, InjectionToken, type Signal } from '@angular/core';

import {
  assertRootContext,
  type CollectionHandle,
  orphanContextError,
  unresolvedRootError,
  type WritingDirection,
} from 'forty-cdk/core';
import {
  type FloatingAlign,
  type FloatingSide,
  type ListboxOverlayContext,
} from 'forty-cdk/core-overlay';
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
   * Narrowed from {@link CollectionHandle}'s `Node`: the root moves DOM focus
   * onto the option.
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
   * `overlay.toggle` / `overlay.openOverlay` / `overlay.closeOverlay` or the root's
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

/**
 * The time picker's pointer channel: the calls `[forTimePickerOption]` makes so
 * the slot under the cursor takes the highlight, and so the keyboard takes it
 * back when a slot is focused.
 *
 * **Not** part of {@link ForTimePickerContext} and never exported
 * from `public-api.ts` — a consumer styles the pointed-at slot off
 * `data-highlighted`, never by reporting a hover into the root.
 */
export interface TimePickerPieceContext {
  /**
   * Host element of the slot the pointer is over, `null` when the pointer is
   * over none. Self-heals on read: a host that has left the registered set or
   * become disabled is discounted, so the focused slot reclaims the highlight.
   */
  readonly pointerHighlightedOption: Signal<HTMLElement | null>;
  /**
   * Reported by `[forTimePickerOption]` on `pointermove` so the highlight
   * follows the pointer. Never moves DOM focus and never selects; a move
   * arriving inside the pointer-suppression window a programmatic scroll opened
   * is ignored, or a scroll sliding a different slot under a stationary cursor
   * would hand the highlight to whatever the user merely scrolled past.
   *
   * @param host The hovered slot's host element.
   */
  highlightFromPointer(host: HTMLElement): void;
  /**
   * Called by a slot when it takes DOM focus: drops any pointer highlight, so
   * the keyboard channel owns the highlight again from the move that focused the
   * slot.
   */
  notifyOptionFocus(): void;
}

/**
 * The time picker's internal coordination surface: everything
 * {@link ForTimePickerContext} publishes plus the {@link TimePickerPieceContext}
 * calls.
 *
 * Never exported from `public-api.ts`. It is the type the pieces read
 * {@link FOR_TIME_PICKER_CONTEXT} at, so a consumer who injects that token gets
 * the read surface while `[forTimePickerOption]` gets the pointer channel.
 * `ForTimePicker` declares those members TS-`private`, which keeps them out of
 * the emitted `.d.ts` while `useExisting` still satisfies this contract at
 * runtime.
 */
export interface TimePickerContext<D = unknown>
  extends ForTimePickerContext<D>, TimePickerPieceContext {}

/**
 * DI token for the time picker's coordination surface, provided by
 * `[forTimePicker]`.
 *
 * Publicly typed as the read surface {@link ForTimePickerContext}, which is the
 * whole of what the token promises a consumer. The pieces read the same token at
 * an internal type that adds the pointer-highlight channel, so a wrapper
 * re-providing it must alias it to the root:
 * `{ provide: FOR_TIME_PICKER_CONTEXT, useExisting: MyTimePicker }`, where
 * `MyTimePicker` extends `ForTimePicker`. A value that merely satisfies the
 * declared type resolves too, and is rejected in dev mode by the first piece to
 * reach the channel.
 */
export const FOR_TIME_PICKER_CONTEXT = new InjectionToken<ForTimePickerContext>(
  'FOR_TIME_PICKER_CONTEXT',
);

export function injectTimePickerContext<D = unknown>(piece: string): TimePickerContext<D> {
  const ctx = inject(FOR_TIME_PICKER_CONTEXT, { optional: true });
  if (!ctx) {
    throw orphanContextError({
      code: 'FORCDK-TIME-PICKER-001',
      piece,
      root: '[forTimePicker]',
      token: 'FOR_TIME_PICKER_CONTEXT',
    });
  }
  const widened = ctx as unknown as TimePickerContext<D>;
  assertRootContext({
    entryPoint: 'time-picker',
    token: 'FOR_TIME_PICKER_CONTEXT',
    root: '[forTimePicker]',
    piece,
    probe: () => widened.highlightFromPointer,
  });
  return widened;
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
    throw unresolvedRootError({
      code: 'FORCDK-TIME-PICKER-002',
      trigger: '[forTimePickerTrigger]',
      root: '[forTimePicker]',
      token: 'FOR_TIME_PICKER_CONTEXT',
      exportAs: 'forTimePicker',
    });
  });
}
