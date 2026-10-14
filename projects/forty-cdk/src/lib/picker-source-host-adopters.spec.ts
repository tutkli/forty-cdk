import { entryPointOf, LIBRARY_CODE } from '../test-utils/source-scan';

const PROVIDES_HOST = /\bprovide:\s*FOR_PICKER_SOURCE_HOST\b/;

const QUERIED_TOKEN = /\bcontentChild\(\s*(FOR_[A-Z_]+)\b/g;

const INJECTS_HOST = /\binject\(\s*FOR_PICKER_SOURCE_HOST\b/;

function hostEntryPoints(): Set<string> {
  return new Set(
    [...LIBRARY_CODE]
      .filter(([, code]) => PROVIDES_HOST.test(code))
      .map(([path]) => entryPointOf(path)),
  );
}

function queriedTokens(): Set<string> {
  const entryPoints = hostEntryPoints();
  const tokens = new Set<string>();
  for (const [path, code] of LIBRARY_CODE) {
    if (!entryPoints.has(entryPointOf(path))) {
      continue;
    }
    for (const match of code.matchAll(QUERIED_TOKEN)) {
      tokens.add(match[1]!);
    }
  }
  return tokens;
}

function projectedSources(): string[] {
  const providers = [...queriedTokens()].map((token) => new RegExp(`\\bprovide:\\s*${token}\\b`));
  return [...LIBRARY_CODE]
    .filter(([, code]) => providers.some((provider) => provider.test(code)))
    .map(([path]) => path)
    .sort();
}

describe('picker source host adoption (meta-guard, #2226)', () => {
  it('finds the pickers providing the host and the sources they query', () => {
    expect([...hostEntryPoints()]).toEqual(['date-picker']);
    expect([...queriedTokens()].sort()).toEqual(['FOR_CALENDAR_CONTEXT', 'FOR_TIME_VALUE_SOURCE']);
    expect(projectedSources()).toEqual([
      'calendar/src/calendar.ts',
      'time-field/src/time-field.ts',
      'time-picker/src/time-picker.ts',
    ]);
  });

  it('makes every source a picker queries read the picker source host', () => {
    const missing = projectedSources().filter(
      (path) => !INJECTS_HOST.test(LIBRARY_CODE.get(path)!),
    );
    expect(missing).toEqual([]);
  });
});
