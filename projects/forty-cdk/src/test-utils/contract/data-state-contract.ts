/**
 * Shared contract suite for the `data-state` styling vocabulary every
 * primitive reflects. Adopted by every entry point whose pieces bind
 * `'[attr.data-state]'` to a **literal** value set: Accordion, Carousel,
 * Combobox, ContextMenu, DatePicker, Dialog, Disclosure, Drawer,
 * DropdownMenu, HoverCard, Listbox, Menu, Menubar, NavigationMenu, Popover,
 * RadioGroup, Select, Stepper, Switch, Tabs, TimePicker, Toggle, Tooltip,
 * Tree.
 *
 * The list is not maintained by hand: `data-state-adopters.spec.ts` derives
 * the emitting entry points from library source — the same extraction
 * `scripts/lib/convention-matrices.mjs` runs to generate the `data-state`
 * rows of the matrices in `.claude/rules/conventions.md` — and fails when one
 * of them has no `assertDataStateContract` call. That shared extraction is
 * what makes the docs gate and the test gate agree on one fact rather than on
 * two hand-copied rosters.
 *
 * The contract owns the three assertions that are identical across every
 * emitting piece, and each one has already regressed per-primitive:
 *
 *   - **The declared vocabulary is a documented one.** A fourth family
 *     invented for one primitive is a value set the consumer cannot guess
 *     from any other, so the declaration is checked against
 *     {@link DOCUMENTED_DATA_STATE_VOCABULARIES} — the executable twin of the
 *     canonical families and the _Documented alternative vocabularies_ table
 *     in `.claude/rules/conventions.md`.
 *   - **Every piece reflects the same vocabulary.** `data-state` is emitted on
 *     the root *and* the trigger / content / option, and the convention is
 *     that all of them speak the same value set — a piece that drifts onto
 *     its own spelling breaks a consumer's single `[data-state="open"]`
 *     selector.
 *   - **Boolean `data-*` are present or absent, never `="false"`.** The
 *     present/absent rule is the one [#108](https://github.com/tutkli/forty-cdk/issues/108)
 *     enforced library-wide, and it is asserted here over every `data-*`
 *     attribute the pieces happen to carry rather than over a per-primitive
 *     list, so a new boolean reflection is covered the day it ships.
 *
 * Deliberate exclusions:
 *
 *   - **A `data-state` computed by a signal or method.** The value set lives
 *     in the delegate's own type, so the source extraction cannot read it and
 *     the adoption guard cannot demand a declaration it has no way to check
 *     (Checkbox, Progress, ScrollArea, Table, and the individually-computed
 *     Drawer / NavigationMenu / Stepper / Tree pieces). This is the same
 *     boundary the generated matrix draws with its `data-state` computed by a
 *     signal / method row; an entry point on both sides of it adopts for its
 *     literal pieces only.
 *   - **Toast.** `[forToast]` binds the constant `'"open"'` — mount *is* open
 *     for a toast, so there is no second state to transition to and the
 *     sweep below has nothing to distinguish. Its singleton is still a row in
 *     {@link DOCUMENTED_DATA_STATE_VOCABULARIES} so the vocabulary gate keeps
 *     covering it.
 *   - **`data-highlighted`, `data-selected`, `data-disabled` and the rest of
 *     the boolean siblings** are asserted here only against the never-`"false"`
 *     rule. What they *mean* per primitive stays with that primitive's spec —
 *     the same scoping that keeps the overlay-trigger-ARIA contract to its
 *     trio.
 *
 * Internal to the spec suite — never re-exported from `public-api.ts`.
 */

/**
 * The value sets a `data-state` binding may emit, sorted within each row so a
 * declaration can be compared regardless of the order an adopter lists it in.
 *
 * The first three rows are the canonical families; the rest are the documented
 * alternatives. A new family belongs here **and** in the
 * `.claude/rules/conventions.md` vocabulary tables, in the same change — the
 * point of the pair is that neither can be updated alone without turning a
 * gate red.
 *
 * Two rows have no adopter today and are deliberately kept. The **tri-state**
 * checkbox family is canonical, and the one control that emits it (Checkbox)
 * computes its value through a signal, so it is outside this contract's scope
 * rather than outside the vocabulary; dropping the row would fail the
 * declaration gate for a documented family the day a tri-state control emits it
 * literally. The **`["open"]` singleton** is Toast's constant, which no adopter
 * can declare (the contract demands two states) but which the adoption guard's
 * vocabulary check still has to recognise.
 */
export const DOCUMENTED_DATA_STATE_VOCABULARIES: ReadonlyArray<readonly string[]> = [
  ['closed', 'open'],
  ['checked', 'unchecked'],
  ['checked', 'indeterminate', 'unchecked'],
  ['active', 'inactive'],
  ['completed', 'pending'],
  ['open'],
];

export interface DataStateMountResult {
  /**
   * Resolve the pieces reflecting `data-state`, keyed by a name the failure
   * message quotes (`'root'`, `'trigger'`, `'content'`). Called after every
   * `setState` + `flush`, so a portaled surface that exists only while open
   * resolves per state; a piece absent in the current state returns `null`
   * and is skipped rather than failing.
   *
   * Report only the pieces whose state is the one {@link setState} drives.
   * `[forMenuSubTrigger]` reflects the *submenu's* open state, so it belongs
   * to the sub's mount factory and not to the parent menu's.
   */
  pieces: () => Readonly<Record<string, HTMLElement | null>>;
  /**
   * Drive the primitive into `state` — one of the declared vocabulary's
   * values. Called before every `flush`, including for the state the
   * primitive already rests in.
   */
  setState: (state: string) => void;
  /**
   * Drain Angular's render pipeline. Must be the canonical async waiter
   * (`flush` from `renderHost()` / `test-utils/flush.ts`) — a sync-only
   * function would type-check behind the contract's `await` while
   * under-waiting, letting an assertion run against stale DOM.
   */
  flush: () => Promise<void>;
}

