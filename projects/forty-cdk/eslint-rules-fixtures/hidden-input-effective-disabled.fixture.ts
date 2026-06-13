/**
 * Fixture for `forty-cdk/hidden-input-effective-disabled`.
 *
 * Any control wiring `injectHiddenInput` is a form-value control that can sit
 * inside a disabled `[forFieldset]`, so the hidden `<input>` it spawns must
 * reflect `effectiveDisabled` — the signal that folds in the fieldset's
 * disabled state — never the raw `disabled` input. Passing the raw `disabled`
 * leaves the hidden `<input>` submitting its value inside a disabled fieldset
 * (the #695 footgun). The rule is unconditional on the call: it fires whenever
 * the `disabled` value does not reference `effectiveDisabled` anywhere,
 * including controls that *inherit* `effectiveDisabled` from
 * `FormUiControlBase` and never declare it in their own body. See
 * tutkli/forty-cdk#695 / #728 / #741 and CLAUDE.md > "Disabled custom-role
 * controls stay focusable".
 */

declare interface Signal<T> {
  (): T;
}
declare function injectHiddenInput<T = string>(config: {
  name: Signal<string>;
  values: Signal<readonly T[]>;
  disabled?: Signal<boolean>;
}): void;
declare function computed<T>(fn: () => T): Signal<T>;
declare abstract class FormUiControlBase {
  readonly effectiveDisabled: Signal<boolean>;
}

// Expected: 1× forty-cdk/hidden-input-effective-disabled
// The #695 footgun: the class declares `effectiveDisabled` but passes the raw
// `disabled` to the hidden input, so its value submits inside a disabled
// `[forFieldset]`.
export class BrokenControl {
  declare readonly name: Signal<string>;
  declare readonly value: Signal<readonly string[]>;
  declare readonly disabled: Signal<boolean>;
  readonly effectiveDisabled = computed(() => this.disabled());

  constructor() {
    injectHiddenInput({
      name: this.name,
      values: this.value,
      disabled: this.disabled,
    });
  }
}

// Expected: 1× forty-cdk/hidden-input-effective-disabled
// The blind spot the broadening closes: this control *inherits*
// `effectiveDisabled` from `FormUiControlBase` (never declaring it in-body) yet
// passes the raw `disabled`, so its value still submits inside a disabled
// fieldset. The old "class declares `effectiveDisabled`" gate let this through.
export class InheritedBrokenControl extends FormUiControlBase {
  declare readonly name: Signal<string>;
  declare readonly value: Signal<readonly string[]>;
  declare readonly disabled: Signal<boolean>;

  constructor() {
    super();
    injectHiddenInput({
      name: this.name,
      values: this.value,
      disabled: this.disabled,
    });
  }
}

// Allowed: passes `this.effectiveDisabled`, the correct fieldset-aware signal.
export class GoodControl {
  declare readonly name: Signal<string>;
  declare readonly value: Signal<readonly string[]>;
  declare readonly disabled: Signal<boolean>;
  readonly effectiveDisabled = computed(() => this.disabled());

  constructor() {
    injectHiddenInput({
      name: this.name,
      values: this.value,
      disabled: this.effectiveDisabled,
    });
  }
}

// Allowed: a wrapped/derived expression that still references
// `effectiveDisabled` anywhere is accepted.
export class WrappedGoodControl {
  declare readonly name: Signal<string>;
  declare readonly value: Signal<readonly string[]>;
  declare readonly disabled: Signal<boolean>;
  declare readonly readonly: Signal<boolean>;
  readonly effectiveDisabled = computed(() => this.disabled());

  constructor() {
    injectHiddenInput({
      name: this.name,
      values: this.value,
      disabled: computed(() => this.effectiveDisabled() || this.readonly()),
    });
  }
}
