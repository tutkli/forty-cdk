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

**Most of this document is executable.** The frontmatter schema, the archetype-to-section rules, the
order those sections are written in, the headings they may not be written under and the exemption
lists live in [scripts/lib/doc-contract.mjs](../scripts/lib/doc-contract.mjs) and run on every
build; the ring a section falls in reaches the page on the model
([#1808](https://github.com/tutkli/forty-cdk/issues/1808)). Where this file states a rule the code
does not check — whether a keyboard-handling primitive wrote its Keyboard section — it says so,
because a contract that quietly mixes the two is how this document came to disagree with the code in
three places.

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

| Ring        | Sections                                                                                                    | Rule                                                                                     |
| ----------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `core`      | Anatomy, API                                                                                                | Required of every archetype that has DOM at all                                          |
| `canonical` | When to choose, Examples, Programmatic API, Keyboard, Accessibility, Styling, SSR, Behavior notes, Wrapping | Required per archetype, by the table below                                               |
| `specific`  | The long tail — _Snap points_, _Mega-menu_, _Date adapter_ …                                                | Free title and content, in one contiguous run; grouped in the TOC rather than normalised |

The tail is deliberate. 102 of the corpus's section titles appear exactly once, because `Select`
genuinely has _Modal touch presentation_ to document and `Separator` does not. Normalising them
would cost real nuance for the sake of a template, so `specific` gives them a home instead.

### Where the specific ring goes

The tail has a **position**, not only a classification and a rail treatment: a document writes its
`specific` sections in **one contiguous run**, and one of them may sit above the first `core` section
as a **prelude**. Both halves are checked, and a second run fails the build naming the file and the
heading that starts it ([#1863](https://github.com/tutkli/forty-cdk/issues/1863)).

The run is free to sit anywhere among the canonical sections — after `## Examples` on `/listbox`,
after `## Programmatic API` on `/toast`, below `## Behavior notes` on `/dialog` — because the rail
puts the group where the run is. Contiguity is what makes those two the same place: the rail nests
the whole ring under one group, so a ring written in two runs got a group at one of them and dragged
the rest of the tail to it. That is how twelve of the fifty-four published pages came to list their
sections in an order the page does not use, with `## Wrapping the root` and
`## Wrapping the declarative body` ending up inside `/table`'s closed drawer.

The prelude is the exception thirteen documents already needed, under seven titles. `## Date adapter`
states the provider `calendar`, `date-field`, `date-picker` and `time-field` need installed before
any of them does anything; `## Two flows, one engine` opens `dialog` and `drawer`,
`## Mount the viewport once` opens `toast`, and `## Why this exists` / `## How it works` /
`## Setup` / `## Ergonomic layer` open the six others. Content a reader needs _before_ the anatomy
belongs above it, so the rail keeps a prelude at its top level with its own anchor instead of nesting
it — without that, five rails opened with a **non-clickable** _Behavior notes_ above `Anatomy`. One
section, though, not a leading block: a second one is the tail spreading back out.

## Canonical sections

Sections appear **in this order**, and both halves of that sentence are enforced by
[scripts/lib/doc-contract.mjs](../scripts/lib/doc-contract.mjs). The `Required for` column decides
which sections a document owes — one missing fails the build unless it carries a written exemption
there — and `TEMPLATE_ORDER` decides the sequence, failing a document that writes one of these
headings above a heading the table puts before it
([#1862](https://github.com/tutkli/forty-cdk/issues/1862)). The order is read as a subsequence, so
the specific run may sit between any two canonical ones — where it may sit is the previous section's
rule.

| Order | Canonical heading                | Level | Required for                           | Replaces these existing headings (aliases)                                              |
| ----- | -------------------------------- | ----- | -------------------------------------- | --------------------------------------------------------------------------------------- |
| 1     | _(intro)_                        | —     | all                                    | _(the lede paragraph; no heading)_                                                      |
| 2     | `## When to choose`              | `##`  | optional                               | "When to choose X vs Y", "X vs Y"                                                       |
| 3     | `## Anatomy`                     | `##`  | all except `headless-utility`          | "Pieces", "Pieces (declarative)", "Parts"                                               |
| 4     | `## Examples`                    | `##`  | all except `headless-utility`          | "Example", "Usage", "Stand-alone usage", "Declarative usage"                            |
| 5     | `## API`                         | `##`  | all                                    | "Inputs / outputs", "Inputs / models", "Inputs", "Outputs", "API reference"             |
| 6     | `## Programmatic API`            | `##`  | `overlay`                              | "Programmatic — …", "ForXManager"                                                       |
| 7     | `## Keyboard`                    | `##`  | `overlay`; any other with key handling | "Keyboard interaction"; or a `### Keyboard` subsection of A11y                          |
| 8     | `## Accessibility`               | `##`  | all except `headless-utility`          | "Accessibility notes", "A11y"                                                           |
| 9     | `## Styling`                     | `##`  | all except `headless-utility`          | "Styling forty-cdk"                                                                     |
| 10    | `## SSR`                         | `##`  | any primitive with server-side caveats | "Server-side rendering"                                                                 |
| 11    | `## Behavior notes`              | `##`  | optional (complex primitives)          | "Behavior", "Notes"                                                                     |
| 12    | `## Wrapping in a design system` | `##`  | `form-control`                         | "Wrapping", "Design system usage", "Wrapping the root", "Wrapping the declarative body" |

Rows 2, 10 and 11 are canonical without being required: a primitive with nothing SSR-specific to
say should not be made to write a section about it. Row 7 is required of `overlay` and expected of
anything else that handles keys, which is a judgement no build can make — a keyboard-handling
primitive that omits it is caught in review, not by the gate.

The alias column is executable: `HEADING_ALIASES` in
[scripts/lib/doc-contract.mjs](../scripts/lib/doc-contract.mjs) carries it, and a `##` matching one
fails the build naming the canonical heading to write instead
([#1864](https://github.com/tutkli/forty-cdk/issues/1864)). It matches exact titles, so the cells
written as patterns — row 2's two, and row 6's — are review's business rather than the gate's, as is
the long tail of free titles the `specific` ring holds. A document that cannot take the rename says
so in `ALIAS_EXEMPTIONS` with the reason, on the same terms as `SECTION_EXEMPTIONS` below.

Row 5 covers the depth question too: a primitive's attribute reference is a `### Data attributes`
under `## API`, never a section of its own. That one the gate does not hold — it reads what a
heading is called, not how deep it sits.

`## Scoped defaults` is the one spelling, and the alias list holds it even though no row above names
it: the section is `specific`, and the spelling rule still has to exist because the corpus carried
the one `provideForXDefaults` concept four ways — `Scoped defaults` eight times, and `Defaults`,
`Defaults provider` and `Global defaults` once each — which minted four anchors for one idea. The
rule stated here before named the wrong pair; `Scope defaults`, the spelling an earlier pass
removed, stays in the alias list so it cannot come back.

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
  tri-state, Signal Forms, etc.) into a named `*.example.ts` under the docs-site demo folder, so
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

- **`## Behavior notes`** — Escape hatch for complex primitives (Dialog's mount-equals-open, portal,
  scroll-lock, inert-siblings). Use sparingly; prefer folding detail into the relevant section above.
  It closes a page only when the document carries no `## Wrapping in a design system`.

- **`## Wrapping in a design system`** — For `form-control` primitives: the `hostDirectives`
  name-tuple pattern and subclassing, linking [Wrapping form primitives](wrapping-form-primitives.md).
  The closing section: "now go wrap this in your design system" is the last thing a page says.

## Heading rules (so the renderer can split deterministically)

- Use the **exact canonical heading text** above — no parenthetical suffixes on the `##` line
  (write `## Anatomy`, not `## Pieces (declarative)`; put the "declarative vs imperative" framing in
  the body or a `### Declarative` subheading).
- One `#` h1 per README (the title). Sections are `##`; per-piece and sub-topics are `###`.
- Section anchors are derived from the heading slug, so canonical headings keep deep links stable
  across the site and GitHub.

## Site rendering contract

How each canonical section surfaces on the site (informs the page-shell components, not the audit):

| Section           | Site treatment                                                                                                                                                         |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| _(intro)_         | Page header: title + the lede as description + APG badge; the rest of the intro renders below it                                                                       |
| When to choose    | Rendered markdown                                                                                                                                                      |
| Anatomy           | Rendered markdown; the Class·Selector·Role table as a compact table                                                                                                    |
| Examples          | **Not** rendered from README — live `*.example.ts` demos with **Tabs** (Preview/Code), copy-to-clipboard via **Toast**; rendered markdown on a page projecting no demo |
| API               | Rendered markdown; a table whose header matches the API shape gets the type chip and detail popover                                                                    |
| Programmatic API  | Rendered markdown; its config table is a compact table                                                                                                                 |
| Keyboard          | Rendered markdown; Key·Action is a compact table                                                                                                                       |
| Accessibility     | Rendered markdown                                                                                                                                                      |
| Styling           | Rendered markdown                                                                                                                                                      |
| All `##` headings | Feed the "On this page" TOC (right rail); the `specific` ones nest under one group — see below                                                                         |

A document that declares no `## Examples` — the six carrying a written exemption, plus one
`headless-utility` the table never required the section of — still gets it as long as its page
projects a demo into the block: the site synthesises the heading and places it where the table
above orders it, after `## Anatomy`, and after the prelude on a page whose document declares no
`## Anatomy` at all ([#1865](https://github.com/tutkli/forty-cdk/issues/1865)). It used to be
emitted first, so those seven pages opened with their demos and stated the pieces those demos
compose below them, `/table` in ninth place. `check:doc-output` fails a page whose parts list
follows the block again, and the placement itself is stated over the compiled model in
`doc-section-layout.spec.ts`.

A page whose only demo is its **hero** gets no block at all
([#1872](https://github.com/tutkli/forty-cdk/issues/1872),
[#1878](https://github.com/tutkli/forty-cdk/issues/1878)). A hero renders above the intro rather
than in the block, so the heading would carry its permalink and an empty body — the state
`forty-cdk/shared` is spared by declaring no demos at all
([#1809](https://github.com/tutkli/forty-cdk/issues/1809)), and the question the rail already asks
when it lists the block's children. `/menu` is that page on the synthesised half; on the declared
one — `/hover-card`, `/separator` and `/toolbar` — the section returns to the normal flow and the
site publishes the markdown its README writes under the heading, nested `###` anchors included.
That is why the rule is the demos a page projects rather than the demos it declares, and why
`check:doc-output` fails an emitted `#examples` carrying neither a demo frame nor a content block.

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
  does not borrows the title with no anchor, and the group sits where its first grouped section does.
  Either way that is where the page renders the run, so the rail's flattened order is the page's —
  which `check:doc-output` asserts per page rather than leaves to the placement rule
  ([#1863](https://github.com/tutkli/forty-cdk/issues/1863)). A **prelude** is not grouped: it keeps
  its top-level entry and its anchor.
- **Whether it starts closed.** Closed once the group holds more entries than the rest of the rail's
  top level — a ratio, so a page that later grows two canonical sections opens again with no
  threshold to retune. Six pages are closed today (`/select`, `/combobox`, `/table`, `/drawer`,
  `/drag-drop`, `/virtualization`), and a closed group opens on its own while the section being read
  is inside it.

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
plus, per document, on a `##` section the page never emitted, on a section that rendered no content
block, on an `#examples` block carrying neither a demo frame nor a content block, and on a rail
whose links do not arrive in the order the page renders their targets. Anchors
inside a live example are excluded: a demo's markup is data, not documentation. One rule follows
from the Examples row above and is worth stating on its own: **a fragment link to a heading nested
under `## Examples` resolves on GitHub and cannot resolve on the site whenever the page projects a
demo into that block**, because the site then replaces the section's body with its live demos. Link
to `#examples` instead — it is valid in both places, and it stays valid on a page that later grows
a demo.

**Every fenced code block is highlighted at build time**, from the same two themes the example
sources use, so nothing about a page's markup is decided in the browser
([#1807](https://github.com/tutkli/forty-cdk/issues/1807)). A fence's info string therefore has to be
one the site loads a grammar for — `ts` / `typescript`, `html`, `css`, `bash` / `sh` / `shell`,
`md` / `markdown`, or `text` / `txt` / `plaintext` — and a bare fence is plain text, framed like its
neighbours rather than left unstyled. Anything else fails the compile naming its line, because the
alternative is a page where one sample is highlighted and the next is not, which is the state the
corpus had drifted into twice. If a new language is genuinely needed, load its grammar in
`scripts/docs/doc-highlight.mjs` rather than writing the fence unlabelled.

**Every TypeScript fence is type-checked**, by `scripts/check-doc-snippets.mjs` under
`pnpm test:docs` ([#1918](https://github.com/tutkli/forty-cdk/issues/1918)). The fence roster is the
compiler's own — whatever `resolveFenceLanguage()` reads as TypeScript is written to a file and run
through `tsc` with the workspace `paths`, so `forty-cdk/<entry>` resolves to source and a renamed
symbol fails the gate at the document and line the fence sits on. Inline templates are not checked;
imports and symbol names are, which is the drift the corpus actually produced. Two shapes opt out,
each with an HTML comment on the line above the fence (a blank line between the two is fine, Prettier
inserts one): `<!-- snippet: fragment -->` for a fence that is deliberately not a whole module — a
lone class member, a `providers: […]` array, a call on `this.` — which is never compiled; and
`<!-- snippet: expect-error -->` for a fence that makes its point by failing, which the gate then
requires to fail. A marker above anything other than a TypeScript fence is an error, so a stale one
cannot linger, and the run reports how many fences carry each marker so a sweep can be reviewed.
Prefer a fence that compiles: a snippet complete enough to paste is worth the two import lines.

The page chrome itself dogfoods the library: **Drawer** for the mobile nav, **Combobox** for ⌘K
search, **Switch** for the theme toggle, **Toast** for copy-to-clipboard feedback, **Tabs** for each
demo's Preview / Code pair, **Popover** for an API row's detail, **Tooltip** for the inline hints,
**Select** for the demo controls and **Scroll Area** for the sidebar. The top nav is plain anchors
and the sidebar is a plain list — Navigation Menu, Tree and Breadcrumbs are not on the site, and
this list is the set of primitives it actually imports.

## Per-archetype required-section checklist

Use this when auditing a README. Each line is a set rather than a sequence: a document declaring
two archetypes owes the union, written in the order of the table above — which puts `## Behavior notes`
before `## Wrapping in a design system`.

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

`ALIAS_EXEMPTIONS` is the same list for the other half: a document that keeps a retired heading
writes down why, and the entry fails the build once the heading is finally renamed. Its one entry is
Toast's `## Declarative usage`, and the reason is the Examples row above: the site replaces a
declared `## Examples` body with the live demos, so renaming that section would unpublish the
snippet it holds. The canonical heading becomes available the day the snippet is a live example of
its own.

## Metadata: where structured fields live

In the README's frontmatter, and nowhere else. `projects/forty-cdk-docs/src/app/primitives.ts`
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
