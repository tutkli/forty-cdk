const EXAMPLE_FILES = import.meta.glob('/projects/forty-cdk-docs/src/app/demos/**/*.example.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const README_FILES = import.meta.glob('/projects/forty-cdk/*/README.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const DEMOS_ROOT = 'projects/forty-cdk-docs/src/app/demos/';

const LIBRARY_ROOT = 'projects/forty-cdk/';

const STYLES_BLOCK = /styles:\s*`([^`]*)`/g;

const CSS_FENCE = /^```css\n([\s\S]*?)^```/gm;

const RULE = /([^{}]+)\{([^{}]*)\}/g;

export interface SourceFile {
  readonly path: string;
  readonly source: string;
}

export interface StyleRule {
  readonly path: string;
  readonly selectors: readonly string[];
  readonly declarations: string;
}

function splitSelectorList(list: string): string[] {
  const selectors: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < list.length; i++) {
    const char = list[i];
    if (char === '(') depth++;
    else if (char === ')') depth--;
    else if (char === ',' && depth === 0) {
      selectors.push(list.slice(start, i));
      start = i + 1;
    }
  }
  selectors.push(list.slice(start));
  return selectors.map((selector) => selector.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

function rulesOf({ path, source }: SourceFile, block: RegExp): StyleRule[] {
  const rules: StyleRule[] = [];
  for (const match of source.matchAll(block)) {
    const css = match[1]!.replace(/\/\*[\s\S]*?\*\//g, '');
    for (const rule of css.matchAll(RULE)) {
      const prelude = rule[1]!.trim();
      if (prelude.startsWith('@')) continue;
      rules.push({ path, selectors: splitSelectorList(prelude), declarations: rule[2]! });
    }
  }
  return rules;
}

function filesFrom(files: Record<string, string>, base: string): readonly SourceFile[] {
  return Object.entries(files)
    .map(([key, source]) => ({
      path: key.slice(1 + base.length),
      source: source.replace(/\r\n/g, '\n'),
    }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

export const EXAMPLE_SOURCES: readonly SourceFile[] = filesFrom(EXAMPLE_FILES, DEMOS_ROOT);

export const README_SOURCES: readonly SourceFile[] = filesFrom(README_FILES, LIBRARY_ROOT);

export const STYLE_RULES: readonly StyleRule[] = [
  ...EXAMPLE_SOURCES.flatMap((file) => rulesOf(file, STYLES_BLOCK)),
  ...README_SOURCES.flatMap((file) => rulesOf(file, CSS_FENCE)),
];
