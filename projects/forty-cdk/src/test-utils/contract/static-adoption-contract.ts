/**
 * Shared contract suite for the consumer-set **static attribute** a directive
 * must never clobber with its own host binding. One contract over the four
 * channels the library adopts on, because all four are the same seam family in
 * `forty-cdk/core` and every one of them shipped the identical bug:
 *
 *   - **`id`** ([#659](https://github.com/tutkli/forty-cdk/issues/659)) —
 *     `hostId` / `resolveHostId` / `adoptHostId`. A consumer's `id` is the
 *     anchor for external `aria-labelledby` / `aria-describedby` references,
 *     label `for`, and test hooks, so the generated fallback must not win.
 *   - **`aria-labelledby`** ([#1454](https://github.com/tutkli/forty-cdk/issues/1454))
 *     — `hostLabelledBy`. **Replace** semantics: a name has one owner.
 *   - **`aria-describedby`** (#1454) — `hostDescribedBy`. **Compose**
 *     semantics, consumer ids first: descriptions are additive.
 *   - **`aria-label`** ([#1479](https://github.com/tutkli/forty-cdk/issues/1479))
 *     — `hostAriaLabel`. Same mechanic as the label channel, larger blast
 *     radius: the canonical binding is truthy-only, so a `null` fallback used
 *     to `removeAttribute` the consumer's own name and leave the widget with no
 *     accessible name at all.
 *
 * A claim is a `(piece, channel)` pair plus the two values that make it
 * falsifiable: the `probe` a consumer writes in the template, and the
 * `fallback` the library emits on a host that carries no consumer value. Both
 * mounts are mandatory, and the second is not overhead — it is the *fallback
 * still works* half of the seam's contract, which is what the per-primitive
 * "falls back to a generated id" / "falls back to the trigger id" cases used to
 * assert one adopter at a time.
 *
 * Adoption is not a hand-maintained roster:
 * `src/lib/static-adoption/adopters.spec.ts` derives the family from library
 * source — every file calling one of the six seams — and fails on a call site
 * no claim declares. Each claim therefore names its `source` file and `seam`,
 * because a piece key is a runtime selector with nothing tying it back to the
 * source that emits the binding, and for `adoptHostId` the two are genuinely
 * different files: the root adopts on behalf of a child piece. That explicit
 * tie-back is what the `data-state` contract's per-entry-point guard could not
 * do ([#1645](https://github.com/tutkli/forty-cdk/issues/1645) — an entry point
 * counted as covered while one of its pieces was asserted by nothing).
 *
 * Deliberate exclusions:
 *
 *   - **The static-only boundary is asserted per channel, not per piece.** That
 *     a consumer `[id]="expr"` / `[attr.aria-*]="expr"` **property** binding is
 *     *not* adopted is a property of the seam — every one of them reads
 *     `getAttribute` once, at construction — rather than of the piece that
 *     calls it, so one case per channel proves it and 74 would only restate the
 *     helper. The cases live in `static-adoption.spec.ts` beside the other
 *     claims the declarative shape cannot state.
 *   - **Per-instance computed names.** `[forCalendarCell]`,
 *     `[forCarouselSlide]` / `[forCarouselIndicator]`,
 *     `[forComboboxChipRemove]`, the date / time segments and
 *     `[forCarouselRotationControl]` are stamped in a repeat or swap their name
 *     with state, so a single static attribute would name every instance
 *     identically — an authoring error rather than an override — and none of
 *     them ever resolves to `null`, so nothing is erased. They call no seam, so
 *     the adoption guard does not ask for a claim; `static-adoption.spec.ts`
 *     pins the non-adoption instead.
 *   - **What the attribute *means* per primitive** stays with that primitive's
 *     spec. This contract asserts only that the consumer's value survives and
 *     that the library's own value is still emitted without one — the same
 *     scoping that keeps the overlay-trigger-ARIA contract to its trio.
 *
 * Internal to the spec suite — never re-exported from `public-api.ts`.
 */

/**
 * The attribute channels a piece adopts a consumer-set static value on.
 *
 * `aria-describedby` is the one that **composes** (consumer ids first, then any
 * library id not already present); the other three **replace**.
 */
export type StaticAdoptionChannel = 'id' | 'aria-label' | 'aria-labelledby' | 'aria-describedby';

/**
 * The core seams that implement adoption. A claim names the one its piece
 * calls, so `adopters.spec.ts` can pair the claim with the source file it is
 * stated over.
 */
