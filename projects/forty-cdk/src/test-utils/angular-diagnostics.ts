/**
 * Records every Angular runtime diagnostic (`NG<NNNN>`) that reaches
 * `console.warn`, with the stack it was emitted from, instead of forwarding
 * it. Armed by `vitest-invariants-setup.ts`, which drains the record after
 * every test.
 *
 * A spec that provokes a diagnostic on purpose mocks `console.warn` itself,
 * which bypasses the record; nothing here is muted by file.
 */

const ANGULAR_DIAGNOSTIC = /^(NG\d{4,})\b/;

const RECORDER_MODULE = 'angular-diagnostics.ts';

const ORIGIN_FRAME_BUDGET = 4;

const REMEDIES: Record<string, string> = {
  NG0912:
    "Give one of the fixtures a distinct shape. A `host: { 'data-fixture': '<name>' }` block " +
    'moves `hostAttrs` into the hash without touching a template or a selector, and the value ' +
    'only has to be unique within the declaring file.',
  NG0953:
    'Resolve the hook through a channel that survives teardown — `injectVetoableEmitter` for a ' +
    'vetoable one, a function `input` for a value the primitive reports from its destroy hook — ' +
    'instead of emitting into the output directly.',
  NG0956:
    'Give the collection the keyed-row shape the library models — a `{ index }` row tracked by ' +
    '`track row.index` — instead of tracking a bare item by identity. `track $index` is the ' +
    'recycle-by-slot model the library does not implement.',
};

const GENERIC_REMEDY =
  'Resolve it at its source: a diagnostic on this channel is a defect in the library or in the ' +
  'fixture that provoked it, never a line to silence here. A spec that provokes one deliberately ' +
  'asserts it behind its own `console.warn` mock, which bypasses this record.';

interface RecordedDiagnostic {
  readonly code: string;
  readonly message: string;
  readonly origin: string;
}

const recorded: RecordedDiagnostic[] = [];

const passThrough = console.warn.bind(console);

function captureOrigin(): string {
  const frames = (new Error().stack ?? '')
    .split('\n')
    .slice(1)
    .filter((frame) => !frame.includes(RECORDER_MODULE));
  const owned = frames.filter((frame) => frame.includes('/') && !frame.includes('node_modules'));

  return (owned.length > 0 ? owned : frames).slice(0, ORIGIN_FRAME_BUDGET).join('\n');
}

console.warn = (...args: unknown[]): void => {
  const [message] = args;

  if (typeof message === 'string') {
    const code = ANGULAR_DIAGNOSTIC.exec(message)?.[1];

    if (code !== undefined) {
      recorded.push({ code, message, origin: captureOrigin() });
      return;
    }
  }

  passThrough(...args);
};

/**
 * Throws when an Angular runtime diagnostic was recorded since the last call,
 * drains the record either way.
 *
 * Draining is what keeps one diagnostic to one failure, and is what lets a
 * liveness probe assert the throw without failing the run it just proved.
 */
export function assertNoAngularDiagnostics(): void {
  if (recorded.length === 0) return;

  const drained = recorded.splice(0, recorded.length);
  const codes = [...new Set(drained.map(({ code }) => code))].sort();

  const reported = drained
    .map(({ message, origin }) => (origin === '' ? message : `${message}\n${origin}`))
    .join('\n\n');
  const fixes = codes
    .map((code) => `Fix (${code}): ${REMEDIES[code] ?? GENERIC_REMEDY}`)
    .join('\n\n');

  throw new Error(
    `[forty-cdk/test-utils] ${codes.join(', ')}: ${drained.length} Angular runtime ` +
      `diagnostic(s) reached \`console.warn\` during this test.\n\n${reported}\n\n${fixes}`,
  );
}
