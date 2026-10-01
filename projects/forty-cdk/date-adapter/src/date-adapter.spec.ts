import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { injectDateAdapter } from 'forty-cdk/core';
import {
  FOR_DATE_ADAPTER as SHARED_FOR_DATE_ADAPTER,
  NativeDateAdapter as SharedNativeDateAdapter,
  provideNativeDateAdapter as sharedProvideNativeDateAdapter,
} from 'forty-cdk/shared';

import { entryPointOf, LIBRARY_CODE } from '../../src/test-utils/source-scan';
import { FOR_DATE_ADAPTER, NativeDateAdapter, provideNativeDateAdapter } from './public-api';

const SPECIFIER = /(?:^|\n)\s*(?:import|export)\b[^'";]*?from\s*'([^']+)'/g;
const DECLARATION =
  /\b(?:const\s+FOR_DATE_ADAPTER\s*=|function\s+createFormatterCache\b|class\s+NativeDateAdapter\b|interface\s+DateAdapter\b)/;

function sourcesOf(entry: string): Array<readonly [string, string]> {
  return [...LIBRARY_CODE].filter(([path]) => entryPointOf(path) === entry);
}

describe('forty-cdk/date-adapter', () => {
  it('imports nothing but @angular/core and its own modules', () => {
    const sources = sourcesOf('date-adapter');
    expect(sources.map(([path]) => path).sort()).toEqual([
      'date-adapter/src/date-adapter.ts',
      'date-adapter/src/formatter-cache.ts',
      'date-adapter/src/native-date-adapter.ts',
      'date-adapter/src/public-api.ts',
    ]);

    const foreign = sources.flatMap(([path, code]) =>
      [...code.matchAll(SPECIFIER)]
        .map((match) => match[1]!)
        .filter((specifier) => specifier !== '@angular/core' && !specifier.startsWith('./'))
        .map((specifier) => `${path} → ${specifier}`),
    );
    expect(foreign).toEqual([]);
  });

  it('is the only entry point declaring the adapter token, interface, cache and native adapter', () => {
    const declaring = [...LIBRARY_CODE]
      .filter(([, code]) => DECLARATION.test(code))
      .map(([path]) => entryPointOf(path));

    expect(new Set(declaring)).toEqual(new Set(['date-adapter']));
  });

  it('is re-exported from forty-cdk/shared as the same objects', () => {
    expect(SHARED_FOR_DATE_ADAPTER).toBe(FOR_DATE_ADAPTER);
    expect(SharedNativeDateAdapter).toBe(NativeDateAdapter);
    expect(sharedProvideNativeDateAdapter).toBe(provideNativeDateAdapter);
  });

  it('provides the adapter injectDateAdapter resolves', () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), ...provideNativeDateAdapter()],
    });

    const adapter = TestBed.inject(FOR_DATE_ADAPTER);
    expect(adapter).toBeInstanceOf(NativeDateAdapter);
    expect(TestBed.runInInjectionContext(() => injectDateAdapter<Date>('spec'))).toBe(adapter);
  });
});
