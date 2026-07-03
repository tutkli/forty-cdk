import { computed, inject, InjectionToken, type Signal } from '@angular/core';

import { type AnchoredPositioningContext, type Point } from 'forty-cdk/core';

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

  /** Schedule the tooltip to open after `openDelay` ms (instant when delay is 0). */
  scheduleOpen(reason: TooltipScheduleReason): void;
  /** Schedule the tooltip to close after `closeDelay` ms (instant on `escape` and `press`). */
  scheduleClose(reason: TooltipScheduleReason): void;
  /** Cancel any pending open/close timer without changing state. */
  cancelPending(): void;
  /**
   * Emit the public `(escapeKeyDown)` output and, unless prevented, close.
   * Driven by the content's document-level dismissable layer, so the tooltip
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
