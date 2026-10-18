/**
 * Exact public names of every `ForListbox` input, its models included. Spread it into the
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
 *   selector: 'div[myListbox]',
 *   template: '',
 *   hostDirectives: [
 *     {
 *       directive: ForListbox,
 *       inputs: [...FOR_LISTBOX_HOST_DIRECTIVE_INPUTS],
 *       outputs: [...FOR_LISTBOX_HOST_DIRECTIVE_OUTPUTS],
 *     },
 *   ],
 * })
 * export class MyListbox {}
 * ```
 */
export const FOR_LISTBOX_HOST_DIRECTIVE_INPUTS = [
  'value',
  'ariaLabel',
  'compareWith',
  'dir',
  'dirty',
  'disabled',
  'errors',
  'invalid',
  'itemToFormValue',
  'loop',
  'multiple',
  'name',
  'orientation',
  'pending',
  'readonly',
  'required',
  'selectionFollowsFocus',
  'touched',
] as const;

/**
 * Exact public names of every `ForListbox` output, the Signal Forms `touch` output
 * included. Spread it into the `outputs` array of the same `hostDirectives` entry as
 * {@link FOR_LISTBOX_HOST_DIRECTIVE_INPUTS}.
 */
export const FOR_LISTBOX_HOST_DIRECTIVE_OUTPUTS = [
  'touch',
  'touchedChange',
  'valueChange',
] as const;

/**
 * Exact public names of every `ForListboxVirtualized` input. Spread it into the `inputs`
 * array of a second `hostDirectives` entry, beside the `ForListbox` one, so a wrapper
 * component that virtualizes its options re-exposes the virtualization surface too.
 */
export const FOR_LISTBOX_VIRTUALIZED_HOST_DIRECTIVE_INPUTS = [
  'dataVersion',
  'totalCount',
  'visibleRange',
] as const;

/**
 * Exact public names of every `ForListboxVirtualized` output. Spread it into the
 * `outputs` array of the same `hostDirectives` entry as
 * {@link FOR_LISTBOX_VIRTUALIZED_HOST_DIRECTIVE_INPUTS}.
 */
export const FOR_LISTBOX_VIRTUALIZED_HOST_DIRECTIVE_OUTPUTS = ['scrollToIndex'] as const;