export type StaticAdoptionSeam =
  | 'hostId'
  | 'resolveHostId'
  | 'adoptHostId'
  | 'hostAriaLabel'
  | 'hostLabelledBy'
  | 'hostDescribedBy';

/**
 * What a piece emits on the channel when the consumer sets nothing:
 *
 *   - `null` — no attribute at all. The `aria-label` case that #1479 was opened
 *     over: without adoption this branch is what deletes the consumer's name.
 *   - a `string` — a literal the library owns (a scope default), or the static
 *     id of another element the fixture wires it to.
 *   - `{ generated: prefix }` — an `IdGenerator` id (`<prefix>-<salt>-<n>`),
 *     asserted against the prefix the piece passes so a renamed prefix cannot
 *     pass unnoticed.
 *   - `{ pairs: key }` — the resolved `id` of another element in the same mount,
 *     for a fallback that references a *generated* id (an overlay surface
 *     labelled by its trigger). The mount resolves it alongside the claim keys,
 *     so the referenced element needs no claim of its own — which is what lets
 *     `[forFieldset]` pin its fallback on a `[forFieldsetLegend]` id that is
 *     itself not adopted.
 */
export type StaticAdoptionFallback =
  | string
  | null
  | { readonly generated: string }
  | { readonly pairs: string };

export interface StaticAdoptionClaim {
  /** The piece's key in {@link StaticAdoptionMountResult.pieces}. */
  key: string;
  /** The channel this piece adopts on. */
  channel: StaticAdoptionChannel;
  /**
   * The library source file calling {@link StaticAdoptionClaim.seam}. Repo
   * path relative to `projects/forty-cdk/`, so `adopters.spec.ts` can compare
   * it with the call sites it finds — including the ones in `forty-cdk/core`
   * that serve several primitives (`modal-surface-base`, `register-handle`,
   * `element-registry`, `menu-opener-registry`).
   */
  source: string;
  /** The seam that file calls for this channel. */
  seam: StaticAdoptionSeam;
  /**
   * The static value the `adopted` fixture writes on the piece's host. Must be
   * a value the library cannot produce on its own — the contract fails a probe
   * that matches the piece's own fallback, which is the one way the adoption
   * case could pass while nothing was adopted.
   */
  probe: string;
  /** What the `bare` fixture's counterpart of this piece emits instead. */
  fallback: StaticAdoptionFallback;
}

export interface StaticAdoptionMountResult {
  /**
   * Resolve the pieces this adopter covers, keyed by the claim's `key`. Called
   * after `flush`, so a portaled surface that exists only while open resolves.
   *
   * A piece absent from the current variant returns `null`, which the adoption
   * and fallback comparisons skip — so the resolution case requires every
   * declared key in **both** variants rather than in their union. Skipping is a
   * safety net against a half-rendered mount, never a licence for one: a key
   * present in one variant only would keep that half asserted and lose the
   * other silently, which is the invisibility
   * [#1645](https://github.com/tutkli/forty-cdk/issues/1645) found one rung up.
   */
  pieces: () => Readonly<Record<string, HTMLElement | null>>;
  /**
   * Drain Angular's render pipeline. Must be the canonical async waiter
   * (`flush` from `test-utils/flush.ts`) — a sync-only function would
   * type-check behind the contract's `await` while under-waiting, letting an
   * assertion run against stale DOM.
   */
  flush: () => Promise<void>;
}

export interface StaticAdoptionContractSetup {
  /**
   * Mount the adopter's fixture.
   *
   * `'adopted'` writes every claim's `probe` as a plain static attribute on the
   * piece's host; `'bare'` writes none of them and is what pins each
   * `fallback`. Both must render the same pieces — an element the consumer
   * happens not to name is still the same element — and the resolution case
   * asserts that rather than trusting it.
   *
   * Called more than once inside a single case, so the factory must reset the
   * `TestBed` before configuring it (`mountStaticAdoptionFixture` does).
   */
  mount: (variant: 'adopted' | 'bare') => StaticAdoptionMountResult;
  /** One claim per `(piece, channel)` pair this adopter covers. */
  claims: readonly StaticAdoptionClaim[];
}

export interface StaticAdoptionContractOptions {
  /**
   * A label for the pieces this call covers, appended to the `describe` title.
   * Needed only when one adopter group is split across two calls.
   */
  label?: string;
}

