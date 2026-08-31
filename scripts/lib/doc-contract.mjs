import { splitFrontmatter } from './doc-frontmatter.mjs';

/**
 * The nav group a document publishes under, or `none` for an entry point whose
 * README the site publishes no route of its own for — either because its
 * content is folded into another page (`foldInto`) or because it carries a
 * written exemption in `scripts/lib/docs-coverage.mjs`
 * ([#1809](https://github.com/tutkli/forty-cdk/issues/1809)).
 */
export const DOC_GROUPS = new Map([
  ['primitives', 'Primitives'],
  ['utilities', 'Utilities'],
  ['none', null],
]);

const FOLD_TARGET = /^([a-z0-9-]+)#([a-z0-9-]+)$/;

/**
 * Where an unpublished README's content is republished: the slug of the page
 * that carries it, and the `##` section of that page it is appended to, or
 * `null` for a document that declares no fold.
 *
 * A folded entry point keeps its README as the single source its npm package
 * and GitHub both serve, and the site renders that same content inside its
 * host's page rather than holding a second copy of it
 * ([#1809](https://github.com/tutkli/forty-cdk/issues/1809)).
 */
export function foldTargetOf(meta) {
  if (meta.foldInto === null) {
    return null;
  }
  const match = FOLD_TARGET.exec(meta.foldInto);
  return match === null ? null : { slug: match[1], section: match[2] };
}

/**
 * What each archetype is, and the canonical sections a document declaring it
 * must carry.
 *
 * `overlay` is read as the trait the corpus actually shows — a primitive that
 * renders floating or portaled content — rather than as the contract's original
 * "has a `For<X>Manager`", which only Dialog, Drawer and Toast satisfy while the
 * contract's own example list names five more. `Programmatic API` is therefore
 * required of the manager-bearing three through the exemption list's inverse:
 * it is asked of every overlay, and the overlays with no manager to document
 * carry a written exemption.
 */
export const ARCHETYPES = new Map([
  [
    'composable-ui',
    {
      summary: 'A set of directives composed in a template; ARIA and data-* hooks of its own.',
      sections: ['Anatomy', 'Examples', 'API', 'Accessibility', 'Styling'],
    },
  ],
  [
    'overlay',
    {
      summary: 'Renders floating or portaled content — a popup, a sheet, a positioned surface.',
      sections: [
        'Anatomy',
        'Examples',
        'API',
        'Programmatic API',
        'Keyboard',
        'Accessibility',
        'Styling',
      ],
    },
  ],
  [
    'form-control',
    {
      summary: 'Implements a @angular/forms/signals control interface.',
      sections: [
        'Anatomy',
        'Examples',
        'API',
        'Accessibility',
        'Styling',
        'Wrapping in a design system',
      ],
    },
  ],
  [
    'headless-utility',
    {
      summary: 'No DOM or ARIA of its own — an inject* / provider API.',
      sections: ['API'],
    },
  ],
]);

/**
 * The canonical headings, in the order the page template gives them, split into
 * the two rings that carry a rule.
 *
 * `core` is required of every archetype that has DOM at all; `canonical` is
 * required per archetype, by the table above. Everything else a document writes
 * is `specific` — the 121-title tail the audit measured, which is content
 * `Select` genuinely has and `Separator` does not, and which is grouped rather
 * than normalised ([#1810](https://github.com/tutkli/forty-cdk/issues/1810)).
 */
export const CORE_SECTIONS = ['Anatomy', 'API'];

export const CANONICAL_SECTIONS = [
  'When to choose',
  'Examples',
  'Programmatic API',
  'Keyboard',
  'Accessibility',
  'Styling',
  'SSR',
  'Wrapping in a design system',
  'Behavior notes',
];

/**
 * A required section a document deliberately omits, with the reason it does.
 *
 * This is the mechanism that keeps the check blocking rather than advisory: an
 * omission is either written down here or it fails the build, so the next one
 * is visible the day it appears. An entry naming a section the document does
 * carry — or a document that no longer exists — fails too, which is what stops
 * the list outliving its reasons.
 */
