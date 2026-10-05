import { DestroyRef, inject, signal } from '@angular/core';

import { isImeComposing } from '../keyboard-navigation/ime-composition';

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
   * A shortcut chord is not typing and is rejected: anything with Meta held,
   * Ctrl without AltGr, or Alt without AltGr on an ASCII key (an accelerator
   * or `accesskey` on Windows and Linux). A character composed through AltGr
   * (`ł` on a Polish layout) or through the macOS Option key (`ø`) is typing
   * and is accepted.
   *
   * Space is accepted **only while the buffer already holds at least one
   * character**, so multi-word labels ("New York") can accumulate past the
   * first word. The first Space with an empty buffer is rejected so widgets
   * that use Space for activation keep that behavior when the user is not
   * mid-typing. A Space this method accepts is `preventDefault()`-ed, so a
   * native `<button>` host never turns it into a click on `keyup`. A caller
   * whose own Space branch activates must offer the key here first and
   * activate only when this returns `false`.
   */
  handle(event: KeyboardEvent): boolean {
    if (isImeComposing(event) || isShortcutChord(event)) {
      return false;
    }
    const ch = event.key;
    if (typeof ch !== 'string' || ch.length !== 1) {
      return false;
    }
    if (ch === ' ') {
      if (this.#buffer() === '') {
        return false;
      }
      event.preventDefault();
    }

    this.#buffer.update((current) => current + ch);
    this.#scheduleReset();
    return true;
  }

  /**
   * Whether the buffer is a single printable character, optionally pressed
   * repeatedly (every character identical — `"c"`, `"cc"`, `"ccc"`). Callers
   * use this to switch from prefix matching to cycling among same-initial
   * items, matching the WAI-ARIA APG menu typeahead behavior: pressing one key
   * (and re-pressing it) steps through every item that starts with it, instead
   * of looking for a literal `"ccc"` prefix that never exists.
   */
  isRepeatedChar(): boolean {
    const buffer = this.#buffer();
    return buffer.length >= 1 && [...buffer].every((ch) => ch === buffer[0]);
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

function isShortcutChord(event: KeyboardEvent): boolean {
  if (event.metaKey) {
    return true;
  }
  if (event.getModifierState?.('AltGraph')) {
    return false;
  }
  if (event.ctrlKey) {
    return true;
  }
  return event.altKey && event.key.length === 1 && event.key.charCodeAt(0) < 0x80;
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
