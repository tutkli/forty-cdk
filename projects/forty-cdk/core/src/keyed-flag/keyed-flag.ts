import { signal, type WritableSignal } from '@angular/core';

/**
 * Marks at most one key at a time, read per key: {@link has} is reactive, and
 * {@link move} notifies only the reads of the key losing the mark and of the
 * key gaining it, so a group of N items that each read their own key pays O(1)
 * per move instead of O(N).
 *
 * Internal core tier — used by the roving and pointer trackers, with no semver
 * guarantee.
 */
export class KeyedFlag<K extends object> {
  readonly #slots = new WeakMap<K, WritableSignal<boolean>>();

  #current: K | null = null;

  /** The marked key, or `null`. Not reactive. */
  get current(): K | null {
    return this.#current;
  }

  /** Whether `key` holds the mark. Reactive per key. */
  has(key: K): boolean {
    return this.#slot(key)();
  }

  /** Hand the mark to `next`, or clear it with `null`. */
  move(next: K | null): void {
    const previous = this.#current;
    if (previous === next) {
      return;
    }
    this.#current = next;
    if (previous !== null) {
      this.#slot(previous).set(false);
    }
    if (next !== null) {
      this.#slot(next).set(true);
    }
  }

  #slot(key: K): WritableSignal<boolean> {
    let slot = this.#slots.get(key);
    if (slot === undefined) {
      slot = signal(this.#current === key);
      this.#slots.set(key, slot);
    }
    return slot;
  }
}
