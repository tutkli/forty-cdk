/**
 * Fixture for `forty-cdk/namespaced-css-custom-property`.
 *
 * `provideCssVarNamespacing()` rewrites every `--for-*` name the compiler sees:
 * host bindings and component styles. A name written into a plain string never
 * reaches the compiler, so it keeps the raw name while everything around it is
 * namespaced, and the property it sets is one nothing reads. The rule reports
 * a string that starts with `--for-` or holds a `var(--for-…)`, unless it is the
 * first argument of a `namespace(…)` call. See tutkli/forty-cdk#2480.
 */

declare const el: HTMLElement;
declare const column: string;
declare const namespacer: { namespace(name: string): string };
declare function Directive(metadata: unknown): ClassDecorator;

// Expected: 1× forty-cdk/namespaced-css-custom-property
el.style.setProperty('--for-fixture-width', '1px');

// Expected: 1× forty-cdk/namespaced-css-custom-property
el.style.removeProperty(`--for-fixture-col-${column}-width`);

// Expected: 1× forty-cdk/namespaced-css-custom-property
el.style.setProperty('right', 'var(--for-fixture-offset, 0px)');

// Expected: 1× forty-cdk/namespaced-css-custom-property
export const track = `var(--for-fixture-col-${column}-width, 1fr)`;

// Expected: 1× forty-cdk/namespaced-css-custom-property
@Directive({
  selector: '[forFixtureRawVarValue]',
  host: {
    '[style.transform]': '"translateX(var(--for-fixture-offset))"',
  },
})
export class ForFixtureRawVarValue {}

// Allowed: every name resolved through `namespace(…)`.
el.style.setProperty(namespacer.namespace('--for-fixture-width'), '1px');

el.style.removeProperty(namespacer.namespace(`--for-fixture-col-${column}-width`));

el.style.setProperty('right', `var(${namespacer.namespace('--for-fixture-offset')}, 0px)`);

// Allowed: a `[style.--for-…]` host binding is compiled, so the compiler namespaces it.
@Directive({
  selector: '[forFixtureHostBinding]',
  host: {
    '[style.--for-fixture-width]': 'width()',
  },
})
export class ForFixtureHostBinding {
  declare readonly width: () => string;
}

// Allowed: prose that mentions a name without starting with it or reading it through `var()`.
export const message =
  'Column names are interpolated into the --for-fixture-col-<name>-width property';
