# Documentation site — primitive page template

This is the **information-architecture contract** for the forty-cdk documentation site.
It defines the canonical structure every primitive `README.md` must follow so the site can
render each page section-by-section, build a reliable "On this page" table of contents, and
inject live demos in a predictable place.

The README is the **single source of truth** for a primitive's prose _and_ for the metadata the
site's navigation is built from. It is not authored twice. This template is therefore two things at
once:

1. The **normalization checklist** for the existing 57 READMEs (rename headings to the canonical
   set, guarantee the required sections exist, move static example code into live `*.example.ts`).
2. The **rendering contract** the site relies on (each canonical heading maps to a site region).

**Most of this document is executable.** The frontmatter schema, the archetype-to-section rules and
the exemption list live in [scripts/lib/doc-contract.mjs](../scripts/lib/doc-contract.mjs) and run
on every build; the ring a section falls in reaches the page on the model
([#1808](https://github.com/tutkli/forty-cdk/issues/1808)). Where this file states a rule the code
does not check — the ordering of sections, whether a keyboard-handling primitive wrote its Keyboard
section — it says so, because a contract that quietly mixes the two is how this document came to
disagree with the code in three places.

> Scope note: this governs per-primitive pages only. Cross-cutting guides (`docs/styling.md`,
> `docs/your-first-overlay.md`, …) keep their own free-form structure and are rendered as plain
> articles at `/guides/<name>`, listed at `/guides`
> ([#1801](https://github.com/tutkli/forty-cdk/issues/1801)). Free-form is about **sections**: a
> guide owes the lede below like every other document, because its page header and its index card
> read that paragraph. Which files in `docs/` are published,
> which theme group each belongs to, and the written reason for every exclusion all live in
> `PUBLISHED_GUIDES` / `EXCLUDED_GUIDES` in [scripts/lib/doc-site.mjs](../scripts/lib/doc-site.mjs);
> a `.md` file in `docs/` that is in neither list fails `pnpm gen:doc-model`. This document is the one
> excluded file — it addresses contributors rather than consumers.

## Frontmatter

Every entry point's `README.md` opens with the block the site's registry is built from
([#1808](https://github.com/tutkli/forty-cdk/issues/1808)):

```md
---
title: Select
group: primitives
archetype: [overlay, form-control]
apgUrl: https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/
---
```

| Field       | Required | Value                                                                            |
| ----------- | -------- | -------------------------------------------------------------------------------- |
| `title`     | yes      | The name the navigation, page header and `⌘K` palette show                       |
| `group`     | yes      | `primitives`, `utilities`, or `none` for a README the site publishes no page for |
| `archetype` | yes      | A non-empty list from the table below                                            |
| `apgUrl`    | no       | The WAI-ARIA APG pattern's URL, when one exists                                  |

The format is a deliberate subset of YAML rather than YAML: one `key: value` per line, values
either a scalar or a `[a, b]` list, no nesting, no quoting, no comments. Anything else fails the
build naming the file and the line, and so does an unknown field — a typo is refused rather than
dropped. `slug` is not a field: it is the entry point's directory name, and a second copy of it
could only ever disagree.

**There is no `description` field.** The document's own lede — the first paragraph under the `# `
title — _is_ the description, lifted out of the intro at compile time. The page header shows it and
the body below renders everything else, so there is one copy and no comparison to keep it honest.
This replaces `stripLeadingDescription`, which existed to notice when the registry's copy and the
README's opening paragraph were byte-identical and drop one of them.

**Every published document owes one, guides and the site's own pages included.** A document that
opens with no paragraph above its first section fails the build, and the lift has no exemption: a
kind that kept its lede in the intro is a kind whose page header has to quote the body under it,
which is what all eleven guide pages did while the guides were exempt — the header showing a copy
another scan had clipped at 260 characters, the body opening with the same sentence whole. How much
of a description a card shows is that card's own business, in CSS.

## Archetypes

The archetype decides which canonical sections a document must carry, and a primitive may declare
more than one (Select is `[overlay, form-control]`) — it then owes the union of both.

| Archetype          | Examples                                   | Distinguishing trait                                              |
| ------------------ | ------------------------------------------ | ----------------------------------------------------------------- |
| `composable-ui`    | Accordion, Tabs, Carousel, Table           | A set of directives composed in a template; ARIA + `data-*` hooks |
| `overlay`          | Dialog, Drawer, Popover, Toast, Select     | Renders floating or portaled content                              |
| `form-control`     | Checkbox, Switch, Input, Slider, DateField | Implements a `@angular/forms/signals` control interface           |
| `headless-utility` | Breakpoints, DragDrop, Virtualization      | No DOM/ARIA of its own; an `inject*` / provider API               |

`overlay` used to be defined as "`composable-ui` **plus** a programmatic `For<X>Manager` API", which
only Dialog, Drawer and Toast satisfy while the example column named five more. The trait above is
the one the corpus shows. `Programmatic API` is still required of every overlay, and the ones with
no manager to document carry a written exemption rather than a silently relaxed rule.

## Three rings

Every `##` section is classified, and the ring reaches the page on `DocPageSection.ring`:

| Ring        | Sections                                                                                                    | Rule                                                              |
| ----------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `core`      | Anatomy, API                                                                                                | Required of every archetype that has DOM at all                   |
| `canonical` | When to choose, Examples, Programmatic API, Keyboard, Accessibility, Styling, SSR, Wrapping, Behavior notes | Required per archetype, by the table below                        |
| `specific`  | The long tail — _Snap points_, _Mega-menu_, _Date adapter_ …                                                | Free title and content; grouped in the TOC rather than normalised |

The tail is deliberate. 102 of the corpus's section titles appear exactly once, because `Select`
genuinely has _Modal touch presentation_ to document and `Separator` does not. Normalising them
would cost real nuance for the sake of a template, so `specific` gives them a home instead.

## Canonical sections

Sections appear **in this order**. The `Required for` column is what
[scripts/lib/doc-contract.mjs](../scripts/lib/doc-contract.mjs) enforces — a document missing one
fails the build unless it carries a written exemption there.

| Order | Canonical heading                | Level | Required for                           | Replaces these existing headings (aliases)                                  |
| ----- | -------------------------------- | ----- | -------------------------------------- | --------------------------------------------------------------------------- |
| 1     | _(intro)_                        | —     | all                                    | _(the lede paragraph; no heading)_                                          |
| 2     | `## When to choose`              | `##`  | optional                               | "When to choose X vs Y", "X vs Y"                                           |
| 3     | `## Anatomy`                     | `##`  | all except `headless-utility`          | "Pieces", "Pieces (declarative)", "Parts"                                   |
| 4     | `## Examples`                    | `##`  | all except `headless-utility`          | "Example", "Usage", "Stand-alone usage", "… usage" (see Examples)           |
| 5     | `## API`                         | `##`  | all                                    | "Inputs / outputs", "Inputs / models", "Inputs", "Outputs", "API reference" |
| 6     | `## Programmatic API`            | `##`  | `overlay`                              | "Programmatic — …", "ForXManager"                                           |
| 7     | `## Keyboard`                    | `##`  | `overlay`; any other with key handling | "Keyboard interaction"; or a `### Keyboard` subsection of A11y              |
| 8     | `## Accessibility`               | `##`  | all except `headless-utility`          | "Accessibility notes", "A11y"                                               |
| 9     | `## Styling`                     | `##`  | all except `headless-utility`          | "Styling forty-cdk"                                                         |
| 10    | `## SSR`                         | `##`  | any primitive with server-side caveats | "Server-side rendering"                                                     |
| 11    | `## Wrapping in a design system` | `##`  | `form-control`                         | "Wrapping", "Design system usage"                                           |
| 12    | `## Behavior notes`              | `##`  | optional (complex primitives)          | "Behavior", "Notes"                                                         |

Rows 2, 10 and 12 are canonical without being required: a primitive with nothing SSR-specific to
say should not be made to write a section about it. Row 7 is required of `overlay` and expected of
anything else that handles keys, which is a judgement no build can make — a keyboard-handling
primitive that omits it is caught in review, not by the gate.

`## Scoped defaults` is the one spelling. The corpus carried `Scope defaults` four times and
`Scoped defaults` four times for the same concept, which minted two anchors for one idea.

### Section contracts

- **_(intro)_** — One short paragraph: what the primitive is, plus a markdown link to its
  [WAI-ARIA APG pattern](https://www.w3.org/WAI/ARIA/apg/patterns/) when one exists. The APG URL is
  also carried structurally in the site registry; the prose link is for README readers on npm.
  An optional leading blockquote may link a related cross-cutting guide (as Dialog links
  _Your first overlay_).

- **`## When to choose`** — Only for primitives that are easily confused with a sibling
  (Checkbox vs Switch, Dialog vs Popover, Menu vs Listbox). A short bulleted contrast. Omit otherwise.

- **`## Anatomy`** — The composition table with columns **Class · Selector · Role**. Optionally a
  minimal skeleton snippet showing how the pieces nest. This is the "what directives exist" reference.

- **`## Examples`** — Prose here stays minimal: a one-line intro per example at most. The actual
  runnable demos are **live components**, not fenced code blocks — they come from the primitive's
  `*.example.ts` files and the site renders each with a Preview / Code tab pair. **Action for the
  audit:** move every meaningful runnable snippet currently fenced in the README (standalone,
  tri-state, Signal Forms, etc.) into a named `*.example.ts` under the playground demo folder, so
  the site shows it live with copyable source. Keep tiny illustrative fences (a 3-line CSS hook, a
  single binding) inline where a full live demo would be overkill.

- **`## API`** — One `### ForX` subsection per piece, each with an **Inputs / Outputs / Models**
  table (merge "Inputs" and "Outputs" tables under the piece; mark outputs in the Description or a
  Kind column). Canonical columns for new content: **Property · Type · Default · Description**,
  dropping `Default` when no member has one.

  The renderer decides which tables get the rich API treatment — type chip plus detail popover —
  from the header shape, and it keys off the **middle** columns only
  ([#1803](https://github.com/tutkli/forty-cdk/issues/1803)). A table qualifies when it has:
  - three columns whose second is `Type`, or
  - four columns whose second is `Type` and third is `Default`.

  The first column is free (`Property`, `API`, `Input`, `Binding`, `Member`, `Option` and `Default`
  all occur today) and so is the last, which is the description under any name (`Description`,
  `Notes`, `Meaning`). Matching is case-insensitive and ignores inline markup. Every other shape
  renders as a compact table, which is the right treatment for the reference tables that carry no
  type at all — **Key · Action**, **Piece · Attribute · Values**, **Data attribute · Values**,
  **Output · When**. A table that documents typed members and wants the rich rendering has to say
  `Type` in its second column; there is no other opt-in.

  A **`### Data attributes`** subsection (columns **Piece · Attribute · Values**) lives at the end of
  API for every `composable-ui` / `overlay` / `form-control`. Keep every table clean
  GitHub-flavoured markdown — no merged cells, no HTML — because the compiler reads it as records
  and a cell it cannot address is a cell that reaches no page.

- **`## Programmatic API`** — For `overlay` primitives with a `For<X>Manager`. Document the manager
  (`open()` signature), the per-instance `For<X>Ref`, the data token / `inject<X>Data()` accessor,
  and the open-config table (columns **Field · Default · Description**).

- **`## Keyboard`** — A table or tight bullet list of key → action. Split it out of Accessibility
  into its own section so the site can render a dedicated keyboard reference. Primitives with no
  keyboard interaction (Avatar, Progress, AspectRatio) omit it.

- **`## Accessibility`** — Roles, `aria-*` mapping, focus management, APG-conformance notes, and any
  sanctioned APG deviations (with the issue link, as Accordion does for #561).

- **`## Styling`** — The standard "forty-cdk ships no styles" preamble + a link to
  [Styling forty-cdk](styling.md), then the `data-*` hooks the consumer keys CSS off. For portaled
  overlays, the global-CSS / `class` caveat.

- **`## SSR`** — Only when the primitive has server-side behaviour worth stating (a guarded
  `matchMedia`, a `document` access behind `isPlatformBrowser`, "every query reads false on the
  server"). Skip for primitives with nothing SSR-specific to say.

- **`## Wrapping in a design system`** — For `form-control` primitives: the `hostDirectives`
  name-tuple pattern and subclassing, linking [Wrapping form primitives](wrapping-form-primitives.md).

- **`## Behavior notes`** — Escape hatch for complex primitives (Dialog's mount-equals-open, portal,
  scroll-lock, inert-siblings). Use sparingly; prefer folding detail into the relevant section above.

## Heading rules (so the renderer can split deterministically)

- Use the **exact canonical heading text** above — no parenthetical suffixes on the `##` line
  (write `## Anatomy`, not `## Pieces (declarative)`; put the "declarative vs imperative" framing in
  the body or a `### Declarative` subheading).
- One `#` h1 per README (the title). Sections are `##`; per-piece and sub-topics are `###`.
- Section anchors are derived from the heading slug, so canonical headings keep deep links stable
  across the site and GitHub.

## Site rendering contract

How each canonical section surfaces on the site (informs the page-shell components, not the audit):

| Section           | Site treatment                                                                                                         |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------- |
| _(intro)_         | Page header: title + the lede as description + APG badge; the rest of the intro renders below it                       |
| When to choose    | Rendered markdown                                                                                                      |
| Anatomy           | Rendered markdown; the Class·Selector·Role table as a compact table                                                    |
| Examples          | **Not** rendered from README — live `*.example.ts` demos with **Tabs** (Preview/Code), copy-to-clipboard via **Toast** |
| API               | Rendered markdown; a table whose header matches the API shape gets the type chip and detail popover                    |
| Programmatic API  | Rendered markdown; its config table is a compact table                                                                 |
| Keyboard          | Rendered markdown; Key·Action is a compact table                                                                       |
| Accessibility     | Rendered markdown                                                                                                      |
| Styling           | Rendered markdown                                                                                                      |
| All `##` headings | Feed the "On this page" TOC (right rail); the `specific` ones nest under one group — see below                         |

The rail groups by ring ([#1810](https://github.com/tutkli/forty-cdk/issues/1810)). `core` and
`canonical` sections stay at the top level in document order; the `specific` ones nest under a single
group so a reader looking for _Styling_ is not scanning it against _Modal touch presentation_. **Every
anchor still resolves** — grouping moves an entry down a level and rewrites nothing — and
`check:doc-output` fails a page whose rail stopped linking a section its document declares.

Three things decide what a page gets, and all three are derived rather than declared:

- **Whether it groups at all.** Three or more `specific` sections, and at least three template ones
  left outside. Below either, the flat rail is the better one: `Separator` is untouched, and
  `forty-cdk/shared` — seven sections, all seven specific — has nothing to separate from. Seventeen
  of the fifty-four published primitives group today; no guide does, since a guide declares no
  archetype and every section it writes reads as `specific`.
- **What the group is called.** A document that declares `## Behavior notes` names its own container:
  the group takes that section's title _and_ its anchor, and sits where the document put it. One that
  does not borrows the title with no anchor, and the group sits where its first specific section does.
- **Whether it starts closed.** Closed once the group holds more entries than the rest of the rail's
  top level — a ratio, so a page that later grows two canonical sections opens again with no
  threshold to retune. Seven pages are closed today (`/select`, `/combobox`, `/table`, `/toast`,
  `/drawer`, `/drag-drop`, `/virtualization`), and a closed group opens on its own while the section
  being read is inside it.

Tables are plain `<table>` markup, not the **ForTable** primitive, and no column sorts. This
document claimed otherwise for a year; sorting a twelve-row API reference buys a reader little, and
the claim's only effect was to describe a site that did not exist.

Every relative link a README or a guide carries is repository-relative — correct on GitHub, a 404 on
the web — so the renderer resolves each one against the document's own path before it reaches the
DOM ([#1800](https://github.com/tutkli/forty-cdk/issues/1800)): a sibling entry point's README
becomes that primitive's route, a `docs/*.md` guide becomes its `/guides/<name>` route (both keeping
their fragment and navigating through the router without a page load), and anything the site does not
publish — library source, an entry point with no page yet — becomes a GitHub blob URL opened in a new
tab. The mapping is derived from the same registries that drive the routes, never hand-written, and
`pnpm check:doc-links` fails the build on a relative link that resolves to nothing, to a file that
does not exist, to an excluded guide, or to `.claude/` agent instrumentation.

That gate reads the links a document _writes_; `pnpm check:doc-output` reads the ones the site
_serves_ ([#1802](https://github.com/tutkli/forty-cdk/issues/1802)). Over the prerendered HTML it
fails on an anchor that still points at repository source, on one outside the site's base href, on an
internal href that is not a route, and on any fragment with no matching `id` on its target page —
plus, per document, on a `##` section the page never emitted and on a section that rendered no
content block. Anchors inside a live example are excluded: a demo's markup is data, not
documentation. One rule follows from the Examples row above and is worth stating on its own: **a
fragment link to a heading nested under `## Examples` resolves on GitHub and cannot resolve on the
site**, because the site replaces that section's body with its live demos. Link to `#examples`
instead — it is valid in both places.

**Every fenced code block is highlighted at build time**, from the same two themes the example
sources use, so nothing about a page's markup is decided in the browser
([#1807](https://github.com/tutkli/forty-cdk/issues/1807)). A fence's info string therefore has to be
one the site loads a grammar for — `ts` / `typescript`, `html`, `css`, `bash` / `sh` / `shell`,
`md` / `markdown`, or `text` / `txt` / `plaintext` — and a bare fence is plain text, framed like its
neighbours rather than left unstyled. Anything else fails the compile naming its line, because the
alternative is a page where one sample is highlighted and the next is not, which is the state the
corpus had drifted into twice. If a new language is genuinely needed, load its grammar in
`scripts/docs/doc-highlight.mjs` rather than writing the fence unlabelled.

The page chrome itself dogfoods the library: **Drawer** for the mobile nav, **Combobox** for ⌘K
search, **Switch** for the theme toggle, **Toast** for copy-to-clipboard feedback, **Tabs** for each
demo's Preview / Code pair, **Popover** for an API row's detail, **Tooltip** for the inline hints,
**Select** for the demo controls and **Scroll Area** for the sidebar. The top nav is plain anchors
and the sidebar is a plain list — Navigation Menu, Tree and Breadcrumbs are not on the site, and
this list is the set of primitives it actually imports.

## Per-archetype required-section checklist

Use this when auditing a README.

**`composable-ui`** — intro(+APG) · Anatomy · Examples · API(+data-attributes) · Keyboard† · Accessibility · Styling
**`overlay`** — all of the above · **Programmatic API** · Keyboard · (Behavior notes if non-trivial)
**`form-control`** — `composable-ui` set · Signal Forms example under Examples · **Wrapping in a design system**
**`headless-utility`** — intro · Setup‡ · Examples(Usage) · **API** · SSR† _(no Anatomy / Accessibility / Styling / data-attributes)_

† include only when applicable (keyboard interaction exists / SSR caveat exists)
‡ `headless-utility` may use `## Setup` before `## Examples` for the provider configuration step

### Deliberate omissions

A document that genuinely should not carry a required section declares so in `SECTION_EXEMPTIONS`
([scripts/lib/doc-contract.mjs](../scripts/lib/doc-contract.mjs)), with the reason written out:

```js
{
  slug: 'menu',
  section: 'Examples',
  reason: 'The shared surface is never used alone; each menu-family README carries the demos.',
},
```

This is what keeps the check blocking rather than advisory. An omission is either written down or
it fails the build, so the next one is visible the day it appears — and an exemption for a section
the document has since written, or for a document that no longer exists, fails too, which is what
stops the list outliving its reasons.

## Metadata: where structured fields live

In the README's frontmatter, and nowhere else. `projects/forty-cdk-playground/src/app/primitives.ts`
is generated from it: adding an entry point to the site is a frontmatter block, and there is no
second copy of a title, a description or an APG URL to fall out of step with the document it
describes. The README owns both its prose and its metadata; the registry is derived.

This reverses the earlier arrangement, in which the registry held the structured fields and
duplicated `title` / `description` with the README's intro on purpose. The duplication was real —
a function existed solely to notice when the two copies were byte-identical and drop one — and
editing one without the other printed the description twice.

So is the router's table. `src/generated/routes.generated.ts` carries one lazy route per published
primitive and one per guide, leaving `app.routes.ts` with the site's own chrome and nothing
per-primitive ([#1811](https://github.com/tutkli/forty-cdk/issues/1811)). Publishing a page is
therefore two things and no announcement: frontmatter declaring a nav group, and a `demos/<slug>/`
directory holding `<slug>.page.ts`. That file must export `<Slug>Page` — the symbol the generated
route imports — and naming it anything else fails `pnpm gen:doc-model`, which reports the class it
found instead of leaving the site build to fail on a resolution error.
