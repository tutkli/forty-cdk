import type { Signal } from '@angular/core';

/**
 * Shared contract for the **positioning-input family**: the trigger-anchored
 * overlay roots that inherit the ten floating-ui positioning inputs and the
 * five effective computeds over them from one of the two twin bases
 * (`AnchoredOverlayPositioningBase`, or `AnchoredFormValueControlBase` for the
 * five roots that must also extend `FormUiControlBase`).
 *
 * The adopters are derived rather than listed:
 * `src/lib/anchored-positioning-adopters.spec.ts` folds library source for a
 * root extending either base — directly or through `MenuOverlayHost` /
 * `DatePickerBase` — and fails on one the registry does not cover. That is the
 * shape `.claude/rules/testing.md` prescribes over every guard in this folder,
 * for the reason it states: a missing adopter is otherwise invisible, since the
 * suite reports N green primitives whether the roster lists N or N + 1.
 *
 * The failure the family's drift produced is the one
 * [#1726](https://github.com/tutkli/forty-cdk/issues/1726) was opened over and
 * it reached consumers: with the base adopted by three of thirteen roots,
 * `side` / `align` were scope-defaultable for Popover / Tooltip / HoverCard and
 * silently ignored on the other ten, so a design system could state "our popups
 * align to `end`" for three primitives and discovered the rest by trying. There
 * was no gate over "these roots answer the same questions the same way" —
 * `provideForSelectDefaults({ align: 'end' })` type-checked, resolved, and did
 * nothing.
 *
 * The contract owns exactly the shape of that read surface:
 *
 *   - **The six non-seed values are the shared constant, everywhere.** They
 *     come from one `ANCHORED_POSITIONING_DEFAULTS` source, so a root that
 *     resolves one of them differently has re-declared the block.
 *   - **The four placement seeds resolve to this root's own library
 *     placement** at rest — the numbers `main` produced before the roots were
 *     folded onto the base, stated per adopter because `sideOffset` genuinely
 *     varies (`0` flush at a pointer, `4` for a trigger button, `8` for a
 *     larger surface).
 *   - **Each of the four seeds reaches the root from its own scope defaults
 *     provider**, which is the capability #1726 delivered.
 *   - **A per-instance binding wins over the scope default, for all ten
 *     inputs** — which is also where the inherited block is proven to bind at
 *     all: alias (`side` / `align` / `sideOffset` / `alignOffset` /
 *     `collisionPadding`), transform (`numberAttribute` / `booleanAttribute`),
 *     and inheritance through two levels of base all have to survive the
 *     compile for the case to pass.
 *
 * **Adoption is a registry entry rather than a call from each primitive's own
 * spec, and that is deliberate.** The other seven contracts in this folder are
 * called from the adopting primitive's suite because each states something
 * about that primitive alone. This one states that *thirteen unrelated classes
 * answer the same ten questions the same way*, so its subject is the set: the
 * thirteen roots mount together in one host, one `TestBed` per case, and the
 * per-root variation is four numbers. Splitting it into thirteen self-contained
 * adoptions would mean thirteen copies of the same two fixtures and would
 * leave the identity claim stated nowhere. This is the sweep-first shape the
 * SSR suite uses for the same reason — *a new primitive owes a registry entry,
 * never a hand-written `it`*.
 *
 * What the contract deliberately does not own is what the positioner then
 * *does* with the resolved placement — `data-side` / `data-align` / the
 * `--for-floating-*` properties are asserted over the positioner itself in
 * `core-overlay/src/floating/floating.spec.ts`, and the wiring in between (each
 * content directive forwarding the ten effective computeds into
 * `injectOverlayShell`) is a source claim the adopter roster makes over every
 * `kind: 'floating'` block in the library. Re-running the positioner's own
 * behaviour once per adopter would assert one module thirteen times.
 *
 * Internal to the spec suite — never re-exported from `public-api.ts`.
 */

/** The `side` value set, re-declared so the contract imports no entry point. */
export type AnchoredSide = 'top' | 'right' | 'bottom' | 'left';

/** The `align` value set, re-declared for the same reason. */
export type AnchoredAlign = 'start' | 'center' | 'end';

/** The `sticky` value set, re-declared for the same reason. */
export type AnchoredSticky = 'partial' | 'always' | false;

/**
 * The read surface every anchored root publishes. Deliberately structural: the
 * point of the contract is that thirteen unrelated classes answer the same ten
 * questions the same way, so an adopter passing its directive instance here is
 * how the ten-ness itself is pinned — a root that stopped inheriting one of the
 * computeds fails to type-check at its registry entry rather than at an
 * assertion.
 */
export interface AnchoredPositioningReadout {
  readonly side: Signal<AnchoredSide>;
  readonly align: Signal<AnchoredAlign>;
  readonly sideOffset: Signal<number>;
  readonly alignOffset: Signal<number>;
  readonly avoidCollisions: Signal<boolean>;
  readonly collisionPadding: Signal<number>;
  readonly arrowPadding: Signal<number>;
  readonly sticky: Signal<AnchoredSticky>;
  readonly hideWhenDetached: Signal<boolean>;
  readonly clipUntilPositioned: Signal<boolean>;
}

/**
 * The four placement values a root seeds from its own defaults provider. The
 * other six come from the shared constant and are identical for every anchored
 * overlay in the library.
 */
export interface AnchoredPositioningSeeds {
  side: AnchoredSide;
  align: AnchoredAlign;
  sideOffset: number;
  collisionPadding: number;
}

