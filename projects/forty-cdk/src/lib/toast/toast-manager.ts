import { computed, inject, Injectable, InjectionToken, signal } from '@angular/core';

import { IdGenerator } from '../_internal/id-generator/id-generator';
import type {
  ForToastCloseReason,
  ForToastConfig,
  ForToastInstance,
} from './toast-context';
import { ForToastRef } from './toast-ref';

/**
 * Optional global defaults. Provide via
 * `provideForToastDefaults({ duration: 4000, hotkey: 'F6' })` in your app
 * config to override library defaults.
 */
export interface ForToastDefaults {
  duration?: number;
  hotkey?: string;
  maxVisible?: number;
}

export const FOR_TOAST_DEFAULTS = new InjectionToken<ForToastDefaults>(
  'FOR_TOAST_DEFAULTS',
);

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
  readonly #defaults = inject(FOR_TOAST_DEFAULTS, { optional: true }) ?? {};

  readonly #entries = signal<readonly ToastEntry[]>([]);

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

    const existing = this.#entries().find((e) => e.id === id);
    if (existing) {
      (existing.ref as ForToastRef<R, D>).update(config);
      return existing.ref as ForToastRef<R, D>;
    }

    const ref = new ForToastRef<R, D>({ ...config, id }, (reason) =>
      this.#removeById(id, reason),
    );
    this.#entries.update((arr) => [...arr, { id, ref: ref as ForToastRef }]);
    return ref;
  }

  /** Dismiss a toast by id. No-op when unknown. */
  dismiss(id: string, reason: ForToastCloseReason = 'programmatic'): void {
    const entry = this.#entries().find((e) => e.id === id);
    entry?.ref.dismiss(reason);
  }

  /** Dismiss every live toast. */
  dismissAll(reason: ForToastCloseReason = 'programmatic'): void {
    for (const entry of [...this.#entries()]) {
      entry.ref.dismiss(reason);
    }
  }

  /** @internal Used by the viewport to read the configured hotkey. */
  hotkey(): string {
    return this.#defaults.hotkey ?? 'F6';
  }

  /** @internal Default duration applied when a toast omits it. */
  defaultDuration(): number {
    return this.#defaults.duration ?? 5000;
  }

  /** @internal Default `maxVisible` applied to the viewport. */
  defaultMaxVisible(): number {
    return this.#defaults.maxVisible ?? Infinity;
  }

  #removeById(id: string, _reason: ForToastCloseReason): void {
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

/** Provider helper for global toast defaults. */
export function provideForToastDefaults(defaults: ForToastDefaults) {
  return { provide: FOR_TOAST_DEFAULTS, useValue: defaults };
}
