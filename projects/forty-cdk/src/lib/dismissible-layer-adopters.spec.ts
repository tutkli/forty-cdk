import { entryPointOf, LIBRARY_CODE, SPEC_SOURCES } from '../test-utils/source-scan';

/**
 * Meta-guard: every piece that pushes a `DismissibleLayer` is covered by an
 * adopter of the shared dismissible-layer contract, and every adopter names a
 * layer that still exists.
 *
 * Derived from source rather than declared, for the reason
 * `form-control-adopters.spec.ts`, `data-state-adopters.spec.ts` and
 * `static-adoption/adopters.spec.ts` were written: a missing adopter is
 * *invisible* otherwise. The suite reports N green primitives whether the roster
 * lists N or N + 1 — which is how the hand-maintained form-control roster lost
 * four primitives, and how this contract's own header came to claim an exclusion
 * that had stopped being true (see `EXCLUSIONS` below).
 *
 * **The family is "this piece pushes a layer", not "this root has a
 * `dismissible` input"** ([#1655](https://github.com/tutkli/forty-cdk/issues/1655)).
 * The second set is wrong in both directions: `[forToast]` has the input and
 * pushes no layer (its Escape is its own host `(keydown)`, gated on focus being
 * inside), while `[forTooltip]` and `[forHoverCard]` have no input and are
 * layers. The first set is derivable — the layer is injected by exactly two core
 * shells, `injectOverlayShell` and `injectModalShell`, and every participant
 * reaches it through one of them — so it is what the coverage cases below fold.
 * The `dismissible`-input set is still derived, as the **cross-check** the last
 * two cases run: it is the flank on which `[forToast]` sits.
 *
 * Three things about the pairing:
 *
 *   - **A claim pairs `(root, spec)` with the `(layer source, shell)` pairs its
 *     mount drives**, and the per-spec call count is what makes it finer than
 *     an entry point. Five anatomies share one layer file
 *     (`menu/src/menu-content.ts`, composed by `[forMenu]`, `[forMenuSub]`,
 *     `[forDropdownMenu]`, `[forMenubar]` and `[forContextMenu]`), so pairing on
 *     the file alone is *coarser* than the entry point rather than finer — the
 *     lesson [#1645](https://github.com/tutkli/forty-cdk/issues/1645) paid for,
 *     one contract over, since `menu-sub.spec.ts` made the `menu` entry point
 *     read as covered while nothing asserted `[forMenu]`'s own dismissal. What
 *     recovers the resolution is that each claim names its own spec and the
 *     guard requires one contract call per claim in it.
 *   - **The shell is part of the pair, not a detail of the file.** Select,
 *     DatePicker and TimePicker each call both shells from one content file,
 *     picking by `[modal]`, and the two are genuinely different layers: on the
 *     anchored path the root owns Escape's emit-and-close, on the modal one the
 *     shell owns the close and the root only forwards the vetoable event. Before
 *     this guard the modal layer of all three was covered by three hand-written
 *     Select cases, two `aria-modal` DatePicker cases, and — for TimePicker —
 *     nothing at all.
 *   - **Comments are stripped before the scan.** `core-overlay/modal-shell/modal-surface-base`
 *     documents the shell its subclasses call, in a JSDoc line that a bare
 *     `injectModalShell\(` scan reads as a fourteenth call site. Same anchoring
 *     failure the marker rules hit in
 *     [#1606](https://github.com/tutkli/forty-cdk/issues/1606) / #1609: prose
 *     about a symbol is not a use of it.
 *
 * Stack routing is deliberately absent from all of this. Topmost-only dispatch,
 * declared-nesting depth order, Escape-only layer transparency and
 * `stopPropagation`'s one-layer-per-Escape are properties of
 * `DismissibleLayerStack`, asserted over synthetic layers in
 * `core-overlay/src/dismissible-layer/dismissible-layer.spec.ts` and over two real
 * layers in the composition E2E routes. A per-primitive contract would re-run
 * one stack's behaviour once per adopter.
 *
 * The first two cases are liveness probes over the extraction: a mis-typed glob
 * returns an empty record and a renamed shell reports zero call sites, either of
 * which would make every coverage assertion pass for the wrong reason.
 */
/** The two core shells that inject a `DismissibleLayer`. */
const SHELLS = ['injectOverlayShell', 'injectModalShell'] as const;

type Shell = (typeof SHELLS)[number];

interface DismissibleLayerAdopter {
  /**
   * The root piece the claim is stated over, as its selector. Checked against
   * source, so a renamed root cannot leave a claim pointing at nothing.
   */
  readonly root: string;
  /**
   * The spec making the claim. It must hold one `assertDismissibleLayerContract`
   * call per claim naming it — which is what keeps two anatomies sharing one
   * layer file from covering for each other.
   */
  readonly spec: string;
  /**
   * The `<layer source file>#<shell>` pairs this claim's mount drives. Several
   * claims may name the same pair (the five menu anatomies), and one claim names
   * several only if its mount genuinely drives them.
   */
  readonly layers: readonly `${string}#${Shell}`[];
}

