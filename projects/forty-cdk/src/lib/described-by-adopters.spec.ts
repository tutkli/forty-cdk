import { LIBRARY_CODE } from '../test-utils/source-scan';

const OWNER = 'core/src/host-attributes/described-by-owner.ts';

const DESCRIBED_BY_WRITE =
  /\[attr\.aria-describedby\]|[(,]\s*['"`]aria-describedby['"`]|\baria-describedby\s*=|ariaDescribedBy/;

const CONTRIBUTION = /\b(?:hostDescribedBy|contributeDescribedBy)\(/;

function writers(sources: ReadonlyMap<string, string> = LIBRARY_CODE): string[] {
  return [...sources]
    .filter(([path, code]) => path !== OWNER && DESCRIBED_BY_WRITE.test(code))
    .map(([path]) => path)
    .sort();
}

function contributors(): string[] {
  return [...LIBRARY_CODE]
    .filter(([path, code]) => path !== OWNER && CONTRIBUTION.test(code))
    .map(([path]) => path)
    .sort();
}

describe('aria-describedby has one owner', () => {
  it('derives a live family of contributors', () => {
    expect(LIBRARY_CODE.get(OWNER)).toMatch(DESCRIBED_BY_WRITE);
    expect(contributors()).toEqual(
      expect.arrayContaining([
        'core/src/field/field-wiring.ts',
        'core/src/host-attributes/host-aria.ts',
        'tooltip/src/tooltip-trigger.ts',
        'popover/src/popover-content.ts',
        'toast/src/toast.ts',
        'core-overlay/src/modal-shell/modal-surface-base.ts',
      ]),
    );
  });

  it('reports a host binding, an attribute call, a template attribute and a reflected property', () => {
    const sources = new Map([
      ['a/src/a.ts', "host: { '[attr.aria-describedby]': 'describedBy()' }"],
      ['b/src/b.ts', "el.setAttribute('aria-describedby', ids);"],
      ['c/src/c.ts', "applyAttr(target, 'aria-describedby', value);"],
      ['d/src/d.ts', 'el.ariaDescribedByElements = [hint];'],
      ['e/src/e.ts', 'template: \'<p aria-describedby="hint"></p>\''],
      ['f/src/f.ts', "el.setAttribute('aria-labelledby', ids);"],
      ['g/src/g.ts', "fortyError({ message: 'referenced from aria-describedby, too' });"],
      [OWNER, "element.setAttribute('aria-describedby', value);"],
    ]);

    expect(writers(sources)).toEqual([
      'a/src/a.ts',
      'b/src/b.ts',
      'c/src/c.ts',
      'd/src/d.ts',
      'e/src/e.ts',
    ]);
  });

  it('leaves aria-describedby to the owner in every library source', () => {
    expect(writers()).toEqual([]);
  });
});
