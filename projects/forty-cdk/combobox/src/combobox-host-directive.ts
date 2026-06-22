/**
 * Exact public names of every `ForCombobox` input, its models included. Spread it into the
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
 *   selector: 'div[myCombobox]',
 *   template: '',
 *   hostDirectives: [
 *     {
 *       directive: ForCombobox,
 *       inputs: [...FOR_COMBOBOX_HOST_DIRECTIVE_INPUTS],
 *       outputs: [...FOR_COMBOBOX_HOST_DIRECTIVE_OUTPUTS],
 *     },
 *   ],
 * })
 * export class MyCombobox {}
 * ```
 */
export const FOR_COMBOBOX_HOST_DIRECTIVE_INPUTS = [
  'query',
  'value',
  'open',
  'align',
  'alignOffset',
  'ariaLabel',
  'arrowPadding',
  'autoHighlight',
  'autocompleteMode',
  'avoidCollisions',
  'clearOnQueryChange',
  'clipUntilPositioned',
  'collisionPadding',
  'commitOnSelect',
  'dir',
  'dirty',
  'disabled',
  'dismissible',
  'errors',
  'hideWhenDetached',
  'invalid',
  'isItemEqualToValue',
  'itemToFormValue',
  'itemToStringLabel',
  'loop',
  'multiple',
  'name',
  'openOnFocus',
  'openOnQuery',
  'pending',
  'readonly',
  'required',
  'returnFocus',
  'side',
  'sideOffset',
  'sticky',
  'totalCount',
  'visibleRange',
  'touched',
] as const;

/**
 * Exact public names of every `ForCombobox` output, the Signal Forms `touch` output
 * included. Spread it into the `outputs` array of the same `hostDirectives` entry as
 * {@link FOR_COMBOBOX_HOST_DIRECTIVE_INPUTS}.
 */
export const FOR_COMBOBOX_HOST_DIRECTIVE_OUTPUTS = [
  'queryChange',
  'valueChange',
  'openChange',
  'scrollToIndex',
  'escapeKeyDown',
  'pointerDownOutside',
  'focusOutside',
  'interactOutside',
  'autoFocusOnOpen',
  'autoFocusOnClose',
  'touchedChange',
  'touch',
] as const;
