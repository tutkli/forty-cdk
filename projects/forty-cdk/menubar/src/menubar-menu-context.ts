import { computed, type OutputEmitterRef, type Signal, signal } from '@angular/core';
import type { ReferenceElement } from '@floating-ui/dom';

import {
  type ListNavigationAction,
  type VetoableEvent,
  type VetoableNativeEvent,
} from 'forty-cdk/core';
import {
  ANCHORED_POSITIONING_DEFAULTS,
  createMenuItemList,
  type MenuActivationModality,
  type FloatingAlign,
  type ForMenuCloseReason,
  type ForMenuContext,
  type FloatingFallbackAxisSideDirection,
  type FloatingSide,
  type ForMenuItemHandle,
  type MenuSiblingNavigator,
  OverlayController,
} from 'forty-cdk/core-overlay';
import type { ForMenubarTriggerHandle } from './menubar-context';

/**
 * Per-scope positioning seeds (`provideForMenubarDefaults`) the multiplexed
 * context falls back to while no trigger is active, keeping them identical to
 * the values `[forMenubarTrigger]` seeds its own inputs from.
 */
export interface MenubarPositioningSeeds {
  readonly side: FloatingSide;
  readonly align: FloatingAlign;
  readonly sideOffset: number;
  readonly collisionPadding: number;
  readonly fallbackAxisSideDirection: FloatingFallbackAxisSideDirection;
}

/**
 * The slice of `[forMenubar]` the multiplexed `ForMenuContext` reads. Passed to
 * {@link MenubarMenuContext} so the context implementation stays a plain class
 * (testable, no `inject()`) while still reading the bar's reactive state.
 */
export interface MenubarMenuHost extends MenuSiblingNavigator {
  readonly value: Signal<string | null>;
  readonly disabled: Signal<boolean>;
  readonly dismissible: Signal<boolean>;
  readonly dir: ForMenuContext['dir'];
  readonly loop: Signal<boolean>;
  /** Bar-level `(escapeKeyDown)` output the multiplexed context emits through. */
  readonly escapeKeyDown: OutputEmitterRef<VetoableNativeEvent<KeyboardEvent>>;
  /** Bar-level `(pointerDownOutside)` output the multiplexed context emits through. */
  readonly pointerDownOutside: OutputEmitterRef<VetoableNativeEvent<PointerEvent>>;
  /** Bar-level `(focusOutside)` output the multiplexed context emits through. */
  readonly focusOutside: OutputEmitterRef<VetoableNativeEvent<FocusEvent>>;
  /** Bar-level `(interactOutside)` output the multiplexed context emits through. */
  readonly interactOutside: OutputEmitterRef<VetoableNativeEvent<PointerEvent | FocusEvent>>;
  /** Bar-level `(autoFocusOnOpen)` output the multiplexed context emits through. */
  readonly autoFocusOnOpen: OutputEmitterRef<VetoableEvent>;
  /** Bar-level `(autoFocusOnClose)` output the multiplexed context emits through. */
  readonly autoFocusOnClose: OutputEmitterRef<VetoableEvent>;
  /** Currently-open trigger handle, or `null` when no menu is open. */
  readonly activeTrigger: Signal<ForMenubarTriggerHandle | null>;
  /** All registered triggers in DOM order; their hosts are the dismissible exemptions. */
  readonly triggers: Signal<readonly ForMenubarTriggerHandle[]>;
  /**
   * The most-recently-active trigger handle — survives past close so the
   * still-mounted surface keeps its ids and accessible name for the whole close
   * transition.
   */
  readonly lastTrigger: Signal<ForMenubarTriggerHandle | null>;
  /**
   * The most-recently-active trigger host — survives past close so the
   * content's destroy hook can still return focus to the trigger.
   */
  readonly lastTriggerHost: Signal<HTMLElement | null>;
  /** Close the currently-open menu by clearing `value`. */
  closeOpen(): void;
}

