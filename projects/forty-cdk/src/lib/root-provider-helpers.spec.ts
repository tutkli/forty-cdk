import { entryPointOf, LIBRARY_CODE, SPEC_CODE } from '../test-utils/source-scan';

const INTERNAL_TIER = new Set(['core', 'core-overlay']);

const DECORATED_CLASS =
  /@(?:Directive|Component)\(\{([\s\S]*?)\n\}\)\s*\nexport\s+(?:abstract\s+)?class\s+(\w+)/g;

const PROVIDED_TOKEN = /\bprovide:\s*(\w+)/g;

const HELPER_CALL = /\b(provide[A-Z]\w*)\(\s*(\w*)\s*\)/g;

const HELPER_DECLARATION = /export function (provide[A-Z]\w*)\b[^{]*\{([\s\S]*?)\n\}/g;

const SOLE_HELPER_PROVIDERS = /^providers:\s*(provide[A-Z]\w*)\(\s*(\w*)\s*\)\s*(?:,|$)/;

const EXCLUSIONS: Readonly<Record<string, { readonly token: string; readonly why: string }>> = {
  ForDateRangeFieldStart: {
    token: 'FOR_DATE_RANGE_FIELD_SEGMENT_CONTEXT',
    why: 'an endpoint group composed inside its range field, not a root a wrapper subclasses',
  },
  ForDateRangeFieldEnd: {
    token: 'FOR_DATE_RANGE_FIELD_SEGMENT_CONTEXT',
    why: 'an endpoint group composed inside its range field, not a root a wrapper subclasses',
  },
  ForTimeRangeFieldStart: {
    token: 'FOR_TIME_RANGE_FIELD_SEGMENT_CONTEXT',
    why: 'an endpoint group composed inside its range field, not a root a wrapper subclasses',
  },
  ForTimeRangeFieldEnd: {
    token: 'FOR_TIME_RANGE_FIELD_SEGMENT_CONTEXT',
    why: 'an endpoint group composed inside its range field, not a root a wrapper subclasses',
  },
};

interface Root {
  readonly entry: string;
  readonly path: string;
  readonly name: string;
  readonly providers: string;
  readonly privateTokens: readonly string[];
}

function publicNames(): Map<string, Set<string>> {
  const byEntry = new Map<string, Set<string>>();
  for (const [path, code] of LIBRARY_CODE) {
    const entry = entryPointOf(path);
    if (path !== `${entry}/src/public-api.ts` || INTERNAL_TIER.has(entry)) {
      continue;
    }
    const names = new Set<string>();
    for (const match of code.matchAll(/export\s+(?:type\s+)?\{([^}]*)\}/g)) {
      for (const part of match[1]!.split(',')) {
        const name = part
          .trim()
          .replace(/^type\s+/, '')
          .split(/\s+as\s+/)
          .pop()!
          .trim();
        if (name) {
          names.add(name);
        }
      }
    }
    byEntry.set(entry, names);
  }
  return byEntry;
}

function helperTokens(): Map<string, string[]> {
  const helpers = new Map<string, string[]>();
  for (const [path, code] of LIBRARY_CODE) {
    if (INTERNAL_TIER.has(entryPointOf(path))) {
      continue;
    }
    for (const match of code.matchAll(HELPER_DECLARATION)) {
      helpers.set(
        match[1]!,
        [...match[2]!.matchAll(PROVIDED_TOKEN)].map((token) => token[1]!),
      );
    }
  }
  return helpers;
}

function rootsWithPrivateTokens(): Root[] {
  const exported = new Set([...publicNames().values()].flatMap((names) => [...names]));
  const helpers = helperTokens();
  const roots: Root[] = [];
  for (const [path, code] of LIBRARY_CODE) {
    const entry = entryPointOf(path);
    if (INTERNAL_TIER.has(entry) || path.endsWith('public-api.ts')) {
      continue;
    }
    for (const match of code.matchAll(DECORATED_CLASS)) {
      const body = match[1]!;
      const start = body.indexOf('providers:');
      if (start < 0) {
        continue;
      }
      const providers = body.slice(start).trim();
      const tokens = [...providers.matchAll(PROVIDED_TOKEN)].map((token) => token[1]!);
      for (const call of providers.matchAll(HELPER_CALL)) {
        tokens.push(...(helpers.get(call[1]!) ?? []));
      }
      const privateTokens = [...new Set(tokens.filter((token) => !exported.has(token)))];
      if (privateTokens.length > 0) {
        roots.push({ entry, path, name: match[2]!, providers, privateTokens });
      }
    }
  }
  return roots.sort((a, b) => a.name.localeCompare(b.name));
}

const subject = () => rootsWithPrivateTokens().filter((root) => !(root.name in EXCLUSIONS));

describe('root provider helpers (meta-guard)', () => {
  it('derives every decorated class whose providers name a token no public entry point exports', () => {
    expect(rootsWithPrivateTokens().map((root) => root.name)).toEqual([
      'ForDatePicker',
      'ForDateRangeFieldEnd',
      'ForDateRangeFieldStart',
      'ForDateRangePicker',
      'ForTable',
      'ForTableBody',
      'ForTableRow',
      'ForTimeField',
      'ForTimePicker',
      'ForTimeRangeFieldEnd',
      'ForTimeRangeFieldStart',
      'ForToolbar',
    ]);
  });

  it('keeps every exclusion true to the one private token it names', () => {
    const roots = new Map(rootsWithPrivateTokens().map((root) => [root.name, root]));
    for (const [name, { token }] of Object.entries(EXCLUSIONS)) {
      expect(roots.get(name)?.privateTokens, name).toEqual([token]);
    }
  });

  it('declares each such root’s providers as one call to a helper its own entry point exports', () => {
    const barrels = publicNames();
    const offenders = subject()
      .map((root) => {
        const call = SOLE_HELPER_PROVIDERS.exec(root.providers);
        if (!call) {
          return `${root.name}: providers are not a single helper call`;
        }
        if (!barrels.get(root.entry)?.has(call[1]!)) {
          return `${root.name}: ${call[1]} is not exported from forty-cdk/${root.entry}`;
        }
        if (call[2] && call[2] !== root.name) {
          return `${root.name}: ${call[1]} is passed ${call[2]} rather than the root itself`;
        }
        if (call[2] && call[1] !== `provide${root.name}`) {
          return `${root.name}: a helper taking the root is named provide${root.name}`;
        }
        return null;
      })
      .filter((offender) => offender !== null);
    expect(offenders).toEqual([]);
  });

  it('gives each helper a wrapper spec in its entry point that spreads it', () => {
    const missing = subject()
      .map((root) => ({ root, helper: SOLE_HELPER_PROVIDERS.exec(root.providers)?.[1] }))
      .filter(({ root, helper }) =>
        [...SPEC_CODE].every(
          ([path, code]) =>
            entryPointOf(path) !== root.entry ||
            !path.endsWith('-wrapper.spec.ts') ||
            !code.includes(`${helper}(`),
        ),
      )
      .map(({ root, helper }) => `${root.name} (${helper})`);
    expect(missing).toEqual([]);
  });
});
