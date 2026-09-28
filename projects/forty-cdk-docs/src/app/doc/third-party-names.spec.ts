import {
  jsdocLines,
  markdownLines,
  THIRD_PARTY_EXEMPTIONS,
  THIRD_PARTY_NAMES,
  type ThirdPartyExemption,
  thirdPartyProblems,
} from '../../../../../scripts/lib/third-party-names.mjs';
import { SITE_DOCS } from './testing/doc-corpus';

const TAILWIND: ThirdPartyExemption = {
  name: 'Tailwind',
  entryPoint: 'breakpoints',
  reason: 'The preset is named after the scale it copies.',
};

const README_PATH = /^projects\/forty-cdk\/([^/]+)\/README\.md$/;

function readme(entryPoint: string, ...body: readonly string[]) {
  return markdownLines(['# Title', '', ...body].join('\n'), {
    path: `projects/forty-cdk/${entryPoint}/README.md`,
    entryPoint,
  });
}

function mentionAt(path: string, line: number, name: string) {
  return expect.stringMatching(
    new RegExp(`^${path.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}:${line} names ${name} — `),
  );
}

const only = (problems: readonly string[]) => problems.join('\n');

describe('a README naming another UI library', () => {
  it('fails once per mention, naming the file and the line', () => {
    const { problems } = thirdPartyProblems(
      readme('tooltip', 'A press closes the tooltip. This mirrors Radix and Base UI.'),
      { exemptions: [] },
    );

    expect(problems).toEqual([
      mentionAt('projects/forty-cdk/tooltip/README.md', 3, 'Radix'),
      mentionAt('projects/forty-cdk/tooltip/README.md', 3, 'Base UI'),
    ]);
  });

  it('fails a mention inside a code fence', () => {
    const { problems } = thirdPartyProblems(
      readme('drag-drop', '```ts', "import { CdkDrag } from '@angular/cdk/drag-drop';", '```'),
      { exemptions: [] },
    );

    expect(problems).toEqual([
      mentionAt('projects/forty-cdk/drag-drop/README.md', 4, 'CdkDrag'),
      mentionAt('projects/forty-cdk/drag-drop/README.md', 4, '@angular/cdk'),
    ]);
  });

  it('names the right line of a README written with CRLF endings', () => {
    const lines = markdownLines('# Title\r\n\r\nMirrors Vaul.\r\n', {
      path: 'projects/forty-cdk/drawer/README.md',
      entryPoint: 'drawer',
    });

    expect(thirdPartyProblems(lines, { exemptions: [] }).problems).toEqual([
      mentionAt('projects/forty-cdk/drawer/README.md', 3, 'Vaul'),
    ]);
  });

  it('passes the same behaviour described on its own terms', () => {
    const { problems } = thirdPartyProblems(
      readme('tooltip', 'A press closes the tooltip: the user is acting on the control.'),
      { exemptions: [] },
    );

    expect(problems).toEqual([]);
  });
});

describe('the exemption list', () => {
  it('lets the exempted name through inside its own entry point', () => {
    const { problems, exempted } = thirdPartyProblems(
      readme('breakpoints', 'Without a provider the Tailwind scale is used.'),
      { exemptions: [TAILWIND] },
    );

    expect(problems).toEqual([]);
    expect(exempted).toBe(1);
  });

  it('still fails the exempted name in any other entry point', () => {
    const { problems } = thirdPartyProblems(
      [
        ...readme('breakpoints', 'Without a provider the Tailwind scale is used.'),
        ...readme('select', 'Style the trigger with Tailwind.'),
      ],
      { exemptions: [TAILWIND] },
    );

    expect(problems).toEqual([mentionAt('projects/forty-cdk/select/README.md', 3, 'Tailwind')]);
  });

  it('still fails any other name inside the exempted entry point', () => {
    const { problems } = thirdPartyProblems(
      readme('breakpoints', 'The Tailwind scale, mirroring the CDK observer.'),
      { exemptions: [TAILWIND] },
    );

    expect(problems).toEqual([mentionAt('projects/forty-cdk/breakpoints/README.md', 3, 'CDK')]);
  });

  it('fails an exemption that no longer matches anything', () => {
    const { problems } = thirdPartyProblems(readme('breakpoints', 'The default scale is used.'), {
      exemptions: [TAILWIND],
    });

    expect(problems).toEqual([
      expect.stringContaining('the Tailwind exemption in forty-cdk/breakpoints matched nothing'),
    ]);
  });

  it('carries exactly the Tailwind preset, with the reason it stays', () => {
    expect(THIRD_PARTY_EXEMPTIONS.map(({ name, entryPoint }) => ({ name, entryPoint }))).toEqual([
      { name: 'Tailwind', entryPoint: 'breakpoints' },
    ]);
    expect(THIRD_PARTY_EXEMPTIONS[0]!.reason).toContain('forBreakpointsTailwind');
  });
});

