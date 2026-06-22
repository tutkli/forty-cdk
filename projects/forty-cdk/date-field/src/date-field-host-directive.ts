/**
 * Exact public names of every `ForDateField` input, its models included. Spread it into the
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
 *   selector: 'div[myDateField]',
 *   template: '',
 *   hostDirectives: [
 *     {
 *       directive: ForDateField,
 *       inputs: [...FOR_DATE_FIELD_HOST_DIRECTIVE_INPUTS],
 *       outputs: [...FOR_DATE_FIELD_HOST_DIRECTIVE_OUTPUTS],
 *     },
 *   ],
 * })
 * export class MyDateField {}
 * ```
 */
export const FOR_DATE_FIELD_HOST_DIRECTIVE_INPUTS = [
  'value',
  'ariaLabel',
  'dir',
  'dirty',
  'disabled',
  'errors',
  'granularity',
  'hourCycle',
  'invalid',
  'locale',
  'maxDate',
  'minDate',
  'name',
  'pending',
  'placeholder',
  'readonly',
  'required',
  'touched',
] as const;

/**
 * Exact public names of every `ForDateField` output, the Signal Forms `touch` output
 * included. Spread it into the `outputs` array of the same `hostDirectives` entry as
 * {@link FOR_DATE_FIELD_HOST_DIRECTIVE_INPUTS}.
 */
export const FOR_DATE_FIELD_HOST_DIRECTIVE_OUTPUTS = [
  'valueChange',
  'touchedChange',
  'touch',
] as const;