export interface DataStateContractSetup {
  /**
   * The value set this primitive's pieces emit. Must be a row of
   * {@link DOCUMENTED_DATA_STATE_VOCABULARIES} and carry at least two states:
   * with one state there is no transition, so every assertion below would
   * pass against a primitive whose `data-state` never changes.
   */
  vocabulary: readonly string[];
  /**
   * Mount the primitive in any state of the vocabulary. The contract calls
   * `setState` for the state it wants before asserting, so the mount's own
   * resting state does not matter.
   */
  mount: () => DataStateMountResult | Promise<DataStateMountResult>;
}

export interface DataStateContractOptions {
  /**
   * A label for the pieces this call covers, appended to the `describe`
   * title. Needed only when one entry point adopts the contract more than
   * once — Stepper's content panels (`active` / `inactive`) and its separator
   * (`completed` / `pending`) are two vocabularies in one spec, and two
   * identically-named `describe` blocks read as a duplicate.
   */
  label?: string;
}

const sorted = (values: readonly string[]): string[] => [...values].sort();

const isDocumented = (vocabulary: readonly string[]): boolean =>
  DOCUMENTED_DATA_STATE_VOCABULARIES.some(
    (documented) => sorted(documented).join('|') === sorted(vocabulary).join('|'),
  );

const present = (
  pieces: Readonly<Record<string, HTMLElement | null>>,
): Array<[string, HTMLElement]> =>
  Object.entries(pieces).filter((entry): entry is [string, HTMLElement] => entry[1] !== null);

/**
 * Run the `data-state` vocabulary assertions inside a
 * `describe('data-state contract', …)` block.
 *
 * Four cases, and two of them exist to fail a misconfigured adoption rather
 * than a broken primitive:
 *
 *   - **The declaration case** rejects a one-state vocabulary (nothing to
 *     transition between, so every case below would pass against a primitive
 *     whose `data-state` never changes) and a value set no family documents.
 *   - **One case per state** drives a fresh mount into that state and compares
 *     every reported piece's `data-state` in one object equality, so the
 *     failure names the piece that drifted. It fails a `pieces` resolver that
 *     returns `null` for everything, which would otherwise reduce that
 *     comparison to an empty-object equality.
 *   - **The sweep case** drives the whole vocabulary through **one** mount,
 *     which is what catches a `setState` that silently ignores a state: with a
 *     fresh mount per state a primitive pinned to its resting value fails only
 *     the state it does not rest in, whereas here the missing value is named.
 *   - **The never-`"false"` case** scans every `data-*` attribute the reported
 *     pieces carry in every state, so a new boolean reflection is covered the
 *     day it ships rather than when someone remembers to list it. It has no
 *     exemption list, because none of the adopters needs one; the day a piece
 *     reporting `data-checked` (`"true" | "false" | "mixed"`, the one
 *     non-boolean `data-*` the library ships) adopts, that exemption arrives
 *     with its first real use rather than as an untested option.
 */
export function assertDataStateContract(
  setup: DataStateContractSetup,
  options: DataStateContractOptions = {},
): void {
  const { vocabulary } = setup;
  const title = options.label ? `data-state contract (${options.label})` : 'data-state contract';

  describe(title, () => {
    it('declares a documented vocabulary of at least two states', () => {
      expect(vocabulary.length).toBeGreaterThanOrEqual(2);
      expect(isDocumented(vocabulary)).toBe(true);
    });

    for (const state of vocabulary) {
      it(`reflects data-state="${state}" on every piece that carries it`, async () => {
        const ctx = await setup.mount();
        ctx.setState(state);
        await ctx.flush();

        const reported = present(ctx.pieces());
        expect(reported.length).toBeGreaterThanOrEqual(1);
        expect(
          Object.fromEntries(reported.map(([name, el]) => [name, el.getAttribute('data-state')])),
        ).toEqual(Object.fromEntries(reported.map(([name]) => [name, state])));
      });
    }

    it('emits every declared state and nothing outside the vocabulary', async () => {
      const ctx = await setup.mount();
      const observed = new Set<string>();
      for (const state of vocabulary) {
        ctx.setState(state);
        await ctx.flush();
        for (const [, el] of present(ctx.pieces())) {
          const value = el.getAttribute('data-state');
          if (value !== null) {
            observed.add(value);
          }
        }
      }
      expect(sorted([...observed])).toEqual(sorted(vocabulary));
    });

    it('never emits a boolean data-* attribute with the literal "false"', async () => {
      const ctx = await setup.mount();
      const offenders: string[] = [];
      for (const state of vocabulary) {
        ctx.setState(state);
        await ctx.flush();
        for (const [name, el] of present(ctx.pieces())) {
          for (const attribute of el.getAttributeNames()) {
            if (!attribute.startsWith('data-')) {
              continue;
            }
            if (el.getAttribute(attribute) === 'false') {
              offenders.push(`${name}[${attribute}] in data-state="${state}"`);
            }
          }
        }
      }
      expect(offenders).toEqual([]);
    });
  });
}
