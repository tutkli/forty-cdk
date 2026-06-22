import { computed, Directive, DOCUMENT, effect, ElementRef, inject } from '@angular/core';

import { registerHandle, reflectDisabled } from 'forty-cdk/core';
import { injectComboboxContext } from './combobox-context';

/**
 * The combobox `<input role="combobox">`. Owns the visible text and all
 * keyboard interaction. Apply on a real `<input>` so the browser's native
 * caret / selection semantics drive inline-autocomplete and so the form
 * still behaves like a text field for screen readers.
 *
 * Wires `aria-haspopup="listbox"`, `aria-expanded`, `aria-controls`,
 * `aria-autocomplete`, and `aria-activedescendant` (per APG combobox).
 * Focus stays on the input — arrow keys move the listbox's *active
 * descendant* via id reference, never moving DOM focus into the listbox.
 *
 * Keyboard:
 * - **ArrowDown / ArrowUp** — open + move activedescendant.
 * - **Home / End** (when open) — first / last enabled option.
 * - **PageUp / PageDown** (when open) — first / last enabled option.
 * - **Enter** (when open) — activate the activedescendant; no-op otherwise.
 * - **Escape** (when open) — close (focus stays in input). On the
 *   open→closed transition the input value is re-synced to `query()` even
 *   while focused, so a consumer restoring the committed label from an
 *   `(openChange)` handler renders without reaching for the DOM.
 * - **Tab** (when open) — close and let Tab flow to the next focusable.
 * - Printable keys: update `query` and (if `autocompleteMode` includes `'inline'`)
 *   complete the rest of the first match in the input as selected text.
 */
@Directive({
  selector: '[forComboboxInput]',
  exportAs: 'forComboboxInput',
  host: {
    type: 'text',
    role: 'combobox',
    autocomplete: 'off',
    autocorrect: 'off',
    spellcheck: 'false',
    '[id]': 'ctx.inputId()',
    '[attr.aria-haspopup]': '"listbox"',
    '[attr.aria-expanded]': 'ctx.open() ? "true" : "false"',
    '[attr.aria-controls]': 'ctx.open() ? ctx.listboxId() : null',
    '[attr.aria-autocomplete]': 'ariaAutocomplete()',
    '[attr.aria-activedescendant]': 'ctx.open() ? (ctx.activeId() ?? null) : null',
    '[attr.aria-disabled]': 'ctx.effectiveDisabled() ? "true" : null',
    '[attr.aria-readonly]': 'ctx.readonly() ? "true" : null',
    '[attr.aria-required]': 'ctx.required() ? "true" : null',
    '[attr.aria-invalid]': 'ctx.invalid() ? "true" : null',
    '[attr.aria-busy]': 'ctx.pending() ? "true" : null',
    '[attr.readonly]': 'ctx.readonly() ? "" : null',
    '[attr.data-state]': 'ctx.open() ? "open" : "closed"',
    '[attr.data-disabled]': 'ctx.effectiveDisabled() ? "" : null',
    '(input)': 'onInput($event)',
    '(compositionstart)': 'onCompositionStart()',
    '(compositionend)': 'onCompositionEnd()',
    '(keydown)': 'onKeyDown($event)',
    '(focus)': 'onFocus()',
    '(click)': 'onClick()',
  },
})
export class ForComboboxInput {
  // The input doesn't introspect the value type — it reads/writes the
  // query string and reads cached labels for inline autocomplete.
  protected readonly ctx = injectComboboxContext<unknown>('ForComboboxInput');
  readonly #host = inject<ElementRef<HTMLInputElement>>(ElementRef);

  #composing = false;

  protected readonly ariaAutocomplete = computed(() => this.ctx.autocompleteMode());

  constructor() {
    registerHandle(
      this.#host.nativeElement,
      (el) => this.ctx.registerInput(el),
      (el) => this.ctx.unregisterInput(el),
    );
    reflectDisabled(this.ctx.effectiveDisabled);

    const doc = inject(DOCUMENT);

    // Sync DOM input.value to query() when the input doesn't currently have
    // focus (e.g. consumer set [(query)] programmatically, or option
    // activation copied the label into query via commitOnSelect). When the
    // input is focused the user is mid-edit; clobbering input.value would
    // jump the caret and break inline autocomplete state.
    //
    // The open→closed transition is the documented exception: the edit
    // session is over (Escape closes but keeps focus in the input, per APG),
    // so a consumer restoring the committed label — `query.set(label)` from an
    // `(openChange)` handler — must reach the DOM even while focused. The
    // caret-protection rationale no longer applies and a caret jump to the end
    // of the restored text is the expected outcome. `wasOpen` tracks the prior
    // open state to detect the edge; it's a plain transition latch, not derived
    // signal state.
    let wasOpen = this.ctx.open();
    effect(() => {
      const q = this.ctx.query();
      const closing = wasOpen && !this.ctx.open();
      wasOpen = this.ctx.open();

      const el = this.#host.nativeElement;
      if (el.value === q) {
        return;
      }
      if (doc.activeElement !== el || closing) {
        el.value = q;
      }
    });
  }

  protected onCompositionStart(): void {
    this.#composing = true;
  }

  protected onCompositionEnd(): void {
    this.#composing = false;
    if (this.ctx.effectiveDisabled() || this.ctx.readonly()) {
      return;
    }
    this.#syncQuery(true, false);
  }

