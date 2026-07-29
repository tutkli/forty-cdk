/**
 * The piece-registration surfaces: per entry point, the symbols that carry how a
 * primitive's pieces wire themselves into their root ([#1399]).
 *
 * A primitive's `FOR_<PRIMITIVE>_CONTEXT` interface is public — advanced
 * consumers legitimately inject it to read state or drive commands. The
 * registration protocol behind it is not: it is the code the library refactors
 * most freely, so it lives on a second interface + token that no entry point
 * exports, and `check-registration-surfaces.mjs` fails the build if one of these
 * names becomes public again (exported from the barrel, or referenced from an
 * exported declaration's signature).
 *
 * The table's protocol is not listed here: it lives in the `forty-cdk/core`
 * internal tier (the virtualization entry point registers through it), where
 * `check-entrypoint-public-types.mjs` already enforces the same two rules.
 */
export const REGISTRATION_SURFACES = {
  accordion: ['AccordionContext', 'ACCORDION_CONTEXT', 'ForAccordionTriggerHandle'],
  carousel: [
    'CarouselContext',
    'CAROUSEL_CONTEXT',
    'ForCarouselIndicatorHandle',
    'ForCarouselSlideHandle',
    'ForCarouselViewportHandle',
  ],
  combobox: ['ComboboxContext', 'COMBOBOX_CONTEXT', 'ComboboxRegistrationContext'],
  'navigation-menu': [
    'NavigationMenuContext',
    'NAVIGATION_MENU_CONTEXT',
    'ForNavigationMenuContentHandle',
    'ForNavigationMenuTriggerHandle',
    'ForNavigationMenuViewportHandle',
  ],
  'radio-group': ['RadioGroupContext', 'RADIO_GROUP_CONTEXT', 'ForRadioHandle'],
  select: ['SelectContext', 'SELECT_CONTEXT', 'ForSelectOverlayContext'],
  tabs: ['TabsContext', 'TABS_CONTEXT', 'ForTabsContentHandle', 'ForTabsTriggerHandle'],
  toast: ['ToastContext', 'TOAST_CONTEXT', 'ForToastActionHandle', 'ForToastTextHandle'],
};
