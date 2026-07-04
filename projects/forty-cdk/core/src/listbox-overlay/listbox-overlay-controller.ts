import { type OutputEmitterRef, type Signal, signal, type WritableSignal } from '@angular/core';
import type { ReferenceElement } from '@floating-ui/dom';

import { Collection } from '../collection/collection';
import { firstEnabledHost } from '../collection/first-enabled-host';
import type { IdGenerator } from '../id-generator/id-generator';
import { type ListNavigationAction } from '../keyboard-navigation/keyboard-navigation';
import { nextEnabledHandle } from '../keyboard-navigation/move-in-collection';
import { AnchorSlot, IdentifiedElementSlot } from '../overlay-controller/element-registry';
import { CloseReasonState } from '../overlay-controller/close-reason-state';
import { InitialFocusState } from '../overlay-controller/initial-focus-state';
import {
  emitVetoableEvent,
  emitVetoableNativeEvent,
  type VetoableEvent,
  type VetoableNativeEvent,
} from '../vetoable-event/vetoable-event';

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
 * The dismiss / auto-focus outputs the controller forwards to. Each primitive
 * owns the `output()` instances (they must be declared as class-field
 * initializers for the Angular compiler to detect them); the controller only
 * emits through them, so the shared dismiss pipeline lives in one place.
 */
