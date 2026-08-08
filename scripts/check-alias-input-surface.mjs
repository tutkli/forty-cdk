import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import ts from 'typescript';

import { ALIAS_INPUT_SURFACE } from './lib/alias-input-surface.mjs';
import { repoRoot } from './lib/repo-path.mjs';

const TYPES_DIR = join(repoRoot, 'dist', 'forty-cdk', 'types');
const ROSTER = join(repoRoot, 'scripts', 'lib', 'alias-input-surface.mjs');
const ROSTER_START = 'export const ALIAS_INPUT_SURFACE = {';
const ROSTER_END = '\n};\n';

if (!existsSync(TYPES_DIR)) {
  console.error(`[check-alias-input-surface] ${TYPES_DIR} not found — run \`pnpm build\` first.`);
  process.exit(1);
}

const WRITE = process.argv.includes('--write');

function isNonPublicMember(node) {
  return (ts.getModifiers(node) ?? []).some(
    (m) => m.kind === ts.SyntaxKind.ProtectedKeyword || m.kind === ts.SyntaxKind.PrivateKeyword,
  );
}

function memberName(node) {
  return node.name && (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name))
    ? node.name.text
    : null;
}

function inputsOfDeclaration(member) {
  if (!ts.isPropertyDeclaration(member) || !member.type || !ts.isTypeReferenceNode(member.type)) {
    return null;
  }
  const name = member.type.typeName;
  const declaration = ts.isQualifiedName(name) ? name.right.text : name.text;
  if (declaration !== 'ɵɵComponentDeclaration' && declaration !== 'ɵɵDirectiveDeclaration') {
    return null;
  }
  const map = member.type.typeArguments?.[3];
  if (!map || !ts.isTypeLiteralNode(map)) {
    return new Map();
  }
  const inputs = new Map();
  for (const entry of map.members) {
    const field = ts.isPropertySignature(entry) ? memberName(entry) : null;
    if (field === null || !entry.type || !ts.isTypeLiteralNode(entry.type)) {
      continue;
    }
    const alias = entry.type.members.find(
      (m) => ts.isPropertySignature(m) && memberName(m) === 'alias',
    );
    inputs.set(
      field,
      alias?.type && ts.isLiteralTypeNode(alias.type) && ts.isStringLiteral(alias.type.literal)
        ? alias.type.literal.text
        : field,
    );
  }
  return inputs;
}

