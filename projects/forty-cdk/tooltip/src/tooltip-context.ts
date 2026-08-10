import { computed, inject, InjectionToken, type Signal } from '@angular/core';

import { orphanContextError, unresolvedRootError } from 'forty-cdk/core';
import { type AnchoredPositioningContext, type Point } from 'forty-cdk/core-overlay';

/** Reason a show / hide was scheduled — `escape` and `press` bypass the close delay. */
export type TooltipScheduleReason = 'hover' | 'focus' | 'escape' | 'press';

/**
 * Coordination contract owned by `ForTooltip`. Trigger and content register
 * their host elements so floating-ui can compute position; the optional arrow
 * registers itself so the `arrow` middleware can offset it inside the bubble.
 *
 * The trigger and content forward their host hover / focus events through the
 * `pointerEnter*` / `pointerLeave*` / `focusTrigger` / `blurTrigger` methods;
 * the root owns the single open / close decision so all keep-alive sources
 * (trigger hover, trigger focus, and — under `hoverableContent` — content
 * hover) are reconciled in one place.
 */
export interface ForTooltipContext extends AnchoredPositioningContext {
  readonly open: Signal<boolean>;
  readonly disabled: Signal<boolean>;
  /** Whether the pointer may move into the content without dismissing the tooltip. */
  readonly hoverableContent: Signal<boolean>;
  /** Whether `prefers-reduced-motion: reduce` is active — reflected as `data-reduced-motion`. */
  readonly reducedMotion: Signal<boolean>;
  /** Trigger element id — a consumer-set host `id` is adopted, else a generated one. */
  readonly triggerId: Signal<string>;
  /** Content element id — a consumer-set host `id` is adopted, else a generated one. Referenced by the trigger's `aria-describedby` while open. */
  readonly contentId: Signal<string>;
  readonly trigger: Signal<HTMLElement | null>;

  registerTrigger(el: HTMLElement): void;
  unregisterTrigger(el: HTMLElement): void;
  /** Registers the content host element so the hoverable-content grace polygon can measure it. */
  registerContent(el: HTMLElement): void;
  unregisterContent(el: HTMLElement): void;
  /** Adopts a consumer-set static `id` on the content host into `contentId`. */
  adoptContentId(el: HTMLElement): void;
  registerArrow(el: HTMLElement): void;
  unregisterArrow(el: HTMLElement): void;

  /** The pointer entered the trigger; opens after the resolved open delay (gated by `showOnOverflow`). */
  pointerEnterTrigger(): void;
  /** The pointer left the trigger; closes, or arms the hoverable-content bridge from `cursor`. */
  pointerLeaveTrigger(cursor: Point): void;
  /** The trigger received focus; opens after the resolved open delay (gated by `showOnOverflow`). */
  focusTrigger(): void;
  /** The trigger lost focus; closes when nothing else keeps the tooltip alive. */
  blurTrigger(): void;
  /** The pointer entered the content (`hoverableContent`); holds the tooltip open. */
  pointerEnterContent(): void;
  /** The pointer left the content (`hoverableContent`); closes when nothing else keeps it alive. */
  pointerLeaveContent(): void;

  /**
   * Schedule the tooltip to open after `openDelay` ms (instant when delay is 0).
   * Hover-driven opens are suppressed while an ancestor scroll container is
   * moving content under a stationary cursor, so a row sliding past the pointer
   * can't flicker a tooltip open; the `'focus'` path is never suppressed.
   */
  scheduleOpen(reason: TooltipScheduleReason): void;
  /** Schedule the tooltip to close after `closeDelay` ms (instant on `escape` and `press`). */
  scheduleClose(reason: TooltipScheduleReason): void;
  /** Cancel any pending open/close timer without changing state. */
  cancelPending(): void;
  /**
   * Emit the public `(escapeKeyDown)` output and, unless prevented, close.
   * Driven by the content's document-level dismissible layer, so the tooltip
   * responds to Escape regardless of where focus lives — including a
   * hover-opened tooltip while focus sits on an unrelated element (WCAG 2.1 SC
   * 1.4.13) — and dismisses topmost-first when layered over a dialog.
   */
  emitEscapeKeyDown(event: KeyboardEvent): void;
}

export const FOR_TOOLTIP_CONTEXT = new InjectionToken<ForTooltipContext>('FOR_TOOLTIP_CONTEXT');

export function injectTooltipContext(piece: string): ForTooltipContext {
  const ctx = inject(FOR_TOOLTIP_CONTEXT, { optional: true });
  if (!ctx) {
    throw orphanContextError({
      code: 'FORCDK-TOOLTIP-001',
      piece,
      root: '[forTooltip]',
      token: 'FOR_TOOLTIP_CONTEXT',
    });
  }
  return ctx;
}

/**
 * Resolves the trigger's root context: the explicit reference when the
 * `[forTooltipTrigger]` input carries one, the injected `FOR_TOOLTIP_CONTEXT`
 * otherwise. The orphan error only fires when neither resolves, on first read
 * of the returned signal. Must be called in an injection context.
 */
export function injectTooltipTriggerContext(
  explicitRoot: Signal<ForTooltipContext | ''>,
): Signal<ForTooltipContext> {
  const injected = inject(FOR_TOOLTIP_CONTEXT, { optional: true });
  return computed(() => {
    const explicit = explicitRoot();
    if (explicit !== '') {
      return explicit;
    }
    if (injected) {
      return injected;
    }
    throw unresolvedRootError({
      code: 'FORCDK-TOOLTIP-002',
      trigger: '[forTooltipTrigger]',
      root: '[forTooltip]',
      token: 'FOR_TOOLTIP_CONTEXT',
      exportAs: 'forTooltip',
    });
  });
}
