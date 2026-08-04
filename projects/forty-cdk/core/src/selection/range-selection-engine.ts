import { signal, type Signal } from '@angular/core';

import { nextEnabledHandle } from '../collection/enabled-handle-navigation';
import { isInArray, toggleInArray } from './selection';
import { isUnset } from '../unset-input/unset-input';

/**
 * Minimal option-handle shape the range-selection algorithm needs: a host
 * element to focus, the option's `value` signal, and a `disabled` signal to
 * skip. Both `ForListboxOptionHandle` and `ForSelectOptionHandle` widen this
 * with their own per-option fields (id, label, posInSet, …).
 *
 * @typeParam T Option value type.
 */
export interface RangeSelectionOptionHandle<T> {
  readonly host: HTMLElement;
  readonly value: Signal<T>;
  readonly disabled: Signal<boolean>;
}

/**
 * Construction-time wiring for {@link RangeSelectionEngine}. Plain signals and
 * a value setter only — the engine never imports a primitive's context token,
 * mirroring the `ListboxOverlayController` precedent, so it stays orthogonal to
 * each root's surface.
 *
 * @typeParam T Option value type.
 * @typeParam H Primitive option-handle type.
 */
export interface RangeSelectionEngineDeps<T, H extends RangeSelectionOptionHandle<T>> {
  /** All registered options, in DOM (rendered) order. */
  readonly options: Signal<readonly H[]>;
  /** The control's current selection. */
  readonly value: Signal<readonly T[]>;
  /** Commit a new selection array. */
  readonly setValue: (value: readonly T[]) => void;
  /** Compare two items for equality (`===` for primitives, custom for objects). */
  readonly compareWith: Signal<(a: T, b: T) => boolean>;
  /** Whether multiple options can be selected. Range actions are no-ops in single mode. */
  readonly multiple: Signal<boolean>;
  /** The control's effective disabled — gates every action. */
  readonly effectiveDisabled: Signal<boolean>;
  /** Whether the control is read-only — focus still moves, selection mutation is blocked. */
  readonly readonly: Signal<boolean>;
}

/**
 * The APG multi-select range-selection state machine shared by `ForListbox` and
 * `ForSelect`. Owns the range anchor and implements the range keyboard actions
 * (Shift+Arrow, Shift+Space, Ctrl/Cmd+A, Ctrl+Shift+Home/End) plus the
 * single-mode idempotent select guard — the blocks both roots used to duplicate
 * verbatim. The option source and value model differ between the two roots, so
 * they are threaded in through {@link RangeSelectionEngineDeps}.
 *
 * Every action skips an option seeded with the `unsetInput` sentinel: its
 * `[value]` binding has not been written yet, so there is no value to select and
 * handing the sentinel to `compareWith` would leak it to the consumer.
 *
 * Internal — lives in `forty-cdk/core`, consumed only by the primitives that
 * compose it; carries no semver guarantees.
 *
 * @typeParam T Option value type.
 * @typeParam H Primitive option-handle type.
 */
export class RangeSelectionEngine<T, H extends RangeSelectionOptionHandle<T>> {
  readonly #deps: RangeSelectionEngineDeps<T, H>;

  /**
   * Anchor value for APG range-selection actions (Shift+Space). Stored as the
   * option's *value* (resolved to its current index at range time via
   * `compareWith`) rather than a DOM index, so reordering or removing
   * options before the anchor can't silently shift the range to the wrong span.
   */
  readonly #anchorValue = signal<T | null>(null);

  constructor(deps: RangeSelectionEngineDeps<T, H>) {
    this.#deps = deps;
  }

  /**
   * Set the range anchor. Both roots call this on every unmodified activation
   * (click / Space / Enter); it is not touched by Shift+Arrow, which APG defines
   * as a per-option toggle.
   */
  setAnchor(value: T): void {
    this.#anchorValue.set(value);
  }