function collectFrom(fileName, entry, text, into) {
  const sf = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true);
  const visit = (node) => {
    if (ts.isClassDeclaration(node) && node.name) {
      const inputs = new Map();
      for (const member of node.members) {
        for (const [field, alias] of inputsOfDeclaration(member) ?? []) {
          inputs.set(field, alias);
        }
      }
      const members = [];
      for (const member of node.members) {
        const name = memberName(member);
        if (name === null || !name.startsWith('_') || isNonPublicMember(member)) {
          continue;
        }
        members.push({ name, alias: inputs.get(name) ?? null });
      }
      if (members.length) {
        into.set(`${entry}/${node.name.text}`, members);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return into;
}

function violationsOf(found, roster) {
  const failures = [];
  for (const [id, members] of [...found].sort(([a], [b]) => a.localeCompare(b))) {
    const recorded = roster[id];
    for (const { name, alias } of members) {
      if (alias === null) {
        failures.push({
          kind: 'not-an-input',
          id,
          message:
            `${id}: ${name} is public but is not an input, so nothing forces it onto the emitted ` +
            `surface — mark it \`protected\`, which host bindings read from inside the class anyway.`,
        });
      } else if (alias.startsWith('_')) {
        failures.push({
          kind: 'underscored-alias',
          id,
          message:
            `${id}: ${name} is an input whose public alias \`${alias}\` starts with an underscore, ` +
            `so a consumer has to bind \`[${alias}]\` — give it an alias without the prefix.`,
        });
      } else if (!recorded?.includes(name)) {
        failures.push({
          kind: 'unrecorded',
          id,
          message:
            `${id}: ${name} (bound as \`[${alias}]\`) is a new \`_\`-prefixed public member. The ` +
            `field behind a bindable input stays public by decision — narrowing it emits the same ` +
            `bytes and breaks a \`strictInputAccessModifiers\` consumer — so this is legal, but it ` +
            `is a 1.0 commitment: record it in scripts/lib/alias-input-surface.mjs deliberately.`,
        });
      }
    }
  }
  for (const [id, members] of Object.entries(roster)) {
    const actual = found.get(id);
    for (const name of members) {
      if (!actual?.some((m) => m.name === name)) {
        failures.push({
          kind: 'rotted',
          id,
          message:
            `${id}: ${name} is listed in ALIAS_INPUT_SURFACE but is no longer emitted as a public ` +
            `member — the list has rotted (renamed, removed, or now \`protected\`?). Drop the entry.`,
        });
      }
    }
  }
  return failures;
}

const PROBE = `
declare class ProbeInternal {
  readonly _leaked: number;
  static ɵdir: i0.ɵɵDirectiveDeclaration<ProbeInternal, "[probe]", never, {}, {}, never, never, true, never>;
}
declare class ProbeUnaliased {
  readonly _rawInput: unknown;
  static ɵdir: i0.ɵɵDirectiveDeclaration<ProbeUnaliased, "[probe]", never, { "_rawInput": { "alias": "_rawInput"; "required": false; "isSignal": true; }; }, {}, never, never, true, never>;
}
declare class ProbeUnderscoreAlias {
  readonly _rawInput: unknown;
  static ɵdir: i0.ɵɵDirectiveDeclaration<ProbeUnderscoreAlias, "[probe]", never, { "_rawInput": { "alias": "_raw"; "required": false; "isSignal": true; }; }, {}, never, never, true, never>;
}
declare class ProbeAliased {
  readonly _dirInput: unknown;
  static ɵcmp: i0.ɵɵComponentDeclaration<ProbeAliased, "probe", never, { "_dirInput": { "alias": "dir"; "required": false; "isSignal": true; }; }, {}, never, never, true, never>;
}
`;

const PROBE_EXPECTED = [
  ['not-an-input', 'probe/ProbeInternal'],
  ['underscored-alias', 'probe/ProbeUnaliased'],
  ['underscored-alias', 'probe/ProbeUnderscoreAlias'],
  ['unrecorded', 'probe/ProbeAliased'],
  ['rotted', 'probe/Gone'],
];
const probeFailures = violationsOf(collectFrom('probe.d.ts', 'probe', PROBE, new Map()), {
  'probe/Gone': ['_goneInput'],
});
const missingShapes = PROBE_EXPECTED.filter(
  ([kind, id]) => !probeFailures.some((failure) => failure.kind === kind && failure.id === id),
).map(([kind, id]) => `${kind} on ${id}`);

if (missingShapes.length) {
  console.error(
    `[check-alias-input-surface] FAIL — the liveness probe reported no ` +
      `${missingShapes.join(' / ')} violation, so the gate would pass a real one silently. ` +
      `Fix the emit reader, not the probe.`,
  );
  process.exit(1);
}

const found = new Map();
for (const file of readdirSync(TYPES_DIR)) {
  if (!file.endsWith('.d.ts')) {
    continue;
  }
  const entry =
    file === 'forty-cdk.d.ts' ? 'forty-cdk' : file.slice('forty-cdk-'.length, -'.d.ts'.length);
  collectFrom(file, entry, readFileSync(join(TYPES_DIR, file), 'utf8'), found);
}

if (WRITE) {
  const source = readFileSync(ROSTER, 'utf8');
  const start = source.indexOf(ROSTER_START);
  const end = start === -1 ? -1 : source.indexOf(ROSTER_END, start);
  if (start === -1 || end === -1) {
    console.error(
      `[check-alias-input-surface] FAIL — scripts/lib/alias-input-surface.mjs no longer opens with ` +
        `\`${ROSTER_START}\` and closes on its own line, so the roster cannot be rewritten without ` +
        `taking the JSDoc above it with it. Restore the shape (the rationale is the point of the ` +
        `file) and re-run with --write.`,
    );
    process.exit(1);
  }
  const body = [...found]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, members]) => `  '${id}': [${members.map(({ name }) => `'${name}'`).join(', ')}],`)
    .join('\n');
  writeFileSync(ROSTER, `${source.slice(0, start)}${ROSTER_START}\n${body}${source.slice(end)}`);
  console.log(
    `[check-alias-input-surface] WROTE — ${found.size} classes into ` +
      `scripts/lib/alias-input-surface.mjs, JSDoc untouched. Run \`pnpm format\` (Prettier owns the ` +
      `line breaks), then read the diff: a roster that grew is a new 1.0 commitment, not a rubber stamp.`,
  );
  process.exit(0);
}

const failures = violationsOf(found, ALIAS_INPUT_SURFACE);

if (failures.length) {
  console.error(
    `[check-alias-input-surface] FAIL — ${failures.length} \`_\`-prefixed surface violation(s):`,
  );
  for (const { message } of failures) {
    console.error(`  ${message}`);
  }
  console.error(
    `\nA \`_\`-prefixed member is internal, and \`protected\` is how that is stated to the compiler. ` +
      `The raw field of an aliased input is the one that cannot say it, for two reasons that both ` +
      `hold: narrowing it emits the same bytes (TypeScript writes \`protected\` members into the ` +
      `\`.d.ts\` with their full type; only TS-\`private\` collapses), and it breaks every consumer ` +
      `who opts into \`strictInputAccessModifiers\` — which \`strictTemplates\` does NOT imply, and ` +
      `which this repo turns on explicitly beside it in tsconfig.json. Those fields are pinned in ` +
      `scripts/lib/alias-input-surface.mjs so the roster only ever grows by decision. ` +
      `Regenerate it with \`pnpm check:alias-input-surface --write\`.`,
  );
  process.exit(1);
}

const pinned = Object.values(ALIAS_INPUT_SURFACE).reduce((sum, list) => sum + list.length, 0);
console.log(
  `[check-alias-input-surface] OK — ${pinned} aliased input fields pinned across ` +
    `${Object.keys(ALIAS_INPUT_SURFACE).length} classes; no other \`_\`-prefixed class member is ` +
    `public, and the liveness probe reported all ${PROBE_EXPECTED.length} violation shapes.`,
);
