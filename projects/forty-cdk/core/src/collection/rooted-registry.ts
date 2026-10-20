import { computed, type Signal, signal } from '@angular/core';

export interface RootedHandle<R> {
  readonly root: Signal<R | null>;
}

const NONE: readonly never[] = [];

export class RootedRegistry<R extends object, H extends RootedHandle<R>> {
  readonly #handles = signal<readonly H[]>([]);

  readonly #byRoot = computed(() => {
    const index = new WeakMap<R, H[]>();
    for (const handle of this.#handles()) {
      const root = handle.root();
      if (root === null) {
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
    this.#handles.update((handles) => [...handles, handle]);
  }

  remove(handle: H): void {
    this.#handles.update((handles) => handles.filter((existing) => existing !== handle));
  }

  of(root: R): Signal<readonly H[]> {
    return computed(() => this.#byRoot().get(root) ?? NONE, { equal: sameHandles });
  }
}

function sameHandles<H>(a: readonly H[], b: readonly H[]): boolean {
  return a.length === b.length && a.every((handle, index) => handle === b[index]);
}
