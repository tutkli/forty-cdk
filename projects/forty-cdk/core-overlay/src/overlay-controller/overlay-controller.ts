import type { OutputEmitterRef, Signal, WritableSignal } from '@angular/core';

import {
  emitVetoableEvent,
  emitVetoableNativeEvent,
  type VetoableEvent,
  type VetoableNativeEvent,
} from 'forty-cdk/core';
import { CloseReasonState } from './close-reason-state';
import { IdentifiedElementSlot, injectSlotId } from './element-registry';
import { InitialFocusState } from './initial-focus-state';

/**
 * The dismiss / auto-focus outputs an overlay controller forwards to. Each
 * primitive owns the `output()` instances (they must be declared as class-field
 * initializers for the Angular compiler to detect them); the controller only
 * emits through them, so the shared dismiss pipeline lives in one place.
 */
export interface OverlayEmitTargets {
  readonly escapeKeyDown: OutputEmitterRef<VetoableNativeEvent<KeyboardEvent>>;
  readonly pointerDownOutside: OutputEmitterRef<VetoableNativeEvent<PointerEvent>>;
  readonly focusOutside: OutputEmitterRef<VetoableNativeEvent<FocusEvent>>;
  readonly interactOutside: OutputEmitterRef<VetoableNativeEvent<PointerEvent | FocusEvent>>;
  readonly autoFocusOnOpen: OutputEmitterRef<VetoableEvent>;
  readonly autoFocusOnClose: OutputEmitterRef<VetoableEvent>;
}

/**
 * One of the two element sides a surface has — the trigger focus returns to, and
 * the content that mounts. Both are supplied by the composing controller,
 * because neither is the same object twice in the library: a listbox overlay's
 * trigger is a single {@link IdentifiedElementSlot}, a menu overlay's is a
 * registry of openers resolving one active element and its id, and
 * `[forMenubar]`'s multiplexed context resolves both sides off whichever bar
 * trigger is — or was last — active. All of them answer the same four
 * questions, which is all the shared machine asks of them.
 */
export interface OverlaySlot {
  /**
   * The element's aria-wiring id. Non-empty for a slot minting its own; the
   * menubar's multiplexed sources resolve `''` until a trigger has been active,
   * which `[forMenuContent]` emits as no attribute rather than as `id=""`.
   */
  readonly id: Signal<string>;
  /** The registered element, or `null` while none is registered. */
  readonly element: Signal<HTMLElement | null>;
  /** Register the element. */
  register(el: HTMLElement): void;
  /** Deregister the element. */
  unregister(el: HTMLElement): void;
}

/**
 * Per-transition options forwarded verbatim to the `onOpen` / `onClose` hooks so
 * a host directive can react to *how* a transition was driven without
 * re-deriving it from outside the pipeline.
 */
export interface OverlayTransitionOptions {
  /**
   * When `true`, the transition is pointer-driven (hover) and the surface's
   * imperative focus move must be suppressed — an open must not pull focus into
   * the surface, and a close must not return focus to the trigger. Defaults to
   * `false`, so keyboard / click / programmatic transitions move focus as usual.
   */
  readonly suppressFocusMoves?: boolean;
}

/** Per-call options for {@link OverlayController.open}. */
export interface OverlayOpenOptions {
  /**
   * Arms the initial-focus state's one-shot highlight flag for this open —
   * `true` for a keyboard activation, `false` for a pointer one. Omit it
   * entirely on a surface that does not reflect `data-highlighted` on its
   * initial focus, so the flag is left untouched.
   */
  readonly highlight?: boolean;
  /** Transition options handed verbatim to the `onOpen` hook. */
  readonly transition?: OverlayTransitionOptions;
}

/**
 * What {@link OverlayController.open} did, so a composing controller can run its
 * own tail without re-reading the open model (which the call may just have
 * written).
 *
 * - `'blocked'` — the control is disabled; nothing happened.
 * - `'opened'` — the surface transitioned from closed to open.
 * - `'already-open'` — the surface was already mounted, so no state transition
 *   (and therefore no `openChange` emit) happened. The initial-focus target and
 *   the close reason were still re-armed.
 */
export type OverlayOpenOutcome = 'blocked' | 'opened' | 'already-open';

/**
 * Construction-time wiring for {@link OverlayController}. Plain signals and
 * callbacks only — the controller never imports a primitive's context token,
 * mirroring `injectOverlayShell`, so it stays orthogonal to each root's surface.
 *
 * @typeParam Focus Initial-focus union owned by the composing controller.
 * @typeParam CloseReason Close-reason union owned by the composing controller.
 */
