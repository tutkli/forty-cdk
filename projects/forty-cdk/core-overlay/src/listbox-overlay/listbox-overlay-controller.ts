import { type Signal } from '@angular/core';
import type { ReferenceElement } from '@floating-ui/dom';

import {
  Collection,
  firstEnabledHost,
  lastEnabledHost,
  type ListNavigationAction,
  nextEnabledHandle,
  type VetoableNativeEvent,
} from 'forty-cdk/core';
import {
  anchorSlot,
  type AnchorSlot,
  IdentifiedElementSlot,
} from '../overlay-controller/element-registry';
import {
  OverlayController,
  type OverlayEmitTargets,
} from '../overlay-controller/overlay-controller';

/**
 * Minimal option-handle shape the controller's focus algorithm needs: a host
 * element to focus and a `disabled` signal to skip. Each primitive widens this
 * with its own per-option fields (value, label, id, posInSet, …) and registers
 * the widened handle through {@link ListboxOverlayController.registerOption}.
 */
export interface ListboxOverlayOptionHandle {
  readonly host: HTMLElement;
  readonly disabled: Signal<boolean>;
}

/**
 * Construction-time wiring for {@link ListboxOverlayController}. Plain signals
 * and callbacks only — the controller never imports a primitive's context
 * token, mirroring `injectOverlayShell`, so it stays orthogonal to each root's
 * surface.
 *
 * @typeParam H Primitive option-handle type.
 * @typeParam Focus Initial-focus union (identical `'first' | 'last' | 'selected'`
 *   in both primitives, kept generic so each keeps its own named alias).
 * @typeParam CloseReason Close-reason union owned by the primitive.
 */
export interface ListboxOverlayControllerDeps<
  H extends ListboxOverlayOptionHandle,
  Focus,
  CloseReason,
> {
  /** Id-generator prefix base, e.g. `'for-select'` (suffixed with `-trigger` / `-content`). */
  readonly idPrefix: string;
  /**
   * Message thrown when a second anchor registers. Pass `formatFortyMessage(…)`
   * — the `FORCDK-*` code belongs to the primitive that owns the anchor, so the
   * caller supplies the whole message rather than a prefix this shared
   * controller would have to build by hand.
   */
  readonly multipleAnchorsError: string;
  /** Default initial-focus target when none is set explicitly. */
  readonly defaultInitialFocus: Focus;
  /** The control's effective disabled — gates open / navigate / toggle. */
  readonly effectiveDisabled: Signal<boolean>;
  /** The control's two-way `open` model — flipped by the open / close machine. */
  readonly setOpen: (open: boolean) => void;
  /** Read the control's current open state. */
  readonly isOpen: () => boolean;
  /** Dismiss / auto-focus outputs to forward to. */
  readonly emit: OverlayEmitTargets;
  /** Whether keyboard navigation wraps at the ends of the option list. */
  readonly loop: Signal<boolean>;
  /** Whether Escape / outside interactions dismiss the overlay. */
  readonly dismissible: Signal<boolean>;
  /** Close reason set when Escape dismisses the overlay (both primitives use `'escape'`). */
  readonly escapeReason: CloseReason;
  /** Close reason set when {@link ListboxOverlayController.toggle} closes the overlay (both primitives use `'programmatic'`). */
  readonly programmaticReason: CloseReason;
  /** Mark the control touched (mirrors the trigger blur) on Escape / outside dismissal. */
  readonly markTouched: () => void;
  /**
   * Per-primitive close side effect, run after the open model flips to `false`
   * (Select clears the virtualized activedescendant + pending navigation here).
   */
  readonly onClose?: (reason: CloseReason) => void;
  /**
   * Per-option focus side effect, run after `navigate` focuses the target
   * (Select scrolls the option into view and applies `selectionFollowsFocus`).
   */
  readonly onNavigateFocus?: (target: H) => void;
  /** Per-primitive option-unregister side effect (Select clears a stale activedescendant). */
  readonly onUnregisterOption?: (handle: H) => void;
}

/**
 * The narrow, typed facade a primitive surfaces on its coordination context
 * (`ctx.overlay`) so child directives read the shared overlay-listbox state and
 * behavior here instead of the root re-forwarding every member. Implemented by
 * {@link ListboxOverlayController}; each primitive's context exposes it as a
 * sub-object, keeping the child-facing surface a single, self-documenting seam.
 *
 * @typeParam H Primitive option-handle type.
 * @typeParam Focus Initial-focus union.
 * @typeParam CloseReason Close-reason union owned by the primitive.
 */
