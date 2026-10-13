import type { StaticAdoptionChannel, StaticAdoptionSeam } from '../../test-utils/contract';
import { LIBRARY_CODE } from '../../test-utils/source-scan';
import { STATIC_ADOPTION_ADOPTERS } from './fixtures/registry';

/**
 * Meta-guard: every library source calling one of the seven static-attribute
 * adoption seams is covered by a claim in the registry, every claim names a
 * call site that still exists, and every host binding of an adoptable attribute
 * goes through a seam.
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
 * Call sites alone cannot see a piece that never calls a seam, which is how
 * three field pieces bound `[attr.id]` past this guard
 * ([#2217](https://github.com/tutkli/forty-cdk/issues/2217)). The second
 * `describe` therefore starts from the bindings themselves.
 *
 * The first two cases are liveness probes over the extraction itself: a
 * mis-typed glob returns an empty record and a renamed seam reports zero call
 * sites, either of which would make the coverage assertion pass for the wrong
 * reason.
 */
const SEAMS: readonly StaticAdoptionSeam[] = [
  'hostId',
  'resolveHostId',
  'adoptHostId',
  'hostStaticAttribute',
  'hostAriaLabel',
  'hostLabelledBy',
  'hostDescribedBy',
];

/**
 * Which channels each seam resolves. The registry declares both, so this pairing
 * catches a claim that names the wrong seam for its attribute — the kind of slip
 * that would otherwise leave the real seam's call site looking covered.
 */
const SEAM_CHANNELS: Readonly<Record<StaticAdoptionSeam, readonly StaticAdoptionChannel[]>> = {
  hostId: ['id'],
  resolveHostId: ['id'],
  adoptHostId: ['id'],
  hostStaticAttribute: ['id', 'for'],
  hostAriaLabel: ['aria-label'],
  hostLabelledBy: ['aria-labelledby'],
  hostDescribedBy: ['aria-describedby'],
};

const calls = (code: string, name: string): boolean =>
  new RegExp(`(?<![\\w$#.])${name}\\(`).test(code);

const declares = (code: string, seam: string): boolean => code.includes(`export function ${seam}(`);

/**
 * `<source file>#<seam>` for every call site in library source.
 *
 * A file that **declares** the seam is skipped rather than path-listed, so
 * moving `core/host-attributes`'s seams cannot silently drop the filter —
 * the condition is "this file is the definition", which travels with the code.
 */
function callSites(): Set<string> {
  const sites = new Set<string>();
  for (const [path, code] of LIBRARY_CODE) {
    for (const seam of SEAMS) {
      if (!declares(code, seam) && calls(code, seam)) {
        sites.add(`${path}#${seam}`);
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
    expect(LIBRARY_CODE.size).toBeGreaterThan(100);
  });

  it('finds every call site of the seven adoption seams', () => {
    expect(callSites().size).toBeGreaterThanOrEqual(80);
  });

  it('has a claim for every call site', () => {
    expect(sorted([...callSites()].filter((site) => !claimed.has(site)))).toEqual([]);
  });

  it('claims no call site that no longer exists', () => {
    const sites = callSites();
    expect(sorted([...claimed].filter((claim) => !sites.has(claim)))).toEqual([]);
  });

  it('claims each channel on a seam that resolves it', () => {
    const mismatched = claims
      .filter((claim) => !SEAM_CHANNELS[claim.seam].includes(claim.channel))
      .map((claim) => `${claim.key} ${claim.channel} via ${claim.seam}`);

    expect(sorted(mismatched)).toEqual([]);
  });

  it('covers all five channels', () => {
    expect(sorted(new Set(claims.map((claim) => claim.channel)))).toEqual([
      'aria-describedby',
      'aria-label',
      'aria-labelledby',
      'for',
      'id',
    ]);
  });
});

const GUARDED_BINDING =
  /'\[(id|attr\.id|attr\.for|attr\.aria-label|attr\.aria-labelledby|attr\.aria-describedby)\]'\s*:/g;

const BINDING_CHANNEL: Readonly<Record<string, StaticAdoptionChannel>> = {
  id: 'id',
  'attr.id': 'id',
  'attr.for': 'for',
  'attr.aria-label': 'aria-label',
  'attr.aria-labelledby': 'aria-labelledby',
  'attr.aria-describedby': 'aria-describedby',
};

/**
 * The per-instance computed names `.claude/rules/conventions.md` lists as not
 * adopting: each is stamped in a repeat or swaps with state, so one static
 * attribute would name every instance identically. An exclusion excuses an
 * `aria-label` binding only.
 */
const EXCLUSIONS: Readonly<Record<string, string>> = {
  'calendar/src/calendar-cell.ts': 'the date label of a cell stamped once per day',
  'carousel/src/carousel-indicator.ts': 'the positional "N of M" of an indicator in a repeat',
  'carousel/src/carousel-slide.ts': 'the positional "N of M" of a slide in a repeat',
  'carousel/src/carousel-rotation-control.ts': 'a name that swaps between play and pause',
  'combobox/src/combobox-chip-remove.ts': 'the "Remove <chip>" of a button in a repeat',
  'core/src/datetime/segment-directive.ts': 'the segment name of a part stamped per segment',
};

interface Definition {
  readonly name: string;
  readonly fn: boolean;
  readonly body: string;
}

const CONTROL_KEYWORDS = new Set(['if', 'for', 'while', 'switch', 'catch', 'return', 'function']);

