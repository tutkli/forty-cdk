import { inject, InjectionToken, type Signal } from '@angular/core';

import { assertRootContext, orphanContextError } from 'forty-cdk/core';

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
}

/**
 * The avatar's piece-coordination surface: the one call `[forAvatarImage]`
 * makes so the root can transition its state machine.
 *
 * Deliberately **not** part of {@link ForAvatarContext} and never exported from
 * `public-api.ts` — a consumer drives the status by binding `[src]`, never by
 * reporting a transition into the root.
 */
export interface AvatarPieceContext {
  /** Reported by `[forAvatarImage]` so the root can transition its state machine. */
  reportStatus(status: ForAvatarStatus): void;
}

/**
 * The avatar's internal coordination surface: everything
 * {@link ForAvatarContext} publishes plus the {@link AvatarPieceContext} call.
 *
 * Never exported from `public-api.ts`. It is the type the pieces read
 * {@link FOR_AVATAR_CONTEXT} at, so a consumer who injects that token gets the
 * read surface while `[forAvatarImage]` gets the transition channel. `ForAvatar`
 * declares `reportStatus` TS-`private`, which keeps it out of the emitted
 * `.d.ts` while `useExisting` still satisfies this contract at runtime.
 */
export interface AvatarContext extends ForAvatarContext, AvatarPieceContext {}

/**
 * DI token for the avatar's coordination surface, provided by `[forAvatar]`.
 *
 * Publicly typed as the read surface {@link ForAvatarContext}, which is the whole of
 * what the token promises a consumer. `[forAvatarImage]` reads the same token at an
 * internal type that adds the status-report channel, so a wrapper re-providing it must
 * alias it to the root: `{ provide: FOR_AVATAR_CONTEXT, useExisting: MyAvatar }`, where
 * `MyAvatar` extends `ForAvatar`. A value that merely satisfies the declared type
 * resolves too, and is rejected in dev mode by the first piece to reach the channel.
 */
export const FOR_AVATAR_CONTEXT = new InjectionToken<ForAvatarContext>('FOR_AVATAR_CONTEXT');

/**
 * The constant half of both resolvers' {@link assertRootContext} calls, so the
 * fallback and the image state the same requirement.
 */
const ROOT_ASSERTION = {
  entryPoint: 'avatar',
  token: 'FOR_AVATAR_CONTEXT',
  root: '[forAvatar]',
};

/**
 * Injects the nearest {@link ForAvatarContext}, throwing a descriptive error
 * when used outside a `[forAvatar]` element.
 *
 * @param piece Name of the calling directive, used in the error message.
 */
export function injectAvatarContext(piece: string): AvatarContext {
  const ctx = inject(FOR_AVATAR_CONTEXT, { optional: true });
  if (!ctx) {
    throw orphanContextError({
      code: 'FORCDK-AVATAR-001',
      piece,
      root: '[forAvatar]',
      token: 'FOR_AVATAR_CONTEXT',
    });
  }
  const widened = ctx as AvatarContext;
  assertRootContext({
    ...ROOT_ASSERTION,
    piece,
    probe: () => widened.reportStatus,
  });
  return widened;
}

/**
 * `[forAvatarImage]`'s own resolver. It reports a distinct failure from the rest
 * of the anatomy — the image is the piece that drives the state machine, so an
 * orphaned one silently never transitions — and therefore carries its own code
 * rather than routing through {@link injectAvatarContext}.
 */
export function injectAvatarImageContext(): AvatarContext {
  const ctx = inject(FOR_AVATAR_CONTEXT, { optional: true });
  if (!ctx) {
    throw orphanContextError({
      code: 'FORCDK-AVATAR-002',
      piece: 'ForAvatarImage',
      root: '[forAvatar]',
      token: 'FOR_AVATAR_CONTEXT',
    });
  }
  const widened = ctx as AvatarContext;
  assertRootContext({
    ...ROOT_ASSERTION,
    piece: 'ForAvatarImage',
    probe: () => widened.reportStatus,
  });
  return widened;
}
