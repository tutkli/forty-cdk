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

const IMPORT_FROM = /^\s*(?:import|export)\b[^;'"]*?\bfrom\s+'([^']+)';/gm;

const SIDE_EFFECT_IMPORT = /^\s*import\s+'([^']+)';/gm;

function importedSpecifiers(source: string): readonly string[] {
  return [
    ...[...source.matchAll(IMPORT_FROM)].map((match) => match[1]!),
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
});
