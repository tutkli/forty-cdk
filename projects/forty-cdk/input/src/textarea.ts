import { isPlatformBrowser } from '@angular/common';
import {
  booleanAttribute,
  computed,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  PLATFORM_ID,
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
    computed(() => (this.autosize() && this.#isBrowser ? this.#element.nativeElement : null)),
  );

  constructor() {
    super();

    effect(() => {
      const el = this.#element.nativeElement;
      this.value();
      this.#box();
      if (!this.autosize() || !this.#isBrowser) {
        el.style.height = '';
        return;
      }
      this.#resizeToContent(el);
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
