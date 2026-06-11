/**
 * Exact public names of every `ForSelect` input, its models included. Spread it into the
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
 *   selector: 'div[mySelect]',
 *   template: '',
 *   hostDirectives: [
 *     {
 *       directive: ForSelect,
 *       inputs: [...FOR_SELECT_HOST_DIRECTIVE_INPUTS],
 *       outputs: [...FOR_SELECT_HOST_DIRECTIVE_OUTPUTS],
 *     },
 *   ],
 * })
 * export class MySelect {}
 * ```
 */
export const FOR_SELECT_HOST_DIRECTIVE_INPUTS = [
  'value',
  'open',
  'align',
  'alignOffset',
  'ariaLabel',
  'arrowPadding',
  'avoidCollisions',
  'collisionPadding',
  'dir',
  'dirty',
  'disabled',
  'dismissible',
  'errors',
  'hideWhenDetached',
  'invalid',
  'isItemEqualToValue',
  'itemToFormValue',
  'itemToLabel',
  'loop',
  'modal',
  'multiple',
  'name',
  'orientation',
  'pending',
  'placeholder',
  'position',
  'readonly',
  'required',
  'returnFocus',
  'selectionFollowsFocus',
  'side',
  'sideOffset',
  'sticky',
  'touched',
] as const;

/**
 * Exact public names of every `ForSelect` output, the Signal Forms `touch` output
 * included. Spread it into the `outputs` array of the same `hostDirectives` entry as
 * {@link FOR_SELECT_HOST_DIRECTIVE_INPUTS}.
 */
export const FOR_SELECT_HOST_DIRECTIVE_OUTPUTS = [
  'valueChange',
  'openChange',
  'escapeKeyDown',
  'pointerDownOutside',
  'focusOutside',
  'interactOutside',
  'autoFocusOnOpen',
  'autoFocusOnClose',
  'touchedChange',
  'touch',
] as const;
