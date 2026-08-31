import { compileDocument, type DocDocument } from '../../../../../scripts/docs/doc-model.mjs';
import {
  COVERAGE_EXEMPTIONS,
  coverageProblems,
} from '../../../../../scripts/lib/docs-coverage.mjs';
import { compile } from './testing/compile';
import { PRIMITIVE_DOCS } from './testing/doc-corpus';

/**
 * The documentation-coverage gate
 * ([#1809](https://github.com/tutkli/forty-cdk/issues/1809)).
 *
 * Every case is stated as a refusal, because a gate is only worth its runtime if
 * a repository that broke the rule fails it. The corpus sweep at the end is the
 * other half: the rules are ones the library as it stands actually meets, and
 * the exemption list has exactly the three entries someone argued for.
 */
function readme(slug: string, ...fields: readonly string[]): DocDocument {
  return compileDocument(
    `${['---', `title: ${slug}`, ...fields, '---', '', `# ${slug}`, '', 'Lede.', '', '## API', '', 'Text.'].join('\n')}\n`,
    { path: `projects/forty-cdk/${slug}/README.md`, slug, kind: 'primitive' },
  );
}

/**
 * The exemption list is a module-level constant the real gate reads, so a case
 * stated over a corpus of two synthetic documents has to bring its own — every
 * real entry would otherwise report as an exemption that outlived its folder.
 */
function check(
  documents: readonly DocDocument[],
  overrides: Partial<Parameters<typeof coverageProblems>[0]> = {},
) {
  const bySlug = new Map(documents.map((document) => [document.slug, document]));
  return coverageProblems({
    entryPoints: [...bySlug.keys()].sort(),
    documents: bySlug,
    guides: new Set<string>(),
    routes: new Set(
      documents
        .filter((document) => document.meta?.group !== 'none')
        .map((document) => document.slug),
    ),
    routesFile: 'app.routes.ts',
    exemptions: [],
    ...overrides,
  });
}

const only = (problems: readonly string[]) => problems.join('\n');

describe('an entry point the site publishes nowhere', () => {
  it('fails when its README declares group: none and no fold', () => {
    const { problems } = check([readme('orphan', 'group: none', 'archetype: [headless-utility]')]);

    expect(only(problems)).toContain('orphan ships a README the site publishes nowhere');
  });

  it('passes once it declares a nav group', () => {
    const { problems, counts } = check([
      readme('orphan', 'group: utilities', 'archetype: [headless-utility]'),
    ]);

    expect(problems).toEqual([]);
    expect(counts.published).toBe(1);
  });

  it('fails when the entry point ships no README at all', () => {
    const { problems } = check(
      [readme('host', 'group: primitives', 'archetype: [composable-ui]')],
      {
        entryPoints: ['host', 'undocumented'],
      },
    );

    expect(only(problems)).toContain('undocumented ships an entry point with no README at all');
  });
});

describe('a fold', () => {
  const host = () =>
    compileDocument(
      `${['---', 'title: Host', 'group: primitives', 'archetype: [composable-ui]', '---', '', '# Host', '', 'Lede.', '', '## Windowed rows', '', 'Text.'].join('\n')}\n`,
      { path: 'projects/forty-cdk/host/README.md', slug: 'host', kind: 'primitive' },
    );

  it('covers the folded entry point without an exemption', () => {
    const { problems, counts } = check([
      host(),
      readme('ext', 'group: none', 'archetype: [composable-ui]', 'foldInto: host#windowed-rows'),
    ]);

    expect(problems).toEqual([]);
    expect(counts.folded).toBe(1);
  });

  it('fails when the host page declares no such section, naming the ones it has', () => {
    const { problems } = check([
      host(),
      readme('ext', 'group: none', 'archetype: [composable-ui]', 'foldInto: host#renamed'),
    ]);

    expect(only(problems)).toContain('#windowed-rows');
    expect(only(problems)).toContain('a renamed heading is a broken link');
  });

  it('fails when the host publishes no page of its own', () => {
    const { problems } = check([
      readme('host', 'group: none', 'archetype: [composable-ui]'),
      readme('ext', 'group: none', 'archetype: [composable-ui]', 'foldInto: host#api'),
    ]);

    expect(only(problems)).toContain('ext folds into "host", which publishes no page of its own');
  });

  it('fails when the anchors it would mint collide with the host page', () => {
    const collides = compileDocument(
      `${['---', 'title: Host', 'group: primitives', 'archetype: [composable-ui]', '---', '', '# Host', '', 'Lede.', '', '## Windowed rows', '', 'Text.', '', '## ext-api', '', 'Text.'].join('\n')}\n`,
      { path: 'projects/forty-cdk/host/README.md', slug: 'host', kind: 'primitive' },
    );
    const { problems } = check([
      collides,
      readme('ext', 'group: none', 'archetype: [composable-ui]', 'foldInto: host#windowed-rows'),
    ]);

    expect(only(problems)).toContain('mints 1 anchor(s) the host already emits (ext-api)');
  });
});

