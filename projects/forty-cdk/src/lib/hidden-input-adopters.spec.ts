import { LIBRARY_CODE, SPEC_CODE } from '../test-utils/source-scan';

const HIDDEN_INPUT_CALL = /(?<!function\s)\binjectHiddenInput\s*(?:<[^>]*>)?\(/;
const EXPORTED_CLASS = /\bexport\s+class\s+(\w+)/;
const CONTRACT_CALL = /\bassertNativeSubmissionContract\(/;

interface Adopter {
  readonly source: string;
  readonly spec: string;
  readonly className: string;
}

function adopters(): Adopter[] {
  return [...LIBRARY_CODE]
    .filter(([, code]) => HIDDEN_INPUT_CALL.test(code))
    .map(([source, code]) => ({
      source,
      spec: source.replace(/\.ts$/, '.spec.ts'),
      className: EXPORTED_CLASS.exec(code)?.[1] ?? source,
    }))
    .sort((a, b) => a.source.localeCompare(b.source));
}

describe('native submission contract adoption (meta-guard)', () => {
  it('finds every class that submits through a hidden input', () => {
    const classes = adopters().map((adopter) => adopter.className);
    expect(classes.length).toBeGreaterThanOrEqual(17);
    expect(classes).toEqual(
      expect.arrayContaining([
        'ForCheckbox',
        'ForDateField',
        'ForDateRangeField',
        'ForTimeField',
        'ForTimeRangeField',
        'ForDatePicker',
        'ForDateRangePicker',
        'ForTimePicker',
      ]),
    );
  });

  it('does not count the module declaring injectHiddenInput as an adopter', () => {
    expect(adopters().filter((adopter) => adopter.source.startsWith('core/'))).toEqual([]);
  });

  it('calls assertNativeSubmissionContract from the spec beside every adopter', () => {
    const uncovered = adopters()
      .filter((adopter) => !CONTRACT_CALL.test(SPEC_CODE.get(adopter.spec) ?? ''))
      .map((adopter) => `${adopter.className} (${adopter.source}): no call in ${adopter.spec}`);

    expect(uncovered).toEqual([]);
  });
});