export interface ListboxOverlayContext<H extends ListboxOverlayOptionHandle, Focus, CloseReason> {
  /** The trigger's stable id, adopted from a consumer-set static id when present. */
  readonly triggerId: Signal<string>;
  /** The content surface's stable id, adopted from a consumer-set static id when present. */
  readonly contentId: Signal<string>;
  /** Where focus should land after the content mounts. Triggers set this before flipping `open`. */
  readonly initialFocus: Signal<Focus>;
  /** Reason of the most recent close, or `null` while open (or before any close). */
  readonly lastCloseReason: Signal<CloseReason | null>;
  /** The button trigger — exempt from outside-pointer checks and the focus-return target. */
  readonly trigger: Signal<HTMLElement | null>;
  /**
   * Element floating-ui anchors the content against. Prefers a registered
   * anchor, otherwise falls back to the trigger.
   */
  readonly anchor: Signal<ReferenceElement | null>;
  /** The mounted content element. */
  readonly content: Signal<HTMLElement | null>;
  /** All registered options in DOM order. */
  readonly options: Signal<readonly H[]>;

  /** Set the initial-focus target ahead of the next open. */
  setInitialFocus(target: Focus): void;

  registerTrigger(el: HTMLElement): void;
  unregisterTrigger(el: HTMLElement): void;
  registerAnchor(el: HTMLElement): void;
  unregisterAnchor(el: HTMLElement): void;
  registerContent(el: HTMLElement): void;
  unregisterContent(el: HTMLElement): void;
  registerOption(handle: H): void;
  unregisterOption(handle: H): void;

  /** Move focus inside the open content in response to an arrow / Home / End key. */
  navigate(currentOption: HTMLElement, action: ListNavigationAction): void;
  focusFirstEnabledOption(): boolean;
  focusLastEnabledOption(): boolean;

  toggle(initialFocus: Focus): void;
  openOverlay(initialFocus: Focus): void;
  closeOverlay(reason: CloseReason): void;

  /** Escape on the anchored path: emit `(escapeKeyDown)`, then close when un-vetoed and dismissible. */
  emitEscapeKeyDown(event: KeyboardEvent): void;
  emitPointerDownOutside(veto: VetoableNativeEvent<PointerEvent>): void;
  emitFocusOutside(veto: VetoableNativeEvent<FocusEvent>): void;
  emitInteractOutside(veto: VetoableNativeEvent<PointerEvent | FocusEvent>): void;
  /** Modal-path Escape forwarder: emit only; the modal shell owns the close. */
  forwardEscapeKeyDown(veto: VetoableNativeEvent<KeyboardEvent>): void;
  /** Implicit close requested by the shell after an un-vetoed outside interaction. */
  requestClose(reason: CloseReason): void;
  emitAutoFocusOnOpen(): boolean;
  emitAutoFocusOnClose(): boolean;
}

/**
 * The overlay-listbox state machine shared by `ForSelect` and `ForTimePicker`
 * (the WAI-ARIA select-only combobox and the slot-listbox time picker). It owns
 * the option collection, the anchor slot, the DOM-focus navigation algorithm and
 * the trigger focus move; everything the menu overlays run identically — the
 * trigger / content slots and their ids, the initial-focus and close-reason
 * state, the open / close machine, the dismiss / auto-focus forwarders — is the
 * shared {@link OverlayController}'s, composed here rather than re-declared.
 *
 * Value-specific behaviour (selection equality, `activate`, `focusSelectedOption`,
 * typeahead, the virtualized activedescendant path, `commitOnTab`'s value set)
 * stays in the root and is threaded through {@link ListboxOverlayControllerDeps}
 * callbacks where it must run as a side effect of a shared transition.
 *
 * Internal core tier — exported from `forty-cdk/core-overlay` for the library's
 * own entry points, with no semver guarantee.
 *
 * Construct it from a directive's field initializer, so the slot factories'
 * `inject()` calls resolve through the directive's injector.
 *
 * @typeParam H Primitive option-handle type.
 * @typeParam Focus Initial-focus union.
 * @typeParam CloseReason Close-reason union.
 */
export class ListboxOverlayController<
  H extends ListboxOverlayOptionHandle,
  Focus,
  CloseReason,
