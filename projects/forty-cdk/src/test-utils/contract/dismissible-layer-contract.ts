/**
 * Shared contract suite for primitives that participate in the
 * dismissible-layer behaviour.
 *
 * **The roster is not maintained here.** The family is "this piece pushes a
 * `DismissibleLayer`", which is derivable from source — the layer is injected
 * by exactly two core shells, `injectOverlayShell` and `injectModalShell` — so
 * `src/lib/dismissible-layer-adopters.spec.ts` derives every call site and
 * fails on one no adopter claims ([#1655](https://github.com/tutkli/forty-cdk/issues/1655)).
 * Read that file's registry for who adopts what. A hand-read header is how the
 * form-control roster silently lost four primitives, and this one had drifted
 * the same way: it claimed Combobox's Escape never reaches the layer, which
 * stopped being true when `[forComboboxContent]` wired the layer's Escape as a
 * fallback channel for presses that land on the surface rather than the input.
 *
 * **This contract owns per-primitive dismissal only.** Stack routing —
 * topmost-only dispatch, declared-nesting depth order, Escape-only layer
 * transparency, `stopPropagation`'s one-layer-per-Escape — is a property of
 * `DismissibleLayerStack`, asserted once over synthetic layers in
 * `core/src/dismissible-layer/dismissible-layer.spec.ts` and over two real
 * layers with real focus in the composition E2E routes. Adding it here would
 * re-run one stack's behaviour once per adopter and still could not state the
 * interesting cases, which need two layers.
 *
 * The assertions that are identical across every dismissible layer:
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
 * {@link DismissibleLayerMountOptions} bag describing which veto / flag
 * variant to render. The contract calls `mount(...)` once per `it()`
 * with the relevant options.
 *
 * Internal to the spec suite — never re-exported from `public-api.ts`.
 */
import { focusInOn, pointerDownOn } from '../outside-events';

export interface DismissibleLayerMountOptions {
  /** Default `true`. When `false`, the layer should bind `[dismissible]="false"`. */
  dismissible?: boolean;
  /** When `true`, the host's `(escapeKeyDown)` listener calls `preventDefault()`. */
  escapeVeto?: boolean;
  /** When `true`, the host's `(pointerDownOutside)` listener calls `preventDefault()`. */
  pointerVeto?: boolean;
}

export interface DismissibleLayerMountResult {
  /** Drain Angular's render pipeline. */
  flush: () => Promise<void>;
  /** Reads the consumer-owned `open` signal. */
  isOpen: () => boolean;
  /** Number of `(escapeKeyDown)` emissions captured. */
  escapeCount: () => number;
  /**
   * Number of `(pointerDownOutside)` emissions captured. Required unless the
   * adopter opts out of the outside-interaction scenarios.
   */
  pointerOutsideCount?: () => number;
  /**
   * Number of `(focusOutside)` emissions captured. Required unless the
   * adopter opts out of the outside-interaction scenarios.
   */
  focusOutsideCount?: () => number;
  /**
   * Number of `(interactOutside)` emissions captured. Required unless the
   * adopter opts out of the outside-interaction scenarios.
   */
  interactOutsideCount?: () => number;
}

export interface DismissibleLayerContractSetup {
  /** Mount and open the layer. The contract calls this once per test. */
  mount: (
    options?: DismissibleLayerMountOptions,
  ) => DismissibleLayerMountResult | Promise<DismissibleLayerMountResult>;
}

export interface DismissibleLayerContractOptions {
  /**
   * Does the layer expose a `[dismissible]` input? Default `true`. Set
   * `false` for a layer whose dismissal is not consumer-suppressible
   * (HoverCard), so the contract skips the `dismissible=false` rungs
   * instead of asserting an input that does not exist.
   */
  dismissibleFlag?: boolean;
  /**
   * Does the layer close on an outside pointer-down / focus, emitting the
   * `(pointerDownOutside)` / `(focusOutside)` / `(interactOutside)` trio?
   * Default `true`. Set `false` for a layer whose only document-level
   * channel is Escape (HoverCard, which closes on pointer-leave rather
   * than on an outside press).
   */
  outsideInteraction?: boolean;
  /**
   * A label for the layer this call covers, appended to the `describe` title.
   * Needed only when one spec adopts the contract more than once — Select /
   * DatePicker / TimePicker each push their layer through a different core
   * shell per `[modal]` mode, so two identically-named `describe` blocks read
   * as a duplicate.
   */
  label?: string;
}

