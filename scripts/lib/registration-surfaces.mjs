/**
 * The piece-coordination surfaces: per entry point, the symbols that carry how a
 * primitive's pieces wire themselves into their root ([#1399]) and everything
 * else they read off it that a consumer has no call to touch ([#1722]).
 *
 * A primitive's `FOR_<PRIMITIVE>_CONTEXT` interface is public — advanced
 * consumers legitimately inject it to read state or drive commands. The wiring
 * behind it is not: it is the code the library refactors most freely, so it
 * lives on interfaces that no entry point exports, and
 * `check-registration-surfaces.mjs` fails the build if one of these names
 * becomes public again (exported from the barrel, or referenced from an exported
 * declaration's signature).
 *
 * The `*PieceContext` entries are the #1722 half: the members the `register*` /
 * `unregister*` / `set*` naming pattern the #1399 split searched for never
 * matched — positioning mirrors, ARIA ids, label caches, navigation cursors,
 * emit forwarders. `check-context-surfaces.mjs` is what keeps the split from
 * eroding again; this list is what keeps the moved names from coming back.
 *
 * No split root carries a second **context** token any more ([#1593]): a
 * protocol that stays inside one entry point is reached by reading the public
 * token at the internal interface's type inside `inject<Primitive>Context`, and
 * the root's own members are kept out of the emitted `.d.ts` by `private` /
 * `protected` / a narrow public type. So every name below is a type, except the
 * table def-registry's own token and registry class — a registry a scaffold
 * wrapper must be able to provide is a separate provider rather than a view of
 * a root, which is the one shape a second token is still for (see below).
 *
 * The table's piece-registration protocol is not listed here: it lives in the
 * `forty-cdk/core` internal tier (the virtualization entry point registers
 * through it), where `check-entrypoint-public-types.mjs` already enforces the
 * same two rules. Its **def**-registration protocol is listed, because that one
 * is reached only from within `forty-cdk/table` and so stays in the entry point's
 * own sources — next to the deliberately public `FOR_TABLE_DEF_REGISTRY` read
 * token a scaffold wrapper provides.
 */
export const REGISTRATION_SURFACES = {
  accordion: ['AccordionContext', 'ForAccordionTriggerHandle'],
  avatar: ['AvatarContext', 'AvatarPieceContext'],
  carousel: [
    'CarouselContext',
    'CarouselPieceContext',
    'ForCarouselIndicatorHandle',
    'ForCarouselSlideHandle',
    'ForCarouselViewportHandle',
  ],
  combobox: ['ComboboxContext', 'ComboboxPieceContext', 'ComboboxRegistrationContext'],
  listbox: ['ListboxContext', 'ListboxPieceContext'],
  'navigation-menu': [
    'NavigationMenuContext',
    'ForNavigationMenuContentHandle',
    'ForNavigationMenuTriggerHandle',
    'ForNavigationMenuViewportHandle',
  ],
  'radio-group': ['RadioGroupContext', 'ForRadioHandle'],
  select: ['SelectContext', 'SelectPieceContext', 'ForSelectOverlayContext'],
  table: [
    'TableContext',
    'TablePieceContext',
    'TableDefRegistration',
    'TABLE_DEF_REGISTRATION',
    'TableDefHandle',
    'TableDefRegistry',
  ],
  tabs: ['TabsContext', 'ForTabsContentHandle', 'ForTabsTriggerHandle'],
  toast: ['ToastContext', 'ForToastActionHandle', 'ForToastTextHandle'],
};
