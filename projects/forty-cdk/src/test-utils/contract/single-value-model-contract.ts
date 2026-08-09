/**
 * Shared contract for the shape of a **single-value selection / open-item
 * model** — `model<string | null>(null)`, with `null` as the "nothing
 * selected / nothing open" sentinel and never the empty string.
 *
 * The adopters are derived rather than listed:
 * `src/lib/single-value-model-adopters.spec.ts` folds library source for a
 * root declaring a non-array `model<string…>` named `value` and fails on one
 * that never calls this contract. That is the same source-derived shape
 * `data-state-adopters.spec.ts` uses, and it exists for the reason
 * `.claude/rules/testing.md` states: a missing adopter is otherwise invisible,
 * since the suite reports N green primitives whether the roster lists N or
 * N + 1. Hand-enumerating this family is precisely how it grew a fifth member
 * nobody brought onto the shape — `ForMenuRadioGroup` shipped
 * `model<string>('')` for as long as the convention named four
 * ([#1725](https://github.com/tutkli/forty-cdk/issues/1725)).
 *
 * The failure the shape prevents is silent and ARIA-only: with `''` doubling
 * as the sentinel, an item whose own `value` is `''` — the ordinary markup for
 * a "None" / "Default" / "Any" option in a sort-order or filter control — is
 * indistinguishable from nothing being selected, so it announces as checked
 * with nothing chosen. The DOM stays internally consistent and every
 * per-primitive spec keeps passing, which is why the assertions below mount an
 * `''`-valued item deliberately rather than trusting a primitive's own
 * fixtures to have one.
 *
 * The contract owns exactly the value-model shape:
 *
 *   - **It rests at the sentinel**, with no item reporting selected — the
 *     `''` item included.
 *   - **`''` is a value, not the sentinel.** Choosing the `''` item selects it
 *     and it alone, and the model holds `''` rather than `null`.
 *   - **Clearing returns to the sentinel**, never to `''`, and leaves nothing
 *     reported selected.
 *
 * What the model *means* per primitive stays with that primitive's own suite:
 * how an item is activated, whether selection follows focus, what closes an
 * open item. Keeping the scope this narrow is what lets a selection root
 * (Tabs, RadioGroup, MenuRadioGroup) and an open-item root (Menubar,
 * NavigationMenu) adopt it verbatim — the only per-primitive detail is which
 * always-emit ARIA attribute carries the state.
 *
 * Internal to the spec suite — never re-exported from `public-api.ts`.
 */

/**
 * The always-emit ARIA attribute an item of this family reflects its
 * selected / open state through. All three carry an explicit `"true"` /
 * `"false"` on every render per the ARIA emission table in
 * `.claude/rules/conventions.md`, which is what lets the contract assert the
 * negative state rather than the absence of an attribute.
 */
export type SingleValueSelectionAttribute = 'aria-selected' | 'aria-checked' | 'aria-expanded';

export interface SingleValueModelMountResult {
  /**
   * The value the root's `[(value)]` model currently holds, read back from
   * the consumer signal the fixture binds — the public two-way channel, never
   * the directive's own field.
   */
  value: () => string | null;
  /**
   * The items whose selected / open state the model drives, keyed by the
   * `value` each one carries. Must include an item valued `''`: that item is
   * the contract's subject, and a mount without one leaves every assertion
   * below passing against a primitive that cannot express the distinction.
   *
   * Resolved after every {@link flush}, so an item mounted behind an `@if`
   * resolves per state. A key that resolves to `null` fails the declaration
   * case rather than being skipped — unlike the `data-state` contract, every
   * item here must be present in every state, because the claim is about what
   * the *unselected* ones report.
   */
  items: () => Readonly<Record<string, HTMLElement | null>>;
  /**
   * Select / open the item carrying `value`, through the primitive's own
   * channel (a click on the item, an activation key) rather than by writing
   * the model. The contract awaits {@link flush} afterwards.
   */
  activate: (value: string) => void;
  /**
   * Return the model to the sentinel through the consumer's two-way binding —
   * `signal.set(null)`. This is the one channel every member of the family
   * shares: a selection root has no internal deselect, and an open-item root
   * closes through a dismissal its own suite already covers.
   */
  clear: () => void;
  /**
   * Drain Angular's render pipeline. Must be the canonical async waiter
   * (`flush` from `renderHost()` / `test-utils/flush.ts`) — a sync-only
   * function would type-check behind the contract's `await` while
   * under-waiting, letting an assertion run against stale DOM.
   */
  flush: () => Promise<void>;
}