export const SECTION_EXEMPTIONS = [
  {
    slug: 'aspect-ratio',
    section: 'Accessibility',
    reason: 'A layout wrapper with no role, no state and no focus — it has nothing to state.',
  },
  {
    slug: 'breakpoints',
    section: 'Anatomy',
    reason: 'An inject* API with no pieces to compose; ## Setup documents the provider instead.',
  },
  {
    slug: 'context-menu',
    section: 'Keyboard',
    reason: 'Composes the Menu surface, whose README owns the single keyboard reference.',
  },
  {
    slug: 'context-menu',
    section: 'Programmatic API',
    reason: 'Opened by pointer or the context-menu key; it ships no manager.',
  },
  {
    slug: 'combobox',
    section: 'Programmatic API',
    reason: 'A declarative overlay — the picker opens from its own trigger, with no manager.',
  },
  {
    slug: 'date-picker',
    section: 'Programmatic API',
    reason: 'A declarative overlay — the picker opens from its own trigger, with no manager.',
  },
  {
    slug: 'dialog',
    section: 'Examples',
    reason:
      'Its live demos carry the section; ## Two flows, one engine is the prose the examples need.',
  },
  {
    slug: 'drag-drop',
    section: 'API',
    reason:
      'Documented per flow rather than in one place — each section introduces its pieces with ' +
      'their own table, because a single API section would list nine directives out of context.',
  },
  {
    slug: 'drag-drop',
    section: 'Examples',
    reason: 'Every flow it documents is a live demo; the README pairs each with its own section.',
  },
  {
    slug: 'drawer',
    section: 'Examples',
    reason: 'Its live demos carry the section; each behaviour has a section of its own instead.',
  },
  {
    slug: 'drawer',
    section: 'Keyboard',
    reason: 'Escape and the focus trap are the dialog pattern, documented under ## Accessibility.',
  },
  {
    slug: 'drawer',
    section: 'Programmatic API',
    reason: 'ForDrawerManager is documented under ## Two flows, one engine, with Dialog.',
  },
  {
    slug: 'dropdown-menu',
    section: 'Programmatic API',
    reason: 'Opened by its own trigger; it ships no manager.',
  },
  {
    slug: 'hover-card',
    section: 'Programmatic API',
    reason: 'Its imperative surface is a directive handle — ## Imperative show and hide.',
  },
  {
    slug: 'internationalized-date',
    section: 'API',
    reason:
      'The entry point is two adapter values; the README states what they are and defers to ' +
      '@internationalized/date for everything they expose.',
  },
  {
    slug: 'menu',
    section: 'Examples',
    reason: 'The shared surface is never used alone; each menu-family README carries the demos.',
  },
  {
    slug: 'menu',
    section: 'Programmatic API',
    reason: 'A surface composed by other roots, none of which it opens itself.',
  },
  {
    slug: 'menubar',
    section: 'Programmatic API',
    reason: 'Opened by its own triggers; it ships no manager.',
  },
  {
    slug: 'navigation-menu',
    section: 'Programmatic API',
    reason: 'Opened by its own triggers; it ships no manager.',
  },
  {
    slug: 'pane-resizer',
    section: 'Wrapping in a design system',
    reason: 'Not a form control — it reads a size, and wraps like any composable-ui piece.',
  },
  {
    slug: 'popover',
    section: 'Programmatic API',
    reason: 'A declarative overlay — it opens from its own trigger, with no manager.',
  },
  {
    slug: 'search',
    section: 'Styling',
    reason: 'A native input with no piece of its own to hook; ## Accessibility covers the rest.',
  },
  {
    slug: 'search',
    section: 'Wrapping in a design system',
    reason: 'A single directive over a native input; the Input guide covers wrapping it.',
  },
  {
    slug: 'select',
    section: 'Programmatic API',
    reason: 'A declarative overlay — the listbox opens from its own trigger, with no manager.',
  },
  {
    slug: 'shared',
    section: 'API',
    reason: 'Its exports are one-liners, listed under ## What it exports with their contracts.',
  },
  {
    slug: 'table',
    section: 'Examples',
    reason: 'Its modes are the examples; each carries a section and a live demo of its own.',
  },
  {
    slug: 'table-virtualization',
    section: 'Examples',
    reason: 'An extension of Table, demonstrated from that page.',
  },
  {
    slug: 'table-virtualization',
    section: 'Styling',
    reason: 'It adds no piece to style — Table owns the styling reference.',
  },
  {
    slug: 'toast',
    section: 'Examples',
    reason: '## Declarative usage is the example set; the imperative flow has its own section.',
  },
  {
    slug: 'time-picker',
    section: 'Programmatic API',
    reason: 'A declarative overlay — the picker opens from its own trigger, with no manager.',
  },
  {
    slug: 'time-picker',
    section: 'Styling',
    reason: 'Composes Select and Listbox pieces, whose styling references it links.',
  },
  {
    slug: 'tooltip',
    section: 'Programmatic API',
    reason: 'Its imperative surface is a directive handle — ## Imperative show and hide.',
  },
  {
    slug: 'virtual-reorder',
    section: 'Examples',
    reason: 'An extension of Drag & Drop, demonstrated from that page.',
  },
  {
    slug: 'virtual-reorder',
    section: 'Accessibility',
    reason: 'It adds no role of its own; Drag & Drop owns the announcement contract.',
  },
  {
    slug: 'virtual-reorder',
    section: 'Styling',
    reason: 'It adds no piece to style — Drag & Drop owns the styling reference.',
  },
  {
    slug: 'visually-hidden',
    section: 'Accessibility',
    reason:
      'The primitive is the accessibility affordance; ## Why this exists states the contract.',
  },
];

