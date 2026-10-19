import { PAGE_DOCS } from './testing/doc-corpus';

const SOURCES: Readonly<Record<string, string>> = {
  ...import.meta.glob('/README.md', { query: '?raw', import: 'default', eager: true }),
  ...import.meta.glob('/projects/forty-cdk/README.md', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
  ...import.meta.glob('/projects/forty-cdk/package.json', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
};

function source(path: string): string {
  const text = SOURCES[path];
  if (text === undefined || text.length === 0) {
    throw new Error(`${path} read back empty`);
  }
  return text;
}

const ROOT_README = source('/README.md');
const PACKAGE_README = source('/projects/forty-cdk/README.md');
const MANIFEST = JSON.parse(source('/projects/forty-cdk/package.json')) as {
  readonly peerDependencies: Readonly<Record<string, string>>;
};

const INSTALLATION = (() => {
  const doc = PAGE_DOCS.find(({ path }) => path === 'docs/site/installation.md');
  if (doc === undefined) {
    throw new Error('docs/site/installation.md is not registered as a site page');
  }
  return doc.markdown;
})();

const ANGULAR_CORE = ['@angular', 'core'].join('/');

const SPECIFIER_ROW = /^\|\s*\[?`(forty-cdk\/[a-z-]+)`/gm;
const OPEN_ENDED = /\b(?:and above|or later|or newer|or higher)\b/i;
const QUOTED_RANGE = /`(\^\d+\.\d+\.\d+)`/g;

function unpublishedRanges(markdown: string): readonly string[] {
  const published = new Set(Object.values(MANIFEST.peerDependencies));
  return [...markdown.matchAll(QUOTED_RANGE)]
    .map((match) => match[1]!)
    .filter((range) => !published.has(range));
}

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

describe('the installation page', () => {
  const shared = [...PACKAGE_README.matchAll(SPECIFIER_ROW)].map((match) => match[1]!);

  it('reads the shared specifiers off the package README table', () => {
    expect(shared).toContain('forty-cdk/shared');
  });

  it('names every shared specifier the package README lists', () => {
    expect(shared.filter((specifier) => !INSTALLATION.includes(`\`${specifier}\``))).toEqual([]);
  });

  it('states the range the manifest publishes for every peer', () => {
    const peers = Object.entries(MANIFEST.peerDependencies);
    const misquoted = peers.filter(
      ([name, range]) =>
        !new RegExp(`^\\|\\s*\`${escape(name)}\`\\s*\\|\\s*\`${escape(range)}\`\\s*\\|`, 'm').test(
          INSTALLATION,
        ),
    );

    expect(peers.length).toBeGreaterThan(0);
    expect(misquoted).toEqual([]);
  });

  it('claims no support past the major the peer range admits', () => {
    expect(INSTALLATION).not.toMatch(OPEN_ENDED);
    expect(unpublishedRanges(INSTALLATION)).toEqual([]);
  });
});

describe('the root README', () => {
  const range = MANIFEST.peerDependencies[ANGULAR_CORE]!;
  const major = /^\^(\d+)\./.exec(range)?.[1];

  it('quotes the Angular peer range the manifest publishes', () => {
    expect(major).toBeDefined();
    expect(ROOT_README).toContain(`\`${range}\``);
  });

  it('badges the one Angular major the peer range admits', () => {
    expect(ROOT_README).toContain(`https://img.shields.io/badge/Angular-${major}-`);
    expect(ROOT_README).not.toMatch(OPEN_ENDED);
    expect(unpublishedRanges(ROOT_README)).toEqual([]);
  });
});
