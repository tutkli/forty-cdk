/**
 * Shared contract suite for primitives that implement the
 * `FormValueControl` / `FormCheckboxControl` interface family. Adopted by:
 * Checkbox, Switch, Toggle, Input, Textarea, NumberInput, OtpInput, Search,
 * Select, Combobox, Listbox, Slider, ToggleGroup, RadioGroup, DateField,
 * TimeField, DateRangeField, TimeRangeField, DatePicker, DateRangePicker,
 * TimePicker.
 *
 * The list is not maintained by hand: `form-control-adopters.spec.ts`
 * enumerates the library's `FormValueControl` / `FormCheckboxControl`
 * implementors from source and fails when one of them has no
 * `assertFormControlContract` call in its entry point. Adding a form
 * primitive without adopting the contract is a red build, not a silent gap.
 *
 * Each adopter passes only the `flags` it actually reflects on a single
 * element, so partial adoption is normal:
 *   - Select / Combobox reflect the `aria-*` + `data-disabled` set on their
 *     trigger / editable input (a child of the `[forSelect]` / `[forCombobox]`
 *     wrapper), which is what those adopters return as `control`; the
 *     form-state `data-*` booleans reflect on the wrapper root, so they pass
 *     only the flags that live on the returned element (`disabled`,
 *     `required`).
 *   - Roving-container controls (`Listbox`, `Slider`, `ToggleGroup`, and the
 *     date/time fields) are a non-focusable `role="listbox"` / `role="group"`
 *     host: they drop out of the tab order when disabled (focus lives on a
 *     roving child / segment), so they omit the `disabled` flag — its
 *     "stays focusable" assertion does not apply to a container.
 *   - Controls that reflect `aria-readonly` but not `data-readonly`
 *     (`Listbox`) omit `readonly`; controls with no `aria-busy` (the date/time
 *     fields) omit `pending`.
 *   - Controls whose role does not support `aria-readonly` (`role="group"` on
 *     `Slider` / `ToggleGroup` / the date/time fields, `role="button"` on
 *     `Toggle`) pass `roleSupportsAriaReadonly: false`: they reflect
 *     `data-readonly` only, and the ARIA announcement — where the state has a
 *     supporting role at all — lives on a child (the slider thumb, each
 *     spinbutton segment).
 *
 * The contract owns every assertion that is identical across the adopters:
 *
 *   - Truthy-only ARIA attributes (`aria-disabled`, `aria-readonly`,
 *     `aria-required`, `aria-invalid`, `aria-busy`) are absent when the
 *     corresponding flag is `false` — never `"false"`.
 *   - Each flag, when set to `true`, reflects on the control's host
 *     element with the canonical attribute set:
 *       - `disabled`  → `aria-disabled="true"` + `data-disabled=""`. Native
 *         form elements (`<input>`, `<textarea>`) also reflect the native
 *         `disabled` attribute; custom-role controls (`role="checkbox"`,
 *         `"switch"`, a toggle `<button>`, …) deliberately do NOT — they stay
 *         focusable so assistive tech can announce them, per the APG
 *         (`customRoleStaysFocusable`).
 *       - `readonly`  → `aria-readonly="true"` + `data-readonly=""` (no native
 *         disabled); `data-readonly=""` alone when the control's role does not
 *         support `aria-readonly` (`roleSupportsAriaReadonly: false`)
 *       - `required`  → `aria-required="true"`
 *       - `invalid`   → `aria-invalid="true"` + `data-invalid=""`
 *       - `pending`   → `aria-busy="true"` + `data-pending=""`
 *       - `touched`   → `data-touched=""` (no ARIA mirror)
 *       - `dirty`     → `data-dirty=""` (no ARIA mirror)
 *   - Each `data-*` boolean attribute clears (becomes absent) when the
 *     flag flips back to `false`.
 *
 * The consumer provides a single `mount` function returning a context
 * with mutable flag setters and the control element. The contract's
 * `it()` blocks call `mount()` once per test, so the consumer is free
 * to scaffold a fresh host on every call.
 *
 * Internal to the spec suite — never re-exported from `public-api.ts`.
 */
export type FormControlFlag =
  | 'disabled'
  | 'readonly'
  | 'required'
  | 'invalid'
  | 'pending'
  | 'touched'
  | 'dirty';

export interface FormControlMountResult {
  /** The control's host element — the one that carries the ARIA / data flags. */
  control: HTMLElement;
  /** Drain Angular's render pipeline. */
  flush: () => void | Promise<void>;
  /** Drive a flag from the host (sets the corresponding signal to `value`). */
  setFlag: (flag: FormControlFlag, value: boolean) => void;
  /** Drive the form-field name input (only required when `name` is in `options.flags`). */
  setName?: (name: string) => void;
}

