import {
  CORE_SYMBOL_PUBLISHER,
  INTERNAL_TIER_ENTRY_POINTS,
} from '../../../../../scripts/lib/core-blessed-tier.mjs';

const EXAMPLE_FOLDER_FILES = import.meta.glob(
  '/projects/forty-cdk-docs/src/app/demos/*/examples/**/*.ts',
  { query: '?raw', import: 'default', eager: true },
);

const LIBRARY_MANIFEST = import.meta.glob('/projects/forty-cdk/package.json', {
  query: '?raw',
  import: 'default',
  eager: true,
});

interface ExampleFile {
  readonly path: string;
  readonly source: string;
}

const FILES: readonly ExampleFile[] = Object.entries(EXAMPLE_FOLDER_FILES)
  .map(([key, source]) => ({ path: key.slice(1), source }))
  .sort((a, b) => a.path.localeCompare(b.path));

const EXAMPLES: readonly ExampleFile[] = FILES.filter((file) => file.path.endsWith('.example.ts'));

const EXAMPLE_FLOOR = 170;

const PEER_PACKAGES: readonly string[] = Object.keys(
  (
    JSON.parse(Object.values(LIBRARY_MANIFEST)[0] ?? '{}') as {
      peerDependencies?: Record<string, string>;
    }
  ).peerDependencies ?? {},
);

const ENTRY_POINT = /^forty-cdk\/[a-z0-9-]+$/;

const DEFAULTS_ENTRY_POINT = 'forty-cdk/defaults';

const DEFAULTS_SYMBOL = /^(?:provideFor\w*Defaults|FOR_\w+_DEFAULTS|For\w+Defaults)$/;

const IMPORT_FROM = /^\s*(?:import|export)\b([^;'"]*?)\bfrom\s+'([^']+)';/gm;

const SIDE_EFFECT_IMPORT = /^\s*import\s+'([^']+)';/gm;

interface ImportStatement {
  readonly file: string;
  readonly specifier: string;
  readonly names: readonly string[];
}

function namedBindingsOf(clause: string): readonly string[] {
  const braces = /\{([^}]*)\}/.exec(clause);
  return (braces?.[1] ?? '')
    .split(',')
    .map(
      (binding) =>
        binding
          .trim()
          .replace(/^type\s+/, '')
          .split(/\s+as\s+/)[0]!,
    )
    .filter((name) => name !== '');
}

function importStatements(files: readonly ExampleFile[]): readonly ImportStatement[] {
  return files.flatMap((file) =>
    [...file.source.matchAll(IMPORT_FROM)].map((match) => ({
      file: file.path,
      specifier: match[2]!,
      names: namedBindingsOf(match[1]!),
    })),
  );
}

function importedSpecifiers(source: string): readonly string[] {
  return [
    ...[...source.matchAll(IMPORT_FROM)].map((match) => match[2]!),
    ...[...source.matchAll(SIDE_EFFECT_IMPORT)].map((match) => match[1]!),
  ];
}

function packageOf(specifier: string): string {
  const segments = specifier.split('/');
  return specifier.startsWith('@') ? segments.slice(0, 2).join('/') : segments[0]!;
}

function importsNothingAReaderCanInstall(files: readonly ExampleFile[]): readonly string[] {
  const peers = new Set(PEER_PACKAGES);
  return files.flatMap((file) =>
    importedSpecifiers(file.source)
      .filter((specifier) => !ENTRY_POINT.test(specifier) && !peers.has(packageOf(specifier)))
      .map((specifier) => `${file.path}: ${specifier}`),
  );
}

function isInternalTier(specifier: string): boolean {
  const [scope, entry] = specifier.split('/');
  return scope === 'forty-cdk' && INTERNAL_TIER_ENTRY_POINTS.has(entry ?? '');
}

function importsFromTheInternalTier(files: readonly ExampleFile[]): readonly string[] {
  return importStatements(files)
    .filter(({ specifier }) => isInternalTier(specifier))
    .map(({ file, specifier, names }) => {
      const publishers = names.map((name) => {
        const publisher = CORE_SYMBOL_PUBLISHER.get(name);
        return publisher === undefined
          ? `${name} is not blessed`
          : `${name} is published from forty-cdk/${publisher}`;
      });
      return `${file}: ${specifier} (${publishers.join('; ')})`;
    });
}

function defaultsImportedFromAPrimitive(files: readonly ExampleFile[]): readonly string[] {
  return importStatements(files)
    .filter(({ specifier }) => specifier !== DEFAULTS_ENTRY_POINT)
    .flatMap(({ file, specifier, names }) =>
      names
        .filter((name) => DEFAULTS_SYMBOL.test(name))
        .map((name) => `${file}: ${name} from ${specifier}`),
    );
}

describe('the file a demo example hands to Copy', () => {
  it('reads every example the site publishes, not a fraction of them', () => {
    expect(EXAMPLES.length).toBeGreaterThanOrEqual(EXAMPLE_FLOOR);
  });

  it('keeps the examples folder to the files the Code tab can show', () => {
    const strays = FILES.filter((file) => !file.path.endsWith('.example.ts'));
    expect(strays.map((file) => file.path)).toEqual([]);
  });

  it('reads the peers the library declares, so the import rule allows more than nothing', () => {
    expect(PEER_PACKAGES.length).toBeGreaterThan(0);
  });

  it('resolves every import from an entry point or a declared peer, never from a sibling file', () => {
    expect(importsNothingAReaderCanInstall(EXAMPLES)).toEqual([]);
  });

  it('imports nothing from the internal core tier, which carries no semver guarantee', () => {
    expect(importsFromTheInternalTier(EXAMPLES)).toEqual([]);
  });

  it('imports every defaults pair from forty-cdk/defaults, never from its primitive', () => {
    expect(defaultsImportedFromAPrimitive(EXAMPLES)).toEqual([]);
  });

  it('reads the defaults pairs the examples import, so the defaults rule sees more than nothing', () => {
    const fromDefaults = importStatements(EXAMPLES).filter(
      ({ specifier, names }) =>
        specifier === DEFAULTS_ENTRY_POINT && names.some((name) => DEFAULTS_SYMBOL.test(name)),
    );
    expect(fromDefaults.length).toBeGreaterThan(0);
  });
});
