import {
  booleanAttribute,
  computed,
  Directive,
  ElementRef,
  inject,
  input,
  signal,
} from '@angular/core';

import { reflectDisabled } from '../_internal/disabled-reflection/disabled-reflection';
import { IdGenerator } from '../_internal/id-generator/id-generator';
import {
  FOR_FIELDSET_CONTEXT,
  type ForFieldsetContext,
} from '../_internal/fieldset/fieldset-context';

/**
 * Headless grouping container that gives a set of related fields a shared
 * accessible name — the styleless counterpart to a native `<fieldset>` +
 * `<legend>`, and the grouping companion to `ForField`.
 *
 * On a native `<fieldset>` it relies on the implicit grouping and emits no
 * role; on any other element it emits `role="group"` + `aria-labelledby`
 * pointing at the `[forFieldsetLegend]` (same host-tag detection idiom as
 * `ForLabel`'s `<label>` check).
 *
 * The `disabled` input reflects `data-disabled` and is provided via context so
 * descendant `ForField` controls OR it into their own disabled state — native
 * `<fieldset disabled>` does not reach custom-role controls like `forSwitch`.
 *
 * @example
 * ```html
 * <fieldset forFieldset [disabled]="locked()">
 *   <legend forFieldsetLegend>Shipping address</legend>
 *   <div forField>
 *     <label forLabel>Street</label>
 *     <input forFieldControl />
 *   </div>
 * </fieldset>
 * ```
 */
@Directive({
  selector: '[forFieldset]',
  exportAs: 'forFieldset',
  host: {
    '[attr.role]': 'roleAttr()',
    '[attr.aria-labelledby]': 'labelledBy()',
    '[attr.aria-disabled]': '!isNativeFieldset() && disabled() ? "true" : null',
    '[attr.data-disabled]': 'disabled() ? "" : null',
  },
  providers: [{ provide: FOR_FIELDSET_CONTEXT, useExisting: ForFieldset }],
})
export class ForFieldset implements ForFieldsetContext {
  readonly #idGen = inject(IdGenerator);
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #parent = inject(FOR_FIELDSET_CONTEXT, { optional: true, skipSelf: true });
  readonly #legends = signal(0);

  /**
   * Whether the group is disabled, as bound by the consumer via `[disabled]`.
   * The host reflection and descendant controls read the composed
   * {@link disabled} signal below, which also folds in an enclosing disabled
   * `[forFieldset]`.
   */
  readonly disabledInput = input(false, { transform: booleanAttribute, alias: 'disabled' });

  /**
   * Effective disabled: the group's own `[disabled]` OR'd with an enclosing
   * disabled `[forFieldset]`. Reflects `data-disabled`, emits the native
   * `disabled` attribute on a `<fieldset>` (or `aria-disabled` elsewhere), and
   * propagates to descendant controls via context — so a disabled fieldset
   * reaches custom-role controls (`forSwitch`, `forCheckbox`, …) a native
   * `<fieldset disabled>` can't, and nesting composes like native fieldsets
   * (a disabled outer group cannot be re-enabled by an inner one).
   */
  readonly disabled = computed(() => this.disabledInput() || (this.#parent?.disabled() ?? false));

  /** Id of the legend element; the group's `aria-labelledby` resolves here. */
  readonly legendId = signal(this.#idGen.next('for-fieldset-legend'));

  /** Whether the host element is a native `<fieldset>` (no role/labelledby needed). */
  protected readonly isNativeFieldset = computed(
    () => this.#host.nativeElement.tagName === 'FIELDSET',
  );

  /**
   * Native `disabled` is reflected only on a real `<fieldset>` (where it
   * natively disables descendant controls); a non-`<fieldset>` host advertises
   * its disabled state via `aria-disabled` instead.
   */
  protected readonly nativeDisabled = computed(() => this.isNativeFieldset() && this.disabled());

  constructor() {
    reflectDisabled(this.nativeDisabled);
  }

  /** `role="group"` on a non-`<fieldset>` element, else null. */
  protected readonly roleAttr = computed(() => (this.isNativeFieldset() ? null : 'group'));

  /**
   * Resolved `aria-labelledby`: the legend id on a non-`<fieldset>` element when
   * a legend is registered, else null (a native `<fieldset>`/`<legend>` groups
   * implicitly and needs none).
   */
  protected readonly labelledBy = computed(() =>
    !this.isNativeFieldset() && this.#legends() > 0 ? this.legendId() : null,
  );

  /** Mark a legend present; returns an unregister callback. */
  registerLegend(): () => void {
    this.#legends.update((n) => n + 1);
    return () => this.#legends.update((n) => n - 1);
  }
}
