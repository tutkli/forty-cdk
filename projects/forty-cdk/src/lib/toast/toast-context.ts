import { inject, InjectionToken, type Signal, type TemplateRef } from '@angular/core';

export type ForToastVariant = 'info' | 'success' | 'warning' | 'error';

export type ForToastCloseReason =
  | 'auto'
  | 'manual'
  | 'action'
  | 'escape'
  | 'programmatic';

/**
 * Configuration for a programmatic toast. Pass to `ForToastManager.show()`.
 *
 * The default rendered shape is `title` + optional `description` + optional
 * `action` button + optional `close` button, wired via `[forToastTitle]`,
 * `[forToastDescription]`, `[forToastAction]`, `[forToastClose]`. For custom
 * rendering, pass `template` with a `TemplateRef<ForToastTemplateContext>`.
 */
export interface ForToastConfig<D = unknown> {
  /** Stable id for dedupe / `update()` / external dismissal. Auto-generated when omitted. */
  id?: string;
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

  registerLabel(id: string): void;
  unregisterLabel(id: string): void;
  registerDescription(id: string): void;
  unregisterDescription(id: string): void;

  /** Request close. Always honored — the directive emits `(close)` and the consumer unmounts. */
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
