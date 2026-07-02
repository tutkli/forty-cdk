import { isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  booleanAttribute,
  computed,
  DestroyRef,
  Directive,
  DOCUMENT,
  effect,
  ElementRef,
  inject,
  input,
  model,
  output,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

import { FOR_FIELD_CONTEXT, FormUiControlBase, mirrorUnfocusedValue } from 'forty-cdk/core';
import { FOR_OTP_INPUT_CONTEXT, type ForOtpInputContext } from './otp-input-context';
import { allowedCharForType, inputModeForType, type OtpInputType } from './otp-patterns';

const MASK_CHAR = '•';

function setAttr(el: HTMLElement, name: string, value: string | null): void {
  if (value === null) {
    el.removeAttribute(name);
  } else if (el.getAttribute(name) !== value) {
    el.setAttribute(name, value);
  }
}

/**
 * Headless OTP / PIN input following the **single-input** model: one real
 * `<input maxlength=N>` carries the whole code as a `string`, and the
 * `[forOtpInputSlot]` pieces are a pure
 * styling surface painted over it. There is **no** WAI-ARIA APG pattern for
 * OTP; this gives the cleanest screen-reader experience (one ordinary text
 * field, not "edit text, 1 of 6" announced N times), native mobile SMS autofill
 * via `autocomplete="one-time-code"`, and native paste / caret / selection.
 *
 * Apply `[forOtpInput]` on a wrapper element — it becomes a `role="group"` and
 * the directive injects the single visually-hidden-but-interactive `<input>`
 * inside it (the consumer styles that input to overlay the slots). It
 * implements Angular's `FormValueControl<string>` from `@angular/forms/signals`,
 * so it auto-wires with `[formField]` and auto-associates inside a `[forField]`
 * (label / description / error) with no extra markup.
 *
 * Because the focusable, submittable control is the injected `<input>` and not
 * the `role="group"` host, `ForOtpInput` redirects `FormUiControlBase`'s
 * host-targeted helpers onto that input: it overrides `fieldLabelledElement()`
 * (so the field association lands on the input) and `fieldStateReflectionTarget()`
 * (so the form-state `data-*` reflect there), and reflects the OTP-specific input
 * attributes (`maxLength` / `inputmode` / `autocomplete` / `pattern` / `name`)
 * and ARIA on the input itself.
 *
 * The host gets `data-complete` (while every slot is filled) and `data-disabled`
 * for CSS hooks; the real input carries `data-disabled` / `data-readonly` plus
 * `data-touched` / `data-dirty` / `data-pending` / `data-invalid`.
 *
 * > **`allowedPattern`, not `pattern`.** The custom allowed-character RegExp is
 * > named `allowedPattern` because `FormUiControl.pattern` is reserved by Signal
 * > Forms for an array of validation patterns the `[formField]` directive binds
 * > in — reusing the name would both break the `implements` contract and let the
 * > field overwrite the character filter.
 *
 * @example
 * ```html
 * <div forOtpInput [(value)]="code" [length]="6" type="numeric" ariaLabel="Verification code" #otp="forOtpInput">
 *   @for (i of otp.slots(); track i) {
 *     <div forOtpInputSlot [index]="i" #s="forOtpInputSlot">
 *       {{ s.char() }}
 *       @if (s.hasFakeCaret()) { <span class="caret"></span> }
 *     </div>
 *   }
 * </div>
 * ```
 */
@Directive({
  selector: '[forOtpInput]',
  exportAs: 'forOtpInput',
  host: {
    role: 'group',
    '[attr.aria-label]': 'ariaLabel() || null',
    '[attr.data-complete]': 'complete() ? "" : null',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
  },
  providers: [{ provide: FOR_OTP_INPUT_CONTEXT, useExisting: ForOtpInput }],
})
export class ForOtpInput
  extends FormUiControlBase
  implements FormValueControl<string>, ForOtpInputContext
{
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #document = inject(DOCUMENT);
  readonly #destroyRef = inject(DestroyRef);
  readonly #isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly #field = inject(FOR_FIELD_CONTEXT, { optional: true });

  /** The injected real `<input>`, once created in the browser. */
  readonly #inputEl = signal<HTMLInputElement | null>(null);
  readonly #focused = signal(false);
  readonly #selectionStart = signal(0);
  readonly #selectionEnd = signal(0);

  #composing = false;

  /**
   * The current code. Required by `FormValueControl<string>`. Two-way bindable;
   * its rendered length is clamped to `length()`.
   */
  readonly value = model<string>('');

  /** Number of characters / slots. */
  readonly length = input.required<number>();

  /** Allowed character class. Ignored when `allowedPattern` is set. Defaults to `'numeric'`. */
  readonly type = input<OtpInputType>('numeric');

  /**
   * Custom allowed-character RegExp, tested per typed/pasted character;
   * overrides `type`. Named `allowedPattern` (not `pattern`) to avoid the
   * reserved `FormUiControl.pattern` member — see the class JSDoc.
   */
  readonly allowedPattern = input<RegExp | null>(null);

  /** Obscure entered characters in the slots (PIN entry); `value()` stays raw. */
  readonly mask = input(false, { transform: booleanAttribute });

  /** Toggle `autocomplete="one-time-code"` for mobile SMS autofill. */
  readonly oneTimeCode = input(true, { transform: booleanAttribute });

  /** Rewrite pasted text before it fills the slots (e.g. strip separators). */
  readonly pasteTransformer = input<((pasted: string) => string) | null>(null);

  /**
   * Accessible name for the group, also reflected as `aria-label` on the
   * injected real `<input>` whenever no field-provided `aria-labelledby`
   * applies (standalone usage, or a `[forField]` without a label). Emits
   * `aria-label` only when truthy; a field label always wins on the input.
   */
  readonly ariaLabel = input<string | null>(null);

  /** Fires when every slot is filled (by typing or paste). */
  readonly valueComplete = output<string>();

  /** Fires when an entered / pasted character is rejected by `type` / `allowedPattern`. */
  readonly valueInvalid = output<{ value: string }>();

  /** The value clamped to `length()` — the source of truth for the slots. */
  readonly #clampedValue = computed(() => this.value().slice(0, this.length()));

  /** `true` when every slot is filled. */
  readonly complete = computed(() => this.#clampedValue().length === this.length());

  /** The slot indices, for the consumer's `@for`. */
  readonly slots = computed<readonly number[]>(() =>
    Array.from({ length: this.length() }, (_, i) => i),
  );

  readonly #inputMode = computed(() => inputModeForType(this.type()));

  /** Predicate deciding whether a single character is allowed. */
  readonly #allowed = computed<(ch: string) => boolean>(() => {
    const pattern = this.allowedPattern();
    if (pattern) {
      return (ch: string) => {
        pattern.lastIndex = 0;
        return pattern.test(ch);
      };
    }
    const re = allowedCharForType(this.type());
    return (ch: string) => re.test(ch);
  });

  constructor() {
    super();

    // Reflect the OTP-specific input attributes and ARIA onto the injected real
    // input — not the role="group" host. The four form-state data-* booleans and
    // the field association are reflected onto the same input by the base, via
    // the fieldStateReflectionTarget() / fieldLabelledElement() overrides below.
    // Runs once the input exists.
    effect(() => {
      const el = this.#inputEl();
      if (!el) {
        return;
      }
      el.maxLength = this.length();
      setAttr(el, 'inputmode', this.#inputMode());
      setAttr(el, 'autocomplete', this.oneTimeCode() ? 'one-time-code' : 'off');
      // Legacy iOS numeric-keypad hint; modern browsers honour inputmode.
      setAttr(el, 'pattern', this.#inputMode() === 'numeric' ? '[0-9]*' : null);
      setAttr(el, 'name', this.name() || null);
      el.toggleAttribute('disabled', this.effectiveDisabled());
      el.toggleAttribute('readonly', this.readonly());
      setAttr(el, 'aria-label', this.#field?.labelledBy() ? null : this.ariaLabel() || null);
      setAttr(el, 'aria-disabled', this.effectiveDisabled() ? 'true' : null);
      setAttr(el, 'aria-readonly', this.readonly() ? 'true' : null);
      setAttr(el, 'aria-required', this.required() ? 'true' : null);
      setAttr(el, 'aria-invalid', this.invalid() ? 'true' : null);
      setAttr(el, 'aria-busy', this.pending() ? 'true' : null);
      el.toggleAttribute('data-disabled', this.effectiveDisabled());
      el.toggleAttribute('data-readonly', this.readonly());
    });

    // Mirror external value writes (consumer `[(value)]` / `[formField]`) back
    // to the input while it isn't focused. Live typing flows in through the
    // `input` listener.
    mirrorUnfocusedValue(this.#inputEl, this.#clampedValue);

    // Create the single real input after hydration (browser only), so the
    // server-rendered markup stays the group + slots and there is no hydration
    // mismatch from a node the server never emitted.
    afterNextRender(() => {
      const el = this.#document.createElement('input');
      el.type = 'text';
      el.autocapitalize = 'none';
      el.setAttribute('autocorrect', 'off');
      el.spellcheck = false;
      el.value = this.#clampedValue();
      this.#host.nativeElement.appendChild(el);

      el.addEventListener('input', () => this.#onInput());
      el.addEventListener('compositionstart', () => this.#onCompositionStart());
      el.addEventListener('compositionend', () => this.#onCompositionEnd());
      el.addEventListener('paste', (event) => this.#onPaste(event));
      el.addEventListener('focus', () => {
        this.#focused.set(true);
        this.#syncSelection();
      });
      el.addEventListener('blur', () => {
        this.#focused.set(false);
        if (el.value !== this.#clampedValue()) {
          el.value = this.#clampedValue();
        }
        this.markTouched();
      });
      el.addEventListener('click', () => this.#syncSelection());
      el.addEventListener('keyup', () => this.#syncSelection());
      el.addEventListener('select', () => this.#syncSelection());

      this.#inputEl.set(el);

      this.#destroyRef.onDestroy(() => el.remove());
    });
  }

  /**
   * The injected real `<input>` is the focusable, submittable control, so the
   * surrounding `[forField]` associates with it rather than the `role="group"`
   * host. Returns `null` until the input is created (after hydration), at which
   * point the field-wiring effect re-targets it. See the Select precedent.
   */
  protected override fieldLabelledElement(): HTMLElement | null {
    return this.#inputEl();
  }

  /**
   * The four form-state `data-*` booleans reflect onto the injected real
   * `<input>`, alongside the OTP-specific `data-disabled` / `data-readonly`,
   * rather than the `role="group"` host. `null` until the input exists.
   */
  protected override fieldStateReflectionTarget(): HTMLElement | null {
    return this.#inputEl();
  }

  /** Move focus to the real input. Implements `FormUiControl.focus`. */
  focus(options?: FocusOptions): void {
    this.#inputEl()?.focus(options);
  }

  /** The character in slot `index` (masked when `mask`), or `null` when empty. */
  charAt(index: number): string | null {
    const v = this.#clampedValue();
    if (index < 0 || index >= v.length) {
      return null;
    }
    return this.mask() ? MASK_CHAR : v[index]!;
  }

  /** Whether slot `index` is the active caret position (or inside the selection). */
  isActive(index: number): boolean {
    if (!this.#focused()) {
      return false;
    }
    const len = this.length();
    if (index < 0 || index >= len) {
      return false;
    }
    const start = this.#selectionStart();
    const end = this.#selectionEnd();
    if (start === end) {
      return index === Math.min(start, len - 1);
    }
    return index >= start && index < end;
  }

  /** Whether slot `index` should render a fake caret. */
  hasFakeCaret(index: number): boolean {
    return (
      this.#focused() &&
      this.#selectionStart() === this.#selectionEnd() &&
      this.isActive(index) &&
      this.charAt(index) === null
    );
  }

  #onCompositionStart(): void {
    this.#composing = true;
  }

  #onCompositionEnd(): void {
    this.#composing = false;
    this.#normalize();
  }

  #onInput(): void {
    if (this.#composing) {
      return;
    }
    this.#normalize();
  }

  #normalize(): void {
    const el = this.#inputEl();
    if (!el) {
      return;
    }
    if (this.effectiveDisabled() || this.readonly()) {
      el.value = this.#clampedValue();
      return;
    }
    const raw = el.value;
    const { filtered, rejected } = this.#filter(raw);
    const clamped = filtered.slice(0, this.length());
    if (el.value !== clamped) {
      el.value = clamped;
      el.setSelectionRange(clamped.length, clamped.length);
    }
    this.#commit(clamped);
    this.#syncSelection();
    if (rejected) {
      this.valueInvalid.emit({ value: raw });
    }
  }

  #onPaste(event: ClipboardEvent): void {
    const el = this.#inputEl();
    if (!el || this.effectiveDisabled() || this.readonly()) {
      return;
    }
    event.preventDefault();
    const text = event.clipboardData?.getData('text') ?? '';
    const transformer = this.pasteTransformer();
    const transformed = transformer ? transformer(text) : text;
    const { filtered, rejected } = this.#filter(transformed);
    const clamped = filtered.slice(0, this.length());
    el.value = clamped;
    el.setSelectionRange(clamped.length, clamped.length);
    this.#commit(clamped);
    this.#syncSelection();
    if (rejected) {
      this.valueInvalid.emit({ value: text });
    }
  }

  #commit(next: string): void {
    const wasComplete = this.complete();
    const prev = this.value();
    this.value.set(next);
    if (next.length === this.length() && (!wasComplete || next !== prev)) {
      this.valueComplete.emit(next);
    }
  }

  #filter(raw: string): { filtered: string; rejected: boolean } {
    const test = this.#allowed();
    let filtered = '';
    let rejected = false;
    for (const ch of raw) {
      if (test(ch)) {
        filtered += ch;
      } else {
        rejected = true;
      }
    }
    return { filtered, rejected };
  }

  #syncSelection(): void {
    const el = this.#inputEl();
    if (!el) {
      return;
    }
    const len = this.#clampedValue().length;
    const start = Math.min(el.selectionStart ?? 0, len);
    const end = Math.min(el.selectionEnd ?? start, len);
    this.#selectionStart.set(start);
    this.#selectionEnd.set(end);
  }
}
