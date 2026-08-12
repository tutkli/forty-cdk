import type { OverlayTriggerAriaContractOptions } from '../test-utils/contract';

/**
 * Meta-guard: every trigger that stamps `aria-haspopup` is covered by an adopter
 * of the shared overlay-trigger-ARIA contract, every adopter names a trigger that
 * still emits it, and the token each adopter declares is the token its source
 * binds.
 *
 * Derived from source rather than declared, for the reason its three siblings
 * were written — a missing adopter is *invisible* otherwise, and this was the
 * last contract whose roster lived in a file header read by hand
 * ([#1655](https://github.com/tutkli/forty-cdk/issues/1655)).
 *
 * **The family is "this trigger emits the popup token".** That is the property
 * the contract's own first case asserts, so deriving from it cannot drift from
 * what the contract claims — and it is what makes the roster finer than an entry
 * point: Combobox has two anatomies with two trigger files
 * (`[forComboboxInput]` editable, `[forComboboxTrigger]` picker) in one entry
 * point, so an entry-point reading would let either cover for the other. The
 * mirror case is one trigger file with two roots: DatePicker and DateRangePicker
 * share `date-picker-trigger.ts`, so two claims name it and each is checked
 * against its own spec's call count.
 *
 * **This contract carries no exclusion list, and that is a consequence of the
 * derived property rather than an omission.** ContextMenu is the one
 * trigger-anchored overlay outside the roster — `[forContextMenuTrigger]` is a
 * right-click *region*, not a popup control, so it emits no role, no
 * `aria-haspopup` and no `aria-expanded` — and the scan therefore never puts it
 * on the flank in the first place. Nothing has to be maintained to keep it out,
 * and the day it starts emitting the token the third case asks it for a claim.
 * That is strictly better than an exclusion string, which is the shape that goes
 * stale while still reading plausibly.
 *
 * The first two cases are liveness probes over the extraction: a mis-typed glob
 * returns an empty record and a changed binding name reports zero emitters,
 * either of which would make the coverage assertions pass for the wrong reason.
 */
const SOURCES = import.meta.glob('/projects/forty-cdk/*/src/**/*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
});

type HasPopupToken = OverlayTriggerAriaContractOptions['haspopup'];

interface OverlayTriggerAriaAdopter {
  /**
   * The trigger the claim is stated over, as its selector. Checked against
   * source, so a renamed trigger cannot leave a claim pointing at nothing.
   */
  readonly trigger: string;
  /** The source file binding `aria-haspopup` for that trigger. */
  readonly source: string;
  /**
   * The spec making the claim. It must hold one
   * `assertOverlayTriggerAriaContract` call per claim naming it, so two anatomies
   * in one entry point cannot cover for each other.
   */
  readonly spec: string;
  /** The token the trigger emits. Compared against the literal in `source`. */
  readonly haspopup: HasPopupToken;
}

const ADOPTERS: readonly OverlayTriggerAriaAdopter[] = [
  {
    trigger: '[forPopoverTrigger]',
    source: 'popover/src/popover-trigger.ts',
    spec: 'popover/src/popover.spec.ts',
    haspopup: 'dialog',
  },
  {
    trigger: '[forDialogTrigger]',
    source: 'dialog/src/dialog-trigger.ts',
    spec: 'dialog/src/dialog.spec.ts',
    haspopup: 'dialog',
  },
  {
    trigger: '[forDrawerTrigger]',
    source: 'drawer/src/drawer-trigger.ts',
    spec: 'drawer/src/drawer.spec.ts',
    haspopup: 'dialog',
  },
  {
    trigger: '[forSelectTrigger]',
    source: 'select/src/select-trigger.ts',
    spec: 'select/src/select.spec.ts',
    haspopup: 'listbox',
  },
  {
    trigger: '[forTimePickerTrigger]',
    source: 'time-picker/src/time-picker-trigger.ts',
    spec: 'time-picker/src/time-picker.spec.ts',
    haspopup: 'listbox',
  },
  {
    trigger: '[forDropdownMenuTrigger]',
    source: 'dropdown-menu/src/dropdown-menu-trigger.ts',
    spec: 'dropdown-menu/src/dropdown-menu.spec.ts',
    haspopup: 'menu',
  },
  {
    trigger: '[forMenuSubTrigger]',
    source: 'menu/src/menu-sub-trigger.ts',
    spec: 'menu/src/menu-sub.spec.ts',
    haspopup: 'menu',
  },
  {
    trigger: '[forMenubarTrigger]',
    source: 'menubar/src/menubar-trigger.ts',
    spec: 'menubar/src/menubar.spec.ts',
    haspopup: 'menu',
  },
  // Two anatomies, two trigger files, one entry point.
  {
    trigger: '[forComboboxInput]',
    source: 'combobox/src/combobox-input.ts',
    spec: 'combobox/src/combobox.spec.ts',
    haspopup: 'listbox',
  },
  {
    trigger: '[forComboboxTrigger]',
    source: 'combobox/src/combobox-trigger.ts',
    spec: 'combobox/src/combobox.spec.ts',
    haspopup: 'listbox',
  },
  // Two roots, one trigger file.
  {
    trigger: '[forDatePickerTrigger]',
    source: 'date-picker/src/date-picker-trigger.ts',
    spec: 'date-picker/src/date-picker.spec.ts',
    haspopup: 'dialog',
  },
  {
    trigger: '[forDatePickerTrigger]',
    source: 'date-picker/src/date-picker-trigger.ts',
    spec: 'date-picker/src/date-range-picker.spec.ts',
    haspopup: 'dialog',
  },
];

