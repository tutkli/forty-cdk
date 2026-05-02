import {
  DestroyRef,
  effect,
  ElementRef,
  inject,
  type Signal,
} from '@angular/core';

export interface HiddenInputConfig {
  /**
   * Form name. While empty, no hidden inputs are mounted — set a non-empty
   * `name` (typically via `[name]` on the host primitive) to opt in.
   */
  name: Signal<string>;

  /**
   * Reactive list of values to mirror. Each entry becomes a separate
   * `<input type="hidden" name="…" value="…">`. Use:
   * - `['on']` (checked) / `[]` (unchecked) for boolean controls.
   * - `[value]` (selected) / `[]` (none) for single-value controls.
   * - the array as-is for multi-value controls.
   */
  values: Signal<readonly string[]>;

  /**
   * Optional disabled mirror. Disabled hidden inputs are skipped by native
   * form serialization, matching the behavior of disabled visible controls.
   */
  disabled?: Signal<boolean>;
}

/**
 * Mirrors a headless form control's value into native
 * `<input type="hidden">` siblings so the surrounding `<form>` picks it up
 * during native submission. Multiple values produce multiple inputs (used
 * by multi-select primitives like the listbox).
 *
 * Inputs are inserted right after the directive's host element so they
 * live inside whatever `<form>` the host lives in. Lifecycle is wired to
 * `DestroyRef`: the inputs are removed when the directive is destroyed.
 */
export function injectHiddenInput(config: HiddenInputConfig): void {
  const host = inject<ElementRef<HTMLElement>>(ElementRef);
  const inputs: HTMLInputElement[] = [];

  effect(() => {
    const name = config.name();
    const values = name ? config.values() : [];
    const disabled = config.disabled?.() ?? false;

    while (inputs.length > values.length) {
      inputs.pop()?.remove();
    }
    while (inputs.length < values.length) {
      const input = document.createElement('input');
      input.type = 'hidden';
      const anchor = inputs.length === 0 ? host.nativeElement : inputs[inputs.length - 1]!;
      anchor.insertAdjacentElement('afterend', input);
      inputs.push(input);
    }

    for (let i = 0; i < values.length; i++) {
      const input = inputs[i]!;
      if (input.name !== name) {
        input.name = name;
      }
      const next = values[i] ?? '';
      if (input.value !== next) {
        input.value = next;
      }
      input.toggleAttribute('disabled', disabled);
    }
  });

  inject(DestroyRef).onDestroy(() => {
    for (const input of inputs) {
      input.remove();
    }
    inputs.length = 0;
  });
}
