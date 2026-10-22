import { computed, inject, InjectionToken, type Signal } from '@angular/core';

import {
  assertRootContext,
  orphanContextError,
  RootedRegistry,
  type RootedHandle,
  unresolvedRootError,
} from 'forty-cdk/core';
import { type AnchoredPositioningContext, type Point } from 'forty-cdk/core-anchored';

/** Why an open / close was scheduled. */
export type HoverCardScheduleReason = 'hover-trigger' | 'hover-content' | 'focus' | 'escape';

/**
 * Read surface `[forHoverCard]` publishes through {@link FOR_HOVER_CARD_CONTEXT},
 * including the shared anchored-positioning members.
 */
export interface ForHoverCardContext extends AnchoredPositioningContext {
  readonly open: Signal<boolean>;
  readonly disabled: Signal<boolean>;
  /** Whether `prefers-reduced-motion: reduce` is active — reflected as `data-reduced-motion`. */
  readonly reducedMotion: Signal<boolean>;
  readonly trigger: Signal<HTMLElement | null>;
  readonly content: Signal<HTMLElement | null>;

  registerArrow(el: HTMLElement): void;
  unregisterArrow(el: HTMLElement): void;
  registerContent(el: HTMLElement): void;
  unregisterContent(el: HTMLElement): void;

  /** The pointer entered the trigger; opens after the resolved open delay. */
  pointerEnterTrigger(): void;
  /**
   * The pointer left the trigger; closes, or arms the pointer-grace bridge from `cursor`.
   * `null` means the pointer left the document or a pen left hover range, so it closes.
   */
  pointerLeaveTrigger(cursor: Point | null): void;
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

/**
 * Calls `[forHoverCardContent]` makes into the root that no consumer makes:
 * the focus channel that keeps the card open while focus is inside it.
 */
export interface HoverCardPieceContext {
  /** Focus entered the content; holds the card open while it stays inside. */
  focusEnterContent(): void;
  /** Focus left the content; closes when nothing else keeps the card alive. */
  focusLeaveContent(): void;
  /**
   * The content is unmounting with focus inside it: moves focus back to the
   * trigger, without that focus reopening the card.
   */
  returnFocusToTrigger(): void;
  /**
   * A Tab moved focus out of the content onto the trigger: closes the card
   * at once, ignoring `closeDelay`.
   */
  closeOnTabOut(): void;
}

/**
 * The hover card's internal coordination surface: everything
 * {@link ForHoverCardContext} publishes plus the {@link HoverCardPieceContext}
 * calls.
 *
 * Never exported from `public-api.ts`. It is the type the pieces read
 * {@link FOR_HOVER_CARD_CONTEXT} at, so a consumer who injects that token gets
 * the read surface while `[forHoverCardContent]` gets the focus channel.
 * `ForHoverCard` declares those members TS-`private`, which keeps them out of
 * the emitted `.d.ts` while `useExisting` still satisfies this contract at
 * runtime.
 */
export interface HoverCardContext extends ForHoverCardContext, HoverCardPieceContext {}

/**
 * DI token for the hover card's coordination surface, provided by
 * `[forHoverCard]`.
 *
 * Publicly typed as the read surface {@link ForHoverCardContext}, which is the
 * whole of what the token promises a consumer. The pieces read the same token at
 * an internal type that adds the content's focus channel, so a wrapper
 * re-providing it must alias it to the root:
 * `{ provide: FOR_HOVER_CARD_CONTEXT, useExisting: MyHoverCard }`, where
 * `MyHoverCard` extends `ForHoverCard`. A value that merely satisfies the
 * declared type resolves too, and is rejected in dev mode by the first piece to
 * reach the channel.
 */
export const FOR_HOVER_CARD_CONTEXT = new InjectionToken<ForHoverCardContext>(
  'FOR_HOVER_CARD_CONTEXT',
);

export function injectHoverCardContext(piece: string): HoverCardContext {
  const ctx = inject(FOR_HOVER_CARD_CONTEXT, { optional: true });
  if (!ctx) {
    throw orphanContextError({
      code: 'FORCDK-HOVER-CARD-001',
      piece,
      root: '[forHoverCard]',
      token: 'FOR_HOVER_CARD_CONTEXT',
    });
  }
  const widened = ctx as unknown as HoverCardContext;
  assertRootContext({
    entryPoint: 'hover-card',
    token: 'FOR_HOVER_CARD_CONTEXT',
    root: '[forHoverCard]',
    piece,
    probe: () => widened.focusEnterContent,
  });
  return widened;
}

export interface HoverCardTriggerHandle extends RootedHandle<ForHoverCardContext> {
  readonly host: HTMLElement;
}

export const HOVER_CARD_TRIGGERS = new InjectionToken<
  RootedRegistry<ForHoverCardContext, HoverCardTriggerHandle>
>('HOVER_CARD_TRIGGERS', { providedIn: 'root', factory: () => new RootedRegistry() });

/**
 * Resolves the trigger's root context: the explicit reference when the
 * `[forHoverCardTrigger]` input carries one, the injected
 * `FOR_HOVER_CARD_CONTEXT` otherwise. `root` is `null` while neither resolves;
 * `ctx` throws the orphan error on read in that state. Must be called in an
 * injection context.
 */
export function injectHoverCardTriggerContext(explicitRoot: Signal<ForHoverCardContext | ''>): {
  readonly root: Signal<ForHoverCardContext | null>;
  readonly ctx: Signal<ForHoverCardContext>;
} {
  const injected = inject(FOR_HOVER_CARD_CONTEXT, { optional: true });
  const root = computed(() => {
    const explicit = explicitRoot();
    return explicit === '' ? injected : explicit;
  });
  const ctx = computed(() => {
    const resolved = root();
    if (!resolved) {
      throw unresolvedRootError({
        code: 'FORCDK-HOVER-CARD-002',
        trigger: '[forHoverCardTrigger]',
        root: '[forHoverCard]',
        token: 'FOR_HOVER_CARD_CONTEXT',
        exportAs: 'forHoverCard',
      });
    }
    const widened = resolved as unknown as HoverCardContext;
    assertRootContext({
      entryPoint: 'hover-card',
      token: 'FOR_HOVER_CARD_CONTEXT',
      root: '[forHoverCard]',
      piece: 'ForHoverCardTrigger',
      probe: () => widened.focusEnterContent,
    });
    return resolved;
  });
  return { root, ctx };
}
