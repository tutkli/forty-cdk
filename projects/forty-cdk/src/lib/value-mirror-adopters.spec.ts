import { LIBRARY_CODE } from '../test-utils/source-scan';

const NATIVE_INPUT_LISTENER = /'\(input\)'\s*:|\.addEventListener\(\s*'input'/;

const SHARED_MIRROR = /\b(?:mirrorValue|mirrorExternalValue)\(/;

const OWN_WRITE_MIRROR = /\bmirrorExternalValue\(/;

const RETIRED_MIRROR = /\bmirrorUnfocusedValue\b/;

const NATIVE_FORM_RESET = /\binjectNativeFormReset\(/;

interface Exclusion {
  readonly reason: string;
  readonly holds: (code: string) => boolean;
}

const EXCLUSIONS: Readonly<Record<string, Exclusion>> = {
  'combobox/src/combobox-input.ts': {
    reason:
      'the input edits the query, not a form value; the selection submits through a hidden input',
    holds: (code) =>
      !/\bimplements\b[^{]*\bFormValueControl\b/.test(code) && /\bquery\b/.test(code),
  },
};

const OWN_WRITE_MIRROR_ALLOWLIST: Readonly<Record<string, string>> = {
  'number-input/src/number-input.ts':
    'the spinbutton displays formatted text that differs from the text being typed',
};

function nativeInputControls(): string[] {
  return [...LIBRARY_CODE]
    .filter(([, code]) => NATIVE_INPUT_LISTENER.test(code))
    .map(([path]) => path)
    .sort();
}

function declaringSource(className: string): [string, string] | undefined {
  const declaration = new RegExp(`\\bclass\\s+${className}\\b`);
  return [...LIBRARY_CODE].find(([, code]) => declaration.test(code));
}

function heritageChain(path: string): string[] {
  const chain = [path];
  let code = LIBRARY_CODE.get(path)!;
  for (;;) {
    const base = /\bclass\s+\w+(?:<[^>]*>)?\s+extends\s+(\w+)/.exec(code)?.[1];
    const declared = base === undefined ? undefined : declaringSource(base);
    if (declared === undefined) {
      return chain;
    }
    chain.push(declared[0]);
    code = declared[1];
  }
}

function callsAlongHeritage(path: string, pattern: RegExp): boolean {
  return heritageChain(path).some((link) => pattern.test(LIBRARY_CODE.get(link)!));
}

describe('value mirror adoption (meta-guard)', () => {
  it('finds the controls that edit a native input', () => {
    expect(nativeInputControls()).toEqual(
      expect.arrayContaining([
        'input/src/input.ts',
        'input/src/textarea.ts',
        'number-input/src/number-input.ts',
        'otp-input/src/otp-input.ts',
        'search/src/search.ts',
      ]),
    );
  });

  it('resolves the text controls to the base that mirrors for them', () => {
    expect(heritageChain('input/src/input.ts')).toContain(
      'core/src/form-ui-control/text-value-control-base.ts',
    );
  });

  it('mirrors every native-input control through a shared mirror', () => {
    const missing = nativeInputControls().filter(
      (path) => !(path in EXCLUSIONS) && !callsAlongHeritage(path, SHARED_MIRROR),
    );
    expect(missing).toEqual([]);
  });

  it('hands every native-input control the native form reset', () => {
    const missing = nativeInputControls().filter(
      (path) => !(path in EXCLUSIONS) && !callsAlongHeritage(path, NATIVE_FORM_RESET),
    );
    expect(missing).toEqual([]);
  });

  it('keeps the own-write mirror to the controls allowlisted for it', () => {
    const callers = [...LIBRARY_CODE]
      .filter(
        ([path, code]) =>
          path !== 'core/src/form-ui-control/value-mirror.ts' && OWN_WRITE_MIRROR.test(code),
      )
      .map(([path]) => path)
      .sort();
    expect(callers).toEqual(Object.keys(OWN_WRITE_MIRROR_ALLOWLIST).sort());
  });

  it('leaves the retired focus-guarded mirror out of the library', () => {
    const users = [...LIBRARY_CODE].filter(([, code]) => RETIRED_MIRROR.test(code));
    expect(users.map(([path]) => path)).toEqual([]);
  });

  it.each(Object.entries(EXCLUSIONS))('still excludes %s for its reason', (path, exclusion) => {
    const code = LIBRARY_CODE.get(path);
    expect(code, exclusion.reason).toBeDefined();
    expect(NATIVE_INPUT_LISTENER.test(code!), exclusion.reason).toBe(true);
    expect(exclusion.holds(code!), exclusion.reason).toBe(true);
  });
});