export interface SingleValueModelContractSetup {
  /**
   * Mount the primitive at rest, with its `[(value)]` bound to a consumer
   * signal seeded with `null`, and with one of its items valued `''`.
   */
  mount: () => SingleValueModelMountResult | Promise<SingleValueModelMountResult>;
}

export interface SingleValueModelContractOptions {
  /** The attribute this primitive's items reflect their state through. */
  selectionAttribute: SingleValueSelectionAttribute;
  /**
   * A label for the root this call covers, appended to the `describe` title.
   * Needed only when one entry point adopts the contract more than once.
   */
  label?: string;
}

const reported = (
  items: Readonly<Record<string, HTMLElement | null>>,
  attribute: string,
): Record<string, string | null> =>
  Object.fromEntries(
    Object.entries(items).map(([value, el]) => [value, el?.getAttribute(attribute) ?? null]),
  );

const allUnselected = (
  items: Readonly<Record<string, HTMLElement | null>>,
): Record<string, string> =>
  Object.fromEntries(Object.keys(items).map((value) => [value, 'false']));

const onlySelected = (
  items: Readonly<Record<string, HTMLElement | null>>,
  selected: string,
): Record<string, string> =>
  Object.fromEntries(
    Object.keys(items).map((value) => [value, value === selected ? 'true' : 'false']),
  );

/**
 * Run the single-value model assertions inside a
 * `describe('single-value model contract', …)` block.
 *
 * Five cases, and the first exists to fail a misconfigured adoption rather
 * than a broken primitive: a mount with no `''` item, or with fewer than two,
 * would leave every case below passing against a primitive whose sentinel and
 * whose empty-string value are the same thing.
 *
 * The three state cases compare **every** item in one object equality, so a
 * failure names the item that drifted rather than reporting a bare `false`.
 */
export function assertSingleValueModelContract(
  setup: SingleValueModelContractSetup,
  options: SingleValueModelContractOptions,
): void {
  const { selectionAttribute } = options;
  const title = options.label
    ? `single-value model contract (${options.label})`
    : 'single-value model contract';

  describe(title, () => {
    it('mounts at least two items, one of them valued ""', async () => {
      const ctx = await setup.mount();
      await ctx.flush();

      const items = ctx.items();
      expect(Object.keys(items).length).toBeGreaterThanOrEqual(2);
      expect(Object.keys(items)).toContain('');
      expect(Object.values(items).filter((el) => el === null)).toEqual([]);
    });

    it('rests at the null sentinel with no item reported selected', async () => {
      const ctx = await setup.mount();
      await ctx.flush();

      expect(ctx.value()).toBeNull();
      expect(reported(ctx.items(), selectionAttribute)).toEqual(allUnselected(ctx.items()));
    });

    it('treats "" as a selectable value distinct from the sentinel', async () => {
      const ctx = await setup.mount();
      await ctx.flush();

      ctx.activate('');
      await ctx.flush();

      expect(ctx.value()).toBe('');
      expect(reported(ctx.items(), selectionAttribute)).toEqual(onlySelected(ctx.items(), ''));
    });

    it('reports exactly one item selected at a time', async () => {
      const ctx = await setup.mount();
      await ctx.flush();

      const other = Object.keys(ctx.items()).find((value) => value !== '')!;
      ctx.activate('');
      await ctx.flush();
      ctx.activate(other);
      await ctx.flush();

      expect(ctx.value()).toBe(other);
      expect(reported(ctx.items(), selectionAttribute)).toEqual(onlySelected(ctx.items(), other));
    });

    it('returns to the null sentinel, never to "", when cleared', async () => {
      const ctx = await setup.mount();
      await ctx.flush();

      ctx.activate('');
      await ctx.flush();
      ctx.clear();
      await ctx.flush();

      expect(ctx.value()).toBeNull();
      expect(reported(ctx.items(), selectionAttribute)).toEqual(allUnselected(ctx.items()));
    });
  });
}
