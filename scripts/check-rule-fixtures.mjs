import { readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';

import { ESLint } from 'eslint';

import { repoRoot } from './lib/repo-path.mjs';

const TAG = '[check-rule-fixtures]';
const FIXTURES_PATH = 'projects/forty-cdk/eslint-rules-fixtures';
const FIXTURES_DIR = join(repoRoot, FIXTURES_PATH);
const PLUGIN = 'forty-cdk';

const EXPECTED_MARKER = /\bExpected:\s*(\d+)\s*×/;
const ALLOWED_MARKER = /^\s*(?:\/\/|\/?\*+)\s*Allowed\b[^:\n]*:/;
const LINTED_AS = /\bLinted as `([^`]+)`/;

const linter = new ESLint({
  cwd: repoRoot,
  ignore: false,
  overrideConfig: {
    files: ['**/*.ts'],
    languageOptions: { parserOptions: { projectService: false, project: null } },
    rules: { '@angular-eslint/reactive-context-must-read-signal': 'off' },
  },
});

const PROBE_PATH = `${FIXTURES_PATH}/no-bare-whenstable.fixture.ts`;
const PROBES = [
  {
    kind: 'count',
    label: 'a wrong Expected count',
    source: '// Expected: 2× forty-cdk/no-bare-whenstable\nfixture.whenStable();\n',
  },
  {
    kind: 'allowed',
    label: 'a report inside an Allowed block',
    source:
      '// Expected: 1× forty-cdk/no-bare-whenstable\nfixture.whenStable();\n\n// Allowed: probe.\nfixture.whenStable();\n',
  },
  {
    kind: 'foreign',
    label: 'a report from another rule',
    source:
      '// Expected: 1× forty-cdk/no-bare-whenstable\nfixture.whenStable();\n// @ts-ignore\nexport const probe = 1;\n',
  },
];

function markersOf(source) {
  const markers = [];
  source.split(/\r?\n/).forEach((text, index) => {
    const expected = EXPECTED_MARKER.exec(text);
    if (expected) {
      markers.push({ line: index + 1, expected: Number(expected[1]), reported: [] });
    } else if (ALLOWED_MARKER.test(text)) {
      markers.push({ line: index + 1, expected: 0, allowed: true, reported: [] });
    }
  });
  return markers;
}

function configuredMessages(options) {
  const messages = [];
  const stack = [...options];
  while (stack.length) {
    const option = stack.pop();
    if (Array.isArray(option)) {
      stack.push(...option);
    } else if (option && typeof option === 'object') {
      if (typeof option.message === 'string') messages.push(option.message);
      stack.push(...Object.values(option));
    }
  }
  return messages;
}

function location(path, message) {
  return `${path}:${message.line ?? 1}:${message.column ?? 1}`;
}

function verify({ path, ruleId, source, messages, options }) {
  const problems = [];
  const markers = markersOf(source);
  const firstExpected = markers.find((marker) => !marker.allowed);
  const total = markers.reduce((sum, marker) => sum + marker.expected, 0);

  if (!firstExpected || total === 0) {
    problems.push({
      kind: 'unmarked',
      text: `${path}: no \`// Expected: N× ${ruleId}\` marker, so nothing here proves the rule fires`,
    });
  }

  for (const message of messages) {
    if (message.ruleId !== ruleId) {
      problems.push({
        kind: 'foreign',
        text: `${location(path, message)} ${message.ruleId ?? '<eslint>'} reported, but this fixture exercises ${ruleId} alone: ${message.message}`,
      });
      continue;
    }
    const owner =
      markers.filter((marker) => marker.line <= message.line).at(-1) ?? firstExpected ?? null;
    owner?.reported.push(message);
  }

  for (const marker of markers) {
    if (marker.allowed && marker.reported.length > 0) {
      for (const message of marker.reported) {
        problems.push({
          kind: 'allowed',
          text: `${location(path, message)} ${ruleId} reported inside the \`Allowed:\` block at line ${marker.line}: ${message.message}`,
        });
      }
    } else if (!marker.allowed && marker.reported.length !== marker.expected) {
      problems.push({
        kind: 'count',
        text: `${path}:${marker.line} expects ${marker.expected}× ${ruleId} and got ${marker.reported.length}`,
      });
    }
  }

  const own = messages.filter((message) => message.ruleId === ruleId);
  for (const configured of configuredMessages(options)) {
    if (!own.some((message) => message.message.includes(configured))) {
      problems.push({
        kind: 'unexercised',
        text: `${path}: the configured ${ruleId} entry "${configured}" never fires on this fixture`,
      });
    }
  }

  return problems;
}

