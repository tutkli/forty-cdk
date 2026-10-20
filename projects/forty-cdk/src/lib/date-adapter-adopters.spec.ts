import { LIBRARY_CODE, SPEC_CODE } from '../test-utils/source-scan';

const ADAPTER_CLASS = /\bexport\s+class\s+(\w+)\s+implements\s+DateAdapter</g;
const CONTRACT_CALL = /\bassertDateAdapterContract\(\s*(\w+)/g;

interface Adopter {
  readonly source: string;
  readonly spec: string;
  readonly className: string;
}

function adopters(): Adopter[] {
  return [...LIBRARY_CODE]
    .flatMap(([source, code]) =>
      [...code.matchAll(ADAPTER_CLASS)].map((match) => ({
        source,
        spec: source.replace(/\.ts$/, '.spec.ts'),
        className: match[1]!,
      })),
    )
    .sort((a, b) => a.className.localeCompare(b.className));
}

describe('date adapter contract adoption (meta-guard)', () => {
  it('finds every adapter the library ships', () => {
    expect(adopters().map((adopter) => adopter.className)).toEqual([
      'InternationalizedDateAdapter',
      'InternationalizedDateTimeAdapter',
      'NativeDateAdapter',
    ]);
  });

  it('runs assertDateAdapterContract over every adapter from the spec beside it', () => {
    const uncovered = adopters()
      .filter((adopter) => {
        const called = [...(SPEC_CODE.get(adopter.spec) ?? '').matchAll(CONTRACT_CALL)];
        return !called.some((match) => match[1] === adopter.className);
      })
      .map((adopter) => `${adopter.className} (${adopter.source}): no call in ${adopter.spec}`);

    expect(uncovered).toEqual([]);
  });
});
