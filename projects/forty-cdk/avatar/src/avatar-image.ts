import { isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  output,
  PLATFORM_ID,
} from '@angular/core';

import { orphanContextError } from 'forty-cdk/core';
import { FOR_AVATAR_CONTEXT, type ForAvatarStatus } from './avatar-context';

/**
 * Wraps an `<img>` and reports its load lifecycle to the surrounding
 * `[forAvatar]`. The native `src` / `alt` bindings are owned by the
 * consumer — this directive only observes.
 *
 * Reflects `data-status` on the image element so the consumer can hide it
 * via CSS while loading or after an error (e.g. `img[data-status="error"]
 * { display: none }`).
 */
@Directive({
  selector: 'img[forAvatarImage]',
  exportAs: 'forAvatarImage',
  host: {
    '[attr.data-status]': 'status()',
    '(load)': 'onLoad()',
    '(error)': 'onError()',
  },
})
export class ForAvatarImage {
  readonly #host = inject<ElementRef<HTMLImageElement>>(ElementRef).nativeElement;
  readonly #parent = inject(FOR_AVATAR_CONTEXT, { optional: true });

  /**
   * Emits whenever the image lifecycle transitions to a new state. Useful
   * if the consumer wants to log analytics, swap to a different src on
   * error, etc.
   */
  readonly loadStatusChange = output<ForAvatarStatus>();

  constructor() {
    if (!this.#parent) {
      throw orphanContextError({
        code: 'FORCDK-AVATAR-002',
        piece: 'ForAvatarImage',
        root: '[forAvatar]',
        token: 'FOR_AVATAR_CONTEXT',
      });
    }
    const parent = this.#parent;
    const host = this.#host;

    let destroyed = false;
    inject(DestroyRef).onDestroy(() => (destroyed = true));

    afterNextRender(() => {
      this.#syncFromAttr();
    });

    if (isPlatformBrowser(inject(PLATFORM_ID)) && typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver(() => {
        this.#syncFromAttr();
      });
      observer.observe(host, { attributes: true, attributeFilter: ['src'] });
      inject(DestroyRef).onDestroy(() => observer.disconnect());
    }

    // Re-emit upstream whenever the parent's status changes due to our writes.
    // De-dupe on the (request, status) pair rather than status alone: a new
    // `src` opens a fresh request token, so an identical status (e.g. a second
    // image that also `loaded`) still re-reports for the new request, while a
    // repeated status within the same request is suppressed.
    let last: ForAvatarStatus | null = null;
    let lastReportedToken = -1;
    const emit = (status: ForAvatarStatus): void => {
      if (destroyed) return;
      if (last === status && lastReportedToken === this.#requestToken) return;
      last = status;
      lastReportedToken = this.#requestToken;
      parent.reportStatus(status);
      this.loadStatusChange.emit(status);
    };
    this.#emit = emit;
  }

  protected status(): ForAvatarStatus {
    return this.#parent!.status();
  }

  protected onLoad(): void {
    // Ignore a `load` that fires for a request the host has already moved past
    // (the native event can arrive after `src` was reassigned).
    if (!this.#isCurrentRequest()) return;
    if (!this.#host.complete) return;
    this.#emit('loaded');
  }

  protected onError(): void {
    if (!this.#isCurrentRequest()) return;
    if (!this.#host.complete) return;
    this.#emit('error');
  }

  /**
   * Cheap string-identity fast-path: true when the `src` the host currently
   * carries is the one the latest `#syncFromAttr` observed, so a native
   * load/error event has not drifted away from the in-flight request. This
   * proves src-attribute stability only; request *completeness* (a late event
   * from a superseded resource that happens to share the current src) is
   * verified separately in onLoad/onError via `this.#host.complete`.
   */
  #isCurrentRequest(): boolean {
    return this.#host.getAttribute('src') === this.#requestSrc;
  }

  #syncFromAttr(): void {
    const src = this.#host.getAttribute('src');
    this.#requestToken++;
    this.#requestSrc = src;
    if (!src) {
      this.#emit('idle');
      return;
    }
    if (this.#host.complete) {
      // Cached image: load/error events may not fire — derive from naturalWidth.
      if (this.#host.naturalWidth > 0) {
        this.#emit('loaded');
        return;
      }
      // A complete image with zero intrinsic width is ambiguous: it may be a
      // broken image OR a valid SVG with no intrinsic dimensions. Don't
      // pessimistically flag `error` and hide a valid image — verify with
      // `decode()`, which resolves for a decodable (even zero-size) image and
      // rejects for a broken one. Stay `loading` until it settles.
      this.#emit('loading');
      this.#verifyCachedZeroSize(src);
      return;
    }
    this.#emit('loading');
  }

  #verifyCachedZeroSize(src: string): void {
    const decode = this.#host.decode?.bind(this.#host);
    if (!decode) {
      // No `decode()` (older engines / jsdom): keep the legacy heuristic.
      this.#emit('error');
      return;
    }
    decode().then(
      () => {
        if (this.#host.getAttribute('src') === src) {
          this.#emit('loaded');
        }
      },
      () => {
        if (this.#host.getAttribute('src') === src) {
          this.#emit('error');
        }
      },
    );
  }

  // Initialized in constructor.
  #emit!: (status: ForAvatarStatus) => void;

  /** Monotonic id bumped on every `src` change so stale events are ignored. */
  #requestToken = 0;
  /** The `src` the latest `#syncFromAttr` observed, used to match native events. */
  #requestSrc: string | null = null;
}
