import {
  computed,
  type OutputEmitterRef,
  type Signal,
  signal,
  type WritableSignal,
} from '@angular/core';
import type { ReferenceElement } from '@floating-ui/dom';

import { Collection } from '../collection/collection';
import { firstEnabledHost } from '../collection/first-enabled-host';
import { adoptHostId } from '../host-id/host-id';
import type { IdGenerator } from '../id-generator/id-generator';
import { type ListNavigationAction, moveIndex } from '../keyboard-navigation/keyboard-navigation';
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
export class ListboxOverlayController<H extends ListboxOverlayOptionHandle, Focus, CloseReason> {
  readonly #deps: ListboxOverlayControllerDeps<H, Focus, CloseReason>;
  readonly #idGen: IdGenerator;
  readonly #items = new Collection<H>();

  readonly triggerId: WritableSignal<string>;
  readonly contentId: WritableSignal<string>;

  readonly #initialFocus: ReturnType<typeof signal<Focus>>;
  readonly initialFocus: Signal<Focus>;

  readonly #lastCloseReason = signal<CloseReason | null>(null);
  readonly lastCloseReason = this.#lastCloseReason.asReadonly();

  readonly #triggerEl = signal<HTMLElement | null>(null);
  readonly trigger = this.#triggerEl.asReadonly();

  readonly #anchorEl = signal<HTMLElement | null>(null);

  /**
   * Element floating-ui anchors the listbox against. Prefers an optional
   * registered anchor, otherwise falls back to the trigger so primitives
   * without an anchor keep their behavior.
   */
  readonly anchor: Signal<ReferenceElement | null>;

  readonly #contentEl = signal<HTMLElement | null>(null);
  readonly content = this.#contentEl.asReadonly();

  /** All registered options in DOM order. */
  readonly options: Signal<readonly H[]>;

  constructor(idGen: IdGenerator, deps: ListboxOverlayControllerDeps<H, Focus, CloseReason>) {
    this.#deps = deps;
    this.#idGen = idGen;
    this.triggerId = signal(this.#idGen.next(`${deps.idPrefix}-trigger`));
    this.contentId = signal(this.#idGen.next(`${deps.idPrefix}-content`));
    this.#initialFocus = signal<Focus>(deps.defaultInitialFocus);
    this.initialFocus = this.#initialFocus.asReadonly();
    this.anchor = computed<ReferenceElement | null>(() => this.#anchorEl() ?? this.#triggerEl());
    this.options = this.#items.items;
  }

  setInitialFocus(target: Focus): void {
    this.#initialFocus.set(target);
  }

  registerTrigger(el: HTMLElement): void {
    adoptHostId(el, this.triggerId);
    this.#triggerEl.set(el);
  }
  unregisterTrigger(el: HTMLElement): void {
    if (this.#triggerEl() === el) {
      this.#triggerEl.set(null);
    }
  }

  registerAnchor(el: HTMLElement): void {
    const current = this.#anchorEl();
    if (current !== null && current !== el) {
      throw new Error(this.#deps.multipleAnchorsError);
    }
    this.#anchorEl.set(el);
  }
  unregisterAnchor(el: HTMLElement): void {
    if (this.#anchorEl() === el) {
      this.#anchorEl.set(null);
    }
  }

  registerContent(el: HTMLElement): void {
    adoptHostId(el, this.contentId);
    this.#contentEl.set(el);
  }
  unregisterContent(el: HTMLElement): void {
    if (this.#contentEl() === el) {
      this.#contentEl.set(null);
    }
  }

  registerOption(handle: H): void {
    this.#items.register(handle);
  }
  unregisterOption(handle: H): void {
    this.#items.unregister(handle);
    this.#deps.onUnregisterOption?.(handle);
  }

  navigate(currentOption: HTMLElement, action: ListNavigationAction, loop: boolean): void {
    if (this.#deps.effectiveDisabled()) {
      return;
    }
    const items = this.#items.items();
    if (items.length === 0) {
      return;
    }
    const currentIndex = items.findIndex((o) => o.host === currentOption);
    const next = moveIndex(currentIndex < 0 ? 0 : currentIndex, items.length, action, {
      loop,
      isDisabled: (i) => items[i]!.disabled(),
    });
    if (next === null) {
      return;
    }
    const target = items[next];
    if (!target) {
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
    this.#initialFocus.set(initialFocus);
    this.#lastCloseReason.set(null);
    this.#deps.setOpen(true);
  }

  closeMenu(reason: CloseReason): void {
    this.#lastCloseReason.set(reason);
    this.#deps.setOpen(false);
    this.#deps.onClose?.(reason);
  }

  emitEscapeKeyDown(event: KeyboardEvent, dismissible: boolean, escapeReason: CloseReason): void {
    const vetoed = emitVetoableNativeEvent(this.#deps.emit.escapeKeyDown, event);
    if (!vetoed && dismissible) {
      event.stopPropagation();
      this.#deps.markTouched();
      this.closeMenu(escapeReason);
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
    this.#triggerEl()?.focus();
  }
}
