/**
 * Exact public names of every `ForOtpInput` input, its models included. Spread it into the
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
 *   selector: 'div[myOtpInput]',
 *   template: '',
 *   hostDirectives: [
 *     {
 *       directive: ForOtpInput,
 *       inputs: [...FOR_OTP_INPUT_HOST_DIRECTIVE_INPUTS],
 *       outputs: [...FOR_OTP_INPUT_HOST_DIRECTIVE_OUTPUTS],
 *     },
 *   ],
 * })
 * export class MyOtpInput {}
 * ```
 */
export const FOR_OTP_INPUT_HOST_DIRECTIVE_INPUTS = [
  'value',
  'allowedPattern',
  'ariaLabel',
  'dirty',
  'disabled',
  'errors',
  'invalid',
  'length',
  'mask',
  'name',
  'oneTimeCode',
  'pasteTransformer',
  'pending',
  'readonly',
  'required',
  'type',
  'touched',
] as const;

/**
 * Exact public names of every `ForOtpInput` output, the Signal Forms `touch` output
 * included. Spread it into the `outputs` array of the same `hostDirectives` entry as
 * {@link FOR_OTP_INPUT_HOST_DIRECTIVE_INPUTS}.
 */
export const FOR_OTP_INPUT_HOST_DIRECTIVE_OUTPUTS = [
  'valueChange',
  'touchedChange',
  'touch',
  'complete',
  'reject',
] as const;
