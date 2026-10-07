import { computed, inject, InjectionToken, type Signal } from '@angular/core';

import {
  assertRootContext,
  orphanContextError,
  unresolvedRootError,
  type VetoableNativeEvent,
} from 'forty-cdk/core';
import { type AnchoredPositioningContext } from 'forty-cdk/core-overlay';

/**
 * Why a popover requested close. `'tab'` is a Tab or Shift+Tab past either end of the content,
 * which moves focus to the trigger's place in the page's tab order. The popover has no selection
 * reason. `'programmatic'` covers `[forPopoverClose]` and the trigger toggle-close.
 */
export type ForPopoverCloseReason =
  | 'escape'
  | 'pointerDownOutside'
  | 'focusOutside'
  | 'tab'
  | 'programmatic';

/**
 * Coordination contract owned by `ForPopover`. Trigger / Content register
 * their elements (for floating-ui positioning, dismissible-layer exemptions,
 * and focus return). Title / Description register their generated ids so
 * the content wires `aria-labelledby` / `aria-describedby` reactively.
 *
 * The popover's "openness" lives on the root directive (`open` model) and
 * is published here so descendant pieces can react without each subscribing
 * to the directive instance directly.
 */
export interface ForPopoverContext extends AnchoredPositioningContext {
  /**
   * Whether the popover is open, as a read-only signal. Mutate it through
   * `toggle` / `close` / `requestClose` or the root's `[(open)]` binding — a
   * direct write would bypass the root's `disabled` guard.
   */
  readonly open: Signal<boolean>;
  readonly disabled: Signal<boolean>;
  readonly dismissible: Signal<boolean>;
  readonly returnFocus: Signal<boolean>;
  readonly initialFocus: Signal<'first' | 'container'>;

  /**
   * Reason of the most recent close, or `null` while the popover is open / has
   * never closed. Reset to `null` on open. `[forPopoverContent]` reads it to
   * skip its trigger return-focus when the close came from an outside
   * interaction (`'pointerDownOutside'` / `'focusOutside'`) or a Tab out
   * (`'tab'`) — leaving focus where the user just clicked / focused / tabbed
   * instead of ripping it back to the trigger (matching `[forDropdownMenu]`).
   */
  readonly lastCloseReason: Signal<ForPopoverCloseReason | null>;

  readonly triggerId: Signal<string>;
  readonly contentId: Signal<string>;
  readonly ariaLabel: Signal<string | null>;
  /** Whether `prefers-reduced-motion: reduce` is active — reflected as `data-reduced-motion`. */
  readonly reducedMotion: Signal<boolean>;
  readonly labelledBy: Signal<string | null>;
  readonly describedBy: Signal<string | null>;

  readonly trigger: Signal<HTMLElement | null>;
  readonly anchor: Signal<HTMLElement | null>;
  /**
   * Element used as the floating-ui reference. When `[forPopoverAnchor]`
   * is registered, this is the anchor; otherwise it falls back to the
   * trigger. Decoupled from `trigger` so the trigger can keep driving
   * `aria-controls`, click toggle, and focus return regardless of where
   * the popover paints.
   */
  readonly reference: Signal<HTMLElement | null>;

  registerTrigger(el: HTMLElement): void;
  unregisterTrigger(el: HTMLElement): void;
  /** Adopts a consumer-set static `id` on the content host into `contentId`. */
  adoptContentId(el: HTMLElement): void;
  registerAnchor(el: HTMLElement): void;
  unregisterAnchor(el: HTMLElement): void;
  registerArrow(el: HTMLElement): void;
  unregisterArrow(el: HTMLElement): void;
  registerLabel(id: string): void;
  unregisterLabel(id: string): void;
  registerDescription(id: string): void;
  unregisterDescription(id: string): void;

  /** Toggle from a trigger click. Honours `disabled`. */
  toggle(): void;

  /**
   * Close the popover. Honored regardless of `dismissible` — used by
   * `[forPopoverClose]` and available to custom close pieces. Prefer this over
   * writing `open` directly so the close routes through the root.
   */
  close(): void;