  /**
   * Single-mode idempotent select: replace the selection with `[value]`, but
   * skip the redundant set (and its `valueChange` emission) when the same sole
   * value is already selected. No disabled / readonly guard — the caller applies
   * it before delegating.
   */
  selectSingle(value: T): void {
    const current = this.#deps.value();
    if (current.length === 1 && isInArray(current, value, this.#deps.compareWith())) {
      return;
    }
    this.#deps.setValue([value]);
  }

  /**
   * APG "Shift+ArrowDown / Shift+ArrowUp": move focus to the next / previous
   * enabled option and toggle its selected state, without moving the range
   * anchor. Non-wrapping. No-op in single mode or when disabled. Focus still
   * moves under `readonly`; only the selection mutation is blocked. Focus also
   * still moves onto an option whose `[value]` binding has not landed yet; only
   * its selection is skipped, since the value is not knowable.
   */
  extendByArrow(currentOption: HTMLElement, action: 'next' | 'prev'): void {
    if (this.#deps.effectiveDisabled() || !this.#deps.multiple()) {
      return;
    }
    const target = nextEnabledHandle(this.#deps.options(), currentOption, action, { loop: false });
    if (target === null) {
      return;
    }
    target.host.focus();
    target.host.scrollIntoView?.({ block: 'nearest' });
    if (this.#deps.readonly()) {
      return;
    }
    const targetValue = target.value();
    if (isUnset(targetValue)) {
      return;
    }
    this.#deps.setValue(toggleInArray(this.#deps.value(), targetValue, this.#deps.compareWith()));
  }

  /**
   * APG "Shift+Space": select every enabled option from the anchor (set on the
   * most recent unmodified activation) up to and including `currentOption`,
   * preserving any selection outside the span. Falls back to selecting just the
   * focused option when no anchor exists. No-op in single mode, disabled, or
   * readonly.
   */
  selectRangeToFocused(currentOption: HTMLElement): void {
    if (this.#deps.effectiveDisabled() || this.#deps.readonly() || !this.#deps.multiple()) {
      return;
    }
    const options = this.#deps.options();
    const currentIndex = options.findIndex((o) => o.host === currentOption);
    if (currentIndex < 0) {
      return;
    }
    const anchorValue = this.#anchorValue();
    const equals = this.#deps.compareWith();
    const anchorIndex =
      anchorValue === null
        ? -1
        : options.findIndex((o) => {
            const v = o.value();
            return !isUnset(v) && equals(v, anchorValue);
          });
    const start = anchorIndex < 0 ? currentIndex : anchorIndex;
    const [lo, hi] = start <= currentIndex ? [start, currentIndex] : [currentIndex, start];

    const next = [...this.#deps.value()];
    for (let i = lo; i <= hi; i++) {
      const opt = options[i];
      if (!opt || opt.disabled()) {
        continue;
      }
      const v = opt.value();
      if (!isUnset(v) && !next.some((x) => equals(x, v))) {
        next.push(v);
      }
    }
    this.#deps.setValue(next);
  }

  /**
   * APG "Ctrl/Cmd+A": select every enabled option, or clear the selection when
   * they are all already selected (toggle). An option whose `[value]` binding
   * has not landed yet is left out. No-op in single mode, disabled, or readonly.
   */
  selectAll(): void {
    if (this.#deps.effectiveDisabled() || this.#deps.readonly() || !this.#deps.multiple()) {
      return;
    }
    const enabled: T[] = [];
    for (const opt of this.#deps.options()) {
      if (opt.disabled()) {
        continue;
      }
      const v = opt.value();
      if (isUnset(v)) {
        continue;
      }
      enabled.push(v);
    }
    if (enabled.length === 0) {
      return;
    }
    const equals = this.#deps.compareWith();
    const current = this.#deps.value();
    const allSelected = enabled.every((v) => current.some((x) => equals(x, v)));
    this.#deps.setValue(allSelected ? [] : enabled);
  }

  /**
   * APG "Ctrl+Shift+Home / Ctrl+Shift+End": select every enabled option from
   * `currentOption` (inclusive) to the first / last enabled option, and move
   * focus to that edge, preserving any selection outside the span. No-op in
   * single mode or when disabled. Focus still moves under `readonly`; only the
   * selection mutation is blocked.
   */
  selectFromCurrentToEdge(currentOption: HTMLElement, edge: 'first' | 'last'): void {
    if (this.#deps.effectiveDisabled() || !this.#deps.multiple()) {
      return;
    }
    const options = this.#deps.options();
    const currentIndex = options.findIndex((o) => o.host === currentOption);
    if (currentIndex < 0) {
      return;
    }
    const [lo, hi] = edge === 'first' ? [0, currentIndex] : [currentIndex, options.length - 1];

    const equals = this.#deps.compareWith();
    const next = [...this.#deps.value()];
    let firstEnabled: HTMLElement | null = null;
    let lastEnabled: HTMLElement | null = null;
    for (let i = lo; i <= hi; i++) {
      const opt = options[i];
      if (!opt || opt.disabled()) {
        continue;
      }
      const v = opt.value();
      if (!isUnset(v) && !next.some((x) => equals(x, v))) {
        next.push(v);
      }
      if (firstEnabled === null) {
        firstEnabled = opt.host;
      }
      lastEnabled = opt.host;
    }
    const edgeFocusTarget = edge === 'first' ? firstEnabled : lastEnabled;
    edgeFocusTarget?.focus();
    edgeFocusTarget?.scrollIntoView?.({ block: 'nearest' });
    if (this.#deps.readonly()) {
      return;
    }
    this.#deps.setValue(next);
  }
}
