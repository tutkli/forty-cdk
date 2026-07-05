import { Directive, computed, input, numberAttribute } from '@angular/core';

/**
 * Headless aspect-ratio container. Locks the host element's box to a fixed
 * `width / height` ratio via the native CSS `aspect-ratio` property — useful
 * for media (video, image, iframe) and skeletons that must reserve space
 * before content loads.
 *
 * The directive only writes the `aspect-ratio` style; sizing rules (width,
 * max-width, background, etc.) stay with the consumer.
 *
 * This ships as a dedicated primitive — rather than leaving consumers to write
 * a static `aspect-ratio` CSS declaration — because it is more than one line of
 * CSS: it exposes a reactive `ratio` input that recomputes as the value
 * changes, guards `0` / negative / non-finite ratios so the host never emits
 * invalid CSS, is SSR-safe (the style is bound, never touched imperatively),
 * and offers the same headless API shape as the other primitives. Consumers who
 * only need a fixed, never-changing ratio can skip it and set the native CSS
 * `aspect-ratio` property directly; reach for `[forAspectRatio]` when the ratio
 * is dynamic or must be validated.
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
  host: {
    '[style.aspect-ratio]': 'resolvedRatio()',
  },
})
export class ForAspectRatio {
  /**
   * Width / height ratio, e.g. `16 / 9`, `4 / 3`, `1`. Accepts numeric inputs
   * (`[ratio]="16 / 9"`) and string attributes (`ratio="1.5"`). Defaults to
   * `1` (square). Non-positive or non-finite values fall back to `1` so the
   * host never emits an invalid `aspect-ratio`.
   */
  readonly ratio = input(1, { transform: numberAttribute });

  /**
   * The host `aspect-ratio` style value, guarded so a `0`, negative, or
   * non-finite `ratio` never produces invalid CSS — it falls back to `1`.
   */
  protected readonly resolvedRatio = computed(() => {
    const value = this.ratio();
    return String(Number.isFinite(value) && value > 0 ? value : 1);
  });
}
