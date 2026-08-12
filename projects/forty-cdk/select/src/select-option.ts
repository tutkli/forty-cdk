import {
  booleanAttribute,
  computed,
  Directive,
  ElementRef,
  inject,
  InjectionToken,
  input,
  signal,
} from '@angular/core';

import {
  assertInputBound,
  hostButtonType,
  accessibleTextContent,
  isUnset,
  registerHandle,
  hostId,
  resolveListNavigation,
  unsetInput,
} from 'forty-cdk/core';
import { injectSelectContext } from './select-context';

/**
 * Injection key the `[forSelectIndicator]` uses to resolve its parent option,
 * decoupled from the concrete `ForSelectOption` class. `ForSelectOption`
 * provides itself under this token, so a design system wrapping the option by
 * subclassing re-points it at the subclass with a single provider
 * (`{ provide: FOR_SELECT_OPTION, useExisting: MtxSelectOption }`) and the
 * indicator keeps resolving — see `docs/wrapping-form-primitives.md`.
 */
export const FOR_SELECT_OPTION = new InjectionToken<ForSelectOption>('FOR_SELECT_OPTION');

/**
 * One option inside a `[forSelectContent]`. Apply on a `<button type="button">`
 * so Space / Enter activation come from native button behavior — printable
 * keys fall through to the listbox for typeahead matching.
 *
 * Generic over the option value type `T` (default `string`). Inferred from
 * the `[value]` binding so consumers can pass either primitive ids or full
 * objects (`[value]="city"` infers `T = City`); the parent `[forSelect]`
 * must be parameterized over the same `T`. The parent's
 * `[compareWith]` decides how options are matched against the
 * committed selection.
 *
 * Click activates: in single mode the value replaces `[(value)]` and the
 * listbox closes; in multi mode the value toggles in/out and the listbox
 * stays open.
 *
 * Hovering an enabled option hands it `data-highlighted`, so pointer and
 * keyboard feed one highlight and exactly one option is ever decorated. Hover
 * never moves DOM focus and never selects — the pointer's own click activates.
 *
 * Keyboard while focused:
 * - **Enter / Space** — activate (via native button click).
 * - **ArrowDown / ArrowUp / Home / End** — move focus inside the listbox.
 * - **Shift+Arrow / Shift+Space / Ctrl+A / Ctrl+Shift+Home / Ctrl+Shift+End**
 *   _(multi mode, non-virtualized)_ — APG range selection, matching
 *   `ForListbox`.
 * - **Tab / Shift+Tab** — commit the focused option (single mode) and let
 *   the browser advance focus to the next / previous focusable, mirroring
 *   the WAI-ARIA select-only combobox pattern and native `<select>`.
 * - **Escape** — close the listbox.
 * - **Typeahead** — printable keys match by text content.
 */
@Directive({
  selector: '[forSelectOption]',
  exportAs: 'forSelectOption',
  providers: [{ provide: FOR_SELECT_OPTION, useExisting: ForSelectOption }],
  host: {
    role: 'option',
    '[attr.type]': 'buttonType()',
    tabindex: '-1',
    '[id]': 'id()',
    '[attr.aria-selected]': 'selected() ? "true" : "false"',
    '[attr.aria-disabled]': 'effectiveDisabled() ? "true" : null',
    '[attr.data-state]': 'selected() ? "checked" : "unchecked"',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
    '[attr.aria-setsize]': 'ariaSetSize()',
    '[attr.aria-posinset]': 'ariaPosInSet()',
    '[attr.data-highlighted]': 'highlighted() ? "" : null',
    '(click)': 'onClick()',
    '(keydown)': 'onKeyDown($event)',
    '(focus)': 'onFocus()',
    '(blur)': 'onBlur()',
    '(pointerdown)': 'onPointerDown($event)',
    '(pointermove)': 'onPointerMove()',
  },
})
export class ForSelectOption<T = string> {
  protected readonly buttonType = hostButtonType();

  readonly #ctx = injectSelectContext<T>('ForSelectOption');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * Stable identifier serialized into `[(value)]` and the hidden input.
   * Defaults to `string` for back-compat; bind an object to specialize the
   * parent `[forSelect]` over a richer `T`. The parent's
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
   * Required in the virtualized path — drives `aria-posinset` and the parent's
   * position snapshot. Leave unset (default `null`) outside it.
   */
  readonly posInSet = input<number | null>(null);

  readonly id = hostId('for-select-option');

