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
 * tokens of registries that are separate providers rather than views of a root,
 * which is the one shape a second token is still for: the table def-registry's
 * own token and registry class, which a scaffold wrapper must be able to
 * provide (see below), and the `*_TRIGGERS` registries a root derives its
 * trigger from, which a trigger reaches whether its root came through DI or
 * through its own input ([#2399]).
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
  calendar: ['CalendarContext', 'CalendarPieceContext'],
  carousel: [
    'CarouselContext',
    'CarouselPieceContext',
    'ForCarouselIndicatorHandle',
    'ForCarouselSlideHandle',
    'ForCarouselViewportHandle',
  ],
  combobox: [
    'ComboboxContext',
    'ComboboxPieceContext',
    'ComboboxRegistrationContext',
    'ComboboxVirtualization',
    'ComboboxVirtualizationHost',
  ],
  'context-menu': ['ContextMenuContext', 'ContextMenuPieceContext'],
  'date-picker': ['DatePickerContext', 'DATE_PICKER_TRIGGERS'],
  dialog: ['DialogContext', 'DialogRegistrationContext'],
  'drag-drop': ['DraggableContext', 'DraggablePieceContext'],
  drawer: ['DrawerContext', 'DrawerRegistrationContext'],
  'hover-card': [
    'HoverCardContext',
    'HoverCardPieceContext',
    'HoverCardTriggerHandle',
    'HOVER_CARD_TRIGGERS',
  ],
  listbox: [
    'ListboxContext',
    'ListboxPieceContext',
    'ListboxRegistrationContext',
    'ListboxVirtualization',
    'ListboxVirtualizationHost',
  ],
  'navigation-menu': [
    'NavigationMenuContext',
    'ForNavigationMenuContentHandle',
    'ForNavigationMenuTriggerHandle',
    'ForNavigationMenuViewportHandle',
  ],
  popover: [
    'PopoverContext',
    'PopoverPieceContext',
    'PopoverRegistrationContext',
    'POPOVER_TRIGGERS',
  ],
  'radio-group': ['RadioGroupContext', 'ForRadioHandle'],
  'scroll-area': ['ScrollAreaContext', 'ScrollAreaRegistrationContext'],
  select: [
    'SelectContext',
    'SelectPieceContext',
    'ForSelectOverlayContext',
    'ForSelectOptionHandle',
    'SelectVirtualization',
    'SelectVirtualizationHost',
  ],
  stepper: ['StepperContext', 'StepperPieceContext'],
  table: [
    'TableContext',
    'TablePieceContext',
    'TableDefRegistration',
    'TABLE_DEF_REGISTRATION',
    'TableDefHandle',
    'TableDefRegistry',
  ],
  tabs: ['TabsContext', 'ForTabsContentHandle', 'ForTabsTriggerHandle'],
  'time-picker': ['TimePickerContext', 'TimePickerPieceContext', 'TimePickerOverlayContext'],
  toast: ['ToastContext', 'ForToastActionHandle', 'ForToastTextHandle'],
  tooltip: ['TooltipContext', 'TooltipPieceContext', 'TOOLTIP_TRIGGERS'],
  tree: ['TreeContext', 'TreePieceContext', 'TreeVirtualization', 'TreeVirtualizationHost'],
  virtualization: ['VirtualViewportContext'],
};