> implements ListboxOverlayContext<H, Focus, CloseReason> {
  readonly #deps: ListboxOverlayControllerDeps<H, Focus, CloseReason>;
  readonly #items = new Collection<H>();

  readonly #anchorSlot: AnchorSlot;
  readonly #controller: OverlayController<Focus, CloseReason>;

  /** The trigger's stable id, adopted from a consumer-set static id when present. */
  readonly triggerId: Signal<string>;

  /** The content surface's stable id, adopted from a consumer-set static id when present. */
  readonly contentId: Signal<string>;

  /** Where focus should land after the content mounts. Triggers set this before flipping `open`. */
  readonly initialFocus: Signal<Focus>;

  /** Reason of the most recent close, or `null` while open (or before any close). */
  readonly lastCloseReason: Signal<CloseReason | null>;

  /** The button trigger — exempt from outside-pointer checks and the focus-return target. */
  readonly trigger: Signal<HTMLElement | null>;

  /**
   * Element floating-ui anchors the listbox against. Prefers an optional
   * registered anchor, otherwise falls back to the trigger so primitives
   * without an anchor keep their behavior.
   */
  readonly anchor: Signal<ReferenceElement | null>;

  /** The mounted content element. */
  readonly content: Signal<HTMLElement | null>;

  /** All registered options in DOM order. */
  readonly options: Signal<readonly H[]>;

  constructor(deps: ListboxOverlayControllerDeps<H, Focus, CloseReason>) {
    this.#deps = deps;
    this.#controller = new OverlayController<Focus, CloseReason>({
      idPrefix: deps.idPrefix,
      createTrigger: (mintId) => new IdentifiedElementSlot(mintId()),
      defaultInitialFocus: deps.defaultInitialFocus,
      disabled: deps.effectiveDisabled,
      dismissible: deps.dismissible,
      isOpen: deps.isOpen,
      setOpen: deps.setOpen,
      emit: deps.emit,
      escapeReason: deps.escapeReason,
      programmaticReason: deps.programmaticReason,
      onClose: deps.onClose,
      onDismiss: deps.markTouched,
    });
    this.#anchorSlot = anchorSlot(deps.multipleAnchorsError);
    this.triggerId = this.#controller.triggerId;
    this.contentId = this.#controller.contentId;
    this.initialFocus = this.#controller.initialFocus;
    this.lastCloseReason = this.#controller.lastCloseReason;
    this.trigger = this.#controller.trigger;
    this.content = this.#controller.content;
    this.anchor = this.#anchorSlot.resolve(this.#controller.trigger);
    this.options = this.#items.items;
  }

  setInitialFocus(target: Focus): void {
    this.#controller.setInitialFocus(target);
  }

  registerTrigger(el: HTMLElement): void {
    this.#controller.registerTrigger(el);
  }
  unregisterTrigger(el: HTMLElement): void {
    this.#controller.unregisterTrigger(el);
  }

  registerAnchor(el: HTMLElement): void {
    this.#anchorSlot.register(el);
  }
  unregisterAnchor(el: HTMLElement): void {
    this.#anchorSlot.unregister(el);
  }

  registerContent(el: HTMLElement): void {
    this.#controller.registerContent(el);
  }
  unregisterContent(el: HTMLElement): void {
    this.#controller.unregisterContent(el);
  }

  registerOption(handle: H): void {
    this.#items.register(handle);
  }
  unregisterOption(handle: H): void {
    this.#items.unregister(handle);
    this.#deps.onUnregisterOption?.(handle);
  }

  navigate(currentOption: HTMLElement, action: ListNavigationAction): void {
    if (this.#deps.effectiveDisabled()) {
      return;
    }
    const target = nextEnabledHandle(this.#items.items(), currentOption, action, {
      loop: this.#deps.loop(),
    });
    if (target === null) {
      return;
    }
    target.host.focus();
    this.#deps.onNavigateFocus?.(target);
  }

  focusFirstEnabledOption(): boolean {
    const host = firstEnabledHost(this.#items.items());
    if (!host) {
      return false;
    }
    host.focus();
    return true;
  }

  focusLastEnabledOption(): boolean {
    const host = lastEnabledHost(this.#items.items());
    if (!host) {
      return false;
    }
    host.focus();
    return true;
  }

  toggle(initialFocus: Focus): void {
    this.#controller.toggle(initialFocus);
  }

  openOverlay(initialFocus: Focus): void {
    this.#controller.open(initialFocus);
  }

  closeOverlay(reason: CloseReason): void {
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

  forwardEscapeKeyDown(veto: VetoableNativeEvent<KeyboardEvent>): void {
    this.#controller.forwardEscapeKeyDown(veto);
  }

  /**
   * Implicit close requested by the shell after an un-vetoed outside
   * interaction. The `isOpen` guard keeps a stale event from re-closing an
   * already-closed overlay and clobbering its `lastCloseReason` (e.g. a `'tab'`
   * close must survive so the content skips its return-focus).
   */
  requestClose(reason: CloseReason): void {
    this.#controller.requestClose(reason);
  }

  emitAutoFocusOnOpen(): boolean {
    return this.#controller.emitAutoFocusOnOpen();
  }

  emitAutoFocusOnClose(): boolean {
    return this.#controller.emitAutoFocusOnClose();
  }

  /** Focus the trigger, e.g. on a Tab commit before the content unmounts. */
  focusTrigger(): void {
    this.#controller.trigger()?.focus();
  }
}
