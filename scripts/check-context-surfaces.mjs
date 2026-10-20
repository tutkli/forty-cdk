import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { CONTEXT_SURFACE_CEILING, CONTEXT_SURFACE_EXCEPTIONS } from './lib/context-surfaces.mjs';
import { indexEmittedContexts, readEmittedFiles } from './lib/emitted-contexts.mjs';
import { repoRoot } from './lib/repo-path.mjs';

const TYPES_DIR = join(repoRoot, 'dist', 'forty-cdk', 'types');

if (!existsSync(TYPES_DIR)) {
  console.error(`[check-context-surfaces] ${TYPES_DIR} not found — run \`pnpm build\` first.`);
  process.exit(1);
}

function measure(entries) {
  const { published, surfaceOf } = indexEmittedContexts(entries);
  const measured = [];
  for (const [name, { entry }] of published) {
    if (!/^For.*Context$/.test(name)) {
      continue;
    }
    measured.push({ name, entry, size: surfaceOf(name).size });
  }
  measured.sort((a, b) => b.size - a.size || a.name.localeCompare(b.name));
  return { published, measured };
}

function evaluate({ published, measured }, ceiling, exceptions) {
  const failures = [];

  for (const { name, entry, size } of measured) {
    const exception = exceptions[name];
    if (size <= ceiling) {
      if (exception) {
        failures.push(
          `forty-cdk/${entry}: ${name} is listed in CONTEXT_SURFACE_EXCEPTIONS at ${exception.ceiling} ` +
            `but now carries ${size} members, at or under the ${ceiling}-member ceiling — ` +
            `drop the entry, the exception has rotted.`,
        );
      }
      continue;
    }
    if (!exception) {
      failures.push(
        `forty-cdk/${entry}: ${name} publishes ${size} members, above the ${ceiling}-member ceiling. ` +
          `Move every member whose only caller is a piece of this primitive to the unexported ` +
          `<Primitive>Context interface (TS-private on the root), or add a justified entry to ` +
          `scripts/lib/context-surfaces.mjs.`,
      );
      continue;
    }
    if (size > exception.ceiling) {
      failures.push(
        `forty-cdk/${entry}: ${name} publishes ${size} members, above its own documented ceiling of ` +
          `${exception.ceiling} — the exception covers a surface that has since grown.`,
      );
    }
    if (size < exception.ceiling) {
      failures.push(
        `forty-cdk/${entry}: ${name} publishes ${size} members, below its recorded ceiling of ` +
          `${exception.ceiling} — lower the ceiling in scripts/lib/context-surfaces.mjs to ${size}, ` +
          `so the slack cannot be spent on a new member.`,
      );
    }
  }

  for (const name of Object.keys(exceptions)) {
    if (!published.has(name)) {
      failures.push(
        `${name} is listed in CONTEXT_SURFACE_EXCEPTIONS but no entry point publishes it — ` +
          `the list has rotted (renamed or unexported?).`,
      );
    }
  }

  return failures;
}

const PROBE_FILES = [
  {
    file: 'forty-cdk-core.d.ts',
    text: `interface ProbeBase {
  readonly a: Signal<number>;
  readonly b: Signal<number>;
}
`,
  },
  {
    file: 'forty-cdk-probe.d.ts',
    text: `interface ForProbeSlackContext extends ProbeBase {
  readonly c: Signal<number>;
}
interface ForProbeGrownContext extends ProbeBase {
  readonly c: Signal<number>;
}
interface ForProbeGrownContext {
  readonly d: Signal<number>;
  readonly e: Signal<number>;
}
interface ForProbeUnlistedContext extends ProbeBase {
  readonly c: Signal<number>;
}
export { ForProbeGrownContext, ForProbeSlackContext, ForProbeUnlistedContext };
`,
  },
];
const PROBE_CEILING = 2;
const PROBE_EXCEPTIONS = {
  ForProbeSlackContext: { ceiling: 4 },
  ForProbeGrownContext: { ceiling: 4 },
};
const PROBE_EXPECTED = [
  'ForProbeGrownContext publishes 5 members, above its own documented ceiling of 4',
  'ForProbeSlackContext publishes 3 members, below its recorded ceiling of 4',
  'ForProbeUnlistedContext publishes 3 members, above the 2-member ceiling',
];

const probeFailures = evaluate(measure(PROBE_FILES), PROBE_CEILING, PROBE_EXCEPTIONS);
const probeMissing = PROBE_EXPECTED.filter(
  (expected) => !probeFailures.some((failure) => failure.includes(expected)),
);
if (probeMissing.length || probeFailures.length !== PROBE_EXPECTED.length) {
  console.error(
    `[check-context-surfaces] FAIL — the liveness probe was not rejected the way it must be, so this run proves nothing about the emit.`,
  );
  for (const expected of probeMissing) {
    console.error(`  missed: ${expected}`);
  }
  for (const failure of probeFailures) {
    console.error(`  reported: ${failure}`);
  }
  console.error(
    `\nThe probe is a synthetic emit whose contexts inherit two members from a base declared in another file: one grown past its exception across two merged declarations, one below it, one over the ceiling with no exception. Restore the detection rather than the probe.`,
  );
  process.exit(1);
}

const result = measure(readEmittedFiles(TYPES_DIR));
const failures = evaluate(result, CONTEXT_SURFACE_CEILING, CONTEXT_SURFACE_EXCEPTIONS);

if (failures.length) {
  console.error(`[check-context-surfaces] FAIL — ${failures.length} context-surface violation(s):`);
  for (const failure of failures) {
    console.error(`  ${failure}`);
  }
  console.error(
    `\nA For<X>Context lists only what a consumer reads or invokes. Everything a piece of the same ` +
      `primitive calls belongs on the unexported <X>Context interface, TS-private on the root.`,
  );
  process.exit(1);
}

const listed = Object.keys(CONTEXT_SURFACE_EXCEPTIONS).length;
const widest = result.measured.find(({ name }) => !CONTEXT_SURFACE_EXCEPTIONS[name]);
const widestNote = widest ? `(widest: ${widest.name} at ${widest.size}), ` : '';
console.log(
  `[check-context-surfaces] OK — ${result.measured.length - listed} published For*Context interfaces at or ` +
    `under ${CONTEXT_SURFACE_CEILING} members ${widestNote}plus the ` +
    `${listed} pinned at their current size in scripts/lib/context-surfaces.mjs.`,
);
