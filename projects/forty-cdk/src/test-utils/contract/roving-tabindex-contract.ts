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
 *   - **An arrow held with Alt or Meta is left to the browser** — those are
 *     its history shortcuts, so the event stays unprevented and neither
 *     focus nor any item state moves
 *     ([#2241](https://github.com/tutkli/forty-cdk/issues/2241)). It runs on
 *     the required `mount`, so every adopter the meta-guard counts runs it.
 *   - **An item disabled while it holds focus keeps the keyboard** — the
 *     forward arrow still moves focus off it
 *     ([#2140](https://github.com/tutkli/forty-cdk/issues/2140)). Every
 *     adopter supplies that mount; the meta-guard counts it.
 *   - **An item that leaves while it holds the tab stop leaves exactly one
 *     behind** among the survivors ([#2239](https://github.com/tutkli/forty-cdk/issues/2239)).
 *     It is {@link assertRovingRemovalContract}, which the excluded trackers
 *     call on their own; the meta-guard counts the mount for every tracker.
 *   - **Focus follows an item that leaves only if the item held it** — for
 *     the groups pairing with `injectRovingFocusRestore`: a removal moves the
 *     focus it held, including after a disable in place, and moves nothing once
 *     focus has left the group (#2239).
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
  /**
   * Mount with every item enabled and a way to disable the FIRST one in place.
   * The contract focuses it, disables it, and verifies the forward arrow moves
   * focus to the second item, which must stay enabled.
   */
  mountWithInPlaceDisable?: () => RovingInPlaceDisableMount | Promise<RovingInPlaceDisableMount>;
  /**
   * Mount with a way to remove one item from the group. The contract focuses
   * it, removes it, and verifies exactly one survivor owns the tab stop.
   */
  mountWithRemoval?: () => RovingRemovalMount | Promise<RovingRemovalMount>;
  /**
   * Mount for a group pairing with `injectRovingFocusRestore`, with a way to
   * disable and to remove one item. The contract verifies a removal moves the
   * focus the item held, also after a disable in place, and moves nothing once
   * focus has left the group.
   */
  mountWithFocusRestore?: () => RovingFocusRestoreMount | Promise<RovingFocusRestoreMount>;
}

export interface RovingInPlaceDisableMount extends RovingTabindexMountResult {
  /** Disable the first item without moving focus. The contract flushes afterwards. */
  disableFirst: () => void;
}

export interface RovingRemovalMount extends RovingTabindexMountResult {
  /** Index into {@link items} of the item the contract focuses and then removes. */
  removedIndex: number;
  /**
   * Remove `items[removedIndex]` from the group without moving focus; other
   * items may leave with it. The contract flushes afterwards.
   */
  remove: () => void;
}

export interface RovingFocusRestoreMount extends RovingRemovalMount {
  /** Disable `items[removedIndex]` without moving focus. The contract flushes afterwards. */
  disable: () => void;
}

export interface RovingRemovalContractSetup {
  /** See {@link RovingTabindexContractSetup.mountWithRemoval}. */
  mountWithRemoval: () => RovingRemovalMount | Promise<RovingRemovalMount>;
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

const dispatchKey = (
  target: EventTarget,
  key: string,
  init: KeyboardEventInit = {},
): KeyboardEvent => {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
};

const ITEM_STATE_ATTRIBUTES = [
  'tabindex',
  'aria-checked',
  'aria-selected',
  'aria-pressed',
  'aria-current',
  'data-state',
] as const;

const itemStates = (r: RovingTabindexMountResult): (string | null)[][] =>
  r.items.map((item) => ITEM_STATE_ATTRIBUTES.map((name) => item.getAttribute(name)));

const enabled = (r: RovingTabindexMountResult): readonly number[] =>
  r.enabledIndices ?? r.items.map((_, i) => i);

const selected = (r: RovingTabindexMountResult): readonly number[] => r.selectedIndices ?? [];

const reflectsDisabled = (el: HTMLElement): boolean =>
  el.getAttribute('aria-disabled') === 'true' || el.hasAttribute('data-disabled');

const tabStops = (r: RovingTabindexMountResult): number[] =>
  r.items.reduce<number[]>((acc, item, i) => {
    if (item.getAttribute('tabindex') === '0') {
      acc.push(i);
    }
    return acc;
  }, []);

const survivingTabStops = (r: RovingTabindexMountResult): HTMLElement[] =>
  r.items.filter((item) => item.isConnected && item.getAttribute('tabindex') === '0');

const focusRemovable = async (r: RovingRemovalMount): Promise<HTMLElement> => {
  const target = r.items[r.removedIndex]!;
  target.focus();
  await r.flush();
  expect(document.activeElement).toBe(target);
  expect(target.getAttribute('tabindex')).toBe('0');
  return target;
};

/**
 * Run the removal rung of the roving-tabindex contract inside a
 * `describe('roving-tabindex removal contract', …)` block: after the item
 * holding the tab stop leaves, exactly one surviving item owns it.
 * {@link assertRovingTabindexContract} runs it for `mountWithRemoval`; a
 * tracker excluded from that contract calls it directly.
 */
export function assertRovingRemovalContract(setup: RovingRemovalContractSetup): void {
  describe('roving-tabindex removal contract', () => {
    it('leaves exactly one tab stop among the survivors when the item holding it leaves', async () => {
      const r = await setup.mountWithRemoval();
      const target = await focusRemovable(r);

      r.remove();
      await r.flush();

      expect(target.isConnected).toBe(false);
      expect(r.items.some((item) => item.isConnected)).toBe(true);
      expect(survivingTabStops(r)).toHaveLength(1);
    });
  });
}

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

    for (const modifier of ['altKey', 'metaKey'] as const) {
      it(`leaves arrows held with ${modifier} to the browser`, async () => {
        const r = await setup.mount();
        const enabledIdx = enabled(r);
        expect(enabledIdx.length).toBeGreaterThanOrEqual(2);
        const backward = forward === 'ArrowRight' ? 'ArrowLeft' : 'ArrowUp';

        for (const [from, key] of [
          [enabledIdx[0]!, forward],
          [enabledIdx[1]!, backward],
        ] as const) {
          const item = r.items[from]!;
          item.focus();
          await r.flush();
          const before = itemStates(r);

          const event = dispatchKey(item, key, { [modifier]: true });
          await r.flush();

          expect(event.defaultPrevented).toBe(false);
          expect(document.activeElement).toBe(item);
          expect(itemStates(r)).toEqual(before);
        }
      });
    }

    if (setup.mountWithInPlaceDisable) {
      it(`${forward} moves focus off an item disabled while it holds focus`, async () => {
        const r = await setup.mountWithInPlaceDisable!();
        expect(r.items.length).toBeGreaterThanOrEqual(2);
        const [first, second] = [r.items[0]!, r.items[1]!];
        first.focus();
        await r.flush();
        r.disableFirst();
        await r.flush();
        expect(reflectsDisabled(first)).toBe(true);
        expect(reflectsDisabled(second)).toBe(false);
        expect(document.activeElement).toBe(first);

        dispatchKey(first, forward);
        await r.flush();
        expect(document.activeElement).toBe(second);
      });
    }

    if (setup.mountWithRemoval) {
      assertRovingRemovalContract({ mountWithRemoval: setup.mountWithRemoval });
    }

    if (setup.mountWithFocusRestore) {
      it('moves focus to the new tab stop when the focused item leaves', async () => {
        const r = await setup.mountWithFocusRestore!();
        await focusRemovable(r);

        r.remove();
        await r.flush();

        const stops = survivingTabStops(r);
        expect(stops).toHaveLength(1);
        expect(document.activeElement).toBe(stops[0]);
      });

      it('moves focus to the new tab stop when an item disabled while focused leaves', async () => {
        const r = await setup.mountWithFocusRestore!();
        const target = await focusRemovable(r);
        r.disable();
        await r.flush();
        expect(reflectsDisabled(target)).toBe(true);
        expect(document.activeElement).toBe(target);

        r.remove();
        await r.flush();

        const stops = survivingTabStops(r);
        expect(stops).toHaveLength(1);
        expect(document.activeElement).toBe(stops[0]);
      });

      it('moves no focus when the item leaves after focus left the group', async () => {
        const r = await setup.mountWithFocusRestore!();
        const target = await focusRemovable(r);
        target.blur();
        await r.flush();
        expect(document.activeElement).toBe(document.body);

        r.remove();
        await r.flush();

        expect(document.activeElement).toBe(document.body);
      });
    }

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
