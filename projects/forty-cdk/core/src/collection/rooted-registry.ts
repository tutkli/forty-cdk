import { computed, type Signal, signal } from '@angular/core';

export interface RootedHandle<R> {
  readonly root: Signal<R | null>;
}

const NONE: readonly never[] = [];

export class RootedRegistry<R extends object, H extends RootedHandle<R>> {
  /** Every registered handle, in registration order. Mutated in place; `#version` tracks it. */
  readonly #handles = new Set<H>();

  readonly #version = signal(0);

  readonly #byRoot = computed(() => {
    this.#version();
    const index = new WeakMap<R, H[]>();
    for (const handle of this.#handles) {
      const root = handle.root();
      if (typeof root !== 'object' || root === null) {
        continue;
      }
      const bucket = index.get(root);
      if (bucket) {
        bucket.push(handle);
      } else {
        index.set(root, [handle]);
      }
    }
    return index;
  });

  add(handle: H): void {
    if (!this.#handles.has(handle)) {
      this.#handles.add(handle);
      this.#version.update((version) => version + 1);
    }
  }

  remove(handle: H): void {
    if (this.#handles.delete(handle)) {
      this.#version.update((version) => version + 1);
    }
  }

  of(root: R): Signal<readonly H[]> {
    return computed(() => this.#byRoot().get(root) ?? NONE, { equal: sameHandles });
  }
}

function sameHandles<H>(a: readonly H[], b: readonly H[]): boolean {
  return a.length === b.length && a.every((handle, index) => handle === b[index]);
}
