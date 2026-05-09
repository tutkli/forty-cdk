/**
 * Shared contract suite for primitives that own a roving-tabindex
 * keyboard model — Toolbar, ToggleGroup, RadioGroup, Tabs, Listbox,
 * Menu (and submenus), Menubar.
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
  /** Drain Angular's render pipeline. */
  flush: () => void | Promise<void>;
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
  mountWithDisabledMiddle?: () =>
    | RovingTabindexMountResult
    | Promise<RovingTabindexMountResult>;
  /**
   * Mount with the FIRST item disabled, so the contract can verify the
   * entry-point computation (first-enabled item gets `tabindex=0`).
   */
  mountWithDisabledFirst?: () =>
    | RovingTabindexMountResult
    | Promise<RovingTabindexMountResult>;
  /**
   * Mount with `dir="rtl"`. The contract verifies that `ArrowLeft`
   * advances focus (the "logical forward" direction in RTL).
   */
  mountRtl?: () => RovingTabindexMountResult | Promise<RovingTabindexMountResult>;
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
  target.dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
  );
};

const enabled = (r: RovingTabindexMountResult): readonly number[] =>
  r.enabledIndices ?? r.items.map((_, i) => i);

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
      if (enabledIdx.length < 2) {
        // Nothing to advance to — skip silently.
        return;
      }
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
        if (enabledIdx.length < 2) return;
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
        if (enabledIdx.length < 2) return;
        const a = enabledIdx[0]!;
        const b = enabledIdx[1]!;
        r.items[a]!.focus();
        dispatchKey(r.items[a]!, 'ArrowLeft');
        await r.flush();
        expect(document.activeElement).toBe(r.items[b]);
      });
    }
  });
}