/**
 * Single concrete `ForMenuContext` the `[forMenubar]` root provides to its
 * descendant `[forMenuContent]` and items. It is the one place the bar's
 * "which trigger's menu is open" multiplexing lives: open / anchor / side /
 * placement are all derived from the host's `activeTrigger`, so the same
 * context shape transparently covers whichever trigger's menu is mounted.
 *
 * Item navigation and the open / close / dismiss machine are the same shared code `MenuOverlay`
 * composes — `MenuItemList` and {@link OverlayController} — so this class covers only the
 * `activeTrigger`-derived multiplexing on top of them. Both of the controller's element sides are
 * supplied here rather than minted: every id the bar exposes lives on one of its triggers, so the
 * shared machine mints none and this class needs no injection context.
 *
 * Ids and the accessible name are the exception: they derive from `lastTrigger`, because the
 * surface outlives the trigger's active window. `activeTrigger()` is already `null` while the
 * content is still mounted for its exit frame, so deriving from it would render `id=""` and drop
 * the `aria-labelledby` wiring mid-close. With no trigger association at all, `triggerId` and
 * `ariaLabel` resolve to `''` / `null` — which `[forMenuContent]` emits as no attribute — while
 * `contentId` falls back to {@link MenubarMenuContext.sharedContentId}.
 *
 * The dismiss and auto-focus channels forward to the bar-level outputs on `[forMenubar]`, so the
 * same markup keeps the full shell contract and its vetoes under a menubar. Switching between
 * sibling triggers is not a close: the outgoing surface's `autoFocusOnClose` and return-focus are
 * suppressed, and a hover switch additionally arms a one-shot suppression of the incoming surface's
 * `autoFocusOnOpen` move. Trigger registration stays inert here — triggers register with the bar
 * directly.
 */
export class MenubarMenuContext implements ForMenuContext {
  readonly #host: MenubarMenuHost;
  readonly #positioning: MenubarPositioningSeeds;
  readonly #itemList = createMenuItemList<ForMenuItemHandle>(() => this.#host.loop());
  readonly #contentEl = signal<HTMLElement | null>(null);
  readonly #contentStaticId = signal<string | null>(null);
  readonly #contentOwner = signal<ForMenubarTriggerHandle | null>(null);
  readonly #controller: OverlayController<'first' | 'last', ForMenuCloseReason>;
  #suppressOpenFocus = false;