export interface FormControlContractOptions {
  /**
   * The flags this control supports. Defaults to every flag listed in
   * {@link FormControlFlag} plus `"name"` (the native form field name).
   * Skip a flag here when the underlying primitive deliberately doesn't
   * expose it (e.g. controls whose value is always present can omit
   * `pending`).
   */
  flags?: ReadonlyArray<FormControlFlag | 'name'>;
  /**
   * Whether this control carries a custom ARIA role (`checkbox`, `switch`, a
   * toggle `<button>` reflecting `aria-pressed`, …) rather than being a native
   * form element. Custom-role controls MUST stay focusable when disabled so
   * assistive tech can announce them — they emit `aria-disabled` /
   * `data-disabled` only, never the native `disabled` attribute that would
   * drop them from the focus order. Native form elements (`<input>`,
   * `<textarea>`) instead keep the native `disabled`. Defaults to `false`.
   */
  customRoleStaysFocusable?: boolean;
  /**
   * Whether the control's role supports the `aria-readonly` property. WAI-ARIA
   * gates it to `checkbox`, `combobox`, `grid`, `gridcell`, `listbox`,
   * `radiogroup`, `slider`, `spinbutton`, `textbox` (inherited into
   * `columnheader`, `rowheader`, `searchbox`, `switch`, `treegrid`); emitting
   * it anywhere else is an `aria-allowed-attr` violation. Set to `false` for a
   * control whose host carries an unsupporting role (`role="group"` container
   * roots, a toggle `<button>`) — the `readonly` assertion then demands
   * `data-readonly=""` and the *absence* of `aria-readonly`. Defaults to `true`.
   */
  roleSupportsAriaReadonly?: boolean;
}

const ALL_FLAGS: ReadonlyArray<FormControlFlag | 'name'> = [
  'disabled',
  'readonly',
  'required',
  'invalid',
  'pending',
  'touched',
  'dirty',
  'name',
];

/**
 * Run the form-control contract assertions inside a `describe('form-control contract', …)`
 * block. Call from a primitive's spec, e.g.
 *
 * ```ts
 * describe('ForSwitch', () => {
 *   assertFormControlContract(() => mountSwitchHost(), { flags: [...] });
 * });
 * ```
 */
