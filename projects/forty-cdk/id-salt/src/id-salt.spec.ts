import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { IdGenerator } from 'forty-cdk/core';
import {
  FOR_ID_SALT as SHARED_FOR_ID_SALT,
  provideForIdSalt as sharedProvideForIdSalt,
} from 'forty-cdk/shared';

import { entryPointOf, LIBRARY_CODE } from '../../src/test-utils/source-scan';
import { FOR_ID_SALT, provideForIdSalt } from './public-api';

const SPECIFIER = /(?:^|\n)\s*(?:import|export)\b[^'";]*?from\s*'([^']+)'/g;
const DECLARATION = /\b(?:const\s+FOR_ID_SALT\s*=|function\s+provideForIdSalt\b)/;

function sourcesOf(entry: string): Array<readonly [string, string]> {
  return [...LIBRARY_CODE].filter(([path]) => entryPointOf(path) === entry);
}

describe('forty-cdk/id-salt', () => {
  it('imports nothing but @angular/core and its own modules', () => {
    const sources = sourcesOf('id-salt');
    expect(sources.map(([path]) => path).sort()).toEqual([
      'id-salt/src/id-salt.ts',
      'id-salt/src/public-api.ts',
    ]);

    const foreign = sources.flatMap(([path, code]) =>
      [...code.matchAll(SPECIFIER)]
        .map((match) => match[1]!)
        .filter((specifier) => specifier !== '@angular/core' && !specifier.startsWith('./'))
        .map((specifier) => `${path} → ${specifier}`),
    );
    expect(foreign).toEqual([]);
  });

  it('is the only entry point declaring the salt token and its provider', () => {
    const declaring = [...LIBRARY_CODE]
      .filter(([, code]) => DECLARATION.test(code))
      .map(([path]) => entryPointOf(path));

    expect(new Set(declaring)).toEqual(new Set(['id-salt']));
  });

  it('is re-exported from forty-cdk/shared as the same objects', () => {
    expect(SHARED_FOR_ID_SALT).toBe(FOR_ID_SALT);
    expect(sharedProvideForIdSalt).toBe(provideForIdSalt);
  });

  it('salts the ids IdGenerator mints', () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideForIdSalt('host-a')],
    });

    expect(TestBed.inject(FOR_ID_SALT)).toBe('host-a');
    expect(TestBed.inject(IdGenerator).next('x')).toBe('x-host-a-1');
  });
});