/** Which ring a `##` heading belongs to, by its exact canonical text. */
export function ringOf(title) {
  if (CORE_SECTIONS.includes(title)) {
    return 'core';
  }
  return CANONICAL_SECTIONS.includes(title) ? 'canonical' : 'specific';
}

function fieldProblems(fields, path) {
  const problems = [];
  const at = (key) => fields.get(key)?.line ?? 1;
  const report = (key, message) => {
    problems.push({ path, line: at(key), message });
  };

  const known = new Set(['title', 'group', 'archetype', 'apgUrl', 'foldInto']);
  for (const key of fields.keys()) {
    if (!known.has(key)) {
      report(key, `${key} is not a frontmatter field — write one of ${[...known].join(', ')}`);
    }
  }

  for (const key of ['title', 'group', 'archetype']) {
    if (!fields.has(key)) {
      problems.push({ path, line: 1, message: `frontmatter is missing the required field ${key}` });
    }
  }

  const title = fields.get('title')?.value;
  if (title !== undefined && (Array.isArray(title) || title === '')) {
    report('title', 'title must be the name the navigation shows, as a plain string');
  }

  const group = fields.get('group')?.value;
  if (group !== undefined && !DOC_GROUPS.has(group)) {
    report(
      'group',
      `group ${JSON.stringify(group)} is not one of ${[...DOC_GROUPS.keys()].join(', ')}`,
    );
  }

  const archetype = fields.get('archetype')?.value;
  if (archetype !== undefined) {
    if (!Array.isArray(archetype) || archetype.length === 0) {
      report('archetype', 'archetype must be a non-empty list, as [overlay, form-control]');
    } else {
      for (const name of archetype) {
        if (!ARCHETYPES.has(name)) {
          report(
            'archetype',
            `archetype ${JSON.stringify(name)} is not one of ${[...ARCHETYPES.keys()].join(', ')}`,
          );
        }
      }
    }
  }

  const apgUrl = fields.get('apgUrl')?.value;
  if (apgUrl !== undefined && !String(apgUrl).startsWith('https://www.w3.org/WAI/ARIA/apg/')) {
    report('apgUrl', 'apgUrl must be a https://www.w3.org/WAI/ARIA/apg/ URL, or be left out');
  }

  const foldInto = fields.get('foldInto')?.value;
  if (foldInto !== undefined) {
    if (Array.isArray(foldInto) || !FOLD_TARGET.test(foldInto)) {
      report(
        'foldInto',
        'foldInto must name the page and section its content is appended to, as table#virtualized-rows',
      );
    }
    if (group !== 'none') {
      report(
        'foldInto',
        `foldInto is only for a document with no page of its own, and this one declares group ${JSON.stringify(group)}`,
      );
    }
  }

  return problems;
}

