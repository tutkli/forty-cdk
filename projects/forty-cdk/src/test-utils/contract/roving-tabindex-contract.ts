/**
 * Shared contract suite for primitives that own a roving-tabindex
 * keyboard model.
 *
 * **The roster is not here.** Adoption is derived from library source by
 * [`src/lib/roving-tabindex-adopters.spec.ts`](../../lib/roving-tabindex-adopters.spec.ts),
 * which folds every construction of `RovingTabindex` and fails on one no claim
 * covers ([#1658](https://github.com/tutkli/forty-cdk/issues/1658)). Read that
 * file for the roster, for the two keyboard models that are excluded (the
 * table's 2D grid and the date / time fields' spinbutton segment strips, each
 * with the condition the guard falsifies), and for why `[forRadioGroup]` is a
 * declared member rather than a derived one. A list of names in this header was
 * the shape that let a member join the family unnoticed — and the shape that let
 * drag-drop's exclusion stay here after it had stopped being true.
 *
 * The contract owns the assertions that are identical across every
 * roving primitive:
 *
 *   - On mount, the first **enabled** item has `tabindex="0"`; all
 *     other items have `tabindex="-1"`. Disabled items at the head of
 *     the list are skipped when picking the entry point.
 *   - `Home` jumps focus to the first enabled item; `End` jumps to the
 *     last enabled item.
 *   - The orientation-positive arrow (`ArrowRight` / `ArrowDown`)
 *     advances focus by one position; arrow-key navigation skips
 *     disabled items along the way.
 *   - **Selection-aware entry point** — for primitives that also carry a
 *     selection (Listbox, RadioGroup, ToggleGroup, Tabs, the grid table):
 *     the tab stop moves to the selected item; with several selected it is
 *     the first selected one; and a selected-but-disabled item never wins
 *     the tab stop (the entry point falls back to the first enabled item).
 *     That last rung is the [#1132](https://github.com/tutkli/forty-cdk/issues/1132)
 *     / [#1170](https://github.com/tutkli/forty-cdk/issues/1170) bug family,
 *     which regressed once per sibling while the ladder lived as
 *     copy-pasted `describe('initial tabindex')` blocks; centralising it
 *     here is what makes a fix propagate.
 *
 * The consumer provides `mount` factories per variant they want to
 * exercise. Only the `mount` factory is required; everything else is
 * opt-in for primitives that support that axis.
 *
 * The shared keyboard helpers (`pressKey`) are imported by the consumer
 * spec and not required by the contract itself; the contract dispatches
 * synthetic events via `dispatchEvent` directly.
 *
 * Internal to the spec suite — never re-exported from `public-api.ts`.
 */
export interface RovingTabindexMountResult {
  /**
   * The roving items, in document order. The contract reads
   * `tabindex` and dispatches `keydown` events on these elements.
   * Disabled items must still appear in the array — the contract uses
   * `enabledIndices` to know which ones to expect focus on.
   */
  items: HTMLElement[];
  /**
   * Indices into {@link items} that the contract should treat as
   * enabled. Defaults to "all of them" when omitted.
   */
  enabledIndices?: readonly number[];
  /**
   * Indices into {@link items} that the primitive considers **selected**,
   * in document order. Only read by the selection-aware scenarios; a mount
   * factory that omits it declares "nothing is selected".
   */
  selectedIndices?: readonly number[];
  /**
   * Drain Angular's render pipeline. Must be the canonical async waiter
   * (`flush` from `renderHost()` / `test-utils/flush.ts`) — a sync-only
   * function would type-check behind the contract's `await` while
   * under-waiting, letting an assertion run against stale DOM.
   */
  flush: () => Promise<void>;
}