  protected onInput(event: Event): void {
    if (this.ctx.effectiveDisabled() || this.ctx.readonly()) {
      return;
    }
    if (this.#composing) {
      return;
    }
    const inputEvent = event as InputEvent;
    const allowInline = !inputEvent.isComposing;
    const isDelete = (inputEvent.inputType ?? '').startsWith('delete');
    this.#syncQuery(allowInline, isDelete);
  }

  #syncQuery(allowInline: boolean, isDelete: boolean): void {
    const el = this.#host.nativeElement;

    // The "user prefix" is everything before the caret. After inline
    // autocomplete sets a selection on chars [prefixLen..end], typing replaces
    // the selection (caret lands right after the new char) so this still
    // captures the user's intent. On Backspace, the browser deletes the
    // selection without touching the prefix — re-completing here would mean
    // the user can never shorten the query, so we skip completion on delete.
    const caret = el.selectionStart ?? el.value.length;
    const prefix = el.value.slice(0, caret);

    const atEnd = caret === el.value.length;
    const mode = this.ctx.autocompleteMode();
    const inlineActive =
      allowInline &&
      !isDelete &&
      atEnd &&
      (mode === 'inline' || mode === 'both') &&
      prefix.length > 0;

    if (inlineActive) {
      this.ctx.setQueryFromInput(prefix);
      this.#applyInlineCompletion(prefix);
    } else {
      this.ctx.setQueryFromInput(el.value);
    }
  }

  #applyInlineCompletion(prefix: string): void {
    const cached = this.ctx.cachedOptions();
    const lower = prefix.toLowerCase();
    const match = cached.find((o) => o.label.toLowerCase().startsWith(lower));
    const el = this.#host.nativeElement;
    if (!match || match.label.toLowerCase() === lower) {
      // No completion to apply — strip any prior selection so the user's
      // prefix is plainly visible.
      if (el.value !== prefix) {
        el.value = prefix;
      }
      return;
    }
    // Use the option's full label as the visible text (preserving its case),
    // with chars [prefixLen..end] selected so the next keystroke replaces
    // the appended suggestion. Matches native browser autocomplete behavior.
    const composed = match.label;
    el.value = composed;
    el.setSelectionRange(prefix.length, composed.length);
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (this.ctx.effectiveDisabled()) {
      return;
    }

    // Multi-mode Backspace heuristic: an empty input sends focus to the
    // last chip so a second Backspace there removes it. Skip when there's a
    // non-empty selection in the input (the user's mid-edit) — Backspace falls
    // through to the native delete-char handler.
    if (
      event.key === 'Backspace' &&
      this.ctx.multiple() &&
      this.#host.nativeElement.value === '' &&
      !this.ctx.readonly() &&
      !this.ctx.effectiveDisabled()
    ) {
      const chips = this.ctx.chips();
      const last = chips[chips.length - 1];
      if (last) {
        event.preventDefault();
        last.host.focus();
        return;
      }
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!this.ctx.open()) {
          // Open with the natural extreme as the auto-highlight bias —
          // navigate('next') won't fire here because items aren't registered
          // yet; the root's `activeId` linkedSignal seeds the activedescendant
          // once the options register.
          this.ctx.openMenu('first');
        } else {
          this.ctx.navigate('next');
        }
        break;

      case 'ArrowUp':
        event.preventDefault();
        if (!this.ctx.open()) {
          this.ctx.openMenu('last');
        } else {
          this.ctx.navigate('prev');
        }
        break;

      case 'Home':
        if (this.ctx.open()) {
          event.preventDefault();
          this.ctx.navigate('first');
        }
        break;

      case 'End':
        if (this.ctx.open()) {
          event.preventDefault();
          this.ctx.navigate('last');
        }
        break;

      case 'PageUp':
        if (this.ctx.open()) {
          event.preventDefault();
          this.ctx.navigate('first');
        }
        break;

      case 'PageDown':
        if (this.ctx.open()) {
          event.preventDefault();
          this.ctx.navigate('last');
        }
        break;

      case 'Enter':
        if (this.ctx.open() && this.ctx.activateActive()) {
          event.preventDefault();
        }
        break;

      case 'Escape':
        // Routed through emitEscapeKeyDown so the consumer's
        // (escapeKeyDown) output fires and can veto the close. We still
        // handle Escape inline (not via the dismissable layer) because
        // focus stays in the input — the Escape belongs to this input
        // and shouldn't bubble through nested layers before it sees it.
        if (this.ctx.open()) {
          event.preventDefault();
          this.ctx.emitEscapeKeyDown(event);
        }
        break;

      case 'Tab':
        if (this.ctx.open()) {
          this.ctx.closeMenu('tab');
        }
        // Don't preventDefault — Tab still flows to the next focusable.
        break;
    }
  }

  protected onFocus(): void {
    if (this.ctx.openOnFocus() && !this.ctx.open()) {
      this.ctx.openMenu();
    }
  }

  protected onClick(): void {
    // A click on the input while focused mirrors the focus-open intent —
    // useful when the user closed via Escape and wants to re-open without
    // typing or reaching for the keyboard.
    if (this.ctx.openOnFocus() && !this.ctx.open()) {
      this.ctx.openMenu();
    }
  }
}
