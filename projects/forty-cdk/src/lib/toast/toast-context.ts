import { inject, InjectionToken, type Signal, type TemplateRef } from '@angular/core';

import type { SwipeDirection } from '../_internal/swipe-dismiss/swipe-dismiss';

export type ForToastVariant = 'info' | 'success' | 'warning' | 'error';

/**
 * Allowed swipe directions on a toast — accepts a single direction or
 * an array of directions (multi-axis dismissal). `null` / empty array
 * disables swipe.
 */
export type ForToastSwipeDirection = SwipeDirection | readonly SwipeDirection[] | null;

export type ForToastCloseReason =
  | 'auto'
  | 'manual'
  | 'action'
  | 'escape'
  | 'programmatic'
  | 'swipe';

/**
 * Region a toast belongs to. Toasts route to the `<for-toast-viewport>` whose
 * `[region]` matches; an unspecified region falls through to this default, so
 * the common single-viewport setup needs no `region` anywhere.
 */
export const DEFAULT_TOAST_REGION = 'default';

/**
 * Configuration for a programmatic toast. Pass to `ForToastManager.show()`.
 *
 * The default rendered shape is `title` + optional `description` + optional
 * `action` button + optional `close` button, wired via `[forToastTitle]`,
 * `[forToastDescription]`, `[forToastAction]`, `[forToastClose]`. For custom
 * rendering, pass `template` with a `TemplateRef<ForToastTemplateContext>` —
 * the same helper directives keep working inside it (the viewport renders the
 * template with the `[forToast]` injection context in scope). Pass `class` /
 * `classList` to apply consumer CSS classes onto the rendered toast root.
 */
export interface ForToastConfig<D = unknown> {
  /** Stable id for dedupe / `update()` / external dismissal. Auto-generated when omitted. */
  id?: string;
  /**
   * Routes the toast to the `<for-toast-viewport>` whose `[region]` matches.
   * Omit it (or pass {@link DEFAULT_TOAST_REGION}) for the common
   * single-viewport setup. Use distinct regions to drive independent viewports
   * — e.g. a top-right region for system notifications and a bottom-center one
   * for action confirmations.
   */
  region?: string;
  title?: string;
  description?: string;
  /**
   * Affects `role` and `aria-live`:
   * - `'info'` | `'success'` | `'warning'` (default `'info'`) → `role="status"` + `aria-live="polite"`.
   * - `'error'` → `role="alert"` + `aria-live="assertive"`.
   */
  variant?: ForToastVariant;
  /**
   * Auto-dismiss timer in milliseconds. Default `5000`. `0` keeps the toast
   * sticky (no auto-dismiss; only manual / action / escape close).
   */
  duration?: number;
  /** Action button. The button auto-closes the toast after invoking `onClick`. */
  action?: { label: string; onClick: () => void };
  /** Render an explicit close button. Default `true`. */
  closable?: boolean;
  /**
   * Direction(s) the user can swipe to dismiss the toast. Pass a single
   * direction (`'right'`) or an array (`['right', 'down']`). When unset,
   * the value falls through to the viewport-level `[swipeDirection]`
   * (or stays disabled if that is also unset).
   */
  swipeDirection?: ForToastSwipeDirection;
  /**
   * Pixels of pointer travel along the active swipe direction needed to
   * trigger a dismissal. Falls back to the viewport-level
   * `[swipeThreshold]` (or `50` if neither is set).
   */
  swipeThreshold?: number;
  /**
   * Consumer CSS class(es) applied to the rendered toast root (the
   * `[forToast]` element). Pass a single class (`'toast--compact'`) or a
   * space-separated string (`'toast toast--compact'`). Merged with the
   * directive's own host attributes — it never clobbers `data-state` /
   * `data-variant` / the swipe hooks.
   *
   * Use this to carry design-system classes onto programmatic toasts so you
   * are not forced to style globally by the `[forToast]` attribute selector.
   * For multiple classes as an array, prefer {@link classList}.
   */
  class?: string;
  /**
   * Consumer CSS class(es) applied to the rendered toast root, as an array
   * (`['toast', 'toast--compact']`) or a space-separated string. Merged with
   * {@link class} and with the directive's own host attributes.
   */
  classList?: string | readonly string[];
  /**
   * CSS class applied via `animate.enter` to the rendered toast root, so it
   * plays an enter animation on mount. Optional and symmetric with
   * {@link animateLeave}: a plain CSS `@keyframes` / `animation` declared on
   * `[forToast]` already plays on mount without this, so this is only needed
   * for class-applied entrances. When unset, falls through to the
   * viewport-level `[animateEnter]`.
   */
  animateEnter?: string;
  /**
   * CSS class applied via `animate.leave` to the rendered toast root, so it
   * plays an exit animation before the toast leaves the DOM on dismiss. When
   * unset, falls through to the viewport-level `[animateLeave]`.
   *
   * This is the only way to express a toast exit animation on the programmatic
   * path: the viewport renders the toast inside its own `@for`, and a pure-CSS
   * exit cannot defer the unmount — Angular needs `animate.leave` on the node to
   * keep it mounted until the animation settles. Leaving it unset keeps the
   * existing synchronous unmount on dismiss.
   */
  animateLeave?: string;
  /** Arbitrary payload passed to `template` context as `data`. */
  data?: D;
  /** Override the default rendering with a `TemplateRef`. */
  template?: TemplateRef<ForToastTemplateContext<D>>;
}