export interface OverlayControllerDeps<Focus, CloseReason> {
  /** Id-generator prefix base, e.g. `'for-select'` (suffixed with `-trigger` / `-content`). */
  readonly idPrefix: string;
  /**
   * Builds the trigger side, from a factory minting the seeded
   * `<idPrefix>-trigger` id. Call the factory exactly once for a trigger that
   * owns an id, and **not at all** for one whose id lives elsewhere — the
   * combobox's lives on its input, the menubar's on each bar trigger — because
   * the `IdGenerator` counter is per application, so an id nothing ever emits
   * still shifts every id minted after it.
   *
   * Runs during construction, ahead of {@link createContent}, so the
   * trigger-then-content minting order is fixed here rather than per caller —
   * hydration's id adoption depends on both renders repeating it. It may
   * `inject()`, and so may the factory.
   */
  readonly createTrigger: (mintId: () => WritableSignal<string>) => OverlaySlot;
  /**
   * Builds the content side, same contract as {@link createTrigger} and called
   * immediately after it. Optional: omitted, the controller registers its own
   * {@link IdentifiedElementSlot} over the minted `<idPrefix>-content` id, which
   * is what every surface owning its content id wants. Supply it when the id
   * comes from somewhere else, or when registration does more than adopt a
   * static id — `[forMenubar]` resolves the id off the active trigger and
   * records whether the surface is shared across the bar's triggers.
   */
  readonly createContent?: (mintId: () => WritableSignal<string>) => OverlaySlot;
  /** Default initial-focus target before any open. */
  readonly defaultInitialFocus: Focus;
  /** The control's effective disabled — gates `open` and `toggle`. */
  readonly disabled: Signal<boolean>;
  /** Whether Escape / outside interactions dismiss the surface. */
  readonly dismissible: Signal<boolean>;
  /** Read the control's current open state. */
  readonly isOpen: () => boolean;
  /** Write the control's open state — the open / close machine's only channel. */
  readonly setOpen: (open: boolean) => void;
  /** Dismiss / auto-focus outputs to forward to. */
  readonly emit: OverlayEmitTargets;
  /** Close reason recorded when Escape dismisses the surface. */
  readonly escapeReason: CloseReason;
  /** Close reason recorded when {@link OverlayController.toggle} closes the surface. */
  readonly programmaticReason: CloseReason;
  /**
   * Side effect run after {@link OverlayController.open} resolves an un-blocked
   * open, receiving the resolved initial-focus target and the transition
   * options. Runs on the `'already-open'` outcome too, so a pending hover-close
   * is still cancelled by an open key pressed on a mounted surface.
   */
  readonly onOpen?: (initialFocus: Focus, options: OverlayTransitionOptions) => void;
  /**
   * Side effect run after {@link OverlayController.close} flips the open state
   * to `false`, receiving the close reason and the transition options.
   */
  readonly onClose?: (reason: CloseReason, options: OverlayTransitionOptions) => void;
  /**
   * Side effect run on a user-driven dismissal — an un-vetoed Escape, or the
   * shell's implicit close after an un-vetoed outside interaction — just before
   * the close. Optional: only a form control has touched state to mark, so the
   * menu overlays pass nothing.
   */
  readonly onDismiss?: () => void;
}

/**
 * The open / close / dismiss machine every trigger-anchored overlay surface
 * runs, composed by `MenuOverlay` (the four menu roots), by
 * `ListboxOverlayController` (`[forSelect]` / `[forTimePicker]`), and — since
 * [#1768](https://github.com/tutkli/forty-cdk/issues/1768) — by the two roots
 * that ran a copy of it without any overlay controller: `[forCombobox]` and
 * `[forMenubar]`'s multiplexed `MenubarMenuContext`. It owns the initial-focus
 * and close-reason state, the `disabled`-gated open / close / toggle
 * transitions, the four outside / Escape emit forwarders, the shell's implicit
 * `requestClose`, and the two auto-focus veto pass-throughs — plus the order in
 * which the two supplied element sides mint their ids.
 *
 * It deliberately does not own the **collection**: the menu side's item list is
 * `MenuItemList`, which `[forMenubar]` composes on its own without any overlay
 * controller, so a collection folded in here would be unreachable from there.
 * The two navigate tails differ anyway — the menu suppresses the item highlight
 * and scrolls the surface's own overflow, the listbox runs a per-primitive
 * `onNavigateFocus` and gates the move on `disabled`. What the two collections
 * do share is the enabled-handle scan, deduplicated one level down in
 * `core/collection/enabled-handle-navigation`.
 *
 * Construct it from a directive's field initializer, or from a controller
 * constructed there, so the slot factories' `inject()` calls resolve through the
 * directive's injector. A caller whose factories mint no id needs no injection
 * context at all, which is what keeps `MenubarMenuContext` a plain class.
 *
 * @typeParam Focus Initial-focus union owned by the composing controller.
 * @typeParam CloseReason Close-reason union owned by the composing controller.
 */
