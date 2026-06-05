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
  readonly loadStatusChanged = output<ForAvatarStatus>();

  constructor() {
    if (!this.#parent) {
      throw new Error(
        '[forty-cdk/avatar] ForAvatarImage must be used inside a [forAvatar] element.',
      );
    }
    const parent = this.#parent;
    const host = this.#host;

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
    let last: ForAvatarStatus | null = null;
    const emit = (status: ForAvatarStatus): void => {
      if (last === status) return;
      last = status;
      parent.reportStatus(status);
      this.loadStatusChanged.emit(status);
    };
    this.#emit = emit;
  }

  protected status(): ForAvatarStatus {
    return this.#parent!.status();
  }

  protected onLoad(): void {
    this.#emit('loaded');
  }

  protected onError(): void {
    this.#emit('error');
  }

  #syncFromAttr(): void {
    const src = this.#host.getAttribute('src');
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
}
