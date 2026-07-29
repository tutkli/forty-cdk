import {
  booleanAttribute,
  computed,
  Directive,
  inject,
  input,
  model,
  type Provider,
  type Type,
} from '@angular/core';

import {
  Collection,
  firstEnabledHost,
  type ListNavigationAction,
  rovingListTarget,
  type WritingDirection,
  RovingTabindex,
  injectTextDirection,
} from 'forty-cdk/core';
import {
  FOR_TABS_CONTEXT,
  type ForTabsContentHandle,
  type ForTabsContext,
  type ForTabsTriggerHandle,
  TABS_CONTEXT,
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
  providers: provideForTabs(ForTabs),
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

  readonly roving = new RovingTabindex(() => this.#triggers.items());

  readonly #triggers = new Collection<ForTabsTriggerHandle>();
  readonly #contents = new Collection<ForTabsContentHandle>();

  readonly #firstEnabledTriggerHost = computed(() => firstEnabledHost(this.#triggers.items()));

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
    const target = rovingListTarget(triggers, currentTrigger, action, { loop: this.loop() });
    if (!target) {
      return;
    }
    target.host.focus();
    if (this.activationMode() === 'automatic' && !target.disabled()) {
      this.value.set(target.value());
    }
  }

  private registerTrigger(handle: ForTabsTriggerHandle): void {
    this.#triggers.register(handle);
  }

  private unregisterTrigger(handle: ForTabsTriggerHandle): void {
    this.#triggers.unregister(handle);
    this.roving.unregister(handle.host);
  }

  private registerContent(handle: ForTabsContentHandle): void {
    this.#contents.register(handle);
  }

  private unregisterContent(handle: ForTabsContentHandle): void {
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

/**
 * The providers a `[forTabs]` root installs: the public
 * {@link FOR_TABS_CONTEXT}, aliased to `root`, plus the internal coordination
 * token the tabs pieces resolve.
 *
 * `ForTabs` declares its own providers through this helper, so a wrapper that
 * **subclasses** the root has a single call to keep in step with it. That
 * matters because Angular does not inherit a directive's `providers`: a subclass
 * carrying its own `@Directive` metadata replaces the array wholesale, so
 * re-providing `FOR_TABS_CONTEXT` alone leaves the internal token absent and
 * every piece orphans with the "must be used inside a [forTabs] element" error.
 * That token is deliberately unnameable outside the library
 * ([#1399](https://github.com/tutkli/forty-cdk/issues/1399)), which is why the
 * wrapper cannot list it by hand.
 *
 * ```ts
 * providers: provideForTabs(MyTabs),
 * ```
 *
 * Wrapping through `hostDirectives: [ForTabs]` needs none of this — a host
 * directive brings its own providers to the element.
 */
export function provideForTabs(root: Type<ForTabs>): Provider[] {
  return [
    { provide: FOR_TABS_CONTEXT, useExisting: root },
    { provide: TABS_CONTEXT, useExisting: root },
  ];
}
