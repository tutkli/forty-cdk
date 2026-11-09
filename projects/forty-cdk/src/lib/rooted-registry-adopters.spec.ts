import { LIBRARY_CODE } from '../test-utils/source-scan';

/**
 * Adoption guard for the application-wide handle registries
 * ([#2753](https://github.com/tutkli/forty-cdk/issues/2753)). A piece whose root arrives through an
 * input registers a handle, through `registerHandle`, into a registry provided at the application
 * root, and every piece of that kind in the application shares the one instance. Such a registry
 * is `RootedRegistry` from `forty-cdk/core`, whose `add` / `remove` are O(1); a hand-rolled one
 * copying a handle array per call makes a bulk mount or unmount of N pieces cost O(N²).
 *
 * The family is derived from source: every `providedIn: 'root'` token that some file injects and
 * hands to a `registerHandle` callback. Each member must be typed and built as a `RootedRegistry`.
 */

interface RootToken {
  readonly path: string;
  readonly declaration: string;
}

/** The text of `new InjectionToken<…>(…)` starting at `from`, type arguments and call included. */
function tokenExpression(code: string, from: number): string {
  let i = code.indexOf('InjectionToken', from) + 'InjectionToken'.length;
  if (code[i] === '<') {
    let angles = 0;
    for (; i < code.length; i++) {
      if (code[i] === '<') angles++;
      else if (code[i] === '>') {
        angles--;
        if (angles === 0) {
          i++;
          break;
        }
      }
    }
  }
  return code.slice(from, i) + balancedCall(code, code.indexOf('(', i));
}

/** The parenthesised argument list opening at `open`, parentheses included. */
function balancedCall(code: string, open: number): string {
  let depth = 0;
  for (let i = open; i < code.length; i++) {
    if (code[i] === '(') depth++;
    else if (code[i] === ')') {
      depth--;
      if (depth === 0) return code.slice(open, i + 1);
    }
  }
  return code.slice(open);
}

/** Token name → declaration, for every token provided at the application root. */
function rootTokens(sources: ReadonlyMap<string, string>): Map<string, RootToken> {
  const tokens = new Map<string, RootToken>();
  for (const [path, code] of sources) {
    for (const match of code.matchAll(/export const (\w+) = new InjectionToken\b/g)) {
      const declaration = tokenExpression(code, match.index + match[0].indexOf('new'));
      if (/providedIn:\s*'root'/.test(declaration)) {
        tokens.set(match[1]!, { path, declaration });
      }
    }
  }
  return tokens;
}

/** Every token some file injects and then registers a handle into through `registerHandle`. */
function registeredIntoTokens(sources: ReadonlyMap<string, string>): Set<string> {
  const tokens = new Set<string>();
  for (const code of sources.values()) {
    if (!code.includes('registerHandle(')) {
      continue;
    }
    const bindings = new Map<string, string>();
    for (const match of code.matchAll(/(?:const|readonly)\s+(#?\w+)\s*=\s*inject\((\w+)\)/g)) {
      bindings.set(match[1]!, match[2]!);
    }
    for (const match of code.matchAll(/\bregisterHandle\(/g)) {
      const args = balancedCall(code, match.index + match[0].length - 1);
      for (const token of args.matchAll(/inject\((\w+)\)\s*\.\s*\w+\(/g)) {
        tokens.add(token[1]!);
      }
      for (const [binding, token] of bindings) {
        const receiver = binding.startsWith('#') ? `this\\.${binding}` : `\\b${binding}`;
        if (new RegExp(`${receiver}\\s*\\.\\s*\\w+\\(`).test(args)) {
          tokens.add(token);
        }
      }
    }
  }
  return tokens;
}

function isRootedRegistry(declaration: string): boolean {
  return (
    /^new InjectionToken<\s*RootedRegistry</.test(declaration) &&
    /factory:\s*\(\)\s*=>\s*new RootedRegistry\(\)/.test(declaration)
  );
}

function rootedRegistries(sources: ReadonlyMap<string, string>): {
  readonly family: readonly string[];
  readonly offenders: readonly string[];
} {
  const roots = rootTokens(sources);
  const family = [...registeredIntoTokens(sources)].filter((token) => roots.has(token)).sort();
  const offenders = family
    .filter((token) => !isRootedRegistry(roots.get(token)!.declaration))
    .map((token) => `${roots.get(token)!.path}::${token}`);
  return { family, offenders };
}

describe('application-wide handle registries', () => {
  it('builds every root-provided handle registry as a RootedRegistry', () => {
    const { family, offenders } = rootedRegistries(LIBRARY_CODE);

    expect(family).toContain('MENU_OPENERS');
    expect(family).toContain('LISTBOX_CONTROLLERS');
    expect(family.filter((token) => token.endsWith('_TRIGGERS')).length).toBeGreaterThan(6);
    expect(offenders).toEqual([]);
  });

  it('reports a root-provided registry that registerHandle fills but is not a RootedRegistry', () => {
    const synthetic = new Map([
      [
        'fake/src/fake-context.ts',
        `export const FAKE_TRIGGERS = new InjectionToken<WritableSignal<readonly Handle[]>>(
          'FAKE_TRIGGERS',
          { providedIn: 'root', factory: () => signal<readonly Handle[]>([]) },
        );
        export const FAKE_ROOTED = new InjectionToken<RootedRegistry<object, Handle>>(
          'FAKE_ROOTED',
          { providedIn: 'root', factory: () => new RootedRegistry() },
        );
        export const FAKE_UNUSED = new InjectionToken<WritableSignal<readonly Handle[]>>(
          'FAKE_UNUSED',
          { providedIn: 'root', factory: () => signal<readonly Handle[]>([]) },
        );`,
      ],
      [
        'fake/src/fake-trigger.ts',
        `export class FakeTrigger {
          readonly #rooted = inject(FAKE_ROOTED);
          constructor() {
            const triggers = inject(FAKE_TRIGGERS);
            registerHandle(
              { root: this.root },
              (handle) => triggers.update((all) => [...all, handle]),
              (handle) => triggers.update((all) => all.filter((h) => h !== handle)),
            );
            registerHandle(
              { root: this.root },
              (handle) => this.#rooted.add(handle),
              (handle) => this.#rooted.remove(handle),
            );
          }
        }`,
      ],
    ]);

    expect(rootedRegistries(synthetic)).toEqual({
      family: ['FAKE_ROOTED', 'FAKE_TRIGGERS'],
      offenders: ['fake/src/fake-context.ts::FAKE_TRIGGERS'],
    });
  });
});
