import { inject, InjectionToken, type Signal } from '@angular/core';

import {
  assertRootContext,
  type ListNavigationAction,
  orphanContextError,
  type WritingDirection,
} from 'forty-cdk/core';

/**
 * Lightweight handle each `ForRadio` registers with the group on init so the
 * group can react to changes in any radio's `disabled` (the `firstEnabledHost`
 * computation depends on every registered handle's disabled signal).
 *
 * Part of the registration protocol, so it is never exported from
 * `public-api.ts` — see {@link RadioGroupContext}.
 */
export interface ForRadioHandle {
  readonly host: HTMLElement;
  readonly value: Signal<string>;
  readonly disabled: Signal<boolean>;
}

/**
 * Coordination contract owned by `ForRadioGroup`. Each `ForRadio` reads its
 * checked / disabled / tabindex state from this and routes click + keyboard
 * activation through `select` / `navigate`.
 */
export interface ForRadioGroupContext {
  readonly value: Signal<string | null>;
  /**
   * The group's effective disabled — its own `disabled` input OR'd with a
   * surrounding disabled `[forFieldset]`. Each `ForRadio` ORs this into its own
   * `effectiveDisabled`, so a disabled group (or fieldset) disables every radio.
   */
  readonly effectiveDisabled: Signal<boolean>;
  readonly readonly: Signal<boolean>;
  readonly orientation: Signal<'horizontal' | 'vertical'>;
  readonly dir: Signal<WritingDirection>;

  /** True when some registered, enabled radio's value matches the group's current value. */
  readonly hasSelectedRadio: Signal<boolean>;

  isSelected(value: string): boolean;
  /** Selects `value` if the group is interactive. */
  select(value: string): void;
  /** Moves focus + selection from `currentRadio` according to `action`. */
  navigate(currentRadio: HTMLElement, action: ListNavigationAction): void;
  /** True when `el` is the first enabled radio in registration order. */
  isFirstEnabledRadio(el: HTMLElement): boolean;
}

/**
 * DI token for the group's coordination surface, provided by `[forRadioGroup]`.
 *
 * Publicly typed as the read surface {@link ForRadioGroupContext}, which is the whole of
 * what the token promises a consumer. Each `[forRadio]` reads the same token at an internal
 * type that adds the radio-registration protocol, so a wrapper re-providing it must alias it
 * to the root: `{ provide: FOR_RADIO_GROUP_CONTEXT, useExisting: MyRadioGroup }`, where
 * `MyRadioGroup` extends `ForRadioGroup`. A value that merely satisfies the declared type
 * resolves too, and is rejected in dev mode by the first radio to reach the protocol.
 */
export const FOR_RADIO_GROUP_CONTEXT = new InjectionToken<ForRadioGroupContext>(
  'FOR_RADIO_GROUP_CONTEXT',
);

/**
 * The group's internal coordination surface: everything
 * {@link ForRadioGroupContext} publishes plus the radio-registration protocol
 * the tab-stop and navigation lookups are driven from.
 *
 * Never exported from `public-api.ts`. It is the type the pieces read
 * {@link FOR_RADIO_GROUP_CONTEXT} at, so a consumer who injects that token gets
 * the read surface while the pieces get the wiring protocol. `ForRadioGroup`
 * declares the protocol members TS-`private`, which keeps them out of the
 * emitted `.d.ts` while `useExisting` still satisfies this contract at runtime.
 */
export interface RadioGroupContext extends ForRadioGroupContext {
  registerRadio(handle: ForRadioHandle): void;
  unregisterRadio(handle: ForRadioHandle): void;
}

export function injectRadioGroupContext(piece: string): RadioGroupContext {
  const ctx = inject(FOR_RADIO_GROUP_CONTEXT, { optional: true }) as RadioGroupContext | null;
  if (!ctx) {
    throw orphanContextError({
      code: 'FORCDK-RADIO-GROUP-001',
      piece,
      root: '[forRadioGroup]',
      token: 'FOR_RADIO_GROUP_CONTEXT',
    });
  }
  assertRootContext({
    entryPoint: 'radio-group',
    token: 'FOR_RADIO_GROUP_CONTEXT',
    root: '[forRadioGroup]',
    piece,
    probe: () => ctx.registerRadio,
  });
  return ctx;
}
