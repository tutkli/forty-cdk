/**
 * Exact public names of every `ForSearch` input, its models included. Spread it into the
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
 *   selector: 'input[mySearch]',
 *   template: '',
 *   hostDirectives: [
 *     {
 *       directive: ForSearch,
 *       inputs: [...FOR_SEARCH_HOST_DIRECTIVE_INPUTS],
 *       outputs: [...FOR_SEARCH_HOST_DIRECTIVE_OUTPUTS],
 *     },
 *   ],
 * })
 * export class MySearch {}
 * ```
 */
export const FOR_SEARCH_HOST_DIRECTIVE_INPUTS = [
  'value',
  'clearOnEscape',
  'dirty',
  'disabled',
  'errors',
  'invalid',
  'name',
  'pending',
  'readonly',
  'required',
  'touched',
] as const;

/**
 * Exact public names of every `ForSearch` output, the Signal Forms `touch` output
 * included. Spread it into the `outputs` array of the same `hostDirectives` entry as
 * {@link FOR_SEARCH_HOST_DIRECTIVE_INPUTS}.
 */
export const FOR_SEARCH_HOST_DIRECTIVE_OUTPUTS = ['valueChange', 'touchedChange', 'touch'] as const;