async function lint(source, filePath) {
  const [result] = await linter.lintText(source, { filePath: join(repoRoot, filePath) });
  return result.messages;
}

async function ruleOptions(filePath, ruleId) {
  const config = await linter.calculateConfigForFile(join(repoRoot, filePath));
  const entry = config.rules?.[ruleId];
  return Array.isArray(entry) ? entry.slice(1) : [];
}

const probeConfig = await linter.calculateConfigForFile(join(repoRoot, PROBE_PATH));
const pluginRules = Object.keys(probeConfig.plugins?.[PLUGIN]?.rules ?? {});
const problems = [];

if (pluginRules.length === 0) {
  problems.push(
    `the resolved config for ${PROBE_PATH} carries no \`${PLUGIN}\` plugin rules, so there is nothing to check fixtures against`,
  );
}

const files = readdirSync(FIXTURES_DIR)
  .filter((file) => file.endsWith('.ts'))
  .sort();
const covered = new Set();
let fixtures = 0;
let reports = 0;

for (const file of files) {
  const source = readFileSync(join(FIXTURES_DIR, file), 'utf8');
  const realPath = `${FIXTURES_PATH}/${file}`;

  if (!file.endsWith('.fixture.ts')) {
    for (const message of await lint(source, realPath)) {
      problems.push(
        `${location(realPath, message)} ${message.ruleId ?? '<eslint>'} reported on a support file, which must lint clean: ${message.message}`,
      );
    }
    continue;
  }

  fixtures += 1;
  const name = basename(file, '.fixture.ts');
  const ruleId = pluginRules.includes(name) ? `${PLUGIN}/${name}` : name;
  const lintPath = LINTED_AS.exec(source)?.[1] ?? realPath;
  const label = lintPath === realPath ? realPath : `${realPath} (linted as ${lintPath})`;
  const options = await ruleOptions(lintPath, ruleId);
  const config = await linter.calculateConfigForFile(join(repoRoot, lintPath));

  if (!config.rules?.[ruleId] || [0, 'off'].includes(config.rules[ruleId][0])) {
    problems.push(`${label}: ${ruleId} is not enabled at ${lintPath}, so the fixture cannot fire`);
    continue;
  }

  const messages = await lint(source, lintPath);
  covered.add(ruleId);
  reports += messages.filter((message) => message.ruleId === ruleId).length;
  problems.push(
    ...verify({ path: label, ruleId, source, messages, options }).map((problem) => problem.text),
  );
}

for (const rule of pluginRules) {
  if (!covered.has(`${PLUGIN}/${rule}`)) {
    problems.push(
      `${PLUGIN}/${rule} has no fixture: add ${FIXTURES_PATH}/${rule}.fixture.ts with an \`Expected:\` marker`,
    );
  }
}

const deadProbes = [];
for (const probe of PROBES) {
  const messages = await lint(probe.source, PROBE_PATH);
  const caught = verify({
    path: 'probe',
    ruleId: `${PLUGIN}/no-bare-whenstable`,
    source: probe.source,
    messages,
    options: [],
  }).some((problem) => problem.kind === probe.kind);
  if (!caught) deadProbes.push(probe.label);
}

if (deadProbes.length > 0) {
  console.error(
    `${TAG} FAIL — the liveness probe passed ${deadProbes.join(', ')}, so this run proves nothing about the fixtures.`,
  );
  console.error(
    `\nThe probe lints synthetic ${PLUGIN}/no-bare-whenstable fixtures that are wrong on purpose and must be rejected: either this script stopped detecting them, or that rule stopped firing. Restore the detection rather than editing the probe.`,
  );
  process.exit(1);
}

if (problems.length > 0) {
  console.error(`${TAG} FAIL — ${problems.length} problem(s) across ${fixtures} fixtures:`);
  for (const problem of problems) console.error(`  ${problem}`);
  console.error(
    `\nEach fixture must report exactly what its \`// Expected: N×\` markers say, block by block, with nothing inside an \`Allowed:\` block and nothing from another rule. A rule that stopped firing shows up here as a short count; fix the rule, or the fixture when the shape it pins was retired on purpose. See ${FIXTURES_PATH}/README.md.`,
  );
  process.exit(1);
}

console.log(
  `${TAG} OK — ${fixtures} fixtures reported ${reports} times, matching their Expected markers block by block; every ${PLUGIN} rule has a fixture, and the liveness probe rejected ${PROBES.map((probe) => probe.label).join(', ')}.`,
);