/** The body that follows a parameter list closing just before `from`, or null for a call. */
function bodyAfter(code: string, from: number): string | null {
  let at = from;
  let parens = 0;
  while (at < code.length) {
    const char = code[at];
    if (char === '(') {
      parens += 1;
    } else if (char === ')') {
      parens -= 1;
    }
    if (parens < 0 || (parens === 0 && (char === ';' || char === ','))) {
      return null;
    }
    if (parens === 0 && char === '=' && code[at + 1] !== '>') {
      return null;
    }
    if (parens === 0 && char === '{') {
      break;
    }
    at += 1;
  }
  let end = at + 1;
  for (let braces = 1; end < code.length && braces > 0; end += 1) {
    if (code[end] === '{') {
      braces += 1;
    } else if (code[end] === '}') {
      braces -= 1;
    }
  }
  return at < code.length ? code.slice(at, end) : null;
}

/** Every function and method declared in `code`, with its body. */
function definitions(code: string): Definition[] {
  const found: Definition[] = [];
  const head =
    /^[ \t]*(?:export\s+)?(function\s+)?(?:(?:public|protected|private|static|override|async)\s+)*(#?[A-Za-z_$][\w$]*)\s*(?:<[^>()]*>)?\s*\(/gm;
  for (const match of code.matchAll(head)) {
    const name = match[2]!;
    if (CONTROL_KEYWORDS.has(name)) {
      continue;
    }
    let at = match.index + match[0].length;
    for (let parens = 1; at < code.length && parens > 0; at += 1) {
      if (code[at] === '(') {
        parens += 1;
      } else if (code[at] === ')') {
        parens -= 1;
      }
    }
    const body = bodyAfter(code, at);
    if (body !== null) {
      found.push({ name, fn: match[1] !== undefined, body });
    }
  }
  return found;
}

const ID_SEAMS = SEAMS.filter((seam) => SEAM_CHANNELS[seam].includes('id'));

/**
 * The `register…` / `adopt…` functions and methods that adopt an id on behalf
 * of the piece calling them: their body calls an id seam, or calls another one
 * of them. A function counts through a plain call and a method through a
 * member call, so a parameter that happens to be named `register` delegates
 * nothing.
 */
function idDelegates(): Definition[] {
  const candidates = [...LIBRARY_CODE.values()]
    .flatMap((code) => definitions(code))
    .filter(({ name }) => /^#?(?:register|adopt)/.test(name));
  const delegates: Definition[] = [];
  for (let grew = true; grew; ) {
    grew = false;
    for (const candidate of candidates) {
      if (delegates.includes(candidate)) {
        continue;
      }
      const adopts =
        ID_SEAMS.some((seam) => calls(candidate.body, seam)) ||
        delegates.some((delegate) => callsDelegate(candidate.body, delegate));
      if (adopts) {
        delegates.push(candidate);
        grew = true;
      }
    }
  }
  return delegates;
}

const callsDelegate = (code: string, delegate: Definition): boolean =>
  delegate.fn
    ? calls(code, delegate.name)
    : code.includes(`.${delegate.name}(`) || code.includes(`.#${delegate.name}(`);

/** `<source file>#<channel>` for every guarded host binding in library source. */
function bindings(): Array<{ path: string; channel: StaticAdoptionChannel }> {
  const found: Array<{ path: string; channel: StaticAdoptionChannel }> = [];
  for (const [path, code] of LIBRARY_CODE) {
    for (const match of code.matchAll(GUARDED_BINDING)) {
      found.push({ path, channel: BINDING_CHANNEL[match[1]!]! });
    }
  }
  return found;
}

function unadopted(): string[] {
  const delegates = idDelegates();
  return bindings()
    .filter(({ path, channel }) => {
      const code = LIBRARY_CODE.get(path)!;
      const seams = SEAMS.filter((seam) => SEAM_CHANNELS[seam].includes(channel));
      if (seams.some((seam) => calls(code, seam))) {
        return false;
      }
      return channel !== 'id' || !delegates.some((delegate) => callsDelegate(code, delegate));
    })
    .map(({ path, channel }) => `${path}#${channel}`);
}

describe('adoptable host bindings go through a seam (meta-guard)', () => {
  it('finds the guarded host bindings', () => {
    expect(new Set(bindings().map(({ path }) => path)).size).toBeGreaterThanOrEqual(100);
  });

  it('finds the register / adopt methods that adopt an id for their caller', () => {
    const names = new Set(idDelegates().map(({ name }) => name));

    expect(
      ['adoptLegendId', 'adoptTriggerId', 'registerA11yName', 'registerLabel'].filter(
        (name) => !names.has(name),
      ),
    ).toEqual([]);
  });

  it('calls the seam for its channel, delegates an id, or is a declared exclusion', () => {
    const uncovered = unadopted().filter((site) => {
      const [path, channel] = site.split('#');
      return !(EXCLUSIONS[path!] !== undefined && channel === 'aria-label');
    });

    expect(sorted(uncovered)).toEqual([]);
  });

  it('declares no exclusion whose binding now adopts', () => {
    const excused = new Set(
      unadopted()
        .filter((site) => site.endsWith('#aria-label'))
        .map((site) => site.split('#')[0]),
    );

    expect(sorted(Object.keys(EXCLUSIONS).filter((path) => !excused.has(path)))).toEqual([]);
  });
});
