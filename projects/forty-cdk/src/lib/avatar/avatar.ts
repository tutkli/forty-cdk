import {
  computed,
  DestroyRef,
  Directive,
  effect,
  inject,
  input,
  numberAttribute,
  signal,
} from '@angular/core';

import { FOR_AVATAR_CONTEXT, type ForAvatarContext, type ForAvatarStatus } from './avatar-context';
import { FOR_AVATAR_DEFAULTS } from './avatar-defaults';

/**
 * Headless avatar root. Tracks the load lifecycle of an inner
 * `[forAvatarImage]` and exposes `status` + `shouldShowFallback` so the
 * consumer can swap the image for fallback content (initials, generic icon)
 * via `@if`.
 *
 * No ARIA role is imposed — avatars are typically presentational. If the
 * surrounding component conveys identity (a person's name in the header,
 * a chat bubble), the consumer should provide an `aria-label` on the
 * relevant ancestor or pair the avatar with visible text.
 *
 * @example
 * ```html
 * <span forAvatar #a="forAvatar" fallbackDelayMs="500">
 *   <img forAvatarImage [src]="user.avatarUrl" [alt]="user.name" />
 *   @if (a.shouldShowFallback()) {
 *     <span forAvatarFallback>{{ user.initials }}</span>
 *   }
 * </span>
 * ```
 */
@Directive({
  selector: '[forAvatar]',
  exportAs: 'forAvatar',
  host: {
    '[attr.data-status]': 'status()',
  },
  providers: [{ provide: FOR_AVATAR_CONTEXT, useExisting: ForAvatar }],
})
export class ForAvatar implements ForAvatarContext {
  readonly #defaults = inject(FOR_AVATAR_DEFAULTS);

  /**
   * Milliseconds to defer the fallback for fast loads, avoiding a brief
   * "initials → image" flicker. Set to `0` (default) to show immediately
   * during `idle` / `loading`, or to e.g. `500` to skip rendering during
   * quick cached loads. `error` always shows the fallback immediately.
   * The default is read from `provideForAvatarDefaults` for the
   * surrounding scope.
   */
  readonly fallbackDelayMs = input(this.#defaults.fallbackDelayMs, {
    transform: numberAttribute,
  });

  readonly #status = signal<ForAvatarStatus>('idle');
  readonly status = this.#status.asReadonly();

  readonly #delayElapsed = signal(false);
  #timer: ReturnType<typeof setTimeout> | null = null;

  readonly shouldShowFallback = computed(() => {
    const status = this.#status();
    if (status === 'loaded') return false;
    if (status === 'error') return true;
    return this.#delayElapsed();
  });

  /** @internal */
  reportStatus(status: ForAvatarStatus): void {
    this.#status.set(status);
  }

  constructor() {
    // Imperative timer integration: effect tracks status + delay and (re)arms
    // a setTimeout. The signal write happens inside the timer callback, which
    // runs outside the effect's reactive scope, so this does NOT create a
    // self-cycle in the reactive graph.
    effect(() => {
      const status = this.#status();
      const delay = this.fallbackDelayMs();
      this.#cancelTimer();
      if (status === 'loaded') {
        this.#delayElapsed.set(false);
        return;
      }
      if (status === 'error') {
        this.#delayElapsed.set(true);
        return;
      }
      // idle | loading
      if (delay <= 0) {
        this.#delayElapsed.set(true);
        return;
      }
      this.#delayElapsed.set(false);
      this.#timer = setTimeout(() => {
        this.#timer = null;
        this.#delayElapsed.set(true);
      }, delay);
    });

    inject(DestroyRef).onDestroy(() => this.#cancelTimer());
  }

  #cancelTimer(): void {
    if (this.#timer !== null) {
      clearTimeout(this.#timer);
      this.#timer = null;
    }
  }
}
