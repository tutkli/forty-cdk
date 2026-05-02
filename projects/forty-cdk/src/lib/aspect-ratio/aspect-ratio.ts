import { Directive, ElementRef, effect, inject, input, numberAttribute } from '@angular/core';

/**
 * Headless aspect-ratio container. Locks the host element's box to a fixed
 * `width / height` ratio via the native CSS `aspect-ratio` property — useful
 * for media (video, image, iframe) and skeletons that must reserve space
 * before content loads.
 *
 * The directive only writes the `aspect-ratio` style; sizing rules (width,
 * max-width, background, etc.) stay with the consumer.
 *
 * @example
 * ```html
 * <div forAspectRatio [ratio]="16 / 9">
 *   <img src="cover.jpg" alt="" />
 * </div>
 *
 * <div forAspectRatio ratio="1">  <!-- square -->
 *   <video src="clip.mp4" controls></video>
 * </div>
 * ```
 */
@Directive({
  selector: '[forAspectRatio]',
  exportAs: 'forAspectRatio',
})
export class ForAspectRatio {
  /**
   * Width / height ratio, e.g. `16 / 9`, `4 / 3`, `1`. Accepts numeric inputs
   * (`[ratio]="16 / 9"`) and string attributes (`ratio="1.5"`). Defaults to
   * `1` (square).
   */
  readonly ratio = input(1, { transform: numberAttribute });

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    effect(() => {
      const value = String(this.ratio());
      host.style.setProperty('aspect-ratio', value);
      // Fallback for environments (some jsdom versions) where
      // CSSStyleDeclaration silently rejects `aspect-ratio`. The browser
      // path above already wrote the property; this only fires in test envs.
      if (host.style.getPropertyValue('aspect-ratio') !== value) {
        const existing = host.getAttribute('style') ?? '';
        const stripped = existing.replace(/(?:^|;)\s*aspect-ratio:[^;]*;?/i, '').trim();
        const next = stripped
          ? `${stripped.replace(/;$/, '')}; aspect-ratio: ${value};`
          : `aspect-ratio: ${value};`;
        host.setAttribute('style', next);
      }
    });
  }
}