const sorted = (values: Iterable<string>): string[] => [...values].sort();

const claimLabel = (claim: StaticAdoptionClaim): string => `${claim.key} ${claim.channel}`;

const present = (
  pieces: Readonly<Record<string, HTMLElement | null>>,
): Array<[string, HTMLElement]> =>
  Object.entries(pieces).filter((entry): entry is [string, HTMLElement] => entry[1] !== null);

/**
 * Compose an id-reference list the way `composeIds` in `core/host-aria` does:
 * consumer ids first, then any library id not already among them.
 */
function compose(consumer: string, libraryIds: string | null): string {
  if (!libraryIds) {
    return consumer;
  }
  const seen = new Set(consumer.split(/\s+/).filter(Boolean));
  const extra = libraryIds.split(/\s+/).filter((id) => id && !seen.has(id));
  return extra.length > 0 ? `${consumer} ${extra.join(' ')}` : consumer;
}

const resolvedPiece = (
  pieces: Readonly<Record<string, HTMLElement | null>>,
  key: string,
): HTMLElement | null => pieces[key] ?? null;

/**
 * The selector a `{ pairs: … }` fallback references, as a 0-or-1 element array.
 * The mount resolves these alongside the claim keys, so the resolution case
 * covers a referenced element that stopped rendering too — that element is the
 * fallback, so losing it silently would turn the fallback case into a
 * `null === null` comparison.
 */
const pairedKey = (claim: StaticAdoptionClaim): string[] => {
  const { fallback } = claim;
  return fallback !== null && typeof fallback === 'object' && 'pairs' in fallback
    ? [fallback.pairs]
    : [];
};

const rendered = (
  pieces: Readonly<Record<string, HTMLElement | null>>,
  claims: readonly StaticAdoptionClaim[],
): Record<string, string | null> =>
  Object.fromEntries(
    claims.map((claim) => [
      claimLabel(claim),
      resolvedPiece(pieces, claim.key)!.getAttribute(claim.channel),
    ]),
  );

/**
 * The value a claim's `fallback` describes, resolved against the mount's own
 * pieces so `{ pairs }` can read the sibling element's generated id.
 *
 * `value` is what the attribute should literally hold, and is `null` for a
 * generated id (whose digits nothing can predict). `expected` is what the
 * fallback case compares against, with a generated id collapsed to
 * `<prefix>-*` — the same collapse {@link normalizeGenerated} applies to the
 * rendered value, so the two meet on the prefix the piece passes and a renamed
 * prefix still fails.
 */
function resolveFallback(
  fallback: StaticAdoptionFallback,
  pieces: Readonly<Record<string, HTMLElement | null>>,
): { value: string | null; expected: string | null } {
  if (fallback === null || typeof fallback === 'string') {
    return { value: fallback, expected: fallback };
  }
  if ('generated' in fallback) {
    return { value: null, expected: `${fallback.generated}-*` };
  }
  const paired = resolvedPiece(pieces, fallback.pairs);
  const value = paired === null ? null : paired.id || null;
  return { value, expected: value };
}

const normalizeGenerated = (
  actual: string | null,
  fallback: StaticAdoptionFallback,
): string | null => {
  if (fallback === null || typeof fallback === 'string' || !('generated' in fallback)) {
    return actual;
  }
  const matches = actual !== null && new RegExp(`^${fallback.generated}-\\S+-\\d+$`).test(actual);
  return matches ? `${fallback.generated}-*` : actual;
};

