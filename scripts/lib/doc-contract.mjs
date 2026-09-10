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
 * Every heading the page template names, in the order it gives them.
 *
 * The sequence is the half of the contract nothing used to check: the two ring
 * lists below were membership tests with no order between them, so a document
 * could carry every section its archetype requires and still write them in an
 * order no other page uses
 * ([#1862](https://github.com/tutkli/forty-cdk/issues/1862)). A heading this
 * list does not name is `specific`, and where it sits is its own question —
 * {@link checkSectionOrder} passes over it.
 */
export const TEMPLATE_ORDER = [
  'When to choose',
  'Anatomy',
  'Examples',
  'API',
  'Programmatic API',
  'Keyboard',
  'Accessibility',
  'Styling',
  'SSR',
  'Behavior notes',
  'Wrapping in a design system',
];

/**
 * The two rings that carry a rule, derived from the sequence above rather than
 * written out a second time beside it.
 *
 * `core` is required of every archetype that has DOM at all; `canonical` is
 * required per archetype, by the table above. Everything else a document writes
 * is `specific` — the 121-title tail the audit measured, which is content
 * `Select` genuinely has and `Separator` does not, and which is grouped rather
 * than normalised ([#1810](https://github.com/tutkli/forty-cdk/issues/1810)).
 */
export const CORE_SECTIONS = ['Anatomy', 'API'];

export const CANONICAL_SECTIONS = TEMPLATE_ORDER.filter((title) => !CORE_SECTIONS.includes(title));

/**
 * A heading no document may write, and the one it means.
 *
 * The page template carried this as a prose column — "Replaces these existing
 * headings" — and prose is what let seven of them survive the normalisation it
 * was written for ([#1864](https://github.com/tutkli/forty-cdk/issues/1864)).
 * An alias is not a cosmetic difference: {@link ringOf} classifies by exact
 * title, so `## Keyboard interaction` is read as `specific` and its primitive
 * has no keyboard section as far as any check or any reader scanning the rail
 * can tell.
 *
 * `Scoped defaults` is here for the same reason under a different name: it is
 * no template heading, and four spellings of it minted four anchors for the one
 * concept every `provideForXDefaults` scope documents.
 *
 * Exact titles only. A free heading is the tail this contract deliberately
 * leaves alone, and judging one is not this check's business — the aliases are
 * the headings the corpus actually wrote for a canonical idea, and the list
 * grows the day another one does.
 */
export const HEADING_ALIASES = new Map([
  ['Pieces', 'Anatomy'],
  ['Pieces (declarative)', 'Anatomy'],
  ['Parts', 'Anatomy'],
  ['Example', 'Examples'],
  ['Usage', 'Examples'],
  ['Stand-alone usage', 'Examples'],
  ['Declarative usage', 'Examples'],
  ['Inputs', 'API'],
  ['Outputs', 'API'],
  ['Inputs / outputs', 'API'],
  ['Inputs / models', 'API'],
  ['API reference', 'API'],
  ['Keyboard interaction', 'Keyboard'],
  ['Accessibility notes', 'Accessibility'],
  ['A11y', 'Accessibility'],
  ['Styling forty-cdk', 'Styling'],
  ['Server-side rendering', 'SSR'],
  ['Behavior', 'Behavior notes'],
  ['Notes', 'Behavior notes'],
  ['Wrapping', 'Wrapping in a design system'],
  ['Design system usage', 'Wrapping in a design system'],
  ['Wrapping the root', 'Wrapping in a design system'],
  ['Wrapping the declarative body', 'Wrapping in a design system'],
  ['Scope defaults', 'Scoped defaults'],
  ['Defaults', 'Scoped defaults'],
  ['Defaults provider', 'Scoped defaults'],
  ['Global defaults', 'Scoped defaults'],
]);

/**
 * An alias a document keeps, and the reason the rename is not available to it.
 *
 * `## Declarative usage` is Toast's example set, and Toast is exempt from
 * `## Examples` for exactly that reason. The placement half of that is settled
 * — the block the site synthesises for such a page renders where the template
 * orders it ([#1865](https://github.com/tutkli/forty-cdk/issues/1865)) — and
 * the rename is still unavailable, because the site replaces a declared
 * `## Examples` body with the live demos: called by its canonical name, the
 * section's snippet would stop being published at all. The canonical heading
 * becomes available the day that snippet is a live example of its own, and this
 * entry fails the build then rather than outliving its reason.
 */
export const ALIAS_EXEMPTIONS = [
  {
    slug: 'toast',
    section: 'Declarative usage',
    reason:
      'The example set of a page exempt from ## Examples, and the site replaces a declared ' +
      'Examples body with its live demos — so the canonical name would unpublish this snippet.',
  },
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

/**
 * The canonical section a page's specific ones nest under in the rail, and the
 * title the rail falls back to when the document declares none.
 *
 * `Behavior notes` is not a name invented for the grouping: it is already the
 * canonical heading twelve READMEs use for what a primitive does beyond the
 * template, so a document that declares it names its own container, anchor and
 * all. The rest borrow the title without an anchor, rather than a container
 * being written into the site's markup.
 */
export const BEHAVIOR_GROUP_TITLE = 'Behavior notes';

/**
 * How many specific sections it takes before nesting them reads as an
 * improvement.
 *
 * Below three, the group costs a level of indentation and a heading of its own
 * to save one or two entries, which is a worse rail than the flat one —
 * `Separator` and the thirty-five other documents at or under two are left
 * exactly as they are.
 */
const MIN_GROUPED = 3;

/**
 * How many template sections have to stay outside the group for it to mean
 * anything.
 *
 * The grouping separates what a reader expects on every page from what only
 * this page has to say, so a document with almost nothing in the first half has
 * nothing to separate. `forty-cdk/shared` is the case the corpus holds: seven
 * sections, all seven specific, and grouping them would leave a rail of one.
 */
const MIN_TEMPLATE = 3;

/**
 * The container a document's specific sections nest under in the rail, or
 * `null` for a document the grouping would not improve
 * ([#1810](https://github.com/tutkli/forty-cdk/issues/1810)).
 *
 * Only a README is grouped. A guide declares no archetype and is held to no
 * template, so every one of its sections reads as `specific` — the ring says
 * nothing about a guide, and grouping on it would empty the rail rather than
 * order it.
 */
export function behaviorGroupOf(document) {
  if (document.kind !== 'primitive') {
    return null;
  }
  const specific = document.sections.filter((section) => section.ring === 'specific');
  const container =
    document.sections.find((section) => section.title === BEHAVIOR_GROUP_TITLE) ?? null;
  const template = document.sections.length - specific.length - (container === null ? 0 : 1);
  if (specific.length < MIN_GROUPED || template < MIN_TEMPLATE) {
    return null;
  }
  return { title: container?.title ?? BEHAVIOR_GROUP_TITLE, slug: container?.slug ?? null };
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

/**
 * Every document that writes a heading the template retired, and every alias
 * exemption that no longer earns its place.
 *
 * Only `##` headings take part, which is what makes the drag-drop half of
 * [#1864](https://github.com/tutkli/forty-cdk/issues/1864) expressible: the
 * data-attribute reference is canonical as a `### Data attributes` under
 * `## API`, and this check is about what a section is called rather than how
 * deep it sits.
 *
 * The staleness half is stated over the whole corpus for the same reason
 * {@link checkExemptions} is — an exemption can only be called stale against
 * every document there is.
 */
export function checkHeadingAliases(documents) {
  const problems = [];
  const exempt = (slug, title) =>
    ALIAS_EXEMPTIONS.some((one) => one.slug === slug && one.section === title);

  for (const document of documents) {
    for (const section of document.sections) {
      const canonical = HEADING_ALIASES.get(section.title);
      if (canonical === undefined || exempt(document.slug, section.title)) {
        continue;
      }
      problems.push({
        path: document.path,
        line: section.line,
        message:
          `"## ${section.title}" is an alias the page template retired — write ` +
          `"## ${canonical}", the one spelling the corpus and its anchors carry`,
      });
    }
  }

  const bySlug = new Map(documents.map((document) => [document.slug, document]));
  const at = (message) => ({ path: 'scripts/lib/doc-contract.mjs', line: 1, message });
  for (const exemption of ALIAS_EXEMPTIONS) {
    const document = bySlug.get(exemption.slug);
    if (document === undefined) {
      problems.push(at(`ALIAS_EXEMPTIONS names ${exemption.slug}, which compiles no document`));
      continue;
    }
    if (!document.sections.some((section) => section.title === exemption.section)) {
      problems.push(
        at(
          `${exemption.slug} keeps the alias "## ${exemption.section}" by exemption and no longer ` +
            'writes it — drop the exemption',
        ),
      );
    }
  }
  return problems;
}

/**
 * Every document that carries the right sections in the wrong order.
 *
 * Read as a subsequence rather than a sequence: only the headings
 * {@link TEMPLATE_ORDER} names take part, so a document stays free to write a
 * specific section wherever its content belongs and the long tail keeps the
 * position it earned. The problem is reported against the heading that arrived
 * early — the one a contributor moves — and names the section it should follow,
 * because a rule restated where it failed is a fix and a rule restated in prose
 * is a lookup.
 */
export function checkSectionOrder(documents) {
  const problems = [];
  for (const document of documents) {
    const placed = [];
    for (const section of document.sections) {
      const at = TEMPLATE_ORDER.indexOf(section.title);
      if (at === -1) {
        continue;
      }
      const furthest = placed.at(-1);
      if (furthest === undefined || at >= furthest.at) {
        placed.push({ title: section.title, at });
        continue;
      }
      const anchor = placed.findLast((entry) => entry.at < at);
      problems.push({
        path: document.path,
        line: section.line,
        message:
          `"## ${section.title}" is written after "## ${furthest.title}", which the page template ` +
          `orders below it — ` +
          (anchor === undefined
            ? `move it above "## ${furthest.title}"`
            : `move it up to follow "## ${anchor.title}"`),
      });
    }
  }
  return problems;
}

/**
 * The one specific section a document may write above its first core one, or
 * `-1` for a document that writes none.
 *
 * `## Date adapter` states the provider the four date primitives need before
 * any of them does anything, and pushing it below `## Anatomy` would make those
 * four documents worse to read. So the ring gets a position rather than none: a
 * prelude, and then one contiguous run wherever its content belongs. Thirteen
 * documents open this way, under seven titles. The allowance is one section and
 * not a leading block — a second one is the tail spreading back out, which is the
 * state this rule closes
 * ([#1863](https://github.com/tutkli/forty-cdk/issues/1863)).
 */
export function preludeIndexOf(sections) {
  const first = sections.findIndex((section) => section.ring === 'specific');
  const core = sections.findIndex((section) => section.ring === 'core');
  return first !== -1 && (core === -1 || first < core) ? first : -1;
}

/**
 * Every document that writes its specific sections in more than one run.
 *
 * This is the half of the ring's position {@link checkSectionOrder} leaves open
 * on purpose: the canonical sections have a sequence, and a specific one is free
 * to sit between any two of them. Free of a *position*, though, it was also free
 * of a *neighbour* — and the rail nests the whole ring under one group, so a
 * document whose specific sections came in two runs got a group placed at one of
 * them, dragging the rest of the ring to it. Twelve of the fifty-four published
 * pages listed their sections in an order the page did not use, and the table of
 * contents is the one component whose entire job is to state that order.
 *
 * A contiguous run is the rule rather than a fixed slot, because the group lands
 * where the run is: contiguity is what makes the rail's order the page's order,
 * and it leaves every document free to say where its own tail belongs.
 */
export function checkSectionRuns(documents) {
  const problems = [];
  for (const document of documents) {
    const prelude = preludeIndexOf(document.sections);
    let previous = null;
    let last = null;
    let runs = 0;
    for (const [index, section] of document.sections.entries()) {
      if (section.ring !== 'specific' || index === prelude) {
        continue;
      }
      if (previous === null || index !== previous + 1) {
        runs += 1;
        if (runs > 1) {
          problems.push({
            path: document.path,
            line: section.line,
            message:
              `"## ${section.title}" opens a second run of specific sections, and the page ` +
              'template gives the ring one contiguous run — one section may still precede the ' +
              `first core one, as a prelude — so move it beside "## ${last.title}", or move ` +
              'that run down to it',
          });
        }
      }
      if (runs === 1) {
        last = section;
      }
      previous = index;
    }
  }
  return problems;
}

/** Every way a compiled corpus disagrees with the contract. */
export function checkContract(documents) {
  return [
    ...checkSections(documents),
    ...checkExemptions(documents),
    ...checkHeadingAliases(documents),
    ...checkSectionOrder(documents),
    ...checkSectionRuns(documents),
  ];
}
