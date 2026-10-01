import { isPlatformBrowser } from '@angular/common';
import {
  booleanAttribute,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

import { injectElementSize, TextValueControlBase } from 'forty-cdk/core';

/**
 * Headless multi-line text `<textarea>` implementing Angular's
 * `FormValueControl<string>` from `@angular/forms/signals`, so it auto-wires
 * with `[formField]` and auto-associates inside a `[forField]` (label /
 * description / error) with no extra markup.
 *
 * Apply on a native `<textarea>`. The element keeps its own caret, wrapping,
 * IME composition, and native form submission — the directive only bridges the
 * value to a signal and reflects validation state. The string-valued sibling
 * of `[forInput]`.
 *
 * The host gets `data-empty` (while the value is `''`), `data-disabled`, and
 * `data-readonly` for CSS hooks.
 *
 * With `[autosize]` the host grows and shrinks its height to fit the content on
 * every edit, programmatic value change, and width reflow, and reflects
 * `data-autosize` for styling (pair it with `resize: none; overflow: hidden;`).
 * Autosize is a DOM side effect gated to the browser, so it is inert under SSR.
 *
 * `overflowing` reports whether the content is taller than the visible box and
 * reflects `data-overflowing`, so a height-capped textarea can offer a
 * "Read more" toggle.
 *
 * @example
 * ```html
 * <textarea forTextarea [(value)]="bio" placeholder="About you"></textarea>
 *
 * <!-- Grow to content: -->
 * <textarea forTextarea autosize [(value)]="bio"></textarea>
 *
 * <!-- With Signal Forms + Field (auto-wired): -->
 * <div forField>
 *   <label forLabel>Bio</label>
 *   <textarea forTextarea [formField]="profile.bio"></textarea>
 * </div>
 * ```
 */
@Directive({
  selector: '[forTextarea]',
  exportAs: 'forTextarea',
  host: {
    '[attr.aria-readonly]': 'readonly() ? "true" : null',
    '[attr.aria-required]': 'required() ? "true" : null',
    '[attr.aria-invalid]': 'invalid() ? "true" : null',
    '[attr.aria-busy]': 'pending() ? "true" : null',
    '[attr.readonly]': 'readonly() ? "" : null',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
    '[attr.data-readonly]': 'readonly() ? "" : null',
    '[attr.data-autosize]': 'autosize() ? "" : null',
    '[attr.data-overflowing]': 'overflowing() ? "" : null',
    '[attr.name]': 'name() || null',
    '[attr.data-empty]': 'value() === "" ? "" : null',
    '(input)': 'onInput($event)',
    '(compositionstart)': 'onCompositionStart()',
    '(compositionend)': 'onCompositionEnd()',
    '(blur)': 'onBlur()',
  },
})
export class ForTextarea extends TextValueControlBase implements FormValueControl<string> {
  /**
   * Opt into height auto-sizing. When `true` the textarea's height tracks its
   * content: it grows as the value gets taller and shrinks back as it gets
   * shorter, recomputed on every edit, on programmatic `value` writes, and on
   * width reflow. Defaults to `false`, leaving the element's height to CSS.
   */
  readonly autosize = input(false, { transform: booleanAttribute });

  readonly #element = inject<ElementRef<HTMLTextAreaElement>>(ElementRef);
  readonly #isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly #box = injectElementSize(
    signal(
      this.#isBrowser && typeof ResizeObserver !== 'undefined' ? this.#element.nativeElement : null,
    ),
  );

  readonly #overflowing = signal(false);

  /**
   * Whether the content is taller than the visible box, as with a
   * `max-height` cap on an `autosize` textarea or a fixed-height one. Holds
   * with and without `autosize`, follows every value change and resize, and
   * ignores a difference of 1px or less. Always `false` under SSR. Reflected
   * as `data-overflowing`.
   */
  readonly overflowing = this.#overflowing.asReadonly();

  #sized = false;

  constructor() {
    super();

    // @sanctioned-effect(external-source): `#overflowing` mirrors the element's
    // measured scroll and client heights, and the effect never reads it.
    effect(() => {
      const el = this.#element.nativeElement;
      this.value();
      this.#box();
      if (!this.#isBrowser) {
        return;
      }
      if (this.autosize()) {
        this.#resizeToContent(el);
        this.#sized = true;
      } else if (this.#sized) {
        el.style.height = '';
        this.#sized = false;
      }
      this.#overflowing.set(el.scrollHeight - el.clientHeight > 1);
    });
  }

  #resizeToContent(el: HTMLTextAreaElement): void {
    const view = el.ownerDocument.defaultView;
    if (!view) {
      return;
    }
    const style = view.getComputedStyle(el);
    el.style.height = 'auto';
    const content = el.scrollHeight;
    if (style.boxSizing === 'border-box') {
      const borderY = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
      el.style.height = `${content + borderY}px`;
    } else {
      const paddingY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
      el.style.height = `${content - paddingY}px`;
    }
  }
}
