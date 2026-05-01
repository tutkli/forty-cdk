import {
  booleanAttribute,
  computed,
  Directive,
  input,
  model,
  Signal,
  signal,
} from '@angular/core';

import {
  type ListNavigationAction,
  moveIndex,
  type WritingDirection,
} from '../_internal/keyboard-navigation';
import { injectRovingTabindex } from '../_internal/roving-tabindex';
import {
  FOR_TABS_CONTEXT,
  ForTabsContentHandle,
  ForTabsContext,
  ForTabsTriggerHandle,
  TabsActivationMode,
} from './tabs-context';

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
  },
  providers: [{ provide: FOR_TABS_CONTEXT, useExisting: ForTabs }],
})
export class ForTabs implements ForTabsContext {
  /** Two-way bindable. The selected tab's value. */
  readonly value = model<string>('');

  readonly activationMode = input<TabsActivationMode>('automatic');
  readonly orientation = input<'horizontal' | 'vertical'>('horizontal');
  readonly dir = input<WritingDirection>('ltr');
  readonly disabled = input(false, { transform: booleanAttribute });

  readonly roving = injectRovingTabindex();

  readonly #triggers = signal<readonly ForTabsTriggerHandle[]>([]);
  readonly #contents = signal<readonly ForTabsContentHandle[]>([]);

  readonly #firstEnabledTriggerHost = computed<HTMLElement | null>(() => {
    for (const t of this.#triggers()) {
      if (!t.disabled()) {
        return t.host;
      }
    }
    return null;
  });

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
    const triggers = this.#triggers();
    if (triggers.length === 0) {
      return;
    }
    const currentIndex = triggers.findIndex((t) => t.host === currentTrigger);
    const next = moveIndex(currentIndex < 0 ? 0 : currentIndex, triggers.length, action, {
      loop: true,
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
    this.#triggers.update((arr) => [...arr, handle]);
  }

  unregisterTrigger(handle: ForTabsTriggerHandle): void {
    this.#triggers.update((arr) => arr.filter((h) => h !== handle));
  }

  registerContent(handle: ForTabsContentHandle): void {
    this.#contents.update((arr) => [...arr, handle]);
  }

  unregisterContent(handle: ForTabsContentHandle): void {
    this.#contents.update((arr) => arr.filter((h) => h !== handle));
  }

  triggerIdFor(value: string): string | null {
    for (const t of this.#triggers()) {
      if (readSignalSafe(t.value) === value) {
        return t.id();
      }
    }
    return null;
  }

  contentIdFor(value: string): string | null {
    for (const c of this.#contents()) {
      if (readSignalSafe(c.value) === value) {
        return c.id();
      }
    }
    return null;
  }

  isFirstEnabledTrigger(el: HTMLElement): boolean {
    return this.#firstEnabledTriggerHost() === el;
  }
}

/**
 * Read a signal that may be a not-yet-bound `input.required`. Returns null
 * during the brief window between handle registration (in a child's
 * constructor) and that child's input-binding step within the same CD pass.
 */
function readSignalSafe(s: Signal<string>): string | null {
  try {
    return s();
  } catch {
    return null;
  }
}
