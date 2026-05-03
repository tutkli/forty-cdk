import { inject, InjectionToken, Signal } from '@angular/core';
import type { Placement } from '@floating-ui/dom';

import type { FloatingAlign, FloatingSide } from '../_internal/floating/floating';

/** Why an open / close was scheduled. */
export type HoverCardScheduleReason = 'hover-trigger' | 'hover-content' | 'focus' | 'escape';

export interface ForHoverCardContext {
  readonly open: Signal<boolean>;
  readonly disabled: Signal<boolean>;
  readonly placement: Signal<Placement>;
  readonly side: Signal<FloatingSide | undefined>;
  readonly align: Signal<FloatingAlign | undefined>;
  readonly offset: Signal<number>;
  readonly sideOffset: Signal<number | undefined>;
  readonly alignOffset: Signal<number>;
  readonly avoidCollisions: Signal<boolean>;
  readonly collisionPadding: Signal<number>;
  readonly arrowPadding: Signal<number>;
  readonly sticky: Signal<'partial' | 'always' | false>;
  readonly hideWhenDetached: Signal<boolean>;
  readonly trigger: Signal<HTMLElement | null>;
  readonly arrow: Signal<HTMLElement | null>;

  registerTrigger(el: HTMLElement): void;
  unregisterTrigger(el: HTMLElement): void;
  registerArrow(el: HTMLElement): void;
  unregisterArrow(el: HTMLElement): void;

  /** Schedule the card to open after `openDelay` ms (instant when delay is 0). */
  scheduleOpen(reason: HoverCardScheduleReason): void;
  /** Schedule the card to close after `closeDelay` ms (instant on `escape`). */
  scheduleClose(reason: HoverCardScheduleReason): void;
  /** Cancel any pending open / close timer without changing state. */
  cancelPending(): void;
}

export const FOR_HOVER_CARD_CONTEXT = new InjectionToken<ForHoverCardContext>(
  'FOR_HOVER_CARD_CONTEXT',
);

export function injectHoverCardContext(piece: string): ForHoverCardContext {
  const ctx = inject(FOR_HOVER_CARD_CONTEXT, { optional: true });
  if (!ctx) {
    throw new Error(
      `[forty-cdk/hover-card] ${piece} must be used inside a [forHoverCard] element.`,
    );
  }
  return ctx;
}
