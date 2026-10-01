export const THIRD_PARTY_NAMES = [
  { name: 'CDK', pattern: /\bCDK\b/ },
  { name: 'cdkDrag', pattern: /\b[Cc]dk[A-Z]\w*/ },
  { name: '@angular/cdk', pattern: /@angular\/cdk\b/ },
  { name: 'Angular Material', pattern: /\bAngular Material\b/ },
  { name: '@angular/material', pattern: /@angular\/material\b/ },
  { name: '@angular/aria', pattern: /@angular\/aria\b/ },
  { name: 'Radix', pattern: /\bRadix\b/ },
  { name: '@radix-ui', pattern: /@radix-ui\b/ },
  { name: 'Base UI', pattern: /\bBase UI\b/ },
  { name: '@headlessui', pattern: /@headlessui\b/ },
  { name: 'React Aria', pattern: /\bReact Aria\b/ },
  { name: 'Ark UI', pattern: /\bArk UI\b/ },
  { name: 'Zag.js', pattern: /\bZag\.js\b/ },
  { name: 'Melt UI', pattern: /\bMelt UI\b/ },
  { name: 'Bits UI', pattern: /\bBits UI\b/ },
  { name: 'Kobalte', pattern: /\bKobalte\b/ },
  { name: 'Reach UI', pattern: /\bReach UI\b/ },
  { name: 'Ariakit', pattern: /\bAriakit\b/ },
  { name: 'shadcn', pattern: /\bshadcn\b/i },
  { name: 'spartan/ui', pattern: /\bspartan[/-](?:ui|ng)\b/i },
  { name: 'PrimeNG', pattern: /\bPrimeNG\b/i },
  { name: 'NG-ZORRO', pattern: /\bng-zorro\b/i },
  { name: 'Taiga UI', pattern: /\bTaiga UI\b/ },
  { name: 'ng-bootstrap', pattern: /\bng-bootstrap\b/i },
  { name: 'MUI', pattern: /\bMUI\b/ },
  { name: 'Material UI', pattern: /\bMaterial[- ]UI\b/ },
  { name: 'Chakra UI', pattern: /\bChakra\b/ },
  { name: 'Mantine', pattern: /\bMantine\b/ },
  { name: 'Vaul', pattern: /\bVaul\b/i },
  { name: 'Tailwind', pattern: /\bTailwind\b/i },
  { name: 'VueUse', pattern: /\bVueUse\b/i },
  { name: 'Embla', pattern: /\bEmbla\b/i },
  { name: 'Swiper', pattern: /\bSwiper\b/ },
  { name: 'SortableJS', pattern: /\bSortable(?:JS|\.js)\b/i },
  { name: 'dnd kit', pattern: /\bdnd[- ]kit\b/i },
];

export const THIRD_PARTY_EXEMPTIONS = [
  {
    name: 'Tailwind',
    entryPoint: 'breakpoints',
    reason:
      'The default breakpoint map is the Tailwind CSS scale value for value, and its preset, ' +
      'forBreakpointsTailwind, is named after it on purpose: the name tells a consumer which ' +
      'breakpoints they get without reading the numbers, so the docs have to name it too.',
  },
  {
    name: 'Tailwind',
    entryPoint: 'defaults',
    reason:
      'The same Tailwind CSS scale, documented where the breakpoints defaults pair is declared: ' +
      'forBreakpointsTailwind and the TailwindBreakpointName union live in forty-cdk/defaults.',
  },
];

const FIX =
  'describe the behaviour on its own terms, or exempt it in THIRD_PARTY_EXEMPTIONS ' +
  '(scripts/lib/third-party-names.mjs) with the reason it has to stay';

function globalOf(pattern) {
  return new RegExp(
    pattern.source,
    pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`,
  );
}

export function markdownLines(markdown, { path, entryPoint }) {
  return markdown
    .split(/\r?\n/)
    .map((text, index) => ({ path, line: index + 1, entryPoint, text }));
}

export function jsdocLines(source, { path, entryPoint }) {
  const lines = [];
  let line = 1;
  let cursor = 0;
  for (const block of source.matchAll(/\/\*\*[\s\S]*?\*\//g)) {
    line += source.slice(cursor, block.index).split('\n').length - 1;
    cursor = block.index;
    block[0].split(/\r?\n/).forEach((text, offset) => {
      lines.push({ path, line: line + offset, entryPoint, text });
    });
  }
  return lines;
}

export function thirdPartyProblems(
  lines,
  { names = THIRD_PARTY_NAMES, exemptions = THIRD_PARTY_EXEMPTIONS } = {},
) {
  const problems = [];
  const compiled = names.map(({ name, pattern }) => ({ name, global: globalOf(pattern) }));

  for (const { name, pattern } of names) {
    if (!globalOf(pattern).test(name)) {
      problems.push(
        `the pattern ${pattern} no longer matches "${name}", the name it is listed under — ` +
          'the gate cannot report a mention it does not match',
      );
    }
  }

  if (lines.length === 0) {
    problems.push('the scan read no lines — a gate that reads nothing cannot report anything');
  }

  const uses = new Map(exemptions.map((exemption) => [exemption, 0]));
  let exempted = 0;
  for (const { path, line, entryPoint, text } of lines) {
    for (const { name, global } of compiled) {
      for (const match of text.matchAll(global)) {
        const exemption = exemptions.find(
          (candidate) => candidate.name === name && candidate.entryPoint === entryPoint,
        );
        if (exemption !== undefined) {
          uses.set(exemption, uses.get(exemption) + 1);
          exempted += 1;
          continue;
        }
        problems.push(`${path}:${line} names ${match[0]} — ${FIX}`);
      }
    }
  }

  for (const [exemption, count] of uses) {
    if (count === 0) {
      problems.push(
        `the ${exemption.name} exemption in forty-cdk/${exemption.entryPoint} matched nothing — ` +
          'drop it if the mention is gone, or the scan no longer reads the text it exempts',
      );
    }
  }

  return { problems, exempted };
}
