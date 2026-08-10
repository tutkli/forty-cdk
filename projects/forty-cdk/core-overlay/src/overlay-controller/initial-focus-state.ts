import { type Signal, signal } from '@angular/core';

/**
 * Tracks where an overlay's initial focus should land on the next open and
 * whether that one programmatic move should reflect `data-highlighted` on the
 * focused item.
 *
 * `target` is set by triggers before they flip the overlay open (ArrowDown →
 * `'first'`, ArrowUp → `'last'`, or a primitive-specific `'selected'`).
 * `highlightOnNextFocus` is armed per open via {@link prepareOpen}: a keyboard
 * activation highlights the focused item per the APG menu-button pattern; a
 * pointer activation (click, hover-after-open) suppresses the highlight so a
 * mouse-opened surface doesn't read as "preselected". {@link consumeHighlight}
 * reads the flag once and re-arms it to `true`, so the suppression applies only
 * to the single initial-focus move that follows an open.
 *
 * Generic over the focus-target union so every overlay controller reuses the
 * same one-shot protocol: `MenuOverlay` / `[forMenubar]`'s multiplexed menu
 * context keep `'first' | 'last'` (the default), while the listbox overlays and
 * combobox widen it with `'selected'`. Plain class (no `inject()`) so each
 * controller composes the same implementation instead of hand-copying it.
 *
 * @typeParam Focus Initial-focus target union. Defaults to `'first' | 'last'`.
 */
export class InitialFocusState<Focus = 'first' | 'last'> {
  readonly #target: ReturnType<typeof signal<Focus>>;
  #highlightOnNextFocus = true;

  /** Where focus should land when the overlay mounts. */
  readonly target: Signal<Focus>;

  /**
   * @param defaultTarget Initial focus target before any open. Defaults to
   *   `'first'`, valid for the default `'first' | 'last'` union.
   */
  constructor(defaultTarget: Focus = 'first' as Focus) {
    this.#target = signal<Focus>(defaultTarget);
    this.target = this.#target.asReadonly();
  }

  setTarget(target: Focus): void {
    this.#target.set(target);
  }

  /**
   * Arms the state for the next open: records the initial-focus target and
   * whether the upcoming initial-focus move should highlight the focused item
   * (`true` for keyboard activation, `false` for pointer activation).
   */
  prepareOpen(target: Focus, highlight: boolean): void {
    this.#target.set(target);
    this.#highlightOnNextFocus = highlight;
  }

  /**
   * Returns whether the next initial-focus move should highlight, then re-arms
   * the flag to `true` so the suppression is one-shot.
   */
  consumeHighlight(): boolean {
    const highlight = this.#highlightOnNextFocus;
    this.#highlightOnNextFocus = true;
    return highlight;
  }
}
