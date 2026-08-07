/**
 * Meta-guard: every concrete `FormValueControl` / `FormCheckboxControl`
 * implementor in the library adopts the shared form-control contract.
 *
 * The contract's adopter list was maintained by hand, and four primitives
 * (RadioGroup, DatePicker, DateRangePicker, TimePicker) drifted off it
 * unnoticed — the same class of drift `host-directive-configs.spec.ts`
 * exists to prevent for the `hostDirectives` tuples. A hand-audited list
 * catches that once; a mechanical check catches it on the next form
 * primitive too.
 *
 * The implementor set is derived from the library sources rather than
 * declared here, so the guard cannot rot: an implementor without an
 * `assertFormControlContract` call of its own turns this spec red.
 *
 * Detection is a source scan (`implements … FormValueControl` /
 * `FormCheckboxControl` on a non-abstract exported class) because the
 * interfaces are erased at runtime — there is nothing on the directive def to
 * reflect. Abstract bases (`FormUiControlBase`, `TextValueControlBase`) are
 * excluded: they ship no host of their own, and the concrete subclasses own
 * the contract.
 *
 * Adoption counts the calls an entry point's specs make rather than asking
 * whether it makes one, because a variant root ships inside its base's entry
 * by rule ([#1716](https://github.com/tutkli/forty-cdk/issues/1716)) and one
 * sibling's call would otherwise cover for it. The key stays the entry point
 * rather than the declaring file because `input/src/textarea.ts` has no spec
 * of its own — `ForTextarea`'s call sits beside `ForInput`'s in `input.spec.ts`.
 */
const SOURCES = import.meta.glob('../../*/src/**/*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const IMPLEMENTS_FORM_CONTROL =
  /(?:^|\n)export\s+(abstract\s+)?class\s+(\w+)(?:<[^>]*>)?([\s\S]*?)\{/g;

const entryPointOf = (key: string): string => key.replace(/^\.\.\/\.\.\//, '').split('/')[0]!;

const withoutComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(?:^|[^:])\/\/[^\n]*/g, '');

function concreteImplementors(): Map<string, string[]> {
  const byEntryPoint = new Map<string, string[]>();
  for (const [key, source] of Object.entries(SOURCES)) {
    if (key.endsWith('.spec.ts')) {
      continue;
    }
    IMPLEMENTS_FORM_CONTROL.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = IMPLEMENTS_FORM_CONTROL.exec(source)) !== null) {
      const [, isAbstract, className, heritage] = match;
      if (isAbstract !== undefined) {
        continue;
      }
      if (!/\bimplements\b[\s\S]*\b(?:FormValueControl|FormCheckboxControl)\b/.test(heritage!)) {
        continue;
      }
      const entryPoint = entryPointOf(key);
      byEntryPoint.set(entryPoint, [...(byEntryPoint.get(entryPoint) ?? []), className!]);
    }
  }
  return byEntryPoint;
}

function contractCallsPerEntryPoint(): Map<string, number> {
  const calls = new Map<string, number>();
  for (const [key, source] of Object.entries(SOURCES)) {
    if (!key.endsWith('.spec.ts')) {
      continue;
    }
    const found = withoutComments(source).match(/\bassertFormControlContract\(/g)?.length ?? 0;
    if (found > 0) {
      const entryPoint = entryPointOf(key);
      calls.set(entryPoint, (calls.get(entryPoint) ?? 0) + found);
    }
  }
  return calls;
}

describe('form-control contract adoption (meta-guard)', () => {
  it('finds the library sources through the glob', () => {
    // A mis-typed glob would return an empty record and make every
    // assertion below vacuously true.
    expect(Object.keys(SOURCES).length).toBeGreaterThan(100);
  });

  it('finds every entry point that declares a form-value control', () => {
    // A regex that stopped matching would report zero implementors and pass
    // the adoption assertion for the wrong reason.
    expect(concreteImplementors().size).toBeGreaterThanOrEqual(16);
  });

  it('has one assertFormControlContract call per implementor an entry point declares', () => {
    const implementors = concreteImplementors();
    const calls = contractCallsPerEntryPoint();

    const uncovered = [...implementors.entries()]
      .filter(([entryPoint, classes]) => (calls.get(entryPoint) ?? 0) < classes.length)
      .map(
        ([entryPoint, classes]) =>
          `${entryPoint}: ${classes.length} implementor(s) (${classes.join(', ')}), ` +
          `${calls.get(entryPoint) ?? 0} contract call(s)`,
      );

    expect(uncovered).toEqual([]);
  });
});
