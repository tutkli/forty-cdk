/**
 * Fixture for `forty-cdk/hidden-input-effective-disabled`.
 *
 * A form-value control that folds in `[forFieldset]`-disabled (by declaring
 * an `effectiveDisabled` member) must pass that signal — not the raw
 * `disabled` input — to `injectHiddenInput({ … disabled: … })`. Passing the
 * raw `disabled` leaves the hidden `<input>` submitting its value inside a
 * disabled fieldset (the #695 footgun). A control with no `effectiveDisabled`
 * member does not fold in fieldset-disabled, so passing `disabled` is correct
 * and the rule stays silent. See tutkli/forty-cdk#695 / #728 / #741 and
 * CLAUDE.md > "Disabled custom-role controls stay focusable".
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

// Allowed: the control has no `effectiveDisabled` member, so it does not fold
// in fieldset-disabled — passing the raw `disabled` is correct.
export class PlainControl {
  declare readonly name: Signal<string>;
  declare readonly value: Signal<readonly string[]>;
  declare readonly disabled: Signal<boolean>;

  constructor() {
    injectHiddenInput({
      name: this.name,
      values: this.value,
      disabled: this.disabled,
    });
  }
}
