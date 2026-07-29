import { inject, InjectionToken, type Signal } from '@angular/core';

import {
  type CollectionHandle,
  type FloatingAlign,
  type FloatingFallbackAxisSideDirection,
  type FloatingSide,
  type ListNavigationAction,
  type WritingDirection,
  type MenuActivationModality,
  type MenuSiblingNavigator,
} from 'forty-cdk/core';

/**
 * Per-trigger configuration that the menubar root reads when its menu is the
 * one currently open. Each `[forMenubarTrigger]` registers one of these so
 * the menubar's multiplexed `ForMenuContext` (which `[forMenuContent]`
 * injects) can pull side / align, ids, anchor, and per-menu inputs from
 * the matching trigger.
 */
export interface ForMenubarTriggerHandle extends CollectionHandle {
  readonly value: Signal<string>;
  readonly disabled: Signal<boolean>;
  readonly triggerId: Signal<string>;
  readonly contentId: Signal<string>;
  readonly side: Signal<FloatingSide | undefined>;
  readonly align: Signal<FloatingAlign | undefined>;
  readonly sideOffset: Signal<number>;
  readonly alignOffset: Signal<number>;
  readonly avoidCollisions: Signal<boolean>;
  readonly fallbackAxisSideDirection: Signal<FloatingFallbackAxisSideDirection>;
  readonly collisionPadding: Signal<number>;
  readonly arrowPadding: Signal<number>;
  readonly sticky: Signal<'partial' | 'always' | false>;
  readonly hideWhenDetached: Signal<boolean>;
  readonly clipUntilPositioned: Signal<boolean>;
  readonly ariaLabel: Signal<string | null>;
  /**
   * Adopts a consumer-set static `id` on the mounted `[forMenuContent]` host
   * into this trigger's {@link ForMenubarTriggerHandle.contentId}, so the
   * surface's `[id]` binding re-emits the consumer id instead of clobbering it.
   * Invoked by the menubar's multiplexed menu context on content registration.
   */
  adoptContentId(el: HTMLElement): void;
}

/**
 * Coordination contract owned by `[forMenubar]`. Sibling triggers register
 * here so the bar can run cross-trigger navigation, roving tabindex,
 * typeahead, and the "first open is intentional, subsequent are hover"
 * (skip-delay) model — and so the multiplexed `ForMenuContext` can route
 * `[forMenuContent]` to whichever trigger is currently active.
 */
export interface ForMenubarContext extends MenuSiblingNavigator {
  /**
   * The value of the open trigger, or `null` for none, as a read-only signal.
   * Mutate it through `openTrigger` / `closeOpen` or the root's `[(value)]`
   * binding — a direct write would bypass the bar's open / close coordination.
   */
  readonly value: Signal<string | null>;
  readonly orientation: Signal<'horizontal' | 'vertical'>;
  readonly dir: Signal<WritingDirection>;
  readonly loop: Signal<boolean>;
  readonly disabled: Signal<boolean>;
  readonly ariaLabel: Signal<string | null>;

  /**
   * Consumer-set static `id` of a `[forMenuContent]` surface that registered
   * while no trigger was active — an unconditionally mounted surface, which
   * belongs to no single trigger. Each trigger prefers it over its own generated
   * seed in {@link ForMenubarTriggerHandle.contentId}, so `aria-controls`
   * resolves to the consumer's id whichever menu opens. `null` for the
   * `@if`-per-trigger composition (the active trigger adopts the surface's id
   * directly on registration) and for a shared surface with no static `id`.
   */
  readonly sharedContentId: Signal<string | null>;

  registerTrigger(handle: ForMenubarTriggerHandle): void;
  unregisterTrigger(handle: ForMenubarTriggerHandle): void;

  /** All registered triggers in DOM order. */
  readonly triggers: Signal<readonly ForMenubarTriggerHandle[]>;

  /** Returns the trigger handle for `value`, or `null` if none matches. */
  triggerFor(value: string): ForMenubarTriggerHandle | null;

  /** Currently-open trigger handle, or `null` when no menu is open. */
  readonly activeTrigger: Signal<ForMenubarTriggerHandle | null>;

  /**
   * Returns `0` for the trigger element that should be in the tab sequence
   * and `-1` for the rest. The active stop is the open trigger, or the
   * most-recently-focused trigger, or the first enabled trigger when
   * nothing has been focused yet. Wire into a host binding on each trigger.
   */
  tabindexFor(el: HTMLElement): 0 | -1;

  /**
   * Promote `el` to the focused trigger so the roving tab stop follows
   * keyboard navigation. Called from each trigger's `(focus)` handler.
   */
  setFocusedTrigger(el: HTMLElement | null): void;

  /** Cross-trigger navigation. Used by triggers when no menu is open. */
  navigateTriggers(currentTrigger: HTMLElement, action: ListNavigationAction): void;

  /**
   * Open the trigger identified by `value`, focus its first or last item.
   * Called by the trigger itself (Enter/Space/click/ArrowDown/ArrowUp).
   * `modality` (default `'keyboard'`) records how the open was activated: a
   * `'pointer'` open (click, hover-after-open) keeps the programmatic
   * initial focus from reflecting `data-highlighted`, while a `'keyboard'`
   * open highlights the focused item.
   *
   * When `value` is already the open trigger there is no state transition (and
   * therefore no `(valueChange)` emit): focus moves straight to the requested
   * first / last enabled item instead, so an APG open key pressed on a trigger
   * whose menu is already mounted is never a dead key. Closing from the trigger
   * is the click toggle's job, not the open keys'.
   *
   * The other three menu roots get the same already-open branch from core
   * `MenuOverlay.openMenu`. The bar keeps its own: its open path is keyed by a
   * trigger `value` and runs through the multiplexed `MenubarMenuContext`, which
   * is not a `MenuOverlay`, so there is no shared entry point to inherit it from.
   */
  openTrigger(
    value: string,
    initialFocus: 'first' | 'last',
    modality?: MenuActivationModality,
  ): void;

  /** Close the currently-open menu, if any. Returns focus to the trigger. */
  closeOpen(): void;

  /**
   * Hover-after-open. When some menu is open and pointer enters a sibling
   * trigger, that sibling's menu opens immediately. No-op while no menu
   * is open (first open requires keyboard / click).
   */
  pointerEnterTrigger(value: string): void;

  /**
   * Typeahead at the trigger row: focuses the sibling trigger whose label
   * matches the buffered keys, anchored on the currently-focused trigger and
   * cycling to the next match (per the APG typeahead behaviour).
   */
  handleTriggerTypeahead(event: KeyboardEvent): void;
}

export const FOR_MENUBAR_CONTEXT = new InjectionToken<ForMenubarContext>('FOR_MENUBAR_CONTEXT');

export function injectMenubarContext(piece: string): ForMenubarContext {
  const ctx = inject(FOR_MENUBAR_CONTEXT, { optional: true });
  if (!ctx) {
    throw new Error(
      `[forty-cdk/menubar] ${piece} must be used inside a [forMenubar] element. ` +
        "If it is declared inside an ng-template, DI resolves at the template's declaration site — " +
        'not where it is stamped (e.g. via ngTemplateOutlet) — so declare the template inside the ' +
        '[forMenubar] root.',
    );
  }
  return ctx;
}
