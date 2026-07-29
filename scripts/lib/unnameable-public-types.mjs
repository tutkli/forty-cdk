/**
 * Types declared inside a stable entry point that a public exported signature
 * surfaces without the barrel re-exporting them ([#1345]).
 *
 * The supported-import-path convention ([#1180]) says a consumer can name every
 * type a public signature hands them. `check-entrypoint-public-types.mjs`
 * enforces it for types declared in `forty-cdk/core`; the same leak through a
 * type declared in the entry's own sources is what this list tracks. Each name
 * here is a known, deliberately deferred instance: the gate fails when a *new*
 * one appears, and fails just as loudly when a listed name stops leaking, so the
 * list cannot rot.
 *
 * Landing a fix means removing a name, never adding one. The two resolutions are
 * the same as for a core leak: **narrow** the leak (drop the member, mark it
 * `protected` / `private`, or retype it to a shape the consumer can name), or
 * **publish** the type (re-export it from that entry's `public-api.ts`, with
 * JSDoc that reads as consumer documentation). Which one applies per entry — and
 * why each of these is deferred rather than fixed — is recorded in the core tier
 * section of `.claude/rules/conventions.md`.
 *
 * The nine registration handles (accordion, carousel, radio-group, tabs, toast)
 * leave together with the [#1399] context split that removes the `register*`
 * members surfacing them, tracked by [#1524] — never by a re-export.
 */
export const UNNAMEABLE_PUBLIC_TYPES = {
  accordion: ['ForAccordionTriggerHandle'],
  carousel: ['ForCarouselIndicatorHandle', 'ForCarouselSlideHandle', 'ForCarouselViewportHandle'],
  dialog: ['ForDialogEntry'],
  drawer: ['ForDrawerEntry'],
  menubar: ['MenubarMenuContext', 'MenubarMenuHost', 'MenubarPositioningSeeds'],
  'radio-group': ['ForRadioHandle'],
  table: ['ForTableRowContext'],
  tabs: ['ForTabsContentHandle', 'ForTabsTriggerHandle'],
  toast: ['ForToastActionHandle', 'ForToastTextHandle'],
};