  readonly open = computed(() => this.#host.value() !== null);
  readonly allowsUnconditionalMount = true;
  readonly disabled: Signal<boolean>;
  readonly dismissible: Signal<boolean>;
  readonly returnFocus = signal(true).asReadonly();
  readonly dir: ForMenuContext['dir'];
  readonly side = computed(() => this.#host.activeTrigger()?.side() ?? this.#positioning.side);
  readonly align = computed(() => this.#host.activeTrigger()?.align() ?? this.#positioning.align);
  readonly sideOffset = computed(
    () => this.#host.activeTrigger()?.sideOffset() ?? this.#positioning.sideOffset,
  );
  readonly alignOffset = computed(
    () => this.#host.activeTrigger()?.alignOffset() ?? ANCHORED_POSITIONING_DEFAULTS.alignOffset,
  );
  readonly avoidCollisions = computed(
    () =>
      this.#host.activeTrigger()?.avoidCollisions() ??
      ANCHORED_POSITIONING_DEFAULTS.avoidCollisions,
  );
  readonly fallbackAxisSideDirection = computed(
    () =>
      this.#host.activeTrigger()?.fallbackAxisSideDirection() ??
      this.#positioning.fallbackAxisSideDirection,
  );
  readonly collisionPadding = computed(
    () => this.#host.activeTrigger()?.collisionPadding() ?? this.#positioning.collisionPadding,
  );
  readonly arrowPadding = computed(
    () => this.#host.activeTrigger()?.arrowPadding() ?? ANCHORED_POSITIONING_DEFAULTS.arrowPadding,
  );
  readonly sticky = computed(
    () => this.#host.activeTrigger()?.sticky() ?? ANCHORED_POSITIONING_DEFAULTS.sticky,
  );
  readonly hideWhenDetached = computed(
    () =>
      this.#host.activeTrigger()?.hideWhenDetached() ??
      ANCHORED_POSITIONING_DEFAULTS.hideWhenDetached,
  );
  readonly clipUntilPositioned = computed(
    () =>
      this.#host.activeTrigger()?.clipUntilPositioned() ??
      ANCHORED_POSITIONING_DEFAULTS.clipUntilPositioned,
  );
  readonly loop: Signal<boolean>;
  readonly initialFocus: Signal<'first' | 'last'>;
  readonly lastCloseReason: Signal<ForMenuCloseReason | null>;
  readonly triggerId: Signal<string>;
  readonly contentId: Signal<string>;
  readonly ariaLabel = computed(() => this.#host.lastTrigger()?.ariaLabel() ?? null);
  readonly anchor = computed<ReferenceElement | null>(
    () => this.#host.activeTrigger()?.host ?? null,
  );
  readonly trigger: Signal<HTMLElement | null>;
  readonly content: Signal<HTMLElement | null>;

  /**
   * Consumer-set static `id` of a `[forMenuContent]` surface that belongs to no
   * single trigger. Every trigger's `contentId` prefers it, so `aria-controls`
   * resolves to the consumer's id whichever menu opens, and this context's own
   * `contentId` falls back to it so an unconditionally mounted surface keeps
   * emitting the id before any trigger has ever been active.
   *
   * Two compositions are trigger-agnostic, told apart by when that becomes observable:
   *
   * - **Unconditionally mounted** — registers with no active trigger, so it is shared from mount.
   * - **Shared by one `@if (value() !== null)`** — registers under whichever trigger opened the
   *   bar, so at registration it is indistinguishable from a per-trigger surface. What separates
   *   them is survival: it is still the registered content after the bar switches triggers, whereas
   *   a per-trigger surface is destroyed and replaced. Hence the `lastTrigger() !== owner` test
   *   rather than a flag set at registration.
   *
   * `null` while the surface is still the one its registering trigger owns, and for any surface
   * carrying no static `id`.
   */
  readonly sharedContentId = computed(() => {
    const staticId = this.#contentStaticId();
    if (staticId === null) {
      return null;
    }
    const owner = this.#contentOwner();
    return owner === null || this.#host.lastTrigger() !== owner ? staticId : null;
  });

  readonly parentMenu = null;
  readonly menubar: MenuSiblingNavigator;

  /**
   * Exempt every menubar trigger element so clicking another trigger doesn't
   * fire `pointerDownOutside` (the trigger's own click handler routes the
   * close + open).
   */
  readonly dismissibleExemptions = computed<readonly HTMLElement[]>(() =>
    this.#host.triggers().map((t) => t.host),
  );

  constructor(host: MenubarMenuHost, positioning: MenubarPositioningSeeds) {
    this.#host = host;
    this.#positioning = positioning;
    this.disabled = host.disabled;
    this.dismissible = host.dismissible;
    this.dir = host.dir;
    this.loop = host.loop;
    this.menubar = host;
    this.#controller = new OverlayController<'first' | 'last', ForMenuCloseReason>({
      idPrefix: 'for-menubar',
      createTrigger: () => ({
        id: computed(() => host.lastTrigger()?.triggerId() ?? ''),
        element: host.lastTriggerHost,
        register: () => {},
        unregister: () => {},
      }),
      createContent: () => ({
        id: computed(() => host.lastTrigger()?.contentId() ?? this.sharedContentId() ?? ''),
        element: this.#contentEl.asReadonly(),
        register: (el) => this.#adoptContent(el),
        unregister: (el) => this.#releaseContent(el),
      }),
      defaultInitialFocus: 'first',
      disabled: host.disabled,
      dismissible: host.dismissible,
      isOpen: () => host.value() !== null,
      /**
       * Only the close direction is expressible here: opening needs the trigger
       * value this context does not have, so the bar writes `value` itself right
       * after {@link MenubarMenuContext.prepareOpen} arms the shared state.
       */
      setOpen: (open) => {
        if (!open) {
          host.closeOpen();
        }
      },
      emit: host,
      escapeReason: 'escape',
      programmaticReason: 'programmatic',
    });
    this.initialFocus = this.#controller.initialFocus;
    this.lastCloseReason = this.#controller.lastCloseReason;
    this.triggerId = this.#controller.triggerId;
    this.contentId = this.#controller.contentId;
    this.trigger = this.#controller.trigger;
    this.content = this.#controller.content;
  }

  setInitialFocus(target: 'first' | 'last'): void {
    this.#controller.setInitialFocus(target);
  }

  /**
   * Read by the bar's `openTrigger` so the next open seeds the resolved
   * initial-focus target and clears the prior close reason. A `'pointer'`
   * `modality` keeps the upcoming programmatic initial focus from reflecting
   * `data-highlighted` on the focused item.
   *
   * It arms the shared machine's open without flipping any state: the bar owns
   * the flip, because the open state is derived from a `value` only the bar knows
   * (see the controller's `setOpen`).
   *
   * `suppressOpenFocus` arms a one-shot veto of the incoming surface's
   * `(autoFocusOnOpen)` focus move — the hover-switch path, where the bar has
   * already placed DOM focus on the hovered trigger and the menu must not pull
   * it back in. Every call re-arms the flag (defaulting it to `false`), so a
   * suppression that no surface ever consumed cannot leak into the next open.
   */
  prepareOpen(
    initialFocus: 'first' | 'last',
    modality: MenuActivationModality = 'keyboard',
    { suppressOpenFocus = false }: { readonly suppressOpenFocus?: boolean } = {},
  ): void {
    this.#controller.open(initialFocus, { highlight: modality === 'keyboard' });
    this.#suppressOpenFocus = suppressOpenFocus;
  }

  registerTrigger(el: HTMLElement): void {
    this.#controller.registerTrigger(el);
  }
  unregisterTrigger(el: HTMLElement): void {
    this.#controller.unregisterTrigger(el);
  }

  registerContent(el: HTMLElement): void {
    this.#controller.registerContent(el);
  }
  unregisterContent(el: HTMLElement): void {
    this.#controller.unregisterContent(el);
  }

  /**
   * The content side the shared machine registers through. Records the surface's
   * consumer-set static `id` and the trigger that owned it at registration, both
   * of which {@link sharedContentId} reads to tell a trigger-agnostic surface
   * from a per-trigger one, and hands the id to the active trigger to adopt.
   */
  #adoptContent(el: HTMLElement): void {
    const active = this.#host.activeTrigger();
    active?.adoptContentId(el);
    this.#contentStaticId.set(el.getAttribute('id') || null);
    this.#contentOwner.set(active);
    this.#contentEl.set(el);
  }

  /** Drops the registered surface, identity-guarded so a replaced one unwinds cleanly. */
  #releaseContent(el: HTMLElement): void {
    if (this.#contentEl() === el) {
      this.#contentEl.set(null);
      this.#contentStaticId.set(null);
      this.#contentOwner.set(null);
    }
  }

