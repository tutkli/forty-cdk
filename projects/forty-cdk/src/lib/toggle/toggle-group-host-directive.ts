/**
 * Exact public names of every `ForToggleGroup` input, its models included. Spread it into the
 * `inputs` array of a `hostDirectives` entry so a wrapper component re-exposes the
 * primitive's full surface — the Signal Forms members `[formField]` binds among them —
 * without hand-maintaining the list. Always spread into an inline object literal as shown
 * below: the literal is what keeps the entry statically analyzable for consumers compiling
 * against the published package. An anti-drift spec fails when this list no longer matches
 * the directive's actual API. See `docs/wrapping-form-primitives.md` for both supported
 * wrapping patterns.
 *
 * @example
 * ```ts
 * @Component({
 *   selector: 'div[myToggleGroup]',
 *   template: '',
 *   hostDirectives: [
 *     {
 *       directive: ForToggleGroup,
 *       inputs: [...FOR_TOGGLE_GROUP_HOST_DIRECTIVE_INPUTS],
 *       outputs: [...FOR_TOGGLE_GROUP_HOST_DIRECTIVE_OUTPUTS],
 *     },
 *   ],
 * })
 * export class MyToggleGroup {}
 * ```
 */
export const FOR_TOGGLE_GROUP_HOST_DIRECTIVE_INPUTS = [
  'value',
  'dir',
  'dirty',
  'disabled',
  'errors',
  'invalid',
  'loop',
  'multiple',
  'name',
  'orientation',
  'pending',
  'readonly',
  'required',
  'touched',
] as const;

/**
 * Exact public names of every `ForToggleGroup` output, the Signal Forms `touch` output
 * included. Spread it into the `outputs` array of the same `hostDirectives` entry as
 * {@link FOR_TOGGLE_GROUP_HOST_DIRECTIVE_INPUTS}.
 */
export const FOR_TOGGLE_GROUP_HOST_DIRECTIVE_OUTPUTS = [
  'valueChange',
  'touchedChange',
  'touch',
] as const;
