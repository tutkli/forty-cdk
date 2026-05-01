import { DestroyRef, inject, signal } from '@angular/core';

export interface TypeaheadOptions {
  /** Milliseconds before the buffer is reset. Default 500. */
  debounceMs?: number;
}

/**
 * Stateful typeahead helper. Accumulates printable single-character keypresses
 * into a debounced buffer. The consumer reads `buffer()` after each handled
 * key and uses it to find a matching item (case-insensitive prefix match,
 * usually).
 *
 * The instance owns a debounce timer — call `destroy()` to clear it, or use
 * `injectTypeahead()` to register cleanup automatically with `DestroyRef`.
 */
export class Typeahead {
  readonly #buffer = signal('');
  readonly buffer = this.#buffer.asReadonly();
  readonly #debounceMs: number;
  #timeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor(options: TypeaheadOptions = {}) {
    this.#debounceMs = options.debounceMs ?? 500;
  }

  /**
   * Handles a key event. Returns `true` and appends to the buffer if the key
   * is a printable single character; returns `false` otherwise so the caller
   * can let the event keep flowing.
   *
   * Modifier-only events (Ctrl, Alt, Meta) are ignored even if `event.key`
   * looks printable — the user is not typing.
   */
  handle(event: KeyboardEvent): boolean {
    if (event.ctrlKey || event.altKey || event.metaKey) {
      return false;
    }
    const ch = event.key;
    if (typeof ch !== 'string' || ch.length !== 1 || ch === ' ') {
      // Length-1 only (skips ArrowUp, Enter, Tab, etc.). Space is excluded
      // because it's a common activation key in many widgets — typeahead
      // would steal it.
      return false;
    }

    this.#buffer.update((current) => current + ch);
    this.#scheduleReset();
    return true;
  }

  reset(): void {
    if (this.#timeoutId !== null) {
      clearTimeout(this.#timeoutId);
      this.#timeoutId = null;
    }
    this.#buffer.set('');
  }

  destroy(): void {
    if (this.#timeoutId !== null) {
      clearTimeout(this.#timeoutId);
      this.#timeoutId = null;
    }
  }

  #scheduleReset(): void {
    if (this.#timeoutId !== null) {
      clearTimeout(this.#timeoutId);
    }
    this.#timeoutId = setTimeout(() => {
      this.#buffer.set('');
      this.#timeoutId = null;
    }, this.#debounceMs);
  }
}

/**
 * Creates a `Typeahead` and registers `destroy()` with the current `DestroyRef`.
 * Must be called within an Angular injection context (constructor / field
 * initializer of a directive/component, or `runInInjectionContext`).
 */
export function injectTypeahead(options?: TypeaheadOptions): Typeahead {
  const typeahead = new Typeahead(options);
  inject(DestroyRef).onDestroy(() => typeahead.destroy());
  return typeahead;
}
