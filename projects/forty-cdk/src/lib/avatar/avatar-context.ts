import { inject, InjectionToken, type Signal } from '@angular/core';

/**
 * Lifecycle stages of the avatar's image:
 * - `idle`: no `src` set yet.
 * - `loading`: `src` set, waiting for the network.
 * - `loaded`: image rendered successfully.
 * - `error`: image failed to load.
 */
export type ForAvatarStatus = 'idle' | 'loading' | 'loaded' | 'error';

export interface ForAvatarContext {
  /** Current status of the avatar's image. */
  readonly status: Signal<ForAvatarStatus>;
  /**
   * `true` when the consumer should render the fallback. Drives `@if` in
   * the consumer's template. Honors `fallbackDelayMs` for `idle` / `loading`
   * states; `error` flips it to `true` immediately.
   */
  readonly shouldShowFallback: Signal<boolean>;
  /**
   * Internal — reported by `[forAvatarImage]` so the root can transition
   * its state machine. Consumers should not call this.
   */
  reportStatus(status: ForAvatarStatus): void;
}

export const FOR_AVATAR_CONTEXT = new InjectionToken<ForAvatarContext>('FOR_AVATAR_CONTEXT');

/**
 * Injects the nearest {@link ForAvatarContext}, throwing a descriptive error
 * when used outside a `[forAvatar]` element.
 *
 * @param piece Name of the calling directive, used in the error message.
 */
export function injectAvatarContext(piece: string): ForAvatarContext {
  const ctx = inject(FOR_AVATAR_CONTEXT, { optional: true });
  if (!ctx) {
    throw new Error(`[forty-cdk/avatar] ${piece} must be used inside a [forAvatar] element.`);
  }
  return ctx;
}
