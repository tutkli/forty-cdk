import {
  computed,
  DestroyRef,
  inject,
  Injectable,
  type Signal,
  signal,
  type WritableSignal,
} from '@angular/core';

/**
 * The elements a drag item (`[forDraggable]`, `[forFreeDrag]`) is mounted on, so a piece sharing
 * one of them can tell it is co-located with a draggable without importing `forty-cdk/drag-drop`.
 * The draggable marks its host from its constructor, which a subclass inherits and a
 * `hostDirectives` wrapper runs, so every wrapping shape is seen; a selector attribute is rendered
 * for neither.
 */
@Injectable({ providedIn: 'root' })
export class DragItemHosts {
  /** Per host, how many drag items are mounted on it. Created by whichever side asks first. */
  readonly #counts = new WeakMap<HTMLElement, WritableSignal<number>>();

  /** Records a drag item on `host`; the returned function removes it again. */
  mark(host: HTMLElement): () => void {
    const count = this.#count(host);
    count.update((n) => n + 1);
    return () => count.update((n) => n - 1);
  }

  /** Whether a drag item is mounted on `host`, tracking a draggable constructed after the reader. */
  carries(host: HTMLElement): Signal<boolean> {
    const count = this.#count(host);
    return computed(() => count() > 0);
  }

  #count(host: HTMLElement): WritableSignal<number> {
    let count = this.#counts.get(host);
    if (count === undefined) {
      count = signal(0);
      this.#counts.set(host, count);
    }
    return count;
  }
}

/**
 * Marks `host` as carrying a drag item until the calling directive is destroyed. Call from the
 * drag item's constructor.
 */
export function markDragItemHost(host: HTMLElement): void {
  const unmark = inject(DragItemHosts).mark(host);
  inject(DestroyRef).onDestroy(unmark);
}

/**
 * Whether a drag item shares `host` with the calling piece. Call from an injection context; the
 * signal turns `true` once the draggable on `host` is constructed, whichever is constructed first.
 */
export function injectHostCarriesDragItem(host: HTMLElement): Signal<boolean> {
  return inject(DragItemHosts).carries(host);
}
