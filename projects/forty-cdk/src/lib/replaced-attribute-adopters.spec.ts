import { LIBRARY_CODE } from '../test-utils/source-scan';

const OWNER = 'core/src/host-attributes/replaced-attribute-owner.ts';

const ATTRIBUTE = String.raw`aria-(?:labelledby|errormessage)`;

const REPLACED_WRITE = new RegExp(
  [
    String.raw`\[attr\.${ATTRIBUTE}\]`,
    String.raw`(?<!\b(?:get|has)Attribute)\(\s*['"\`]${ATTRIBUTE}['"\`]`,
    String.raw`,\s*['"\`]${ATTRIBUTE}['"\`]`,
    String.raw`\b${ATTRIBUTE}\s*=`,
    String.raw`aria(?:LabelledBy|ErrorMessage)`,
  ].join('|'),
);

const CLAIM = /\b(?:hostLabelledBy|claimReplacedAttribute)\(/;

const SANCTIONED_CLAIM = new RegExp(
  String.raw`\bclaimReplacedAttribute\(\s*[^,()]+,\s*['"\`]${ATTRIBUTE}['"\`]`,
  'g',
);

function writers(sources: ReadonlyMap<string, string> = LIBRARY_CODE): string[] {
  return [...sources]
    .filter(
      ([path, code]) => path !== OWNER && REPLACED_WRITE.test(code.replace(SANCTIONED_CLAIM, '')),
    )
    .map(([path]) => path)
    .sort();
}

function claimants(): string[] {
  return [...LIBRARY_CODE]
    .filter(([path, code]) => path !== OWNER && CLAIM.test(code))
    .map(([path]) => path)
    .sort();
}

describe('aria-labelledby and aria-errormessage have one owner', () => {
  it('derives a live family of claimants', () => {
    expect(LIBRARY_CODE.get(OWNER)).toMatch(/setAttribute\(name, value\)/);
    expect(claimants()).toEqual(
      expect.arrayContaining([
        'core/src/field/field-wiring.ts',
        'core/src/host-attributes/host-aria.ts',
        'accordion/src/accordion-content.ts',
        'core-overlay/src/modal-shell/modal-surface-base.ts',
        'fieldset/src/fieldset.ts',
        'toast/src/toast.ts',
      ]),
    );
    expect(claimants().length).toBeGreaterThan(20);
  });

  it('reports host bindings, attribute writes, template attributes and reflected properties', () => {
    const sources = new Map([
      ['a/src/a.ts', "host: { '[attr.aria-labelledby]': 'labelledBy()' }"],
      ['b/src/b.ts', "host: { '[attr.aria-errormessage]': 'errorId()' }"],
      ['c/src/c.ts', "el.setAttribute('aria-labelledby', ids);"],
      ['d/src/d.ts', "applyAttr(target, 'aria-errormessage', value);"],
      ['e/src/e.ts', "el.removeAttribute('aria-errormessage');"],
      ['f/src/f.ts', 'template: \'<p aria-labelledby="heading"></p>\''],
      ['g/src/g.ts', 'el.ariaLabelledByElements = [heading];'],
      ['h/src/h.ts', 'el.ariaErrorMessageElements = [error];'],
      ['i/src/i.ts', "host.hasAttribute('aria-labelledby');"],
      ['j/src/j.ts', "const consumer = el.getAttribute('aria-errormessage');"],
      ['k/src/k.ts', "el.setAttribute('aria-describedby', ids);"],
      ['l/src/l.ts', "claimReplacedAttribute(target, 'aria-labelledby', () => ids());"],
      [OWNER, 'element.setAttribute(name, value);'],
    ]);

    expect(writers(sources)).toEqual([
      'a/src/a.ts',
      'b/src/b.ts',
      'c/src/c.ts',
      'd/src/d.ts',
      'e/src/e.ts',
      'f/src/f.ts',
      'g/src/g.ts',
      'h/src/h.ts',
    ]);
  });

  it('leaves both attributes to the owner in every library source', () => {
    expect(writers()).toEqual([]);
  });
});

const LABELLED_BY_CLAIM = /\bhostLabelledBy\(/;

const HOST_ROLE = /\brole:\s*['"`]|'\[attr\.role\]'/;

function roleLessLabelledHosts(sources: ReadonlyMap<string, string> = LIBRARY_CODE): string[] {
  return [...sources]
    .filter(
      ([path, code]) =>
        !path.startsWith('core/src/host-attributes/') &&
        LABELLED_BY_CLAIM.test(code) &&
        !HOST_ROLE.test(code),
    )
    .map(([path]) => path)
    .sort();
}

describe('a piece naming its host with hostLabelledBy gives the host a role', () => {
  it('derives a live family of labelled hosts', () => {
    const labelled = [...LIBRARY_CODE].filter(
      ([path, code]) =>
        !path.startsWith('core/src/host-attributes/') && LABELLED_BY_CLAIM.test(code),
    );
    expect(labelled.length).toBeGreaterThan(15);
  });

  it('reports a labelled host that declares no role, static or bound', () => {
    const sources = new Map([
      ['a/src/a.ts', "host: { role: 'group' }; hostLabelledBy(() => id());"],
      ['b/src/b.ts', "host: { '[attr.role]': 'role()' }; hostLabelledBy(() => id());"],
      ['c/src/c.ts', "host: { '[id]': 'id()' }; hostLabelledBy(() => id());"],
      ['d/src/d.ts', "host: { '[id]': 'id()' };"],
    ]);

    expect(roleLessLabelledHosts(sources)).toEqual(['c/src/c.ts']);
  });

  it('finds no role-less labelled host in the library', () => {
    expect(roleLessLabelledHosts()).toEqual([]);
  });
});