describe('the liveness probe', () => {
  it('reports every listed name when it meets its own spelling', () => {
    const lines = THIRD_PARTY_NAMES.map(({ name }, index) => ({
      path: 'probe.md',
      line: index + 1,
      entryPoint: null,
      text: `This mirrors ${name}.`,
    }));

    const { problems } = thirdPartyProblems(lines, { exemptions: [] });

    expect(problems).toEqual(
      THIRD_PARTY_NAMES.map((_, index) =>
        expect.stringMatching(new RegExp(`^probe\\.md:${index + 1} names `)),
      ),
    );
  });

  it('fails a pattern that no longer matches the name it is listed under', () => {
    const { problems } = thirdPartyProblems(readme('tooltip', 'A press closes the tooltip.'), {
      names: [{ name: 'Radix', pattern: /\bRadix UI\b/ }],
      exemptions: [],
    });

    expect(only(problems)).toContain('the pattern /\\bRadix UI\\b/ no longer matches "Radix"');
  });

  it('fails a scan that read no lines', () => {
    expect(thirdPartyProblems([], { exemptions: [] }).problems).toEqual([
      'the scan read no lines — a gate that reads nothing cannot report anything',
    ]);
  });
});

describe('the JSDoc of a declaration file', () => {
  const declarations = [
    "import { type ForDragDropConfig } from 'forty-cdk/drag-drop';",
    '/**',
    ' * Element that activates the tooltip, mirroring Radix.',
    ' */',
    'declare class ForFreeDrag {',
    "    /** Mirrors CDK's `cdkDragRootElement`. */",
    '    readonly rootElement: string;',
    "    readonly origin: 'Radix';",
    '}',
    'export { ForFreeDrag };',
  ].join('\n');

  const origin = { path: 'dist/forty-cdk/types/forty-cdk-drag-drop.d.ts', entryPoint: 'drag-drop' };

  it('reads every line of every JSDoc block at its own line number', () => {
    expect(jsdocLines(declarations, origin).map(({ line, text }) => [line, text])).toEqual([
      [2, '/**'],
      [3, ' * Element that activates the tooltip, mirroring Radix.'],
      [4, ' */'],
      [6, "/** Mirrors CDK's `cdkDragRootElement`. */"],
    ]);
  });

  it('reports the names in the JSDoc and not in the declarations it documents', () => {
    const { problems } = thirdPartyProblems(jsdocLines(declarations, origin), { exemptions: [] });

    expect(problems).toEqual([
      mentionAt(origin.path, 3, 'Radix'),
      mentionAt(origin.path, 6, 'CDK'),
      mentionAt(origin.path, 6, 'cdkDragRootElement'),
    ]);
  });
});

describe('the published documentation', () => {
  it('names no other UI library outside the exemption list', () => {
    const lines = SITE_DOCS.flatMap((doc) =>
      markdownLines(doc.markdown, {
        path: doc.path,
        entryPoint: README_PATH.exec(doc.path)?.[1] ?? null,
      }),
    );

    expect(only(thirdPartyProblems(lines).problems)).toBe('');
  });
});
