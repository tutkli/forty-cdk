import { entryPointOf, LIBRARY_CODE, README_SOURCES } from '../test-utils/source-scan';

const STATEMENT = /(?:^|\n)\s*(import|export)\b(\s+type\b)?[^'";]*?from\s*'([^']+)'/g;
const BARE_IMPORT = /(?:^|\n)\s*import\s*'([^']+)'/g;
const DEFAULTS_INTERFACE = /export interface For[A-Za-z]+Defaults[^{]*\{([\s\S]*?)\n\}/;
const PROVIDER = /export function (provideFor[A-Za-z]+Defaults)\b/;
const REEXPORT = /export\s*\{([^}]*)\}\s*from\s*'forty-cdk\/defaults';/g;
const SCOPED_DEFAULTS = /(?:^|\n)## Scoped defaults\n([\s\S]*?)(?=\n## |$)/;

interface DefaultsPair {
  readonly file: string;
  readonly provider: string;
  readonly keys: readonly string[];
}

function sourcesOf(entry: string): Array<readonly [string, string]> {
  return [...LIBRARY_CODE].filter(([path]) => entryPointOf(path) === entry);
}

function foreignValueSpecifiers(path: string, code: string): string[] {
  const foreign = (specifier: string): boolean =>
    specifier !== '@angular/core' && !specifier.startsWith('./');
  const fromStatements = [...code.matchAll(STATEMENT)]
    .filter((match) => match[2] === undefined && foreign(match[3]!))
    .map((match) => `${path} → ${match[1]} from '${match[3]}'`);
  const bare = [...code.matchAll(BARE_IMPORT)]
    .filter((match) => foreign(match[1]!))
    .map((match) => `${path} → import '${match[1]}'`);
  return [...fromStatements, ...bare];
}

function defaultsPairs(): DefaultsPair[] {
  return sourcesOf('defaults')
    .filter(([path]) => path.endsWith('-defaults.ts'))
    .map(([file, code]) => {
      const body = code.match(DEFAULTS_INTERFACE)?.[1] ?? '';
      return {
        file,
        provider: code.match(PROVIDER)?.[1] ?? '',
        keys: [...body.matchAll(/^ {2}([a-zA-Z][A-Za-z0-9]*)\??:/gm)].map((match) => match[1]!),
      };
    });
}

function readmeByProvider(): Map<string, string> {
  const readmes = new Map<string, string>();
  for (const [path, code] of LIBRARY_CODE) {
    const entry = entryPointOf(path);
    if (!path.endsWith('/src/public-api.ts') || entry === 'defaults') {
      continue;
    }
    for (const match of code.matchAll(REEXPORT)) {
      for (const name of match[1]!.split(',').map((raw) => raw.trim())) {
        if (/^provideFor[A-Za-z]+Defaults$/.test(name)) {
          readmes.set(name, `${entry}/README.md`);
        }
      }
    }
  }
  return readmes;
}

describe('forty-cdk/defaults entry point', () => {
  describe('import set', () => {
    it('imports nothing at runtime but @angular/core and its own modules', () => {
      const sources = sourcesOf('defaults');
      expect(sources.length).toBeGreaterThan(35);

      expect(sources.flatMap(([path, code]) => foreignValueSpecifiers(path, code))).toEqual([]);
    });

    it('reports a value import of another forty-cdk entry point', () => {
      const code = [
        "import { InjectionToken } from '@angular/core';",
        "import type { LocalizableText } from 'forty-cdk/core';",
        "import { resolveLocalizableText } from 'forty-cdk/core';",
        "export { type FloatingSide } from 'forty-cdk/core-overlay';",
        "export type { FloatingAlign } from 'forty-cdk/core-overlay';",
        "import 'forty-cdk/core';",
        "import { provideDefaults } from './defaults';",
      ].join('\n');

      expect(foreignValueSpecifiers('probe.ts', code)).toEqual([
        "probe.ts → import from 'forty-cdk/core'",
        "probe.ts → export from 'forty-cdk/core-overlay'",
        "probe.ts → import 'forty-cdk/core'",
      ]);
    });
  });

  describe('README coverage', () => {
    const pairs = defaultsPairs();
    const readmes = readmeByProvider();

    it('derives a provider and its keys from every defaults file', () => {
      expect(pairs.length).toBeGreaterThan(35);
      for (const pair of pairs) {
        expect(pair.provider, pair.file).not.toBe('');
        expect(pair.keys.length, pair.file).toBeGreaterThan(0);
      }
    });

    it('maps every provider to the README of the entry point re-exporting it', () => {
      const unmapped = pairs
        .filter((pair) => !README_SOURCES.has(readmes.get(pair.provider) ?? ''))
        .map((pair) => pair.provider);

      expect(unmapped).toEqual([]);
    });

    it('names every provider and every key it accepts under ## Scoped defaults', () => {
      const missing = pairs.flatMap((pair) => {
        const readme = readmes.get(pair.provider)!;
        const section = README_SOURCES.get(readme)
          ?.replace(/\r\n/g, '\n')
          .match(SCOPED_DEFAULTS)?.[1];
        if (section === undefined) {
          return [`${readme}: no ## Scoped defaults section`];
        }
        return [
          ...(new RegExp(`\\b${pair.provider}\\b`).test(section) ? [] : [pair.provider]),
          ...pair.keys.filter((key) => !section.includes(`\`${key}\``)).map((key) => `\`${key}\``),
        ].map((name) => `${readme}: ${pair.provider} → ${name}`);
      });

      expect(missing).toEqual([]);
    });
  });
});
