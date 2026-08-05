import { inject, InjectionToken, type Signal } from '@angular/core';

import {
  assertRootContext,
  type ListNavigationAction,
  type WritingDirection,
  type RovingTabindex,
} from 'forty-cdk/core';

export type TabsActivationMode = 'automatic' | 'manual';

/**
 * Registry entry for one `ForTabsTrigger`. Part of the registration protocol,
 * so it is never exported from `public-api.ts` — see {@link TabsContext}.
 */
export interface ForTabsTriggerHandle {
  readonly host: HTMLElement;
  readonly id: Signal<string>;
  readonly value: Signal<string>;
  readonly disabled: Signal<boolean>;
}

/**
 * Registry entry for one `ForTabsContent`. Part of the registration protocol,
 * so it is never exported from `public-api.ts` — see {@link TabsContext}.
 */
export interface ForTabsContentHandle {
  readonly host: HTMLElement;
  readonly id: Signal<string>;
  readonly value: Signal<string>;
}

/**
 * Coordination contract owned by `ForTabs`. Triggers and contents register
 * with the root so each side can look up its pair (for `aria-controls` and
 * `aria-labelledby` wiring), and the root drives keyboard navigation.
 */
export interface ForTabsContext {
  readonly value: Signal<string | null>;
  readonly disabled: Signal<boolean>;
  readonly orientation: Signal<'horizontal' | 'vertical'>;
  readonly dir: Signal<WritingDirection>;
  readonly activationMode: Signal<TabsActivationMode>;
  readonly roving: RovingTabindex;

  isSelected(value: string): boolean;
  /** Selects `value` if the tabs widget is interactive. */
  select(value: string): void;
  /** Moves focus from `currentTrigger`. In automatic mode also selects the new tab. */
  navigate(currentTrigger: HTMLElement, action: ListNavigationAction): void;

  /**
   * Looks up the trigger id for a given tab value. Reactive.
   *
   * Triggers and contents register synchronously in their constructors, so the
   * pairing resolves during the first change-detection pass — including a real
   * server render, where `afterNextRender` never fires and a deferred
   * registration would leave the pre-hydration DOM without its
   * `aria-labelledby` / `aria-controls` linkage. A handle whose `value` binding
   * has not been written yet reads the `unsetInput` sentinel and is skipped —
   * it can never pair with a lookup value — and the tracked dependency re-runs
   * the lookup once that binding lands.
   */
  triggerIdFor(value: string): string | null;
  /**
   * Looks up the content id for a given tab value. Reactive. Same
   * synchronous-registration and not-yet-bound handling as
   * {@link triggerIdFor}.
   */
  contentIdFor(value: string): string | null;
  /** True when `el` is the first enabled trigger in registration order. */
  isFirstEnabledTrigger(el: HTMLElement): boolean;
  /**
   * True when some registered, enabled trigger matches the current `value`.
   * Distinguishes "another trigger owns the tab stop" from "the selected
   * value points at a removed / disabled trigger" so the per-trigger
   * tabindex fallback can re-engage the first-enabled entry point instead of
   * stranding the tablist. Reactive.
   */
  hasSelectedTrigger(): boolean;
}

/**
 * DI token for the tabs widget's coordination surface, provided by `[forTabs]`.
 *
 * Publicly typed as the read surface {@link ForTabsContext}, which is the whole of what the
 * token promises a consumer. The pieces read the same token at an internal type that adds
 * the trigger / content registration protocol, so a wrapper re-providing it must alias it to
 * the root: `{ provide: FOR_TABS_CONTEXT, useExisting: MyTabs }`, where `MyTabs` extends
 * `ForTabs`. A value that merely satisfies the declared type resolves too, and is rejected
 * in dev mode by the first piece to reach the protocol.
 */
export const FOR_TABS_CONTEXT = new InjectionToken<ForTabsContext>('FOR_TABS_CONTEXT');

/**
 * The tabs widget's internal coordination surface: everything
 * {@link ForTabsContext} publishes plus the trigger / content registration
 * protocol the id pairing and keyboard navigation are driven from.
 *
 * Never exported from `public-api.ts`. It is the type the pieces read
 * {@link FOR_TABS_CONTEXT} at, so a consumer who injects that token gets the
 * read surface while the pieces get the wiring protocol. `ForTabs` declares the
 * protocol members TS-`private`, which keeps them out of the emitted `.d.ts`
 * while `useExisting` still satisfies this contract at runtime.
 */
export interface TabsContext extends ForTabsContext {
  registerTrigger(handle: ForTabsTriggerHandle): void;
  unregisterTrigger(handle: ForTabsTriggerHandle): void;
  registerContent(handle: ForTabsContentHandle): void;
  unregisterContent(handle: ForTabsContentHandle): void;
}

export function injectTabsContext(piece: string): TabsContext {
  const ctx = inject(FOR_TABS_CONTEXT, { optional: true }) as TabsContext | null;
  if (!ctx) {
    throw new Error(`[forty-cdk/tabs] ${piece} must be used inside a [forTabs] element.`);
  }
  assertRootContext({
    entryPoint: 'tabs',
    token: 'FOR_TABS_CONTEXT',
    root: '[forTabs]',
    piece,
    probe: () => ctx.registerTrigger,
  });
  return ctx;
}