export interface ListboxOverlayEmitTargets {
  readonly escapeKeyDown: OutputEmitterRef<VetoableNativeEvent<KeyboardEvent>>;
  readonly pointerDownOutside: OutputEmitterRef<VetoableNativeEvent<PointerEvent>>;
  readonly focusOutside: OutputEmitterRef<VetoableNativeEvent<FocusEvent>>;
  readonly interactOutside: OutputEmitterRef<VetoableNativeEvent<PointerEvent | FocusEvent>>;
  readonly autoFocusOnOpen: OutputEmitterRef<VetoableEvent>;
  readonly autoFocusOnClose: OutputEmitterRef<VetoableEvent>;
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
  /** Full `[forty-cdk/<primitive>]`-prefixed error thrown when a second anchor registers. */
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
  readonly emit: ListboxOverlayEmitTargets;
  /** Whether keyboard navigation wraps at the ends of the option list. */
  readonly loop: Signal<boolean>;
  /** Whether Escape / outside interactions dismiss the overlay. */
  readonly dismissible: Signal<boolean>;
  /** Close reason set when Escape dismisses the overlay (both primitives use `'escape'`). */
  readonly escapeReason: CloseReason;
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
  openMenu(initialFocus: Focus): void;
  closeMenu(reason: CloseReason): void;

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
 * (the WAI-ARIA select-only combobox and the slot-listbox time picker). Owns
 * the option collection, the trigger / anchor / content element registries and
 * their ids, the DOM-focus navigation algorithm, the initial-focus /
 * close-reason state, the open / close machine, and the dismiss / auto-focus
 * emit forwarders — every method each root used to duplicate verbatim.
 *
 * Value-specific behaviour (selection equality, `activate`, `focusSelectedOption`,
 * typeahead, the virtualized activedescendant path, `commitOnTab`'s value set)
 * stays in the root and is threaded through {@link ListboxOverlayControllerDeps}
 * callbacks where it must run as a side effect of a shared transition.
 *
 * Internal — lives in `_internal/`, never re-exported from `public-api.ts`.
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

  readonly #triggerSlot: IdentifiedElementSlot;
  readonly #contentSlot: IdentifiedElementSlot;
  readonly #anchorSlot: AnchorSlot;

  readonly triggerId: WritableSignal<string>;
  readonly contentId: WritableSignal<string>;

  readonly #initialFocusState: InitialFocusState<Focus>;
  readonly initialFocus: Signal<Focus>;

  readonly #closeReasonState = new CloseReasonState<CloseReason>();
  readonly lastCloseReason = this.#closeReasonState.reason;

  readonly trigger: Signal<HTMLElement | null>;

  /**
   * Element floating-ui anchors the listbox against. Prefers an optional
   * registered anchor, otherwise falls back to the trigger so primitives
   * without an anchor keep their behavior.
   */
  readonly anchor: Signal<ReferenceElement | null>;

  readonly content: Signal<HTMLElement | null>;

  /** All registered options in DOM order. */
  readonly options: Signal<readonly H[]>;

  constructor(idGen: IdGenerator, deps: ListboxOverlayControllerDeps<H, Focus, CloseReason>) {
    this.#deps = deps;
    this.#triggerSlot = new IdentifiedElementSlot(signal(idGen.next(`${deps.idPrefix}-trigger`)));
    this.#contentSlot = new IdentifiedElementSlot(signal(idGen.next(`${deps.idPrefix}-content`)));
    this.#anchorSlot = new AnchorSlot(deps.multipleAnchorsError);
    this.triggerId = this.#triggerSlot.id;
    this.contentId = this.#contentSlot.id;
    this.trigger = this.#triggerSlot.element;
    this.content = this.#contentSlot.element;
    this.#initialFocusState = new InitialFocusState<Focus>(deps.defaultInitialFocus);
    this.initialFocus = this.#initialFocusState.target;
    this.anchor = this.#anchorSlot.resolve(this.#triggerSlot.element);
    this.options = this.#items.items;
  }

  setInitialFocus(target: Focus): void {
    this.#initialFocusState.setTarget(target);
  }

  registerTrigger(el: HTMLElement): void {
    this.#triggerSlot.register(el);
  }
  unregisterTrigger(el: HTMLElement): void {
    this.#triggerSlot.unregister(el);
  }

  registerAnchor(el: HTMLElement): void {
    this.#anchorSlot.register(el);
  }
  unregisterAnchor(el: HTMLElement): void {
    this.#anchorSlot.unregister(el);
  }

  registerContent(el: HTMLElement): void {
    this.#contentSlot.register(el);
  }
  unregisterContent(el: HTMLElement): void {
    this.#contentSlot.unregister(el);
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
    const items = this.#items.items();
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];
      if (item && !item.disabled()) {
        item.host.focus();
        return true;
      }
    }
    return false;
  }

  toggle(initialFocus: Focus): void {
    if (this.#deps.effectiveDisabled()) {
      return;
    }
    if (this.#deps.isOpen()) {
      this.closeMenu('programmatic' as CloseReason);
    } else {
      this.openMenu(initialFocus);
    }
  }

  openMenu(initialFocus: Focus): void {
    if (this.#deps.effectiveDisabled()) {
      return;
    }
    this.#initialFocusState.setTarget(initialFocus);
    this.#closeReasonState.reset();
    this.#deps.setOpen(true);
  }

  closeMenu(reason: CloseReason): void {
    this.#closeReasonState.set(reason);
    this.#deps.setOpen(false);
    this.#deps.onClose?.(reason);
  }

  emitEscapeKeyDown(event: KeyboardEvent): void {
    const vetoed = emitVetoableNativeEvent(this.#deps.emit.escapeKeyDown, event);
    if (!vetoed && this.#deps.dismissible()) {
      event.stopPropagation();
      this.#deps.markTouched();
      this.closeMenu(this.#deps.escapeReason);
    }
  }

  emitPointerDownOutside(veto: VetoableNativeEvent<PointerEvent>): void {
    this.#deps.emit.pointerDownOutside.emit(veto);
  }
  emitFocusOutside(veto: VetoableNativeEvent<FocusEvent>): void {
    this.#deps.emit.focusOutside.emit(veto);
  }
  emitInteractOutside(veto: VetoableNativeEvent<PointerEvent | FocusEvent>): void {
    this.#deps.emit.interactOutside.emit(veto);
  }

  forwardEscapeKeyDown(veto: VetoableNativeEvent<KeyboardEvent>): void {
    this.#deps.emit.escapeKeyDown.emit(veto);
  }

  requestClose(reason: CloseReason): void {
    this.#deps.markTouched();
    this.closeMenu(reason);
  }

  emitAutoFocusOnOpen(): boolean {
    return emitVetoableEvent(this.#deps.emit.autoFocusOnOpen);
  }

  emitAutoFocusOnClose(): boolean {
    return emitVetoableEvent(this.#deps.emit.autoFocusOnClose);
  }

  /** Focus the trigger, e.g. on a Tab commit before the content unmounts. */
  focusTrigger(): void {
    this.#triggerSlot.element()?.focus();
  }
}
