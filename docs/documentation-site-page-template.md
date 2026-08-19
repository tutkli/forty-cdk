# Documentation site — primitive page template

This is the **information-architecture contract** for the forty-cdk documentation site.
It defines the canonical structure every primitive `README.md` must follow so the site can
render each page section-by-section, build a reliable "On this page" table of contents, and
inject live demos in a predictable place.

The README is the **single source of truth** for a primitive's prose. The site renders it; it
is not authored twice. This template is therefore two things at once:

1. The **normalization checklist** for the existing 57 READMEs (rename headings to the canonical
   set, guarantee the required sections exist, move static example code into live `*.example.ts`).
2. The **rendering contract** the site relies on (each canonical heading maps to a site region).

> Scope note: this governs per-primitive pages only. Cross-cutting guides (`docs/styling.md`,
> `docs/your-first-overlay.md`, …) keep their own free-form structure and are rendered as plain
> articles at `/guides/<name>`, listed at `/guides`
> ([#1801](https://github.com/tutkli/forty-cdk/issues/1801)). Which files in `docs/` are published,
> which theme group each belongs to, and the written reason for every exclusion all live in
> `PUBLISHED_GUIDES` / `EXCLUDED_GUIDES` in [scripts/lib/doc-site.mjs](../scripts/lib/doc-site.mjs);
> a `.md` file in `docs/` that is in neither list fails `pnpm gen:guides`. This document is the one
> excluded file — it addresses contributors rather than consumers.

## Archetypes

Every primitive belongs to exactly one archetype. The archetype decides which **optional**
sections are required (see the section table below).

| Archetype          | Examples                                   | Distinguishing trait                                              |
| ------------------ | ------------------------------------------ | ----------------------------------------------------------------- |
| `composable-ui`    | Accordion, Tabs, Carousel, Table           | A set of directives composed in a template; ARIA + `data-*` hooks |
| `overlay`          | Dialog, Drawer, Popover, Toast, Select     | `composable-ui` **plus** a programmatic `For<X>Manager` API       |
| `form-control`     | Checkbox, Switch, Input, Slider, DateField | Implements a `@angular/forms/signals` control interface           |
| `headless-utility` | Breakpoints, DragDrop, Virtualization      | No DOM/ARIA of its own; an `inject*` / provider API               |

A primitive can be both `overlay` and `form-control` (e.g. Select, Combobox, DatePicker). When it
is, include the union of both archetypes' required sections.

## Canonical sections

Sections appear **in this order**. `Core` sections are required for every archetype that has the
trait. The `Required for` column lists the archetypes that must include each optional section.

| Order | Canonical heading                | Level | Required for                            | Replaces these existing headings (aliases)                                  |
| ----- | -------------------------------- | ----- | --------------------------------------- | --------------------------------------------------------------------------- |
| 1     | _(intro)_                        | —     | all                                     | _(the lede paragraph; no heading)_                                          |
| 2     | `## When to choose`              | `##`  | optional                                | "When to choose X vs Y", "X vs Y"                                           |
| 3     | `## Anatomy`                     | `##`  | all except `headless-utility`           | "Pieces", "Pieces (declarative)", "Parts"                                   |
| 4     | `## Examples`                    | `##`  | all                                     | "Example", "Usage", "Stand-alone usage", "… usage" (see Examples)           |
| 5     | `## API`                         | `##`  | all                                     | "Inputs / outputs", "Inputs / models", "Inputs", "Outputs", "API reference" |
| 6     | `## Programmatic API`            | `##`  | `overlay`                               | "Programmatic — …", "ForXManager"                                           |
| 7     | `## Keyboard`                    | `##`  | any primitive with keyboard interaction | "Keyboard interaction"; or a `### Keyboard` subsection of A11y              |
| 8     | `## Accessibility`               | `##`  | all except `headless-utility`           | "Accessibility notes", "A11y"                                               |
| 9     | `## Styling`                     | `##`  | all except `headless-utility`           | "Styling forty-cdk"                                                         |
| 10    | `## SSR`                         | `##`  | any primitive with server-side caveats  | "Server-side rendering"                                                     |
| 11    | `## Wrapping in a design system` | `##`  | `form-control`                          | "Wrapping", "Design system usage"                                           |
| 12    | `## Behavior notes`              | `##`  | optional (complex primitives)           | "Behavior", "Notes"                                                         |

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
  API for every `composable-ui` / `overlay` / `form-control`. The site renders all API tables with
  the **ForTable** primitive (sortable) — so keep them as clean GitHub-flavoured markdown tables,
  no merged cells, no HTML.

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
| _(intro)_         | Page header: title + description (from registry) + APG badge + import line                                             |
| When to choose    | Callout block near the top                                                                                             |
| Anatomy           | Rendered markdown; the Class·Selector·Role table via **ForTable**                                                      |
| Examples          | **Not** rendered from README — live `*.example.ts` demos with **Tabs** (Preview/Code), copy-to-clipboard via **Toast** |
| API               | Rendered markdown; every table via sortable **ForTable**; data-attributes table likewise                               |
| Programmatic API  | Rendered markdown + config table via **ForTable**                                                                      |
| Keyboard          | Dedicated keyboard table                                                                                               |
| Accessibility     | Rendered markdown                                                                                                      |
| Styling           | Rendered markdown                                                                                                      |
| All `##` headings | Feed the "On this page" TOC (right rail)                                                                               |

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

The page chrome itself dogfoods the library: Navigation Menu / Drawer (mobile) for the top nav,
Tree / Scroll Area for the sidebar, Combobox for ⌘K search, Switch for the theme toggle,
Breadcrumbs for location.

## Per-archetype required-section checklist

Use this when auditing a README.

**`composable-ui`** — intro(+APG) · Anatomy · Examples · API(+data-attributes) · Keyboard† · Accessibility · Styling
**`overlay`** — all of the above · **Programmatic API** · (Behavior notes if non-trivial)
**`form-control`** — `composable-ui` set · Signal Forms example under Examples · **Wrapping in a design system**
**`headless-utility`** — intro · Setup‡ · Examples(Usage) · API · SSR† _(no Anatomy / Accessibility / Styling / data-attributes)_

† include only when applicable (keyboard interaction exists / SSR caveat exists)
‡ `headless-utility` may use `## Setup` before `## Examples` for the provider configuration step

## Metadata: where structured fields live

Nav-level structured metadata (slug, title, description, `apgUrl`, group/archetype) stays in the
site registry (`projects/forty-cdk-playground/src/app/primitives.ts`), which already drives nav and
the page header — it is **typed** and easy for the build to consume. The README owns the **prose**.
`title` / `description` are intentionally duplicated between registry and README intro; the registry
copy is canonical for nav and SEO. (A later refinement may lift these into README frontmatter; not
required for the first pass.)
