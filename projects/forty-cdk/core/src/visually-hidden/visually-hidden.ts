import {
  Directive,
  ElementRef,
  booleanAttribute,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';

/**
 * The "visually hidden" clip rectangle: an inline style declaration that
 * removes an element from the visual layout while keeping it in the
 * accessibility tree (unlike `display:none` / `visibility:hidden`, which both
 * also drop it from the a11y tree). Shared by {@link ForVisuallyHidden} and the
 * `LiveAnnouncer` so the clip CSS is defined in exactly one place.
 *
 * Deliberately internal tier, and deliberately not exported from the core
 * barrel: the published surface for this capability is {@link ForVisuallyHidden}
 * (blessed, shipped from `forty-cdk/visually-hidden`), which applies the clip
 * for the consumer. A raw style string covers no use case the directive does
 * not (#1492).
 */
export const VISUALLY_HIDDEN_STYLE =
  'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0, 0, 0, 0);white-space:nowrap;border:0;';

/**
 * Visually hides its host while leaving it in the accessibility tree, applying
 * the clip rectangle inline (no global stylesheet). Use it for hidden labels,
 * descriptions, and live-region content that screen readers must reach but
 * sighted users should not see.
 *
 * With `focusable`, the host is revealed whenever it — or any descendant —
 * holds focus, then clips itself again on blur. This is the skip-link pattern:
 * a control that is invisible until a keyboard user tabs to it. Focus is
 * tracked through `focusin` / `focusout` rather than a `:focus-within` CSS
 * rule, because the clip is applied inline and an inline style cannot express a
 * pseudo-class.
 *
 * Part of the blessed core tier: consumers import it from the
 * `forty-cdk/visually-hidden` entry point, which carries the library's semver
 * guarantee.
 */
@Directive({
  selector: '[forVisuallyHidden]',
  exportAs: 'forVisuallyHidden',
  host: {
    '[style]': 'styles()',
    '(focusin)': 'onFocusIn()',
    '(focusout)': 'onFocusOut($event)',
  },
})
export class ForVisuallyHidden {
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * When `true`, the host un-clips while it (or a descendant) holds focus and
   * re-clips on blur — the skip-link "visible on focus" behavior. Defaults to
   * `false`, which keeps the host hidden at all times.
   */
  readonly focusable = input(false, { transform: booleanAttribute });

  readonly #focused = signal(false);

  protected readonly styles = computed(() =>
    this.focusable() && this.#focused() ? null : VISUALLY_HIDDEN_STYLE,
  );

  protected onFocusIn(): void {
    this.#focused.set(true);
  }

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (next && this.#host.nativeElement.contains(next)) {
      return;
    }
    this.#focused.set(false);
  }
}