// Outside nodes the contract appends to `document.body` to drive
// pointer-down / focus-outside paths. Tracked in module scope so the
// contract's own `afterEach` can scrub any survivors, the way
// `afterEachOverlayCleanup` owns its portal cleanup — individual `it()`
// blocks don't each have to remember a `try/finally`.
const outsideNodes: HTMLElement[] = [];

const appendOutsideNode = (): HTMLElement => {
  const outside = document.createElement('button');
  document.body.appendChild(outside);
  outsideNodes.push(outside);
  return outside;
};

const removeOutsideNodes = (): void => {
  for (const node of outsideNodes.splice(0)) {
    node.remove();
  }
};

const dispatchEscape = (): void => {
  document.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
  );
};

const dispatchPointerOnOutside = (): HTMLElement => {
  const outside = appendOutsideNode();
  pointerDownOn(outside);
  return outside;
};

const dispatchFocusOnOutside = (): HTMLElement => {
  const outside = appendOutsideNode();
  focusInOn(outside);
  return outside;
};

// The outside-emission counters are optional on the mount result so a layer
// that opts out of `outsideInteraction` need not fabricate them. Inside the
// opted-in scenarios their absence is a misconfigured adopter, not a
// tolerable gap: throw rather than silently assert `undefined`.
const countOf = (counter: (() => number) | undefined): number => {
  if (counter === undefined) {
    throw new Error(
      'dismissible-layer contract: the mount result must provide the outside-emission counters unless `outsideInteraction: false` is passed.',
    );
  }
  return counter();
};

/**
 * Run the dismissible-layer contract assertions inside a
 * `describe('dismissible-layer contract', …)` block.
 */
export function assertDismissibleLayerContract(
  setup: DismissibleLayerContractSetup,
  options: DismissibleLayerContractOptions = {},
): void {
  const dismissibleFlag = options.dismissibleFlag ?? true;
  const outsideInteraction = options.outsideInteraction ?? true;
  const title = options.label
    ? `dismissible-layer contract (${options.label})`
    : 'dismissible-layer contract';

  describe(title, () => {
    // The contract owns its own cleanup: any outside node a test appended to
    // `document.body` is scrubbed here, so a throwing assertion can never leave
    // a stray <button> attached for the next spec.
    afterEach(() => {
      removeOutsideNodes();
    });

    describe('Escape', () => {
      it('closes the layer when dismissible', async () => {
        const ctx = await setup.mount();
        dispatchEscape();
        await ctx.flush();
        expect(ctx.isOpen()).toBe(false);
      });

      if (dismissibleFlag) {
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
      }

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

    if (outsideInteraction) {
      describe('outside pointerdown', () => {
        it('emits (pointerDownOutside) and (interactOutside), then closes', async () => {
          const ctx = await setup.mount();
          dispatchPointerOnOutside();
          await ctx.flush();
          expect(countOf(ctx.pointerOutsideCount)).toBe(1);
          expect(countOf(ctx.interactOutsideCount)).toBeGreaterThanOrEqual(1);
          expect(ctx.isOpen()).toBe(false);
        });

        if (dismissibleFlag) {
          it('does not close when dismissible=false', async () => {
            const ctx = await setup.mount({ dismissible: false });
            dispatchPointerOnOutside();
            await ctx.flush();
            expect(ctx.isOpen()).toBe(true);
          });
        }

        it('keeps the layer open when (pointerDownOutside) calls preventDefault()', async () => {
          const ctx = await setup.mount({ pointerVeto: true });
          dispatchPointerOnOutside();
          await ctx.flush();
          expect(countOf(ctx.pointerOutsideCount)).toBe(1);
          expect(ctx.isOpen()).toBe(true);
        });
      });

      describe('outside focus', () => {
        it('emits (focusOutside) and (interactOutside) when focus moves outside', async () => {
          const ctx = await setup.mount();
          dispatchFocusOnOutside();
          await ctx.flush();
          expect(countOf(ctx.focusOutsideCount)).toBe(1);
          expect(countOf(ctx.interactOutsideCount)).toBeGreaterThanOrEqual(1);
        });
      });
    }
  });
}