export interface RovingTabindexContractSetup {
  /**
   * Mount with the primitive's default orientation, default direction
   * (`ltr`), and all items enabled.
   */
  mount: () => RovingTabindexMountResult | Promise<RovingTabindexMountResult>;
  /**
   * Mount with at least one item disabled in the middle of the list, so
   * the contract can verify that arrow navigation skips it.
   */
  mountWithDisabledMiddle?: () => RovingTabindexMountResult | Promise<RovingTabindexMountResult>;
  /**
   * Mount with the FIRST item disabled, so the contract can verify the
   * entry-point computation (first-enabled item gets `tabindex=0`).
   */
  mountWithDisabledFirst?: () => RovingTabindexMountResult | Promise<RovingTabindexMountResult>;
  /**
   * Mount with `dir="rtl"`. The contract verifies that `ArrowLeft`
   * advances focus (the "logical forward" direction in RTL).
   */
  mountRtl?: () => RovingTabindexMountResult | Promise<RovingTabindexMountResult>;
  /**
   * Mount with exactly ONE item selected, and not the first enabled one —
   * otherwise the assertion cannot distinguish "the tab stop followed the
   * selection" from "the tab stop stayed at the default entry point". The
   * result must report the selected item through `selectedIndices`.
   */
  mountWithSelection?: () => RovingTabindexMountResult | Promise<RovingTabindexMountResult>;
  /**
   * Mount with TWO OR MORE items selected (a `multiple` collection). The
   * contract verifies the group still exposes exactly one tab stop, on the
   * first selected item.
   */
  mountWithMultiSelection?: () => RovingTabindexMountResult | Promise<RovingTabindexMountResult>;
  /**
   * Mount with the selection sitting on a **disabled** item. The contract
   * verifies the disabled item never wins the tab stop and the entry point
   * falls back to the first enabled item. The result must report the
   * disabled item in `selectedIndices` and exclude it from `enabledIndices`.
   */
  mountWithSelectedDisabled?: () => RovingTabindexMountResult | Promise<RovingTabindexMountResult>;
}

export interface RovingTabindexContractOptions {
  /**
   * The orientation-positive arrow key for this primitive's default
   * orientation. Toolbar / Tabs / RadioGroup default to `'ArrowRight'`;
   * Listbox / Menu / vertical Tabs default to `'ArrowDown'`. The
   * contract uses this to verify forward navigation and
   * `End` semantics.
   */
  forwardArrow?: 'ArrowRight' | 'ArrowDown';
}

const dispatchKey = (target: EventTarget, key: string): void => {
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
};

const enabled = (r: RovingTabindexMountResult): readonly number[] =>
  r.enabledIndices ?? r.items.map((_, i) => i);

const selected = (r: RovingTabindexMountResult): readonly number[] => r.selectedIndices ?? [];

const tabStops = (r: RovingTabindexMountResult): number[] =>
  r.items.reduce<number[]>((acc, item, i) => {
    if (item.getAttribute('tabindex') === '0') {
      acc.push(i);
    }
    return acc;
  }, []);

/**
 * Run the roving-tabindex contract assertions inside a
 * `describe('roving-tabindex contract', …)` block.
 */
