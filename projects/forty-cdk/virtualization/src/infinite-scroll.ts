import { type Signal, computed, effect, linkedSignal, signal, untracked } from '@angular/core';

const DEFAULT_THRESHOLD = 5;

/**
 * Configuration for {@link injectInfiniteScroll}. The consumer owns the data and
 * the fetch; this core only decides *when* to ask for more.
 */
export interface InfiniteScrollOptions {
  /**
   * The rendered window, `[firstIndex, lastIndex + 1)` — e.g.
   * `injectVirtualizer(...).range`. An empty `[0, 0]` window never fires.
   */
  readonly range: Signal<readonly [number, number]>;
  /** Reactive total number of currently-loaded items. */
  readonly count: Signal<number>;
  /**
   * Fire when the window's last index comes within this many items of `count`.
   * Defaults to `5` (mirrors the windowing core's default overscan).
   */
  readonly threshold?: number;
  /** When this resolves to `true` the detector never fires. */
  readonly disabled?: Signal<boolean>;
  /**
   * Called once per threshold crossing. If it returns a promise, the next fire
   * is suppressed until that promise settles (`pending` reflects the in-flight
   * state); the detector re-arms when `count` grows.
   */
  readonly onLoadMore: () => void | Promise<unknown>;
}

/** Reactive handle returned by {@link injectInfiniteScroll}. */
export interface ForInfiniteScroll {
  /** True while an `onLoadMore` promise is in flight. */
  readonly pending: Signal<boolean>;
}

/**
 * Headless infinite-scroll detector: composes on top of any windowed list's
 * `range` + `count` signals and fires `onLoadMore` once per threshold crossing,
 * suppressing re-fire while a returned promise is pending and re-arming when
 * `count` grows (a page was appended). It owns no DOM, adds no scroll listener —
 * the trigger rides the existing reactive recompute — and is SSR-safe by
 * construction: off-browser the window is `[0, 0]`, so it never fires.
 *
 * Must be called from an injection context (a component/directive constructor
 * or field initializer).
 *
 * @param options Reactive `range` + `count`, an optional `threshold`/`disabled`,
 *   and the `onLoadMore` callback.
 * @returns A {@link ForInfiniteScroll} handle exposing the `pending` signal.
 */
export function injectInfiniteScroll(options: InfiniteScrollOptions): ForInfiniteScroll {
  const threshold = options.threshold ?? DEFAULT_THRESHOLD;
  const pending = signal(false);

  const nearEnd = computed(() => {
    if (options.disabled?.()) return false;
    const [start, end] = options.range();
    if (end <= start) return false;
    const total = options.count();
    return total > 0 && end >= total - threshold;
  });

  const armed = linkedSignal<number, boolean>({
    source: () => options.count(),
    computation: () => true,
  });

  // @sanctioned-effect(untracked-read): both `armed` and `pending` are read
  // through `untracked`, so the effect tracks only `count` / `nearEnd` and never
  // cycles on the latches it writes; the `pending` writes bridge a caller-owned
  // promise, which is outside the reactive graph entirely.
  effect(() => {
    options.count();
    if (!nearEnd() || !untracked(armed)) return;
    if (untracked(pending)) return;
    armed.set(false);
    const result = options.onLoadMore();
    if (result instanceof Promise) {
      pending.set(true);
      void result.finally(() => pending.set(false));
    }
  });

  return { pending: pending.asReadonly() };
}
