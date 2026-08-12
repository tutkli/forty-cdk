import {
  booleanAttribute,
  computed,
  Directive,
  ElementRef,
  inject,
  InjectionToken,
  input,
} from '@angular/core';

import {
  assertInputBound,
  hostButtonType,
  isUnset,
  registerHandle,
  hostId,
  resolveListNavigation,
  unsetInput,
} from 'forty-cdk/core';
import { injectListboxContext } from './listbox-context';

/**
 * Injection key the `[forListboxOptionIndicator]` uses to resolve its parent
 * option, decoupled from the concrete `ForListboxOption` class.
 * `ForListboxOption` provides itself under this token, so a design system
 * wrapping the option by subclassing re-points it at the subclass with a
 * single provider (`{ provide: FOR_LISTBOX_OPTION, useExisting: MtxListboxOption }`)
 * and the indicator keeps resolving — see `docs/wrapping-form-primitives.md`.
 */
export const FOR_LISTBOX_OPTION = new InjectionToken<ForListboxOption>('FOR_LISTBOX_OPTION');

/**
 * One option inside a `ForListbox`. Apply on a `<button type="button">` so
 * Space / Enter activation come from native button behavior — printable keys
 * fall through to the parent listbox for typeahead matching.
 *
 * Generic over the option value type `T` (default `string`). Inferred from
 * the `[value]` binding so consumers can pass either primitive ids or full
 * objects (`[value]="lang"` infers `T = Language`); the parent `[forListbox]`
 * must be parameterized over the same `T`. The parent's
 * `[compareWith]` decides how options are matched against the
 * committed selection.
 *
 * Hovering an enabled option hands it `data-highlighted`, so pointer and
 * keyboard feed one highlight and exactly one option is ever decorated. Hover
 * never moves DOM focus and never selects — the pointer's own click activates.
 */
@Directive({
  selector: '[forListboxOption]',
  exportAs: 'forListboxOption',
  providers: [{ provide: FOR_LISTBOX_OPTION, useExisting: ForListboxOption }],
  host: {
    role: 'option',
    '[attr.type]': 'buttonType()',
    '[id]': 'id()',
    '[attr.aria-selected]': 'selected() ? "true" : "false"',
    '[attr.aria-disabled]': 'effectiveDisabled() ? "true" : null',
    '[attr.aria-setsize]': 'ariaSetSize()',
    '[attr.aria-posinset]': 'ariaPosInSet()',
    '[attr.tabindex]': 'tabindex()',
    '[attr.data-state]': 'selected() ? "checked" : "unchecked"',
    '[attr.data-highlighted]': 'highlighted() ? "" : null',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
    '(click)': 'onClick()',
    '(focus)': 'onFocus()',
    '(keydown)': 'onKeyDown($event)',
    '(pointerdown)': 'onPointerDown($event)',
    '(pointermove)': 'onPointerMove()',
  },
})
export class ForListboxOption<T = string> {
  protected readonly buttonType = hostButtonType();

  readonly #group = injectListboxContext<T>('ForListboxOption');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * Stable identifier serialized into `[(value)]` and the hidden input.
   * Defaults to `string` for back-compat; bind an object to specialize the
   * parent `[forListbox]` over a richer `T`. The parent's
   * `[compareWith]` decides how options are matched against the
   * committed selection.
   *
   * Mandatory — an unbound option throws in dev mode.
   */
  readonly value = input(unsetInput<T>());
  /**
   * Whether the option can be activated. A disabled option stays rendered and announced, and is
   * skipped by arrow navigation and typeahead.
   */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Zero-based absolute position of this option in the full source data.
   * Required in the virtualized path — the listbox uses it to build the
   * position snapshot and to emit `aria-posinset` (which is `posInSet + 1`).
   * Leave unset (default `null`) outside the virtualized path.
   */
  readonly posInSet = input<number | null>(null);

  readonly id = hostId('for-listbox-option');

  readonly selected = computed(() => {
    const value = this.value();
    return isUnset(value) ? false : this.#group.isSelected(value);
  });

  /**
   * True when this option is the active candidate — the one the pointer is over,
   * else the keyboard's. In the roving-tabindex path the keyboard channel is the
   * DOM-focused option; in the virtualized activedescendant path it is
   * `aria-activedescendant`, which hover moves too, so the highlight and the
   * option `Enter` activates never disagree there. Reflected as
   * `data-highlighted` so consumers can style it uniformly with the other
   * primitives.
   */
  readonly highlighted = computed(() => {
    const activeId = this.#group.activeDescendantId();
    if (activeId !== null) {
      return activeId === this.id();
    }
    return this.#group.isOptionHighlighted(this.#host.nativeElement);
  });

  protected readonly ariaSetSize = computed<string | null>(() => {
    const total = this.#group.totalCount();
    return total === undefined ? null : String(total);
  });

  protected readonly ariaPosInSet = computed<string | null>(() => {
    if (this.#group.totalCount() === undefined) {
      return null;
    }
    const pos = this.posInSet();
    return pos === null ? null : String(pos + 1);
  });

  readonly effectiveDisabled = computed(() => this.disabled() || this.#group.effectiveDisabled());

  protected readonly tabindex = computed<-1 | 0>(() => {
    if (this.effectiveDisabled()) {
      return -1;
    }
    const rovingTabindex = this.#group.optionTabindex(this.#host.nativeElement);
    if (rovingTabindex !== null) {
      return rovingTabindex;
    }
    return this.#group.isFirstFocusableOption(this.#host.nativeElement) ? 0 : -1;
  });

  constructor() {
    assertInputBound(this.value, 'listbox', '[forListboxOption]', 'value');
    const handle = {
      host: this.#host.nativeElement,
      value: this.value,
      disabled: this.effectiveDisabled,
      id: this.id,
      posInSet: this.posInSet,
    };
    registerHandle(
      handle,
      (h) => this.#group.registerOption(h),
      (h) => this.#group.unregisterOption(h),
    );
  }

  protected onClick(): void {
    if (this.effectiveDisabled() || this.#group.readonly()) {
      return;
    }
    this.#group.activate(this.value());
    this.#group.notifyOptionClick(this.id());
  }

  protected onPointerDown(event: PointerEvent): void {
    if (this.#group.totalCount() === undefined) {
      return;
    }
    event.preventDefault();
  }

  protected onFocus(): void {
    if (this.effectiveDisabled()) {
      return;
    }
    this.#group.setActiveOption(this.#host.nativeElement);
  }

  protected onPointerMove(): void {
    if (this.effectiveDisabled()) {
      return;
    }
    this.#group.highlightFromPointer(this.#host.nativeElement, this.id());
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
      pageKeys: true,
    });
    if (action) {
      event.preventDefault();
      this.#group.navigate(this.#host.nativeElement, action);
      return;
    }
    this.#group.handleTypeahead(event);
  }
}