export class OverlayController<Focus, CloseReason> {
  readonly #deps: OverlayControllerDeps<Focus, CloseReason>;

  readonly #triggerSlot: OverlaySlot;
  readonly #contentSlot: OverlaySlot;

  readonly #initialFocusState: InitialFocusState<Focus>;
  readonly #closeReasonState = new CloseReasonState<CloseReason>();

  /** The trigger's stable id, adopted from a consumer-set static id when present. */
  readonly triggerId: Signal<string>;

  /** The content surface's stable id, adopted from a consumer-set static id when present. */
  readonly contentId: Signal<string>;

  /** The focusable element the surface returns focus to on close. */
  readonly trigger: Signal<HTMLElement | null>;

  /** The mounted content element, or `null` while the surface is closed. */
  readonly content: Signal<HTMLElement | null>;

  /** Where focus should land when the surface mounts. Set by triggers before flipping open. */
  readonly initialFocus: Signal<Focus>;

  /**
   * Reason of the most recent close, or `null` while the surface is open / has
   * never closed. Reset to `null` on every open — the content pieces read it to
   * skip their return-focus on a `'tab'` close.
   */
  readonly lastCloseReason: Signal<CloseReason | null>;

  constructor(deps: OverlayControllerDeps<Focus, CloseReason>) {
    this.#deps = deps;
    const mintContentId = () => injectSlotId(deps.idPrefix, 'content');
    this.#triggerSlot = deps.createTrigger(() => injectSlotId(deps.idPrefix, 'trigger'));
    this.#contentSlot = deps.createContent
      ? deps.createContent(mintContentId)
      : new IdentifiedElementSlot(mintContentId());
    this.#initialFocusState = new InitialFocusState<Focus>(deps.defaultInitialFocus);
    this.triggerId = this.#triggerSlot.id;
    this.contentId = this.#contentSlot.id;
    this.trigger = this.#triggerSlot.element;
    this.content = this.#contentSlot.element;
    this.initialFocus = this.#initialFocusState.target;
    this.lastCloseReason = this.#closeReasonState.reason;
  }

  /** Set the initial-focus target ahead of the next open. */
  setInitialFocus(target: Focus): void {
    this.#initialFocusState.setTarget(target);
  }

  /**
   * Reads the initial-focus state's one-shot highlight flag and re-arms it, so
   * the composing controller's initial-focus move can suppress the focused
   * item's `data-highlighted` for a pointer-driven open only.
   */
  consumeInitialHighlight(): boolean {
    return this.#initialFocusState.consumeHighlight();
  }

  /** Register the trigger element. */
  registerTrigger(el: HTMLElement): void {
    this.#triggerSlot.register(el);
  }

  /** Deregister the trigger element (no-op unless the same node registered). */
  unregisterTrigger(el: HTMLElement): void {
    this.#triggerSlot.unregister(el);
  }

  /** Register the mounted content element. */
  registerContent(el: HTMLElement): void {
    this.#contentSlot.register(el);
  }

  /** Deregister the content element (no-op unless the same node registered). */
  unregisterContent(el: HTMLElement): void {
    this.#contentSlot.unregister(el);
  }

