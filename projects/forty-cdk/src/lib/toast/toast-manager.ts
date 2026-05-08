import { computed, inject, Injectable, type Provider, signal } from '@angular/core';

import { createDefaults } from '../_internal/defaults/defaults';
import { IdGenerator } from '../_internal/id-generator/id-generator';
import type { ForToastCloseReason, ForToastConfig, ForToastInstance } from './toast-context';
import { ForToastRef } from './toast-ref';

/**
 * Optional global defaults. Provide via
 * `provideForToastDefaults({ duration: 4000, hotkey: 'F6' })` in your app
 * config to override library defaults. Every key is optional — unspecified
 * keys inherit from the parent scope (or library defaults at the root).
 */
export interface ForToastDefaults {
  duration?: number;
  hotkey?: string;
  maxVisible?: number;
}

/** @internal Concrete shape stored against the defaults token. */
interface ResolvedToastDefaults {
  duration: number;
  hotkey: string;
  maxVisible: number;
}

const FALLBACK: ResolvedToastDefaults = {
  duration: 5000,
  hotkey: 'F6',
  maxVisible: Infinity,
};

const { token, provideDefaults } = createDefaults<ResolvedToastDefaults>(
  'FOR_TOAST_DEFAULTS',
  FALLBACK,
);

/**
 * Token holding the resolved toast defaults for the current injector scope.
 * The library always provides a fully-populated value (the fallback at the
 * root, or the merged result of the nearest `provideForToastDefaults`).
 */
export const FOR_TOAST_DEFAULTS = token;

/** @internal The shape stored in the manager's reactive array. */
interface ToastEntry<R = unknown, D = unknown> {
  readonly id: string;
  readonly ref: ForToastRef<R, D>;
}

/**
 * Programmatic toast opener — the headless equivalent of CDK's snackbar.
 * Inject anywhere, call `show({ title, ... })` and get a `ForToastRef`
 * back. Toasts render through `<for-toast-viewport>`, which the consumer
 * mounts once near the root of their app.
 *
 * The manager owns the live array of toasts as a signal; the viewport
 * iterates with `@for` so add / remove transitions are pure DOM control
 * flow — consumers attach `animate.enter` / `animate.leave` directly.
 */
@Injectable({ providedIn: 'root' })
export class ForToastManager {
  readonly #idGen = inject(IdGenerator);
  readonly #defaults = inject(FOR_TOAST_DEFAULTS);

  readonly #entries = signal<readonly ToastEntry[]>([]);
  // O(1) id → entry index kept in sync with `#entries`. Prevents same-tick
  // id-collision races where two `show({ id: 'X' })` calls would both miss
  // an array `find` and end up pushing duplicate entries.
  readonly #byId = new Map<string, ToastEntry>();

  /** Reactive view of all live toasts, in insertion order. */
  readonly toasts = computed<readonly ForToastInstance[]>(() =>
    this.#entries().map((e) => this.#instance(e)),
  );

  /** Reactive count of currently open toasts. */
  readonly count = computed(() => this.#entries().length);

  /**
   * Open a toast. Returns a `ForToastRef` you can use to dismiss / update
   * the toast imperatively.
   *
   * If `config.id` matches an existing toast, that toast is updated in place
   * instead of duplicating — useful for "saving / saved" sequences.
   */
  show<R = unknown, D = unknown>(config: ForToastConfig<D> = {}): ForToastRef<R, D> {
    const id = config.id ?? this.#idGen.next('for-toast');

    const existing = this.#byId.get(id);
    if (existing) {
      (existing.ref as ForToastRef<R, D>).update(config);
      return existing.ref as ForToastRef<R, D>;
    }

    const ref = new ForToastRef<R, D>({ ...config, id }, (reason) => this.#removeById(id, reason));
    const entry: ToastEntry = { id, ref: ref as ForToastRef };
    this.#byId.set(id, entry);
    this.#entries.update((arr) => [...arr, entry]);
    return ref;
  }

  /** Dismiss a toast by id. No-op when unknown. */
  dismiss(id: string, reason: ForToastCloseReason = 'programmatic'): void {
    this.#byId.get(id)?.ref.dismiss(reason);
  }

  /** Dismiss every live toast. */
  dismissAll(reason: ForToastCloseReason = 'programmatic'): void {
    for (const entry of [...this.#entries()]) {
      entry.ref.dismiss(reason);
    }
  }

  /** @internal Used by the viewport to read the configured hotkey. */
  hotkey(): string {
    return this.#defaults.hotkey;
  }

  /** @internal Default duration applied when a toast omits it. */
  defaultDuration(): number {
    return this.#defaults.duration;
  }

  /** @internal Default `maxVisible` applied to the viewport. */
  defaultMaxVisible(): number {
    return this.#defaults.maxVisible;
  }

  #removeById(id: string, _reason: ForToastCloseReason): void {
    this.#byId.delete(id);
    this.#entries.update((arr) => arr.filter((e) => e.id !== id));
  }

  #instance<R, D>(entry: ToastEntry<R, D>): ForToastInstance<D> {
    const ref = entry.ref;
    return {
      id: entry.id,
      get config() {
        return ref.config();
      },
      dismiss(reason: ForToastCloseReason = 'manual') {
        ref.dismiss(reason);
      },
    };
  }
}

/**
 * Configures forty-cdk toast defaults for this injector scope. Partial
 * overrides inherit unspecified keys from the parent scope (or library
 * defaults at the root).
 */
export function provideForToastDefaults(defaults: ForToastDefaults): Provider[] {
  return provideDefaults(defaults as Partial<ResolvedToastDefaults>);
}
