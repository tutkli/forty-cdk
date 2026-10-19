import { fencesOf } from '../../../../../scripts/docs/doc-model.mjs';
import { accessibleName } from './testing/accessible-name';
import { type DocFile, SITE_DOCS } from './testing/doc-corpus';

const ROOT_README = import.meta.glob('/README.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const TEMPLATE_LITERAL = /template:\s*`([\s\S]*?)`/g;

interface FencedSwitch {
  readonly at: string;
  readonly name: string;
  readonly markup: string;
}

function rootReadme(): DocFile {
  const markdown = ROOT_README['/README.md'];
  if (markdown === undefined) {
    throw new Error('README.md was not found at the repository root');
  }
  return { path: 'README.md', slug: 'readme', markdown };
}

function templatesOf(language: string | null, code: string): readonly string[] {
  if (language === 'html') {
    return [code];
  }
  if (language === 'angular-ts') {
    return [...code.matchAll(TEMPLATE_LITERAL)].map((match) => match[1]!);
  }
  return [];
}

function switchesOf(doc: DocFile): readonly FencedSwitch[] {
  return fencesOf(doc.markdown).flatMap((fence) =>
    templatesOf(fence.language, fence.code).flatMap((template) => {
      const parsed = new DOMParser().parseFromString(template, 'text/html');
      return [...parsed.querySelectorAll('[forswitch]')].map((el) => {
        el.setAttribute('role', 'switch');
        return {
          at: `${doc.path}:${fence.line}`,
          name: accessibleName(el).name,
          markup: el.outerHTML.split('\n')[0]!,
        };
      });
    }),
  );
}

const DOCS: readonly DocFile[] = [...SITE_DOCS, rootReadme()];
const SWITCHES: readonly FencedSwitch[] = DOCS.flatMap(switchesOf);

describe('the switches the documentation fences compose', () => {
  it('are found on the pages a new consumer copies first', () => {
    const found = new Set(SWITCHES.map(({ at }) => at.slice(0, at.lastIndexOf(':'))));

    expect(found).toContain('docs/site/getting-started.md');
    expect(found).toContain('README.md');
    expect(found).toContain('projects/forty-cdk/switch/README.md');
  });

  it('each carry an accessible name', () => {
    const unnamed = SWITCHES.filter(({ name }) => name === '').map(
      ({ at, markup }) => `${at}  ${markup}`,
    );

    expect(unnamed).toEqual([]);
  });
});
