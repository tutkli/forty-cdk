import { computed, inject, InjectionToken, type Signal } from '@angular/core';

import type { FloatingAlign, FloatingSide } from '../_internal/floating/floating';

/** Reason a show / hide was scheduled — escape bypasses the close delay. */
export type TooltipScheduleReason = 'hover' | 'focus' | 'escape';

/**
 * Coordination contract owned by `ForTooltip`. Trigger and content register
 * their host elements so floating-ui can compute position; the optional arrow
 * registers itself so the `arrow` middleware can offset it inside the bubble.
 */
export interface ForTooltipContext {
  readonly open: Signal<boolean>;
  readonly disabled: Signal<boolean>;
  readonly side: Signal<FloatingSide>;
  readonly align: Signal<FloatingAlign>;
  readonly sideOffset: Signal<number>;
  readonly alignOffset: Signal<number>;
  readonly avoidCollisions: Signal<boolean>;
  readonly collisionPadding: Signal<number>;
  readonly arrowPadding: Signal<number>;
  readonly sticky: Signal<'partial' | 'always' | false>;
  readonly hideWhenDetached: Signal<boolean>;
  /** Trigger element id — a consumer-set host `id` is adopted, else a generated one. */
  readonly triggerId: Signal<string>;
  /** Content element id — a consumer-set host `id` is adopted, else a generated one. Referenced by the trigger's `aria-describedby` while open. */
  readonly contentId: Signal<string>;
  readonly trigger: Signal<HTMLElement | null>;
  readonly arrow: Signal<HTMLElement | null>;

  registerTrigger(el: HTMLElement): void;
  unregisterTrigger(el: HTMLElement): void;
  /** Adopts a consumer-set static `id` on the content host into `contentId`. */
  adoptContentId(el: HTMLElement): void;
  registerArrow(el: HTMLElement): void;
  unregisterArrow(el: HTMLElement): void;

  /** Schedule the tooltip to open after `openDelay` ms (instant when delay is 0). */
  scheduleOpen(reason: TooltipScheduleReason): void;
  /** Schedule the tooltip to close after `closeDelay` ms (instant on `escape`). */
  scheduleClose(reason: TooltipScheduleReason): void;
  /** Cancel any pending open/close timer without changing state. */
  cancelPending(): void;
}

export const FOR_TOOLTIP_CONTEXT = new InjectionToken<ForTooltipContext>('FOR_TOOLTIP_CONTEXT');

export function injectTooltipContext(piece: string): ForTooltipContext {
  const ctx = inject(FOR_TOOLTIP_CONTEXT, { optional: true });
  if (!ctx) {
    throw new Error(
      `[forty-cdk/tooltip] ${piece} must be used inside a [forTooltip] element. ` +
        "If it is declared inside an ng-template, DI resolves at the template's declaration site — " +
        'not where it is stamped (e.g. via ngTemplateOutlet) — so declare the template inside the ' +
        '[forTooltip] root.',
    );
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
    throw new Error(
      '[forty-cdk/tooltip] ForTooltipTrigger could not resolve its [forTooltip] root: ' +
        'no FOR_TOOLTIP_CONTEXT provider is visible and no explicit root reference was passed. ' +
        "If this trigger is declared inside an ng-template, DI resolves at the template's declaration " +
        'site — not where it is stamped — so either declare the template inside the root or pass the ' +
        'root explicitly: [forTooltipTrigger]="root" with #root="forTooltip".',
    );
  });
}
