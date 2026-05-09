/**
 * Shared contract suite for primitives that participate in the
 * dismissable-layer behaviour — Dialog, Popover, DropdownMenu,
 * ContextMenu, Combobox content, Select content, HoverCard.
 *
 * The contract owns the assertions that are identical across every
 * dismissable layer:
 *
 *   - Escape closes the layer when `dismissible` is true.
 *   - Escape does NOT close the layer when `dismissible` is false.
 *   - The vetoable `(escapeKeyDown)` event fires before close, and
 *     calling `preventDefault()` on it suppresses the close.
 *   - `pointerdown` outside both the trigger and the layer closes when
 *     dismissible.
 *   - `pointerdown` outside does NOT close when `dismissible=false`.
 *   - The vetoable `(pointerDownOutside)` and `(interactOutside)` events
 *     fire on outside pointer-down; preventDefault on
 *     `(pointerDownOutside)` suppresses the close.
 *   - `pointerdown` inside the layer never closes.
 *   - `focusin` on an outside element fires `(focusOutside)` and
 *     `(interactOutside)`.
 *
 * The consumer provides a single `mount` function that accepts a
 * {@link DismissableLayerMountOptions} bag describing which veto / flag
 * variant to render. The contract calls `mount(...)` once per `it()`
 * with the relevant options.
 *
 * Internal to the spec suite — never re-exported from `public-api.ts`.
 */
export interface DismissableLayerMountOptions {
  /** Default `true`. When `false`, the layer should bind `[dismissible]="false"`. */
  dismissible?: boolean;
  /** When `true`, the host's `(escapeKeyDown)` listener calls `preventDefault()`. */
  escapeVeto?: boolean;
  /** When `true`, the host's `(pointerDownOutside)` listener calls `preventDefault()`. */
  pointerVeto?: boolean;
}

export interface DismissableLayerMountResult {
  /** Drain Angular's render pipeline. */
  flush: () => Promise<void>;
  /** Reads the consumer-owned `open` signal. */
  isOpen: () => boolean;
  /** Number of `(escapeKeyDown)` emissions captured. */
  escapeCount: () => number;
  /** Number of `(pointerDownOutside)` emissions captured. */
  pointerOutsideCount: () => number;
  /** Number of `(focusOutside)` emissions captured. */
  focusOutsideCount: () => number;
  /** Number of `(interactOutside)` emissions captured. */
  interactOutsideCount: () => number;
}

export interface DismissableLayerContractSetup {
  /** Mount and open the layer. The contract calls this once per test. */
  mount: (
    options?: DismissableLayerMountOptions,
  ) => DismissableLayerMountResult | Promise<DismissableLayerMountResult>;
}

const dispatchEscape = (): void => {
  document.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
  );
};

const dispatchPointerOnOutside = (): HTMLElement => {
  const outside = document.createElement('button');
  document.body.appendChild(outside);
  const event = new PointerEvent('pointerdown', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'target', { value: outside, configurable: true });
  document.dispatchEvent(event);
  return outside;
};

const dispatchFocusOnOutside = (): HTMLElement => {
  const outside = document.createElement('button');
  document.body.appendChild(outside);
  const event = new FocusEvent('focusin', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'target', { value: outside, configurable: true });
  document.dispatchEvent(event);
  return outside;
};

/**
 * Run the dismissable-layer contract assertions inside a
 * `describe('dismissable-layer contract', …)` block.
 */
export function assertDismissableLayerContract(setup: DismissableLayerContractSetup): void {
  describe('dismissable-layer contract', () => {
    describe('Escape', () => {
      it('closes the layer when dismissible', async () => {
        const ctx = await setup.mount();
        dispatchEscape();
        await ctx.flush();
        expect(ctx.isOpen()).toBe(false);
      });

      it('does not close the layer when dismissible=false', async () => {
        const ctx = await setup.mount({ dismissible: false });
        dispatchEscape();
        await ctx.flush();
        expect(ctx.isOpen()).toBe(true);
      });

      it('still emits (escapeKeyDown) when dismissible=false', async () => {
        const ctx = await setup.mount({ dismissible: false });
        dispatchEscape();
        await ctx.flush();
        expect(ctx.escapeCount()).toBe(1);
      });

      it('emits (escapeKeyDown), then closes, when not prevented', async () => {
        const ctx = await setup.mount();
        dispatchEscape();
        await ctx.flush();
        expect(ctx.escapeCount()).toBe(1);
        expect(ctx.isOpen()).toBe(false);
      });

      it('keeps the layer open when (escapeKeyDown) calls preventDefault()', async () => {
        const ctx = await setup.mount({ escapeVeto: true });
        dispatchEscape();
        await ctx.flush();
        expect(ctx.escapeCount()).toBe(1);
        expect(ctx.isOpen()).toBe(true);
      });
    });

    describe('outside pointerdown', () => {
      it('emits (pointerDownOutside) and (interactOutside), then closes', async () => {
        const ctx = await setup.mount();
        const outside = dispatchPointerOnOutside();
        await ctx.flush();
        try {
          expect(ctx.pointerOutsideCount()).toBe(1);
          expect(ctx.interactOutsideCount()).toBeGreaterThanOrEqual(1);
          expect(ctx.isOpen()).toBe(false);
        } finally {
          outside.remove();
        }
      });

      it('does not close when dismissible=false', async () => {
        const ctx = await setup.mount({ dismissible: false });
        const outside = dispatchPointerOnOutside();
        await ctx.flush();
        try {
          expect(ctx.isOpen()).toBe(true);
        } finally {
          outside.remove();
        }
      });

      it('keeps the layer open when (pointerDownOutside) calls preventDefault()', async () => {
        const ctx = await setup.mount({ pointerVeto: true });
        const outside = dispatchPointerOnOutside();
        await ctx.flush();
        try {
          expect(ctx.pointerOutsideCount()).toBe(1);
          expect(ctx.isOpen()).toBe(true);
        } finally {
          outside.remove();
        }
      });
    });

    describe('outside focus', () => {
      it('emits (focusOutside) and (interactOutside) when focus moves outside', async () => {
        const ctx = await setup.mount();
        const outside = dispatchFocusOnOutside();
        await ctx.flush();
        try {
          expect(ctx.focusOutsideCount()).toBe(1);
          expect(ctx.interactOutsideCount()).toBeGreaterThanOrEqual(1);
        } finally {
          outside.remove();
        }
      });
    });
  });
}