export interface ForToastTemplateContext<D = unknown> {
  /** The toast handle for `dismiss()` / state. */
  $implicit: ForToastInstance<D>;
  data: D | undefined;
}

/**
 * Read-only view of a programmatic toast as managed by `ForToastManager`.
 * The viewport iterates over a `Signal<readonly ForToastInstance[]>`.
 */
export interface ForToastInstance<D = unknown> {
  readonly id: string;
  readonly config: ForToastConfig<D>;
  /** Dismiss this toast. Idempotent. */
  dismiss(reason?: ForToastCloseReason): void;
}

/**
 * Handle a `[forToastAction]` registers with its parent `[forToast]` so the
 * toast can compose a screen-reader announcement that includes the action's
 * `altText` (per WCAG 2.2.1, when the toast is time-limited the announcement
 * must tell the user how to recover the action even after it disappears).
 *
 * `altText` is a signal that returns `''` when the consumer hasn't set
 * `[altText]` on the action — in which case the action is treated as
 * voice-less for announcement purposes.
 */
export interface ForToastActionHandle {
  readonly altText: Signal<string>;
}

/**
 * Reactive text source a `[forToastTitle]` / `[forToastDescription]` registers
 * with its parent `[forToast]` so the announcement is composed from a tracked
 * signal rather than a one-shot DOM read. The signal re-emits when the rendered
 * text changes (e.g. through `ref.update()`), which is what drives the toast to
 * re-announce.
 */
export interface ForToastTextHandle {
  /** Generated id host-bound for `aria-labelledby` / `aria-describedby`. */
  readonly id: string;
  /** Current rendered text content of the piece, reactive across re-renders. */
  readonly text: Signal<string>;
}

/**
 * Coordination contract owned by `ForToast`. Title / description register
 * generated ids so the toast can wire `aria-labelledby` / `aria-describedby`
 * reactively. Action and close buttons request close via `requestClose`.
 */
export interface ForToastContext {
  readonly variant: Signal<ForToastVariant>;
  readonly closable: Signal<boolean>;
  readonly paused: Signal<boolean>;
  readonly labelledBy: Signal<string | null>;
  readonly describedBy: Signal<string | null>;

  registerLabel(handle: ForToastTextHandle): void;
  unregisterLabel(handle: ForToastTextHandle): void;
  registerDescription(handle: ForToastTextHandle): void;
  unregisterDescription(handle: ForToastTextHandle): void;

  /**
   * Register an action so the toast can include its `altText` in the
   * synthesized announcement. Actions without `altText` are still allowed
   * to register — they're skipped during composition.
   */
  registerAction(handle: ForToastActionHandle): void;
  unregisterAction(handle: ForToastActionHandle): void;

  /** Request close. Always honored — the directive emits `(dismiss)` and the consumer unmounts. */
  requestClose(reason: ForToastCloseReason): void;
}

export const FOR_TOAST_CONTEXT = new InjectionToken<ForToastContext>('FOR_TOAST_CONTEXT');

export function injectToastContext(piece: string): ForToastContext {
  const ctx = inject(FOR_TOAST_CONTEXT, { optional: true });
  if (!ctx) {
    throw new Error(`[forty-cdk/toast] ${piece} must be used inside a [forToast] element.`);
  }
  return ctx;
}