export function assertFormControlContract(
  mount: () => FormControlMountResult | Promise<FormControlMountResult>,
  options: FormControlContractOptions = {},
): void {
  const flags = new Set(options.flags ?? ALL_FLAGS);
  const has = (f: FormControlFlag | 'name'): boolean => flags.has(f);
  const customRoleStaysFocusable = options.customRoleStaysFocusable ?? false;
  const roleSupportsAriaReadonly = options.roleSupportsAriaReadonly ?? true;

  describe('form-control contract', () => {
    it('omits truthy-only ARIA flags when the underlying signal is false', async () => {
      const ctx = await mount();
      const c = ctx.control;
      // Per CLAUDE.md § "ARIA state attribute emission", these MUST be
      // absent (not "false") when their predicate is falsy.
      expect(c.hasAttribute('aria-disabled')).toBe(false);
      expect(c.hasAttribute('aria-readonly')).toBe(false);
      expect(c.hasAttribute('aria-required')).toBe(false);
      expect(c.hasAttribute('aria-invalid')).toBe(false);
      expect(c.hasAttribute('aria-busy')).toBe(false);
    });

    it('omits boolean form-state data-* attributes when their flag is false', async () => {
      const ctx = await mount();
      const c = ctx.control;
      expect(c.hasAttribute('data-disabled')).toBe(false);
      expect(c.hasAttribute('data-readonly')).toBe(false);
      expect(c.hasAttribute('data-touched')).toBe(false);
      expect(c.hasAttribute('data-dirty')).toBe(false);
      expect(c.hasAttribute('data-pending')).toBe(false);
      expect(c.hasAttribute('data-invalid')).toBe(false);
    });

    if (has('disabled')) {
      if (customRoleStaysFocusable) {
        it('reflects disabled → aria-disabled + data-disabled, stays focusable (no native disabled)', async () => {
          const ctx = await mount();
          ctx.setFlag('disabled', true);
          await ctx.flush();
          expect(ctx.control.hasAttribute('disabled')).toBe(false);
          expect(ctx.control.getAttribute('aria-disabled')).toBe('true');
          expect(ctx.control.getAttribute('data-disabled')).toBe('');
          ctx.control.focus();
          expect(document.activeElement).toBe(ctx.control);

          ctx.setFlag('disabled', false);
          await ctx.flush();
          expect(ctx.control.hasAttribute('disabled')).toBe(false);
          expect(ctx.control.hasAttribute('aria-disabled')).toBe(false);
          expect(ctx.control.hasAttribute('data-disabled')).toBe(false);
        });
      } else {
        it('reflects disabled → native disabled + aria-disabled + data-disabled', async () => {
          const ctx = await mount();
          ctx.setFlag('disabled', true);
          await ctx.flush();
          expect(ctx.control.hasAttribute('disabled')).toBe(true);
          expect(ctx.control.getAttribute('aria-disabled')).toBe('true');
          expect(ctx.control.getAttribute('data-disabled')).toBe('');

          ctx.setFlag('disabled', false);
          await ctx.flush();
          expect(ctx.control.hasAttribute('disabled')).toBe(false);
          expect(ctx.control.hasAttribute('aria-disabled')).toBe(false);
          expect(ctx.control.hasAttribute('data-disabled')).toBe(false);
        });
      }
    }

    if (has('readonly')) {
      const readonlyTitle = roleSupportsAriaReadonly
        ? 'reflects readonly → aria-readonly + data-readonly (and never native disabled)'
        : 'reflects readonly → data-readonly only, never aria-readonly on an unsupporting role';
      it(readonlyTitle, async () => {
        const ctx = await mount();
        ctx.setFlag('readonly', true);
        await ctx.flush();
        if (roleSupportsAriaReadonly) {
          expect(ctx.control.getAttribute('aria-readonly')).toBe('true');
        } else {
          expect(ctx.control.hasAttribute('aria-readonly')).toBe(false);
        }
        expect(ctx.control.getAttribute('data-readonly')).toBe('');
        expect(ctx.control.hasAttribute('disabled')).toBe(false);

        ctx.setFlag('readonly', false);
        await ctx.flush();
        expect(ctx.control.hasAttribute('aria-readonly')).toBe(false);
        expect(ctx.control.hasAttribute('data-readonly')).toBe(false);
      });
    }

    if (has('required')) {
      it('reflects required → aria-required', async () => {
        const ctx = await mount();
        ctx.setFlag('required', true);
        await ctx.flush();
        expect(ctx.control.getAttribute('aria-required')).toBe('true');

        ctx.setFlag('required', false);
        await ctx.flush();
        expect(ctx.control.hasAttribute('aria-required')).toBe(false);
      });
    }

    if (has('invalid')) {
      it('reflects invalid → aria-invalid + data-invalid', async () => {
        const ctx = await mount();
        ctx.setFlag('invalid', true);
        await ctx.flush();
        expect(ctx.control.getAttribute('aria-invalid')).toBe('true');
        expect(ctx.control.getAttribute('data-invalid')).toBe('');

        ctx.setFlag('invalid', false);
        await ctx.flush();
        expect(ctx.control.hasAttribute('aria-invalid')).toBe(false);
        expect(ctx.control.hasAttribute('data-invalid')).toBe(false);
      });
    }

    if (has('pending')) {
      it('reflects pending → aria-busy + data-pending', async () => {
        const ctx = await mount();
        ctx.setFlag('pending', true);
        await ctx.flush();
        expect(ctx.control.getAttribute('aria-busy')).toBe('true');
        expect(ctx.control.getAttribute('data-pending')).toBe('');

        ctx.setFlag('pending', false);
        await ctx.flush();
        expect(ctx.control.hasAttribute('aria-busy')).toBe(false);
        expect(ctx.control.hasAttribute('data-pending')).toBe(false);
      });
    }

    if (has('touched')) {
      it('reflects touched → data-touched', async () => {
        const ctx = await mount();
        ctx.setFlag('touched', true);
        await ctx.flush();
        expect(ctx.control.getAttribute('data-touched')).toBe('');

        ctx.setFlag('touched', false);
        await ctx.flush();
        expect(ctx.control.hasAttribute('data-touched')).toBe(false);
      });
    }

    if (has('dirty')) {
      it('reflects dirty → data-dirty', async () => {
        const ctx = await mount();
        ctx.setFlag('dirty', true);
        await ctx.flush();
        expect(ctx.control.getAttribute('data-dirty')).toBe('');

        ctx.setFlag('dirty', false);
        await ctx.flush();
        expect(ctx.control.hasAttribute('data-dirty')).toBe(false);
      });
    }

    if (has('name')) {
      it('reflects name onto the native `name` attribute', async () => {
        const ctx = await mount();
        if (!ctx.setName) {
          throw new Error(
            '[forty-cdk/test-utils] form-control-contract: `name` is in options.flags but the mount result did not expose `setName`.',
          );
        }
        ctx.setName('field-x');
        await ctx.flush();
        expect(ctx.control.getAttribute('name')).toBe('field-x');
      });
    }
  });
}