/**
 * Run the static-attribute adoption assertions inside a
 * `describe('static attribute adoption contract', …)` block.
 *
 * Five cases, and three of them fail a misconfigured adoption rather than a
 * broken primitive:
 *
 *   - **The declaration case** rejects an empty claim list and two claims on
 *     the same `(piece, channel)` pair, either of which would reduce the
 *     comparisons below to fewer assertions than the adopter appears to make.
 *   - **The adoption case** mounts the `adopted` fixture and compares every
 *     claimed piece's rendered attribute in one object equality, so a failure
 *     names the piece that drifted. `aria-describedby` is expected composed
 *     with its own fallback rather than equal to the probe — the compose /
 *     replace split is the seam's, so the contract derives it from the channel
 *     instead of asking each adopter to restate it.
 *   - **The fallback case** mounts the `bare` fixture and pins what the library
 *     emits with no consumer value. Half the per-primitive cases this contract
 *     replaces were exactly this claim, and it is the reason the second mount
 *     is not overhead.
 *   - **The discrimination case** is the guard. It fails a claim whose `probe`
 *     equals what the bare mount emitted anyway: with the two values equal, the
 *     adoption case passes whether the piece adopts or clobbers, so the claim
 *     proves nothing. This is the axis a mount factory can silently fail to
 *     prove, the way `assertRovingTabindexContract` fails a factory that cannot
 *     produce two enabled items.
 *   - **The resolution case** is the completeness half of the two comparisons.
 *     Both skip a `null`, so a key the fixture never rendered is covered by
 *     nothing while the `describe` stays green — the invisibility
 *     [#1645](https://github.com/tutkli/forty-cdk/issues/1645) found one level
 *     up. It asserts, **per variant**, that the pieces which resolved are the
 *     set the claims declared. Per variant and not over their union, because a
 *     key present in `adopted` alone keeps its adoption asserted and drops its
 *     fallback — and the reverse loses the adoption claim, which is the whole
 *     point of the contract. Two hand-written fixture templates are exactly the
 *     kind of pair that drifts, so the symmetry the `mount` contract asks for is
 *     verified instead of assumed.
 */
export function assertStaticAdoptionContract(
  setup: StaticAdoptionContractSetup,
  options: StaticAdoptionContractOptions = {},
): void {
  const { claims } = setup;
  const title = options.label
    ? `static attribute adoption contract (${options.label})`
    : 'static attribute adoption contract';

  describe(title, () => {
    it('declares at least one claim, and no channel twice on one piece', () => {
      expect(claims.length).toBeGreaterThanOrEqual(1);
      expect(sorted(new Set(claims.map(claimLabel)))).toEqual(sorted(claims.map(claimLabel)));
    });

    it('preserves every consumer-set static value', async () => {
      const ctx = setup.mount('adopted');
      await ctx.flush();
      const pieces = ctx.pieces();
      const asserted = claims.filter((claim) => resolvedPiece(pieces, claim.key) !== null);

      expect(asserted.length).toBeGreaterThanOrEqual(1);
      expect(rendered(pieces, asserted)).toEqual(
        Object.fromEntries(
          asserted.map((claim) => [
            claimLabel(claim),
            claim.channel === 'aria-describedby'
              ? compose(claim.probe, resolveFallback(claim.fallback, pieces).value)
              : claim.probe,
          ]),
        ),
      );
    });

    it('emits its own value on a host the consumer did not name', async () => {
      const ctx = setup.mount('bare');
      await ctx.flush();
      const pieces = ctx.pieces();
      const asserted = claims.filter((claim) => resolvedPiece(pieces, claim.key) !== null);

      expect(asserted.length).toBeGreaterThanOrEqual(1);
      expect(
        Object.fromEntries(
          asserted.map((claim) => [
            claimLabel(claim),
            normalizeGenerated(
              resolvedPiece(pieces, claim.key)!.getAttribute(claim.channel),
              claim.fallback,
            ),
          ]),
        ),
      ).toEqual(
        Object.fromEntries(
          asserted.map((claim) => [
            claimLabel(claim),
            resolveFallback(claim.fallback, pieces).expected,
          ]),
        ),
      );
    });

    it('declares a probe its own fallback cannot produce', async () => {
      const ctx = setup.mount('bare');
      await ctx.flush();
      const pieces = ctx.pieces();

      const vacuous = claims
        .filter((claim) => resolvedPiece(pieces, claim.key) !== null)
        .filter(
          (claim) => resolvedPiece(pieces, claim.key)!.getAttribute(claim.channel) === claim.probe,
        )
        .map(
          (claim) =>
            `${claimLabel(claim)}: probe "${claim.probe}" is what the piece emits without it`,
        );

      expect(vacuous).toEqual([]);
    });

    it('resolves every claimed piece in both variants', async () => {
      const declared = sorted(new Set(claims.flatMap((claim) => [claim.key, ...pairedKey(claim)])));
      const resolved: Record<string, string[]> = {};
      for (const variant of ['adopted', 'bare'] as const) {
        const ctx = setup.mount(variant);
        await ctx.flush();
        resolved[variant] = sorted(present(ctx.pieces()).map(([key]) => key));
      }
      expect(resolved).toEqual({ adopted: declared, bare: declared });
    });
  });
}