  /**
   * Escape is consumer-owned (its close differs per primitive); Content
   * forwards the raw `KeyboardEvent` so the root emits `(escapeKeyDown)` and
   * runs its own close decision.
   */
  emitEscapeKeyDown(event: KeyboardEvent): void;
  /**
   * Outside-interaction emit forwarders. The specific and composite channels
   * observe the same veto, so `preventDefault()` from either one suppresses the
   * close that otherwise follows.
   */
  emitPointerDownOutside(veto: VetoableNativeEvent<PointerEvent>): void;
  emitFocusOutside(veto: VetoableNativeEvent<FocusEvent>): void;
  emitInteractOutside(veto: VetoableNativeEvent<PointerEvent | FocusEvent>): void;
  /**
   * Implicit close requested by the shell after an un-vetoed outside
   * interaction or a Tab out of the content. Records the reason as
   * `lastCloseReason` so the content can skip its trigger return-focus, then
   * closes.
   */
  requestClose(reason: 'pointerDownOutside' | 'focusOutside' | 'tab'): void;

  /**
   * Hooks into the auto-focus pipeline. Content fires these just before
   * its imperative `.focus()` (open) or the trigger return-focus (close);
   * `event.preventDefault()` skips the move. Returns `true` when the
   * consumer vetoed.
   */
  emitAutoFocusOnOpen(): boolean;
  emitAutoFocusOnClose(): boolean;
}

/**
 * The registration protocol `[forPopoverInitialFocus]` drives. Never exported from
 * `public-api.ts`; `ForPopover` declares both members TS-`private`.
 */
export interface PopoverRegistrationContext {
  /** Registers the element the content focuses on mount. */
  registerInitialFocus(el: HTMLElement): void;
  /** Removes a previously registered initial-focus element. */
  unregisterInitialFocus(el: HTMLElement): void;
}

/** What `[forPopoverContent]` reads off the root that no consumer has a call to touch. */
export interface PopoverPieceContext {
  /** The element `[forPopoverInitialFocus]` registered, or `null`. */
  readonly initialFocusTarget: Signal<HTMLElement | null>;
  /** Which open overlays an outside pointer press closes, bound on `[forPopover]`. */
  readonly lightDismiss: Signal<'topmost' | 'stack'>;
}

/**
 * The popover's internal coordination surface: everything {@link ForPopoverContext} publishes plus
 * the initial-focus protocol. It is the type the pieces read {@link FOR_POPOVER_CONTEXT} at.
 */
export interface PopoverContext
  extends ForPopoverContext, PopoverRegistrationContext, PopoverPieceContext {}

/**
 * DI token for the popover's coordination surface, provided by `[forPopover]`.
 *
 * Publicly typed as the read surface {@link ForPopoverContext}. The pieces read the same token at
 * an internal type that adds the initial-focus registration, so a wrapper re-providing it must alias
 * it to the root: `{ provide: FOR_POPOVER_CONTEXT, useExisting: MyPopover }`, where `MyPopover`
 * extends `ForPopover`. A value that merely satisfies the declared type resolves too, and is
 * rejected in dev mode by the first piece to resolve it.
 */
export const FOR_POPOVER_CONTEXT = new InjectionToken<ForPopoverContext>('FOR_POPOVER_CONTEXT');

export function injectPopoverContext(piece: string): PopoverContext {
  const ctx = inject(FOR_POPOVER_CONTEXT, { optional: true });
  if (!ctx) {
    throw orphanContextError({
      code: 'FORCDK-POPOVER-001',
      piece,
      root: '[forPopover]',
      token: 'FOR_POPOVER_CONTEXT',
    });
  }
  const widened = ctx as unknown as PopoverContext;
  assertRootContext({
    entryPoint: 'popover',
    token: 'FOR_POPOVER_CONTEXT',
    root: '[forPopover]',
    piece,
    probe: () => widened.registerInitialFocus,
  });
  return widened;
}

/**
 * Resolves the trigger's root context: the explicit reference when the
 * `[forPopoverTrigger]` input carries one, the injected `FOR_POPOVER_CONTEXT`
 * otherwise. The orphan error only fires when neither resolves, on first read
 * of the returned signal. Must be called in an injection context.
 */
export function injectPopoverTriggerContext(
  explicitRoot: Signal<ForPopoverContext | ''>,
): Signal<ForPopoverContext> {
  const injected = inject(FOR_POPOVER_CONTEXT, { optional: true });
  return computed(() => {
    const explicit = explicitRoot();
    if (explicit !== '') {
      return explicit;
    }
    if (injected) {
      return injected;
    }
    throw unresolvedRootError({
      code: 'FORCDK-POPOVER-002',
      trigger: '[forPopoverTrigger]',
      root: '[forPopover]',
      token: 'FOR_POPOVER_CONTEXT',
      exportAs: 'forPopover',
    });
  });
}