  /**
   * Opens the surface when closed, closes it with the deps' programmatic reason
   * when open. Honours `disabled` on both branches — there is no distinct
   * `'trigger'` close reason for the user-initiated toggle-close path.
   */
  toggle(initialFocus: Focus, options: OverlayOpenOptions = {}): void {
    if (this.#deps.disabled()) {
      return;
    }
    if (this.#deps.isOpen()) {
      this.close(this.#deps.programmaticReason);
    } else {
      this.open(initialFocus, options);
    }
  }

  /**
   * Records where the initial focus should land, resets the close reason, and
   * flips the open state. Returns the {@link OverlayOpenOutcome} so a composing
   * controller can branch on an already-open surface — no state transition
   * happened there, so nothing emitted `openChange`, and a re-focus is the only
   * way an APG open key stays live on a mounted surface.
   */
  open(initialFocus: Focus, options: OverlayOpenOptions = {}): OverlayOpenOutcome {
    if (this.#deps.disabled()) {
      return 'blocked';
    }
    const alreadyOpen = this.#deps.isOpen();
    if (options.highlight === undefined) {
      this.#initialFocusState.setTarget(initialFocus);
    } else {
      this.#initialFocusState.prepareOpen(initialFocus, options.highlight);
    }
    this.#closeReasonState.reset();
    if (!alreadyOpen) {
      this.#deps.setOpen(true);
    }
    this.#deps.onOpen?.(initialFocus, options.transition ?? {});
    return alreadyOpen ? 'already-open' : 'opened';
  }

  /**
   * Closes the surface, recording `reason` as the {@link lastCloseReason} the
   * content pieces read. Never gated on `disabled`: a control disabled while its
   * surface is open must still be closable.
   */
  close(reason: CloseReason, transition: OverlayTransitionOptions = {}): void {
    this.#closeReasonState.set(reason);
    this.#deps.setOpen(false);
    this.#deps.onClose?.(reason, transition);
  }

  /**
   * Escape on the anchored path: emit `(escapeKeyDown)`, then close when
   * un-vetoed and dismissible.
   */
  emitEscapeKeyDown(event: KeyboardEvent): void {
    const vetoed = emitVetoableNativeEvent(this.#deps.emit.escapeKeyDown, event);
    if (!vetoed && this.#deps.dismissible()) {
      // Load-bearing, not redundant: the bubble-phase Escape handler stops the
      // same keydown from reaching an *ancestor* overlay's keydown listener,
      // which is how nested overlays close one layer per Escape (see the
      // listener-phase note in `core-overlay/dismissible-layer/dismissible-layer.ts`).
      event.stopPropagation();
      this.#deps.onDismiss?.();
      this.close(this.#deps.escapeReason);
    }
  }

  /** Modal-path Escape forwarder: emit only; the modal shell owns the close. */
  forwardEscapeKeyDown(veto: VetoableNativeEvent<KeyboardEvent>): void {
    this.#deps.emit.escapeKeyDown.emit(veto);
  }

  /**
   * Outside-interaction emit forwarders. The shared `#pendingOutsideVeto` reuse
   * between the specific outside channels and the composite `interactOutside`
   * lives in `injectOverlayShell`; these only fire the matching output with the
   * veto the shell built.
   */
  emitPointerDownOutside(veto: VetoableNativeEvent<PointerEvent>): void {
    this.#deps.emit.pointerDownOutside.emit(veto);
  }

  /** Focus-outside emit forwarder — see {@link emitPointerDownOutside}. */
  emitFocusOutside(veto: VetoableNativeEvent<FocusEvent>): void {
    this.#deps.emit.focusOutside.emit(veto);
  }

  /** Composite outside-interaction emit forwarder — see {@link emitPointerDownOutside}. */
  emitInteractOutside(veto: VetoableNativeEvent<PointerEvent | FocusEvent>): void {
    this.#deps.emit.interactOutside.emit(veto);
  }

  /**
   * Implicit close requested by `injectOverlayShell` after an un-vetoed outside
   * interaction. The shell owns the shared `#pendingOutsideVeto` reuse between
   * the specific outside channels and the composite `interactOutside`; this
   * controller only owns the close. The open guard keeps a stale event from
   * re-closing an already-closed surface and clobbering its
   * {@link lastCloseReason} (e.g. a `'tab'` close must survive so the content
   * skips its return-focus).
   */
  requestClose(reason: CloseReason): void {
    if (!this.#deps.isOpen()) {
      return;
    }
    this.#deps.onDismiss?.();
    this.close(reason);
  }

  /** Emits `(autoFocusOnOpen)`, returning whether a consumer vetoed the mount's focus move. */
  emitAutoFocusOnOpen(): boolean {
    return emitVetoableEvent(this.#deps.emit.autoFocusOnOpen);
  }

  /** Emits `(autoFocusOnClose)`, returning whether a consumer vetoed the return-focus move. */
  emitAutoFocusOnClose(): boolean {
    return emitVetoableEvent(this.#deps.emit.autoFocusOnClose);
  }
}