/**
 * The six values every anchored root resolves from
 * `ANCHORED_POSITIONING_DEFAULTS`. Spelled here rather than imported so the
 * contract states what it expects instead of comparing the library to itself —
 * an accidental edit of the constant would otherwise pass this rung and change
 * every anchored overlay in the library.
 */
export const ANCHORED_POSITIONING_NON_SEED_DEFAULTS = {
  alignOffset: 0,
  avoidCollisions: true,
  arrowPadding: 0,
  sticky: 'partial' as AnchoredSticky,
  hideWhenDetached: false,
  clipUntilPositioned: true,
} as const;

/**
 * The placement a scope defaults provider seeds in the contract's third case.
 * Every value differs from every root's own library placement, which the case
 * asserts before trusting the result — a probe that happened to equal a root's
 * fallback would pass whether the provider was read or ignored, and that is
 * exactly the bug #1726 fixed.
 */
export const ANCHORED_POSITIONING_SCOPE_PROBE: AnchoredPositioningSeeds = {
  side: 'left',
  align: 'end',
  sideOffset: 14,
  collisionPadding: 18,
};

/**
 * The values the fourth case binds per instance, on the host that also installs
 * {@link ANCHORED_POSITIONING_SCOPE_PROBE}. Every placement value differs from
 * the scope probe and every non-seed value from the shared constant, so each of
 * the ten assertions discriminates.
 *
 * The adopter's bound host binds *from this object* rather than from literals
 * copied into its template, so the two cannot drift apart.
 */
export const ANCHORED_POSITIONING_BOUND_PROBE = {
  side: 'right' as AnchoredSide,
  align: 'center' as AnchoredAlign,
  sideOffset: 20,
  alignOffset: 6,
  avoidCollisions: false,
  collisionPadding: 24,
  arrowPadding: 10,
  sticky: 'always' as AnchoredSticky,
  hideWhenDetached: true,
  clipUntilPositioned: false,
} as const;

export interface AnchoredPositioningContractSetup {
  /** Mount the root with no consumer binding and no scope override. */
  mount: () => AnchoredPositioningReadout | Promise<AnchoredPositioningReadout>;
  /**
   * Mount it under its own `provideFor<Primitive>Defaults` seeded with
   * `overrides`, and nothing bound per instance.
   */
  mountScoped: (
    overrides: AnchoredPositioningSeeds,
  ) => AnchoredPositioningReadout | Promise<AnchoredPositioningReadout>;
  /**
   * Mount it under the same provider, with all ten positioning inputs bound
   * per instance from {@link ANCHORED_POSITIONING_BOUND_PROBE}.
   */
  mountBound: (
    overrides: AnchoredPositioningSeeds,
  ) => AnchoredPositioningReadout | Promise<AnchoredPositioningReadout>;
}

export interface AnchoredPositioningContractOptions {
  /** The root's selector, appended to the `describe` title. */
  label: string;
  /**
   * The placement this root resolves with no consumer binding and no scope
   * override — its library fallback, which legitimately varies per root.
   */
  seeds: AnchoredPositioningSeeds;
}

const readSeeds = (readout: AnchoredPositioningReadout): AnchoredPositioningSeeds => ({
  side: readout.side(),
  align: readout.align(),
  sideOffset: readout.sideOffset(),
  collisionPadding: readout.collisionPadding(),
});

const readNonSeeds = (
  readout: AnchoredPositioningReadout,
): Record<keyof typeof ANCHORED_POSITIONING_NON_SEED_DEFAULTS, unknown> => ({
  alignOffset: readout.alignOffset(),
  avoidCollisions: readout.avoidCollisions(),
  arrowPadding: readout.arrowPadding(),
  sticky: readout.sticky(),
  hideWhenDetached: readout.hideWhenDetached(),
  clipUntilPositioned: readout.clipUntilPositioned(),
});

/**
 * Run the anchored-positioning assertions inside a
 * `describe('anchored positioning contract (<label>)', …)` block.
 *
 * Four cases, each comparing whole objects rather than value by value, so a
 * failure names the input that drifted instead of reporting a bare placement.
 */
export function assertAnchoredPositioningContract(
  setup: AnchoredPositioningContractSetup,
  options: AnchoredPositioningContractOptions,
): void {
  const { label, seeds } = options;

  describe(`anchored positioning contract (${label})`, () => {
    it('resolves the six non-seed inputs from the one shared source', async () => {
      const readout = await setup.mount();

      expect(readNonSeeds(readout)).toEqual({ ...ANCHORED_POSITIONING_NON_SEED_DEFAULTS });
    });

    it('resolves the four placement seeds to its own library placement', async () => {
      const readout = await setup.mount();

      expect(readSeeds(readout)).toEqual(seeds);
    });

    it('seeds all four placement values from its own defaults provider', async () => {
      for (const [key, value] of Object.entries(ANCHORED_POSITIONING_SCOPE_PROBE)) {
        expect(seeds[key as keyof AnchoredPositioningSeeds], `${key} probe`).not.toEqual(value);
      }

      const readout = await setup.mountScoped(ANCHORED_POSITIONING_SCOPE_PROBE);

      expect(readSeeds(readout)).toEqual(ANCHORED_POSITIONING_SCOPE_PROBE);
      expect(readNonSeeds(readout)).toEqual({ ...ANCHORED_POSITIONING_NON_SEED_DEFAULTS });
    });

    it('lets a per-instance binding of every inherited input win over the scope', async () => {
      const readout = await setup.mountBound(ANCHORED_POSITIONING_SCOPE_PROBE);

      expect({ ...readSeeds(readout), ...readNonSeeds(readout) }).toEqual({
        ...ANCHORED_POSITIONING_BOUND_PROBE,
      });
    });
  });
}