  registerItem(handle: ForMenuItemHandle): void {
    this.#itemList.registerItem(handle);
  }
  unregisterItem(handle: ForMenuItemHandle): void {
    this.#itemList.unregisterItem(handle);
  }

  navigate(currentItem: HTMLElement, action: ListNavigationAction): void {
    this.#itemList.navigate(currentItem, action);
  }
  handleTypeahead(event: KeyboardEvent): boolean {
    return this.#itemList.handleTypeahead(event);
  }
  clearItemHighlights(): void {
    this.#itemList.clearHighlights();
  }
  focusInitialEnabledItem(target: 'first' | 'last'): boolean {
    return this.#itemList.focusInitialEnabledItem(
      target,
      this.#controller.consumeInitialHighlight(),
    );
  }

  /**
   * Closes the open menu, recording `'programmatic'` — the reason the shared
   * machine's own `toggle` records on the same path. Without a trigger value the
   * bar context can only close; triggers drive the open path through the bar's
   * `openTrigger`.
   */
  toggle(): void {
    if (this.open()) {
      this.#controller.close('programmatic');
    }
  }

  /** No-op: opening requires a trigger value — see the bar's `openTrigger`. */
  openMenu(): void {}

  closeMenu(reason: ForMenuCloseReason): void {
    this.#controller.close(reason);
  }

  emitEscapeKeyDown(event: KeyboardEvent): void {
    this.#controller.emitEscapeKeyDown(event);
  }

  emitPointerDownOutside(veto: VetoableNativeEvent<PointerEvent>): void {
    this.#controller.emitPointerDownOutside(veto);
  }
  emitFocusOutside(veto: VetoableNativeEvent<FocusEvent>): void {
    this.#controller.emitFocusOutside(veto);
  }
  emitInteractOutside(veto: VetoableNativeEvent<PointerEvent | FocusEvent>): void {
    this.#controller.emitInteractOutside(veto);
  }

  requestClose(reason: 'pointerDownOutside' | 'focusOutside'): void {
    this.#controller.requestClose(reason);
  }

  emitAutoFocusOnOpen(): boolean {
    if (this.#suppressOpenFocus) {
      this.#suppressOpenFocus = false;
      return true;
    }
    return this.#controller.emitAutoFocusOnOpen();
  }

  /**
   * `(autoFocusOnClose)` is a close hook, and a switch between sibling triggers
   * is not a close — the bar unmounts the outgoing surface while `value` already
   * names the incoming trigger, so nothing was dismissed and focus never leaves
   * the widget. Emitting there would announce a close that did not happen and
   * hand the consumer a veto over a focus move that is redundant anyway: the
   * target resolves through `lastTrigger`, which the incoming `value` has
   * already advanced, so it lands on the trigger the user is switching *to*.
   * Returning `true` therefore vetoes the whole return-focus without consulting
   * the consumer whenever a menu is still open, and the emission is reserved for
   * a real close, where `value` is already `null` by the time the surface is
   * destroyed.
   *
   * Derived from the open state rather than from a marker armed on the switching
   * path: every switch modality (hover, cross-menu arrows, a click on a sibling
   * trigger while another menu is open) is covered by construction, and no armed
   * flag can go stale on a composition whose surface outlives the switch instead
   * of unmounting.
   */
  emitAutoFocusOnClose(): boolean {
    if (this.open()) {
      return true;
    }
    return this.#controller.emitAutoFocusOnClose();
  }
}