export function assertRovingTabindexContract(
  setup: RovingTabindexContractSetup,
  options: RovingTabindexContractOptions = {},
): void {
  const forward = options.forwardArrow ?? 'ArrowRight';

  describe('roving-tabindex contract', () => {
    it('puts tabindex="0" on the first enabled item and tabindex="-1" on the rest', async () => {
      const r = await setup.mount();
      const enabledIdx = enabled(r);
      const firstEnabled = enabledIdx[0]!;
      r.items.forEach((item, i) => {
        const expected = i === firstEnabled ? '0' : '-1';
        expect(item.getAttribute('tabindex')).toBe(expected);
      });
    });

    it('Home jumps focus to the first enabled item', async () => {
      const r = await setup.mount();
      const enabledIdx = enabled(r);
      const last = enabledIdx[enabledIdx.length - 1]!;
      r.items[last]!.focus();
      dispatchKey(r.items[last]!, 'Home');
      await r.flush();
      expect(document.activeElement).toBe(r.items[enabledIdx[0]!]);
    });

    it('End jumps focus to the last enabled item', async () => {
      const r = await setup.mount();
      const enabledIdx = enabled(r);
      const first = enabledIdx[0]!;
      r.items[first]!.focus();
      dispatchKey(r.items[first]!, 'End');
      await r.flush();
      expect(document.activeElement).toBe(r.items[enabledIdx[enabledIdx.length - 1]!]);
    });

    it(`${forward} advances focus to the next enabled item`, async () => {
      const r = await setup.mount();
      const enabledIdx = enabled(r);
      // The required `mount` factory must yield at least two enabled items —
      // otherwise there is nothing to advance to and the assertion below would
      // never run. Surface a misconfigured mount as a failure, not a green
      // no-op.
      expect(enabledIdx.length).toBeGreaterThanOrEqual(2);
      const a = enabledIdx[0]!;
      const b = enabledIdx[1]!;
      r.items[a]!.focus();
      dispatchKey(r.items[a]!, forward);
      await r.flush();
      expect(document.activeElement).toBe(r.items[b]);
    });

    if (setup.mountWithDisabledFirst) {
      it('skips disabled items at the head when picking the entry point', async () => {
        const r = await setup.mountWithDisabledFirst!();
        const enabledIdx = enabled(r);
        const firstEnabled = enabledIdx[0]!;
        // The first disabled item must NOT have tabindex=0.
        for (let i = 0; i < firstEnabled; i++) {
          expect(r.items[i]!.getAttribute('tabindex')).toBe('-1');
        }
        expect(r.items[firstEnabled]!.getAttribute('tabindex')).toBe('0');
      });
    }

    if (setup.mountWithDisabledMiddle) {
      it(`${forward} skips disabled items mid-list during arrow navigation`, async () => {
        const r = await setup.mountWithDisabledMiddle!();
        const enabledIdx = enabled(r);
        // The consumer opted into this variant, so a sub-2-item mount is a
        // misconfiguration — fail rather than skip silently.
        expect(enabledIdx.length).toBeGreaterThanOrEqual(2);
        const a = enabledIdx[0]!;
        const b = enabledIdx[1]!;
        // a → b should jump over any disabled items between them.
        expect(b - a).toBeGreaterThan(1);
        r.items[a]!.focus();
        dispatchKey(r.items[a]!, forward);
        await r.flush();
        expect(document.activeElement).toBe(r.items[b]);
      });
    }

    if (setup.mountRtl) {
      it('RTL inverts ArrowLeft / ArrowRight (ArrowLeft becomes the forward direction)', async () => {
        const r = await setup.mountRtl!();
        const enabledIdx = enabled(r);
        // The consumer opted into this variant, so a sub-2-item mount is a
        // misconfiguration — fail rather than skip silently.
        expect(enabledIdx.length).toBeGreaterThanOrEqual(2);
        const a = enabledIdx[0]!;
        const b = enabledIdx[1]!;
        r.items[a]!.focus();
        dispatchKey(r.items[a]!, 'ArrowLeft');
        await r.flush();
        expect(document.activeElement).toBe(r.items[b]);
      });
    }

    if (setup.mountWithSelection) {
      it('moves the tab stop to the selected item instead of the first enabled one', async () => {
        const r = await setup.mountWithSelection!();
        const selectedIdx = selected(r);
        // A selection on the default entry point would make the assertion
        // pass for the wrong reason — surface the misconfigured mount.
        expect(selectedIdx).toHaveLength(1);
        expect(selectedIdx[0]).not.toBe(enabled(r)[0]);
        expect(tabStops(r)).toEqual([selectedIdx[0]]);
      });
    }

    if (setup.mountWithMultiSelection) {
      it('exposes exactly one tab stop, on the first selected item, with several selected', async () => {
        const r = await setup.mountWithMultiSelection!();
        const selectedIdx = selected(r);
        // The consumer opted into this variant, so a sub-2-selection mount
        // is a misconfiguration — fail rather than assert a single-selection
        // ladder under a multi-selection name.
        expect(selectedIdx.length).toBeGreaterThanOrEqual(2);
        expect(tabStops(r)).toEqual([selectedIdx[0]]);
      });
    }

    if (setup.mountWithSelectedDisabled) {
      it('never parks the tab stop on a selected-but-disabled item (#1132 / #1170)', async () => {
        const r = await setup.mountWithSelectedDisabled!();
        const selectedIdx = selected(r);
        const enabledIdx = enabled(r);
        // Every selected item must be disabled for this variant to prove
        // anything — otherwise the fallback below never has to happen.
        expect(selectedIdx.length).toBeGreaterThanOrEqual(1);
        for (const i of selectedIdx) {
          expect(enabledIdx).not.toContain(i);
        }
        expect(tabStops(r)).toEqual([enabledIdx[0]]);
      });
    }
  });
}
