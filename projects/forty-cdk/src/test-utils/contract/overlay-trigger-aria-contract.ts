/**
 * Shared mini-contract for the ARIA trio every trigger-anchored overlay
 * stamps on its trigger: `aria-haspopup`, `aria-expanded`, and the
 * open-gated `aria-controls` pointing at the surface's id. Adopted by:
 * Popover, DropdownMenu, MenuSub, Menubar, Select, Combobox (both anatomies —
 * `[forComboboxInput]` in the editable one, `[forComboboxTrigger]` in the
 * picker one), DatePicker, DateRangePicker, TimePicker, Dialog and Drawer.
 *
 * Dialog and Drawer are free-floating overlays whose surface lifecycle is
 * decoupled from the trigger, yet they fit verbatim: `[forDialogTrigger]` /
 * `[forDrawerTrigger]` own an `[(open)]` model and gate `aria-controls` on it,
 * so the only per-primitive detail is that the consumer wires the surface's id
 * through `[controls]` rather than the root doing it.
 *
 * ContextMenu is the one trigger-anchored overlay outside the roster:
 * `[forContextMenuTrigger]` is a right-click *region*, not a popup control, so
 * it emits none of the trio (no role, no `aria-haspopup`, no `aria-expanded`).
 *
 * The trio was re-asserted per primitive (`describe('a11y baseline')`) and a
 * third time in the SSR smoke suite, so nine overlays each owned their own
 * copy of the same four expectations — and a change to the emission rule
 * (the `aria-controls` open-gate in particular) had to be hand-propagated to
 * every one of them.
 *
 * The contract owns exactly the trio and nothing else. `data-state`, focus
 * moves, and the dismissal channels stay with their own suites; keeping the
 * scope this narrow is what lets every anchored overlay adopt it verbatim,
 * whatever its role and popup token happen to be.
 *
 * Internal to the spec suite — never re-exported from `public-api.ts`.
 */

export interface OverlayTriggerAriaMountResult {
  /** The trigger element carrying the trio. */
  trigger: HTMLElement;
  /** Drain Angular's render pipeline. */
  flush: () => Promise<void>;
  /** Open the overlay. The contract awaits {@link flush} afterwards. */
  open: () => void;
  /**
   * The mounted surface `aria-controls` must point at. Called only after
   * {@link open} and a flush, so a portaled surface has landed in the DOM.
   */
  surface: () => HTMLElement;
}

export interface OverlayTriggerAriaContractOptions {
  /**
   * The `aria-haspopup` token this trigger emits — `'menu'`, `'listbox'`,
   * `'dialog'`, `'tree'`, or `'grid'`. Token values are always present (the
   * truthy-only boolean rule does not apply), so the contract asserts the
   * concrete token in both the closed and open states.
   */
  haspopup: 'menu' | 'listbox' | 'dialog' | 'tree' | 'grid';
}

/**
 * Run the trigger ARIA trio assertions inside a
 * `describe('overlay trigger ARIA contract', …)` block.
 */
export function assertOverlayTriggerAriaContract(
  setup: { mount: () => OverlayTriggerAriaMountResult | Promise<OverlayTriggerAriaMountResult> },
  options: OverlayTriggerAriaContractOptions,
): void {
  describe('overlay trigger ARIA contract', () => {
    it(`emits aria-haspopup="${options.haspopup}" while closed`, async () => {
      const ctx = await setup.mount();
      expect(ctx.trigger.getAttribute('aria-haspopup')).toBe(options.haspopup);
    });

    it('emits aria-expanded="false" and no aria-controls while closed', async () => {
      const ctx = await setup.mount();
      expect(ctx.trigger.getAttribute('aria-expanded')).toBe('false');
      expect(ctx.trigger.hasAttribute('aria-controls')).toBe(false);
    });

    it('flips aria-expanded to "true" and points aria-controls at the surface once open', async () => {
      const ctx = await setup.mount();
      ctx.open();
      await ctx.flush();

      const surface = ctx.surface();
      expect(ctx.trigger.getAttribute('aria-expanded')).toBe('true');
      expect(surface.id).not.toBe('');
      expect(ctx.trigger.getAttribute('aria-controls')).toBe(surface.id);
      expect(ctx.trigger.getAttribute('aria-haspopup')).toBe(options.haspopup);
    });
  });
}
