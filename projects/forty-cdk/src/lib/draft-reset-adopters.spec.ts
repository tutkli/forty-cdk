import { LIBRARY_CODE } from '../test-utils/source-scan';

const FORM_VALUE_CONTROL = /\bexport\s+class\s+\w+[^{]*\bimplements\b[^{]*\bFormValueControl\b/;

const DRAFT_HOLDER =
  /\bnew\s+(?:DateFieldEngine|TimeFieldEngine|RangeFieldComposer)\b|\bprovide:\s*FOR_(?:DATE|TIME)_FIELD_HOST\b/;

const RESET_IMPLEMENTATION = /\boverride\s+reset\(\):\s*void\s*\{/;

function draftHoldingControls(): string[] {
  return [...LIBRARY_CODE]
    .filter(([, code]) => FORM_VALUE_CONTROL.test(code) && DRAFT_HOLDER.test(code))
    .map(([path]) => path)
    .sort();
}

describe('draft reset adoption (meta-guard, #2232)', () => {
  it('finds every form control that can hold a draft its value cannot represent', () => {
    expect(draftHoldingControls().length).toBeGreaterThanOrEqual(6);
  });

  it('implements FormUiControl.reset on every one of them', () => {
    const missing = draftHoldingControls().filter(
      (path) => !RESET_IMPLEMENTATION.test(LIBRARY_CODE.get(path)!),
    );
    expect(missing).toEqual([]);
  });
});