/**
 * Read and validate one entry point README's frontmatter.
 *
 * The registry the site's navigation, search and page headers are built from is
 * this block and nothing else, so an invalid field fails the build naming the
 * file and the field rather than reaching a page as an empty string.
 *
 * @returns `meta` is `null` when any problem was found — the caller reports the
 * problems rather than publishing a half-read document.
 */
export function readDocMeta(source, path) {
  const { fields, body, problems } = splitFrontmatter(source);
  const located = problems.map((problem) => ({ ...problem, path }));
  if (fields === null) {
    return {
      meta: null,
      body,
      problems:
        located.length > 0
          ? located
          : [
              {
                path,
                line: 1,
                message:
                  'the document opens with no frontmatter block — every entry point README declares ' +
                  'title, group and archetype between --- delimiters',
              },
            ],
    };
  }

  const all = [...located, ...fieldProblems(fields, path)];
  if (all.length > 0) {
    return { meta: null, body, problems: all };
  }
  return {
    meta: {
      title: fields.get('title').value,
      group: fields.get('group').value,
      archetype: fields.get('archetype').value,
      apgUrl: fields.get('apgUrl')?.value ?? null,
      foldInto: fields.get('foldInto')?.value ?? null,
    },
    body,
    problems: [],
  };
}

/**
 * The canonical sections a document's archetypes require of it, minus the ones
 * it carries a written exemption for.
 */
export function requiredSections(meta, slug) {
  const required = new Set();
  for (const name of meta.archetype) {
    for (const section of ARCHETYPES.get(name)?.sections ?? []) {
      required.add(section);
    }
  }
  for (const exemption of SECTION_EXEMPTIONS) {
    if (exemption.slug === slug) {
      required.delete(exemption.section);
    }
  }
  return [...required];
}

/** Every document missing a section its declared archetypes require of it. */
export function checkSections(documents) {
  const problems = [];
  for (const document of documents) {
    const titles = new Set(document.sections.map((section) => section.title));
    for (const section of requiredSections(document.meta, document.slug)) {
      if (!titles.has(section)) {
        problems.push({
          path: document.path,
          line: 1,
          message:
            `archetype ${document.meta.archetype.join(' + ')} requires a "## ${section}" section, ` +
            'which this document does not carry — write it, or add an exemption with a reason to ' +
            'SECTION_EXEMPTIONS in scripts/lib/doc-contract.mjs',
        });
      }
    }
  }
  return problems;
}

/**
 * Every exemption that no longer earns its place — one naming a document that
 * is gone, and one for a section the document has since written.
 *
 * Stated over the whole corpus, because that is the only list against which an
 * exemption can be said to be stale.
 */
export function checkExemptions(documents) {
  const problems = [];
  const bySlug = new Map(documents.map((document) => [document.slug, document]));
  const at = (message) => ({ path: 'scripts/lib/doc-contract.mjs', line: 1, message });

  for (const exemption of SECTION_EXEMPTIONS) {
    const document = bySlug.get(exemption.slug);
    if (document === undefined) {
      problems.push(at(`SECTION_EXEMPTIONS names ${exemption.slug}, which compiles no document`));
      continue;
    }
    if (document.sections.some((section) => section.title === exemption.section)) {
      problems.push(
        at(
          `${exemption.slug} is exempt from "## ${exemption.section}" and now carries it — ` +
            'drop the exemption',
        ),
      );
    }
  }
  return problems;
}

/** Every way a compiled corpus disagrees with the contract. */
export function checkContract(documents) {
  return [...checkSections(documents), ...checkExemptions(documents)];
}
