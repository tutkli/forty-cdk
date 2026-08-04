import type { StaticAdoptionChannel, StaticAdoptionSeam } from '../../test-utils/contract';
import { STATIC_ADOPTION_ADOPTERS } from './fixtures/registry';

/**
 * Meta-guard: every library source calling one of the six static-attribute
 * adoption seams is covered by a claim in the registry, and every claim names a
 * call site that still exists.
 *
 * Derived from source rather than declared, for the reason
 * `form-control-adopters.spec.ts` and `data-state-adopters.spec.ts` were
 * written: a missing adopter is *invisible* otherwise. The suite reports N green
 * adopters whether the roster lists N or N + 1, so the eighty-fourth call site
 * would ship uncovered with nothing red — which is how the hand-maintained
 * form-control roster lost four primitives, and how the 1 769-line spec this
 * replaced came to cover 43 of the 83 call sites without ever saying so.
 *
 * It pairs on the **`(source file, seam)`** pair rather than on the entry point,
 * which is what [#1645](https://github.com/tutkli/forty-cdk/issues/1645) found
 * the `data-state` guard could not do: an entry point counted as covered while
 * one of its pieces was asserted by nothing. Two properties make the finer
 * pairing possible here — the seams are named functions a scan can find, and the
 * claim declares the file it is stated over, which for `adoptHostId` is
 * genuinely not the piece's own file (the root adopts on behalf of a child).
 * That declaration is the one thing no scan can infer, so the third case below
 * checks it in the other direction too: a claim naming a file that no longer
 * calls that seam is as much a defect as an uncovered call site, and the
 * eighty-third would otherwise be reported by nothing at all.
 *
 * The first two cases are liveness probes over the extraction itself: a
 * mis-typed glob returns an empty record and a renamed seam reports zero call
 * sites, either of which would make the coverage assertion pass for the wrong
 * reason.
 */
const SOURCES = import.meta.glob('../../../*/src/**/*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const SEAMS: readonly StaticAdoptionSeam[] = [
  'hostId',
  'resolveHostId',
  'adoptHostId',
  'hostAriaLabel',
  'hostLabelledBy',
  'hostDescribedBy',
];

/**
 * Which channel each seam resolves. The registry declares both, so this pairing
 * catches a claim that names the wrong seam for its attribute — the kind of slip
 * that would otherwise leave the real seam's call site looking covered.
 */
const SEAM_CHANNEL: Readonly<Record<StaticAdoptionSeam, StaticAdoptionChannel>> = {
  hostId: 'id',
  resolveHostId: 'id',
  adoptHostId: 'id',
  hostAriaLabel: 'aria-label',
  hostLabelledBy: 'aria-labelledby',
  hostDescribedBy: 'aria-describedby',
};

const pathOf = (key: string): string => key.replace(/^(?:\.\.\/)+/, '');

/**
 * `<source file>#<seam>` for every call site in library source.
 *
 * A file that **declares** the seam is skipped rather than path-listed, so
 * moving `core/host-aria` or `core/host-id` cannot silently drop the filter —
 * the condition is "this file is the definition", which travels with the code.
 */
function callSites(): Set<string> {
  const sites = new Set<string>();
  for (const [key, source] of Object.entries(SOURCES)) {
    if (key.endsWith('.spec.ts')) {
      continue;
    }
    for (const seam of SEAMS) {
      if (source.includes(`export function ${seam}(`)) {
        continue;
      }
      if (new RegExp(`[^A-Za-z]${seam}\\(`).test(source)) {
        sites.add(`${pathOf(key)}#${seam}`);
      }
    }
  }
  return sites;
}

const claims = STATIC_ADOPTION_ADOPTERS.flatMap((adopter) => adopter.claims);
const claimed = new Set(claims.map((claim) => `${claim.source}#${claim.seam}`));
const sorted = (values: Iterable<string>): string[] => [...values].sort();

describe('static attribute adoption contract coverage (meta-guard)', () => {
  it('finds the library sources through the glob', () => {
    expect(Object.keys(SOURCES).length).toBeGreaterThan(100);
  });

  it('finds every call site of the six adoption seams', () => {
    expect(callSites().size).toBeGreaterThanOrEqual(80);
  });

  it('has a claim for every call site', () => {
    expect(sorted([...callSites()].filter((site) => !claimed.has(site)))).toEqual([]);
  });

  it('claims no call site that no longer exists', () => {
    const sites = callSites();
    expect(sorted([...claimed].filter((claim) => !sites.has(claim)))).toEqual([]);
  });

  it('claims each channel on the seam that resolves it', () => {
    const mismatched = claims
      .filter((claim) => SEAM_CHANNEL[claim.seam] !== claim.channel)
      .map((claim) => `${claim.key} ${claim.channel} via ${claim.seam}`);

    expect(sorted(mismatched)).toEqual([]);
  });

  it('covers all four channels', () => {
    expect(sorted(new Set(claims.map((claim) => claim.channel)))).toEqual([
      'aria-describedby',
      'aria-label',
      'aria-labelledby',
      'id',
    ]);
  });
});
