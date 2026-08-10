import { computed, inject, InjectionToken, type Signal } from '@angular/core';

import { orphanContextError, unresolvedRootError } from 'forty-cdk/core';
import { type AnchoredPositioningContext, type Point } from 'forty-cdk/core-overlay';

/** Why an open / close was scheduled. */
export type HoverCardScheduleReason = 'hover-trigger' | 'hover-content' | 'focus' | 'escape';

export interface ForHoverCardContext extends AnchoredPositioningContext {
  readonly open: Signal<boolean>;
  readonly disabled: Signal<boolean>;
  /** Whether `prefers-reduced-motion: reduce` is active — reflected as `data-reduced-motion`. */
  readonly reducedMotion: Signal<boolean>;
  readonly trigger: Signal<HTMLElement | null>;
  readonly content: Signal<HTMLElement | null>;

  registerTrigger(el: HTMLElement): void;
  unregisterTrigger(el: HTMLElement): void;
  registerArrow(el: HTMLElement): void;
  unregisterArrow(el: HTMLElement): void;
  registerContent(el: HTMLElement): void;
  unregisterContent(el: HTMLElement): void;

  /** The pointer entered the trigger; opens after the resolved open delay. */
  pointerEnterTrigger(): void;
  /** The pointer left the trigger; closes, or arms the pointer-grace bridge from `cursor`. */
  pointerLeaveTrigger(cursor: Point): void;
  /** The trigger received keyboard focus; opens after the resolved open delay. */
  focusTrigger(): void;
  /** The trigger lost focus; closes when nothing else keeps the card alive. */
  blurTrigger(): void;
  /** The pointer entered the content; holds the card open. */
  pointerEnterContent(): void;
  /** The pointer left the content; closes when nothing else keeps it alive. */
  pointerLeaveContent(): void;

  /**
   * Schedule the card to open after `openDelay` ms (instant when delay is 0).
   * Hover-driven opens (`'hover-trigger'` / `'hover-content'`) are suppressed
   * while an ancestor scroll container is moving content under a stationary
   * cursor, so rows sliding past the pointer can't flicker cards open; the
   * `'focus'` path is never suppressed.
   */
  scheduleOpen(reason: HoverCardScheduleReason): void;
  /** Schedule the card to close after `closeDelay` ms (instant on `escape`). */
  scheduleClose(reason: HoverCardScheduleReason): void;
  /** Cancel any pending open / close timer without changing state. */
  cancelPending(): void;
  /**
   * Emit the public `(escapeKeyDown)` output and, unless prevented, close.
   * Driven by the content's document-level dismissible layer, so the card
   * responds to Escape regardless of where focus lives — including a card
   * opened by hover while focus sits on an unrelated element.
   */
  emitEscapeKeyDown(event: KeyboardEvent): void;
}

export const FOR_HOVER_CARD_CONTEXT = new InjectionToken<ForHoverCardContext>(
  'FOR_HOVER_CARD_CONTEXT',
);

export function injectHoverCardContext(piece: string): ForHoverCardContext {
  const ctx = inject(FOR_HOVER_CARD_CONTEXT, { optional: true });
  if (!ctx) {
    throw orphanContextError({
      code: 'FORCDK-HOVER-CARD-001',
      piece,
      root: '[forHoverCard]',
      token: 'FOR_HOVER_CARD_CONTEXT',
    });
  }
  return ctx;
}

/**
 * Resolves the trigger's root context: the explicit reference when the
 * `[forHoverCardTrigger]` input carries one, the injected
 * `FOR_HOVER_CARD_CONTEXT` otherwise. The orphan error only fires when neither
 * resolves, on first read of the returned signal. Must be called in an
 * injection context.
 */
export function injectHoverCardTriggerContext(
  explicitRoot: Signal<ForHoverCardContext | ''>,
): Signal<ForHoverCardContext> {
  const injected = inject(FOR_HOVER_CARD_CONTEXT, { optional: true });
  return computed(() => {
    const explicit = explicitRoot();
    if (explicit !== '') {
      return explicit;
    }
    if (injected) {
      return injected;
    }
    throw unresolvedRootError({
      code: 'FORCDK-HOVER-CARD-002',
      trigger: '[forHoverCardTrigger]',
      root: '[forHoverCard]',
      token: 'FOR_HOVER_CARD_CONTEXT',
      exportAs: 'forHoverCard',
    });
  });
}