const ADOPTERS: readonly DismissibleLayerAdopter[] = [
  {
    root: '[forDialog]',
    spec: 'dialog/src/dialog.spec.ts',
    layers: ['dialog/src/dialog.ts#injectModalShell'],
  },
  {
    root: '[forDrawer]',
    spec: 'drawer/src/drawer.spec.ts',
    layers: ['drawer/src/drawer.ts#injectModalShell'],
  },
  {
    root: '[forPopover]',
    spec: 'popover/src/popover.spec.ts',
    layers: ['popover/src/popover-content.ts#injectOverlayShell'],
  },
  {
    root: '[forCombobox]',
    spec: 'combobox/src/combobox.spec.ts',
    layers: ['combobox/src/combobox-content.ts#injectOverlayShell'],
  },
  {
    root: '[forTooltip]',
    spec: 'tooltip/src/tooltip.spec.ts',
    layers: ['tooltip/src/tooltip-content.ts#injectOverlayShell'],
  },
  {
    root: '[forHoverCard]',
    spec: 'hover-card/src/hover-card.spec.ts',
    layers: ['hover-card/src/hover-card-content.ts#injectOverlayShell'],
  },
  // The `[modal]` pairs: one claim per shell, two contract calls per spec.
  {
    root: '[forSelect]',
    spec: 'select/src/select.spec.ts',
    layers: ['select/src/select-content.ts#injectOverlayShell'],
  },
  {
    root: '[forSelect]',
    spec: 'select/src/select.spec.ts',
    layers: ['select/src/select-content.ts#injectModalShell'],
  },
  {
    root: '[forDatePicker]',
    spec: 'date-picker/src/date-picker.spec.ts',
    layers: ['date-picker/src/date-picker-content.ts#injectOverlayShell'],
  },
  {
    root: '[forDatePicker]',
    spec: 'date-picker/src/date-picker.spec.ts',
    layers: ['date-picker/src/date-picker-content.ts#injectModalShell'],
  },
  {
    root: '[forTimePicker]',
    spec: 'time-picker/src/time-picker.spec.ts',
    layers: ['time-picker/src/time-picker-content.ts#injectOverlayShell'],
  },
  {
    root: '[forTimePicker]',
    spec: 'time-picker/src/time-picker.spec.ts',
    layers: ['time-picker/src/time-picker-content.ts#injectModalShell'],
  },
  // The five anatomies of one layer file. Each names its own spec, so none of
  // them can cover for another.
  {
    root: '[forMenu]',
    spec: 'menu/src/menu-multi-opener.spec.ts',
    layers: ['menu/src/menu-content.ts#injectOverlayShell'],
  },
  {
    root: '[forMenuSub]',
    spec: 'menu/src/menu-sub.spec.ts',
    layers: ['menu/src/menu-content.ts#injectOverlayShell'],
  },
  {
    root: '[forDropdownMenu]',
    spec: 'dropdown-menu/src/dropdown-menu.spec.ts',
    layers: ['menu/src/menu-content.ts#injectOverlayShell'],
  },
  {
    root: '[forMenubar]',
    spec: 'menubar/src/menubar.spec.ts',
    layers: ['menu/src/menu-content.ts#injectOverlayShell'],
  },
  {
    root: '[forContextMenu]',
    spec: 'context-menu/src/context-menu.spec.ts',
    layers: ['menu/src/menu-content.ts#injectOverlayShell'],
  },
];

/**
 * Entry points on the `dismissible`-input flank that deliberately adopt nothing,
 * with the **condition** that makes the omission correct — not merely a note
 * that the subject exists, which is the weaker half a stale exclusion keeps
 * passing on. The last case falsifies each condition against source: the entry
 * point must still declare the input (so it is still on the flank the
 * cross-check walks), must still reach neither shell (so it still pushes no
 * layer the contract could drive), and must still own an Escape of its own on a
 * host listener (so the dismissal it does have is genuinely elsewhere). The day
 * `[forToast]` routes Escape through the shared layer, all three stop holding
 * together and this file turns red.
 */
const EXCLUSIONS: Readonly<Record<string, string>> = {
  toast:
    "[forToast] has the `dismissible` input but pushes no layer: its Escape is its own host `(keydown)` handler gated on focus being inside the toast, so the contract's `document`-dispatched Escape would never reach it",
};

/**
 * `<source file>#<shell>` for every layer-pushing call site.
 *
 * A file that **declares** a shell is skipped by condition rather than by path,
 * so moving `core-overlay/overlay-controller/overlay-shell` or `core-overlay/modal-shell/modal-shell` cannot silently drop the
 * filter.
 */