  readonly selected = computed(() => {
    const value = this.value();
    return isUnset(value) ? false : this.#ctx.isSelected(value);
  });
  readonly effectiveDisabled = computed(() => this.disabled() || this.#ctx.effectiveDisabled());

  protected readonly ariaSetSize = computed<string | null>(() => {
    const total = this.#ctx.totalCount();
    return total === undefined ? null : String(total);
  });
  protected readonly ariaPosInSet = computed<string | null>(() => {
    if (this.#ctx.totalCount() === undefined) {
      return null;
    }
    const pos = this.posInSet();
    return pos === null ? null : String(pos + 1);
  });

  readonly #focused = signal(false);
  /**
   * True when this option is the active candidate — the one the pointer is over,
   * else the keyboard's. In the default path the keyboard channel is the
   * DOM-focused option; in the virtualized path it is `aria-activedescendant`,
   * which hover moves too, so the highlight and the option `Enter` activates
   * never disagree there. Reflected as `data-highlighted`.
   */
  readonly highlighted = computed(() => {
    const activeId = this.#ctx.activeDescendantId();
    if (activeId !== null) {
      return activeId === this.id();
    }
    const pointed = this.#ctx.pointerHighlightedOption();
    if (pointed !== null) {
      return pointed === this.#host.nativeElement;
    }
    return this.#focused();
  });

  /**
   * Reactive effective label exposed on the handle — the trimmed `textContent`
   * of the host. Mirrors `ForComboboxOption`'s `#effectiveLabel` so the root
   * can fold a per-option `Signal<string>` into its persisted snapshot instead
   * of reading `textContent` from inside a `computed`. `textContent` is not a
   * signal, so this still does not self-heal on a text-only change with no
   * value change — supply `[forSelect][itemToLabel]` for a pure signal
   * derivation when the label can change without the value.
   */
  readonly #effectiveLabel = computed(() => accessibleTextContent(this.#host.nativeElement).trim());

  constructor() {
    assertInputBound(this.value, 'select', '[forSelectOption]', 'value');
    const handle = {
      host: this.#host.nativeElement,
      value: this.value,
      label: this.#effectiveLabel,
      disabled: this.effectiveDisabled,
      id: this.id,
      posInSet: this.posInSet,
    };
    registerHandle(
      handle,
      (h) => this.#ctx.overlay.registerOption(h),
      (h) => this.#ctx.overlay.unregisterOption(h),
    );
  }

  protected onClick(): void {
    if (this.effectiveDisabled() || this.#ctx.readonly()) {
      return;
    }
    this.#ctx.activate(this.value());
    this.#ctx.notifyOptionClick(this.id());
  }

  protected onFocus(): void {
    this.#focused.set(true);
    this.#ctx.notifyOptionFocus();
  }

  protected onBlur(): void {
    this.#focused.set(false);
  }

  protected onPointerMove(): void {
    if (this.effectiveDisabled()) {
      return;
    }
    this.#ctx.highlightFromPointer(this.#host.nativeElement, this.id());
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (this.effectiveDisabled()) {
      return;
    }

    if (event.key === 'Tab') {
      // In modal mode the focus trap owns Tab (it cycles focus inside the
      // surface in the capture phase); committing + closing here would defeat
      // the trap. Bail and let the trap's `preventDefault` keep focus inside.
      if (this.#ctx.modal()) {
        return;
      }
      // APG (combobox-select-only): Tab commits the focused option and lets
      // the browser advance focus to the next / previous focusable. Do NOT
      // preventDefault — the browser's Tab default uses the focus we just
      // moved to the trigger as the starting point.
      this.#ctx.commitOnTab(this.value());
      return;
    }

    if (this.#ctx.multiple()) {
      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey) {
        if (event.key === 'a' || event.key === 'A') {
          event.preventDefault();
          this.#ctx.selectAll();
          return;
        }
      }

      if ((event.ctrlKey || event.metaKey) && event.shiftKey && !event.altKey) {
        if (event.key === 'Home') {
          event.preventDefault();
          this.#ctx.selectFromCurrentToEdge(this.#host.nativeElement, 'first');
          return;
        }
        if (event.key === 'End') {
          event.preventDefault();
          this.#ctx.selectFromCurrentToEdge(this.#host.nativeElement, 'last');
          return;
        }
      }

      if (event.shiftKey && event.key === ' ') {
        event.preventDefault();
        this.#ctx.selectRangeToFocused(this.#host.nativeElement);
        return;
      }

      if (event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const rangeAction = resolveListNavigation(event, {
          orientation: this.#ctx.orientation(),
          dir: this.#ctx.dir(),
        });
        if (rangeAction === 'next' || rangeAction === 'prev') {
          event.preventDefault();
          this.#ctx.extendByArrow(this.#host.nativeElement, rangeAction);
          return;
        }
      }
    }

    const action = resolveListNavigation(event, {
      orientation: this.#ctx.orientation(),
      dir: this.#ctx.dir(),
      pageKeys: true,
    });
    if (action) {
      event.preventDefault();
      this.#ctx.overlay.navigate(this.#host.nativeElement, action);
      return;
    }

    this.#ctx.handleTypeahead(event);
  }

  protected onPointerDown(event: PointerEvent): void {
    if (this.#ctx.totalCount() === undefined) {
      return;
    }
    event.preventDefault();
  }
}
