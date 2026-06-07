import { booleanAttribute, computed, Directive, inject, input, model } from '@angular/core';

import { Collection } from '../_internal/collection/collection';
import { firstEnabledHost } from '../_internal/collection/first-enabled-host';
import {
  type ListNavigationAction,
  moveIndex,
  type WritingDirection,
} from '../_internal/keyboard-navigation/keyboard-navigation';
import { reconcileRovingActive } from '../_internal/roving-tabindex/reconcile-roving-active';
import { RovingTabindex } from '../_internal/roving-tabindex/roving-tabindex';
import { injectTextDirection } from '../_internal/text-direction/text-direction';
import {
  FOR_TABS_CONTEXT,
  type ForTabsContentHandle,
  type ForTabsContext,
  type ForTabsTriggerHandle,
  type TabsActivationMode,
} from './tabs-context';
import { FOR_TABS_DEFAULTS } from './tabs-defaults';

/**
 * Root of the Tabs primitive. Owns the selected value, activation mode,
 * orientation, and disabled state. Provides the shared context to descendant
 * `ForTabsList` / `ForTabsTrigger` / `ForTabsContent` directives.
 *
 * Implements the [WAI-ARIA Tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/).
 *
 * `activationMode='automatic'` (default): arrow nav moves focus AND selects
 * the new tab. Use when panel content is cheap to render.
 * `activationMode='manual'`: arrow nav only moves focus; the user must press
 * Space / Enter to activate. Use when panel content is expensive.
 */
@Directive({
  selector: '[forTabs]',
  exportAs: 'forTabs',
  host: {
    '[attr.data-orientation]': 'orientation()',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '[attr.dir]': 'dir()',
  },
  providers: [{ provide: FOR_TABS_CONTEXT, useExisting: ForTabs }],
})
export class ForTabs implements ForTabsContext {
  readonly #defaults = inject(FOR_TABS_DEFAULTS);

  /**
   * Two-way bindable. The selected tab's value, or `null` when nothing is
   * selected. `null` is the canonical unset state — distinct from a tab whose
   * `value` is the empty string `''`, which is a legal, selectable value. The
   * `model()` change emitter (`(valueChange)`) fires only on internal
   * selection changes (trigger click or automatic-mode arrow nav), never on
   * consumer writes via `[(value)]` — observe transitions without binding back.
   */
  readonly value = model<string | null>(null);

  readonly activationMode = input<TabsActivationMode>(this.#defaults.activationMode);
  readonly orientation = input<'horizontal' | 'vertical'>('horizontal');

  /**
   * Writing direction. When unset (default `null`), the inherited ambient
   * direction is resolved from the nearest ancestor carrying a `dir` attribute
   * (or `<html dir>`), defaulting to `'ltr'`. An explicit `[dir]` always wins.
   * The resolved value is reflected to the host `dir` attribute and swaps
   * ArrowLeft / ArrowRight semantics in RTL.
   */
  readonly _dirInput = input<WritingDirection | null>(null, { alias: 'dir' });
  readonly dir = injectTextDirection(this._dirInput);
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Whether arrow navigation wraps around past the first / last enabled
   * trigger. Default `true` — matches the WAI-ARIA Tabs APG. Set to `false`
   * for a non-wrapping tablist. The default is read from
   * `provideForTabsDefaults` for the surrounding scope.
   */
  readonly loop = input(this.#defaults.loop, { transform: booleanAttribute });

  readonly roving = new RovingTabindex();

  readonly #triggers = new Collection<ForTabsTriggerHandle>();
  readonly #contents = new Collection<ForTabsContentHandle>();

  readonly #firstEnabledTriggerHost = computed(() =>
    firstEnabledHost(this.#triggers.items()),
  );

  constructor() {
    reconcileRovingActive(this.roving, this.#triggers.items);
  }

  isSelected(v: string): boolean {
    return this.value() === v;
  }

  select(v: string): void {
    if (this.disabled()) {
      return;
    }
    this.value.set(v);
  }

  navigate(currentTrigger: HTMLElement, action: ListNavigationAction): void {
    if (this.disabled()) {
      return;
    }
    const triggers = this.#triggers.items();
    if (triggers.length === 0) {
      return;
    }
    const currentIndex = triggers.findIndex((t) => t.host === currentTrigger);
    const next = moveIndex(currentIndex < 0 ? 0 : currentIndex, triggers.length, action, {
      loop: this.loop(),
      isDisabled: (i) => triggers[i]!.disabled(),
    });
    if (next === null) {
      return;
    }
    const target = triggers[next];
    if (!target) {
      return;
    }
    target.host.focus();
    if (this.activationMode() === 'automatic') {
      this.value.set(target.value());
    }
  }

  registerTrigger(handle: ForTabsTriggerHandle): void {
    this.#triggers.register(handle);
  }

  unregisterTrigger(handle: ForTabsTriggerHandle): void {
    this.#triggers.unregister(handle);
    this.roving.unregister(handle.host);
  }

  registerContent(handle: ForTabsContentHandle): void {
    this.#contents.register(handle);
  }

  unregisterContent(handle: ForTabsContentHandle): void {
    this.#contents.unregister(handle);
  }

  triggerIdFor(value: string): string | null {
    for (const t of this.#triggers.items()) {
      if (t.value() === value) {
        return t.id();
      }
    }
    return null;
  }

  contentIdFor(value: string): string | null {
    for (const c of this.#contents.items()) {
      if (c.value() === value) {
        return c.id();
      }
    }
    return null;
  }

  isFirstEnabledTrigger(el: HTMLElement): boolean {
    return this.#firstEnabledTriggerHost() === el;
  }

  hasSelectedTrigger(): boolean {
    const value = this.value();
    if (value === null) {
      return false;
    }
    return this.#triggers.items().some((t) => !t.disabled() && t.value() === value);
  }
}