function layerCallSites(): Set<string> {
  const sites = new Set<string>();
  for (const [path, source] of LIBRARY_CODE) {
    for (const shell of SHELLS) {
      if (source.includes(`export function ${shell}(`)) {
        continue;
      }
      if (new RegExp(`[^A-Za-z]${shell}\\(`).test(source)) {
        sites.add(`${path}#${shell}`);
      }
    }
  }
  return sites;
}

/** Entry point → the source files declaring a `dismissible` input. */
function dismissibleInputDeclarations(): Map<string, string[]> {
  const byEntryPoint = new Map<string, string[]>();
  for (const [path, source] of LIBRARY_CODE) {
    if (!/(?:^|\n)\s*(?:readonly\s+)?dismissible\s*=\s*input\(/.test(source)) {
      continue;
    }
    const entryPoint = entryPointOf(path);
    byEntryPoint.set(entryPoint, [...(byEntryPoint.get(entryPoint) ?? []), path]);
  }
  return byEntryPoint;
}

/** Spec path → how many times it calls the contract. */
function contractCalls(): Map<string, number> {
  const calls = new Map<string, number>();
  for (const [path, source] of SPEC_SOURCES) {
    const count = (source.match(/assertDismissibleLayerContract\(/g) ?? []).length;
    if (count > 0) {
      calls.set(path, count);
    }
  }
  return calls;
}

const declaredSelectors = (): Set<string> => {
  const selectors = new Set<string>();
  for (const [, source] of LIBRARY_CODE) {
    for (const match of source.matchAll(/selector:\s*'([^']+)'/g)) {
      selectors.add(match[1]!);
    }
  }
  return selectors;
};

const claimedLayers = new Set<string>(ADOPTERS.flatMap((adopter) => adopter.layers));
const claimsPerSpec = new Map<string, number>();
for (const adopter of ADOPTERS) {
  claimsPerSpec.set(adopter.spec, (claimsPerSpec.get(adopter.spec) ?? 0) + 1);
}
const sorted = (values: Iterable<string>): string[] => [...values].sort();

describe('dismissible-layer contract adoption (meta-guard)', () => {
  it('finds the library sources through the glob', () => {
    expect(LIBRARY_CODE.size).toBeGreaterThan(100);
  });

  it('finds every call site of the two layer-pushing shells', () => {
    expect(layerCallSites().size).toBeGreaterThanOrEqual(13);
  });

  it('has an adopter for every layer-pushing call site', () => {
    expect(sorted([...layerCallSites()].filter((site) => !claimedLayers.has(site)))).toEqual([]);
  });

  it('claims no layer that no longer exists', () => {
    const sites = layerCallSites();
    expect(sorted([...claimedLayers].filter((layer) => !sites.has(layer)))).toEqual([]);
  });

  it('names a root that still declares its selector', () => {
    const selectors = declaredSelectors();
    const unknown = ADOPTERS.filter((adopter) => !selectors.has(adopter.root)).map(
      (adopter) => adopter.root,
    );

    expect(sorted(new Set(unknown))).toEqual([]);
  });

  it('has one contract call per claim in the spec that makes it', () => {
    const calls = contractCalls();

    const short = [...claimsPerSpec.entries()]
      .filter(([spec, claims]) => (calls.get(spec) ?? 0) < claims)
      .map(([spec, claims]) => `${spec}: ${claims} claim(s), ${calls.get(spec) ?? 0} call(s)`);

    expect(sorted(short)).toEqual([]);
  });

  it('covers every entry point declaring a dismissible input', () => {
    const claimedEntryPoints = new Set(ADOPTERS.map((adopter) => entryPointOf(adopter.spec)));

    const missing = [...dismissibleInputDeclarations().entries()]
      .filter(([entryPoint]) => !claimedEntryPoints.has(entryPoint))
      .filter(([entryPoint]) => EXCLUSIONS[entryPoint] === undefined)
      .map(([entryPoint, files]) => `${entryPoint} (${files.join(', ')})`);

    expect(sorted(missing)).toEqual([]);
  });

  it('excludes no entry point whose exclusion condition stopped holding', () => {
    const declarations = dismissibleInputDeclarations();
    const layerEntryPoints = new Set([...layerCallSites()].map((site) => entryPointOf(site)));

    const stale = Object.keys(EXCLUSIONS).flatMap((entryPoint) => {
      const reasons: string[] = [];
      if (!declarations.has(entryPoint)) {
        reasons.push('no longer declares a dismissible input');
      }
      if (layerEntryPoints.has(entryPoint)) {
        reasons.push('now pushes a dismissible layer');
      }
      const ownsHostEscape = [...LIBRARY_CODE].some(
        ([path, source]) =>
          entryPointOf(path) === entryPoint &&
          source.includes("'(keydown)'") &&
          source.includes("'Escape'"),
      );
      if (!ownsHostEscape) {
        reasons.push('no longer handles Escape on a host listener');
      }
      return reasons.map((reason) => `${entryPoint}: ${reason}`);
    });

    expect(sorted(stale)).toEqual([]);
  });
});
