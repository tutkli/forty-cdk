/**
 * Fixture for `forty-cdk/require-host-directive-sibling`.
 *
 * A concrete class implementing `FormValueControl` / `FormCheckboxControl`
 * must ship a `<name>-host-directive.ts` sibling carrying the
 * `FOR_<PRIMITIVE>_HOST_DIRECTIVE_INPUTS` / `_OUTPUTS` tuples, re-exported
 * from the primitive barrel. No
 * `require-host-directive-sibling.fixture-host-directive.ts` exists next to
 * this file, so each concrete class below fires once. See
 * tutkli/forty-cdk#645 / #663 and CLAUDE.md > "Form primitives use Signal
 * Forms, never `ControlValueAccessor`".
 */

declare interface ModelSignal<T> {
  (): T;
}
declare interface FormValueControl<T> {
  value: ModelSignal<T>;
}
declare interface FormCheckboxControl {
  checked: ModelSignal<boolean>;
}

// Expected: 1× forty-cdk/require-host-directive-sibling
export class BrokenValueControl implements FormValueControl<string> {
  declare value: ModelSignal<string>;
}

// Expected: 1× forty-cdk/require-host-directive-sibling
// The wrapped reference ForSlider uses (`Omit<FormValueControl<…>, …>`) is
// detected through the type arguments, not just the direct identifier.
export class BrokenOmitControl implements Omit<FormValueControl<readonly number[]>, 'value'> {}

// Expected: 1× forty-cdk/require-host-directive-sibling
export class BrokenCheckboxControl implements FormCheckboxControl {
  declare checked: ModelSignal<boolean>;
}

// Allowed: abstract bases are shared wiring (`TextValueControlBase`); the
// concrete subclasses own the sibling contract.
export abstract class FakeControlBase implements FormValueControl<string> {
  declare value: ModelSignal<string>;
}
