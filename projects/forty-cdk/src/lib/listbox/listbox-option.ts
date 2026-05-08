import {
  booleanAttribute,
  computed,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  input,
  signal,
} from '@angular/core';

import { IdGenerator } from '../_internal/id-generator/id-generator';
import { resolveListNavigation } from '../_internal/keyboard-navigation/keyboard-navigation';
import { injectListboxContext } from './listbox-context';

/**
 * One option inside a `ForListbox`. Apply on a `<button type="button">` so
 * Space / Enter activation come from native button behavior — printable keys
 * fall through to the parent listbox for typeahead matching.
 */
@Directive({
  selector: '[forListboxOption]',
  exportAs: 'forListboxOption',
  host: {
    role: 'option',
    type: 'button',
    '[id]': 'id()',
    '[attr.aria-selected]': 'selected() ? "true" : "false"',
    '[attr.aria-disabled]': 'effectiveDisabled() ? "true" : null',
    '[attr.disabled]': 'effectiveDisabled() ? "" : null',
    '[attr.tabindex]': 'tabindex()',
    '[attr.data-state]': 'selected() ? "checked" : "unchecked"',
    '[attr.data-highlighted]': 'highlighted() ? "" : null',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
    '(click)': 'onClick()',
    '(focus)': 'onFocus()',
    '(keydown)': 'onKeyDown($event)',
  },
})
export class ForListboxOption {
  readonly #group = injectListboxContext('ForListboxOption');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #idGen = inject(IdGenerator);

  readonly value = input.required<string>();
  readonly disabled = input(false, { transform: booleanAttribute });

  readonly id = signal(this.#idGen.next('for-listbox-option'));

  readonly selected = computed(() => this.#group.isSelected(this.value()));

  /**
   * True when this option is the keyboard-focused candidate (the
   * roving-tabindex active item). Reflected as `data-highlighted` so
   * consumers can style it uniformly with the other primitives.
   */
  readonly highlighted = computed(() => this.#group.roving.active() === this.#host.nativeElement);

  readonly effectiveDisabled = computed(() => this.disabled() || this.#group.disabled());

  protected readonly tabindex = computed<-1 | 0>(() => {
    if (this.effectiveDisabled()) {
      return -1;
    }
    if (this.#group.roving.active() !== null) {
      return this.#group.roving.tabindexFor(this.#host.nativeElement);
    }
    if (this.selected()) {
      return 0;
    }
    if (this.#group.value().length > 0) {
      return -1;
    }
    return this.#group.isFirstEnabledOption(this.#host.nativeElement) ? 0 : -1;
  });

  constructor() {
    const handle = {
      host: this.#host.nativeElement,
      value: this.value,
      disabled: this.effectiveDisabled,
    };
    this.#group.registerOption(handle);
    inject(DestroyRef).onDestroy(() => this.#group.unregisterOption(handle));
  }

  protected onClick(): void {
    if (this.effectiveDisabled() || this.#group.readonly()) {
      return;
    }
    this.#group.activate(this.value());
  }

  protected onFocus(): void {
    if (this.effectiveDisabled()) {
      return;
    }
    this.#group.roving.setActive(this.#host.nativeElement);
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (this.effectiveDisabled()) {
      return;
    }

    // APG-recommended multi-select range modifiers. Single-mode falls through
    // to plain navigation so Shift+Arrow / Ctrl+A behave like their unmodified
    // counterparts (or no-op).
    if (this.#group.multiple()) {
      // Ctrl/Cmd+A — select all enabled (toggle if all already selected).
      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey) {
        if (event.key === 'a' || event.key === 'A') {
          event.preventDefault();
          this.#group.selectAll();
          return;
        }
      }

      // Ctrl+Shift+Home / Ctrl+Shift+End — extend selection to first/last.
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && !event.altKey) {
        if (event.key === 'Home') {
          event.preventDefault();
          this.#group.selectFromCurrentToEdge(this.#host.nativeElement, 'first');
          return;
        }
        if (event.key === 'End') {
          event.preventDefault();
          this.#group.selectFromCurrentToEdge(this.#host.nativeElement, 'last');
          return;
        }
      }

      // Shift+Space — contiguous range from anchor to current.
      if (event.shiftKey && event.key === ' ') {
        event.preventDefault();
        this.#group.selectRangeToFocused(this.#host.nativeElement);
        return;
      }

      // Shift+Arrow — move focus AND toggle the destination option.
      if (event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const action = resolveListNavigation(event, {
          orientation: this.#group.orientation(),
          dir: this.#group.dir(),
        });
        if (action === 'next' || action === 'prev') {
          event.preventDefault();
          this.#group.extendByArrow(this.#host.nativeElement, action);
          return;
        }
      }
    }

    const action = resolveListNavigation(event, {
      orientation: this.#group.orientation(),
      dir: this.#group.dir(),
    });
    if (action) {
      event.preventDefault();
      this.#group.navigate(this.#host.nativeElement, action);
      return;
    }
    this.#group.handleTypeahead(event);
  }
}
