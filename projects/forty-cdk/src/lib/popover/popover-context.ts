import { inject, InjectionToken, type ModelSignal, type Signal } from '@angular/core';

import type { FloatingAlign, FloatingSide } from '../_internal/floating/floating';
import type { VetoableNativeEvent } from '../_internal/vetoable-event/vetoable-event';

/**
 * Coordination contract owned by `ForPopover`. Trigger / Content register
 * their elements (for floating-ui positioning, dismissable-layer exemptions,
 * and focus return). Title / Description register their generated ids so
 * the content wires `aria-labelledby` / `aria-describedby` reactively.
 *
 * The popover's "openness" lives on the root directive (`open` model) and
 * is published here so descendant pieces can react without each subscribing
 * to the directive instance directly.
 */
export interface ForPopoverContext {
  readonly open: ModelSignal<boolean>;
  readonly disabled: Signal<boolean>;
  readonly dismissible: Signal<boolean>;
  readonly returnFocus: Signal<boolean>;
  readonly initialFocus: Signal<'first' | 'container'>;

  readonly side: Signal<FloatingSide | undefined>;
  readonly align: Signal<FloatingAlign | undefined>;
  readonly sideOffset: Signal<number>;
  readonly alignOffset: Signal<number>;
  readonly avoidCollisions: Signal<boolean>;
  readonly collisionPadding: Signal<number>;
  readonly arrowPadding: Signal<number>;
  readonly sticky: Signal<'partial' | 'always' | false>;
  readonly hideWhenDetached: Signal<boolean>;

  readonly triggerId: Signal<string>;
  readonly contentId: Signal<string>;
  readonly ariaLabel: Signal<string | null>;
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
  readonly arrow: Signal<HTMLElement | null>;

  registerTrigger(el: HTMLElement): void;
  unregisterTrigger(el: HTMLElement): void;
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
   * Escape is consumer-owned (its close differs per primitive); Content
   * forwards the raw `KeyboardEvent` so the root emits `(escapeKeyDown)` and
   * runs its own close decision.
   */
  emitEscapeKeyDown(event: KeyboardEvent): void;
  /**
   * Outside-interaction emit forwarders. `injectOverlayShell` builds and
   * reuses one `VetoableNativeEvent` across the specific and composite
   * channels, then hands it to these forwarders to fire the matching output
   * and calls `requestClose` when un-vetoed.
   */
  emitPointerDownOutside(veto: VetoableNativeEvent<PointerEvent>): void;
  emitFocusOutside(veto: VetoableNativeEvent<FocusEvent>): void;
  emitInteractOutside(veto: VetoableNativeEvent<PointerEvent | FocusEvent>): void;
  /** Implicit close requested by the shell after an un-vetoed outside interaction. */
  requestClose(): void;

  /**
   * Hooks into the auto-focus pipeline. Content fires these just before
   * its imperative `.focus()` (open) or the trigger return-focus (close);
   * `event.preventDefault()` skips the move. Returns `true` when the
   * consumer vetoed.
   */
  emitAutoFocusOnOpen(): boolean;
  emitAutoFocusOnClose(): boolean;
}

export const FOR_POPOVER_CONTEXT = new InjectionToken<ForPopoverContext>('FOR_POPOVER_CONTEXT');

export function injectPopoverContext(piece: string): ForPopoverContext {
  const ctx = inject(FOR_POPOVER_CONTEXT, { optional: true });
  if (!ctx) {
    throw new Error(`[forty-cdk/popover] ${piece} must be used inside a [forPopover] element.`);
  }
  return ctx;
}