const pathOf = (key: string): string => key.replace(/^\/projects\/forty-cdk\//, '');

const stripComments = (text: string): string =>
  text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

const LIBRARY_SOURCES: ReadonlyArray<readonly [string, string]> = Object.entries(SOURCES)
  .filter(([key]) => !key.endsWith('.spec.ts'))
  .map(([key, source]) => [pathOf(key), stripComments(source as string)] as const);

const SPEC_SOURCES: ReadonlyArray<readonly [string, string]> = Object.entries(SOURCES)
  .filter(([key]) => key.endsWith('.spec.ts'))
  .map(([key, source]) => [pathOf(key), source as string] as const);

/**
 * Source file → the `aria-haspopup` value it binds, as written.
 *
 * The binding is looked up over comment-stripped source rather than inside a
 * brace-matched `host: { … }` block: prose quoting the attribute is what a raw
 * scan would over-count, and a nested object literal — the reason the
 * `data-state` extraction needs brace matching — cannot truncate a search that
 * never delimits a block.
 */
function popupTokenBySource(): Map<string, string> {
  const tokens = new Map<string, string>();
  for (const [path, source] of LIBRARY_SOURCES) {
    const match = source.match(/'\[attr\.aria-haspopup\]':\s*(?:'([^']*)'|"([^"]*)")/);
    if (match === null) {
      continue;
    }
    tokens.set(path, (match[1] ?? match[2] ?? '').replace(/"/g, ''));
  }
  return tokens;
}

/** Spec path → how many times it calls the contract. */
function contractCalls(): Map<string, number> {
  const calls = new Map<string, number>();
  for (const [path, source] of SPEC_SOURCES) {
    const count = (source.match(/assertOverlayTriggerAriaContract\(/g) ?? []).length;
    if (count > 0) {
      calls.set(path, count);
    }
  }
  return calls;
}

const declaredSelectors = (): Set<string> => {
  const selectors = new Set<string>();
  for (const [, source] of LIBRARY_SOURCES) {
    for (const match of source.matchAll(/selector:\s*'([^']+)'/g)) {
      selectors.add(match[1]!);
    }
  }
  return selectors;
};

const claimedSources = new Set(ADOPTERS.map((adopter) => adopter.source));
const claimsPerSpec = new Map<string, number>();
for (const adopter of ADOPTERS) {
  claimsPerSpec.set(adopter.spec, (claimsPerSpec.get(adopter.spec) ?? 0) + 1);
}
const sorted = (values: Iterable<string>): string[] => [...values].sort();

describe('overlay trigger ARIA contract adoption (meta-guard)', () => {
  it('finds the library sources through the glob', () => {
    expect(Object.keys(SOURCES).length).toBeGreaterThan(100);
  });

  it('finds every trigger that emits a popup token', () => {
    expect(popupTokenBySource().size).toBeGreaterThanOrEqual(11);
  });

  it('has an adopter for every trigger that emits a popup token', () => {
    const missing = [...popupTokenBySource().keys()].filter((path) => !claimedSources.has(path));

    expect(sorted(missing)).toEqual([]);
  });

  it('claims no trigger that no longer emits a popup token', () => {
    const emitting = popupTokenBySource();
    const stale = [...claimedSources].filter((source) => !emitting.has(source));

    expect(sorted(stale)).toEqual([]);
  });

  it('declares the token its trigger source binds', () => {
    const emitting = popupTokenBySource();
    const mismatched = ADOPTERS.filter(
      (adopter) => emitting.get(adopter.source) !== adopter.haspopup,
    ).map(
      (adopter) =>
        `${adopter.trigger} declares "${adopter.haspopup}", source binds "${emitting.get(adopter.source) ?? 'nothing'}"`,
    );

    expect(sorted(new Set(mismatched))).toEqual([]);
  });

  it('names a trigger that still declares its selector', () => {
    const selectors = declaredSelectors();
    const unknown = ADOPTERS.filter((adopter) => !selectors.has(adopter.trigger)).map(
      (adopter) => adopter.trigger,
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
});
