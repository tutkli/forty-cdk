/**
 * Exact public names of every `ForTimePicker` input, its models included.
 * Spread it into the `inputs` array of a `hostDirectives` entry so a wrapper
 * component re-exposes the primitive's full surface — the Signal Forms members
 * `[formField]` binds among them — without hand-maintaining the list. Always
 * spread into an inline object literal so the entry is statically analyzable.
 * An anti-drift spec fails when this list no longer matches the directive's
 * actual API.
 *
 * @example
 * ```ts
 * @Component({
 *   selector: 'div[myTimePicker]',
 *   template: '',
 *   hostDirectives: [
 *     {
 *       directive: ForTimePicker,
 *       inputs: [...FOR_TIME_PICKER_HOST_DIRECTIVE_INPUTS],
 *       outputs: [...FOR_TIME_PICKER_HOST_DIRECTIVE_OUTPUTS],
 *     },
 *   ],
 * })
 * export class MyTimePicker {}
 * ```
 */
export const FOR_TIME_PICKER_HOST_DIRECTIVE_INPUTS = [
  'value',
  'open',
  'align',
  'alignOffset',
  'ariaLabel',
  'arrowPadding',
  'avoidCollisions',
  'clipUntilPositioned',
  'closeOnSelect',
  'collisionPadding',
  'dir',
  'dirty',
  'disabled',
  'dismissible',
  'errors',
  'formatOptions',
  'granularity',
  'hideWhenDetached',
  'hourCycle',
  'invalid',
  'locale',
  'loop',
  'maxTime',
  'minTime',
  'modal',
  'name',
  'orientation',
  'pending',
  'placeholder',
  'readonly',
  'required',
  'returnFocus',
  'side',
  'sideOffset',
  'step',
  'sticky',
  'touched',
] as const;

/**
 * Exact public names of every `ForTimePicker` output, the Signal Forms `touch`
 * output included. Spread it into the `outputs` array of the same
 * `hostDirectives` entry as {@link FOR_TIME_PICKER_HOST_DIRECTIVE_INPUTS}.
 */
export const FOR_TIME_PICKER_HOST_DIRECTIVE_OUTPUTS = [
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