describe('a route', () => {
  it('fails when the site serves one for an entry point the library does not ship', () => {
    const { problems } = check(
      [readme('real', 'group: primitives', 'archetype: [composable-ui]')],
      {
        routes: new Set(['real', 'removed']),
      },
    );

    expect(only(problems)).toContain('serves "/removed"');
    expect(only(problems)).toContain('the library ships no such entry point');
  });

  it('fails when a published entry point has no route to render it', () => {
    const { problems } = check(
      [readme('real', 'group: primitives', 'archetype: [composable-ui]')],
      {
        routes: new Set<string>(),
      },
    );

    expect(only(problems)).toContain('serves no "/real" route');
  });
});

describe('the exemption list', () => {
  it('is what turns an omission into a pass', () => {
    const orphan = [readme('orphan', 'group: none', 'archetype: [headless-utility]')];

    expect(only(check(orphan).problems)).toContain('publishes nowhere');
    expect(
      check(orphan, { exemptions: [{ slug: 'orphan', reason: 'It is internal.' }] }).problems,
    ).toEqual([]);
  });

  it('fails when the entry point is documented after all', () => {
    const { problems } = check([readme('a', 'group: primitives', 'archetype: [composable-ui]')], {
      exemptions: [{ slug: 'a', reason: 'It is internal.' }],
    });

    expect(only(problems)).toContain('a carries a documentation exemption and is documented');
  });

  it('fails when it names an entry point the library no longer ships', () => {
    const { problems } = check([readme('a', 'group: primitives', 'archetype: [composable-ui]')], {
      exemptions: [{ slug: 'gone', reason: 'It was internal.' }],
    });

    expect(only(problems)).toContain('COVERAGE_EXEMPTIONS names gone');
    expect(only(problems)).toContain('the entry point is gone and its exemption outlived it');
  });

  it('fails when the entry it names states no reason', () => {
    const { problems } = check([readme('a', 'group: none', 'archetype: [headless-utility]')], {
      exemptions: [{ slug: 'a', reason: '  ' }],
    });

    expect(only(problems)).toContain('COVERAGE_EXEMPTIONS names a with no stated reason');
  });

  it('holds a deferral to a guide to that guide being published', () => {
    const document = readme('adapters', 'group: none', 'archetype: [headless-utility]');
    const exemptions = [{ slug: 'adapters', reason: 'A guide covers it.', guide: 'date-adapters' }];

    expect(only(check([document], { exemptions }).problems)).toContain(
      'adapters is exempt because the "date-adapters" guide covers it',
    );
    expect(check([document], { exemptions, guides: new Set(['date-adapters']) }).problems).toEqual(
      [],
    );
  });

  it('states a reason for every entry', () => {
    for (const exemption of COVERAGE_EXEMPTIONS) {
      expect(exemption.reason.trim().length).toBeGreaterThan(40);
    }
  });
});

describe('the library as it stands', () => {
  const documents = new Map(PRIMITIVE_DOCS.map((doc) => [doc.slug, compile(doc)]));

  it('exempts exactly the three entry points someone argued for', () => {
    expect(COVERAGE_EXEMPTIONS.map((exemption) => exemption.slug)).toEqual([
      'core',
      'core-overlay',
      'internationalized-date',
    ]);
  });

  it('leaves no README with neither a page, a fold nor an exemption', () => {
    const exempt = new Set(COVERAGE_EXEMPTIONS.map((exemption) => exemption.slug));
    const uncovered = [...documents.values()].filter(
      (document) =>
        document.meta!.group === 'none' &&
        document.meta!.foldInto === null &&
        !exempt.has(document.slug),
    );

    expect(uncovered.map((document) => document.slug)).toEqual([]);
  });

  it('publishes shared and visually-hidden, which shipped a README and no page', () => {
    expect(documents.get('shared')!.meta!.group).toBe('utilities');
    expect(documents.get('visually-hidden')!.meta!.group).toBe('utilities');
  });
});
