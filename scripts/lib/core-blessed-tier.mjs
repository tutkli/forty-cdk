export const CORE_PUBLISHERS = {
  shared: [
    'accessibleTextContent',
    'assertTimeCapable',
    'DateRange',
    'DateSegmentType',
    'DragPreview',
    'ElementBox',
    'FieldGranularity',
    'FieldSegment',
    'FloatingAlign',
    'FloatingFallbackAxisSideDirection',
    'FloatingSide',
    'FOR_FIELDSET_CONTEXT',
    'FOR_ID_SALT',
    'FOR_MENU_CONTEXT',
    'ForFieldsetContext',
    'ForMenuCloseReason',
    'ForMenuContext',
    'ForMenuItemHandle',
    'HostRovingItemHandle',
    'injectDateAdapter',
    'isUnset',
    'ListboxOverlayContext',
    'ListNavigationAction',
    'LocalizableText',
    'MenuActivationModality',
    'MenuOpenerPositioning',
    'MenuSiblingNavigator',
    'Point',
    'provideForIdSalt',
    'RovingTabindex',
    'SegmentEditorContext',
    'SegmentEditorDelegate',
    'SegmentHandle',
    'SegmentType',
    'SwipeDirection',
    'SwipeEventDetail',
    'TimeGranularity',
    'TimeSegmentType',
    'Unset',
    'VetoableEvent',
    'VetoableNativeEvent',
    'WritingDirection',
  ],
  breakpoints: ['injectPrefersReducedMotion'],
  drawer: ['ForDrawerSide'],
  field: [
    'FieldControlHandle',
    'FieldValidationError',
    'FOR_FIELD_ANCHOR_CONTEXT',
    'FOR_FIELD_CONTEXT',
    'ForFieldAnchorContext',
    'ForFieldContext',
    'injectFieldWiring',
  ],
  'visually-hidden': ['ForVisuallyHidden', 'LiveAnnouncer'],
};

export const SHARED_ENTRY_POINT = 'shared';

export const CORE_SYMBOL_PUBLISHER = new Map(
  Object.entries(CORE_PUBLISHERS).flatMap(([entry, symbols]) =>
    symbols.map((symbol) => [symbol, entry]),
  ),
);

export const BLESSED_CORE_SYMBOLS = new Set(CORE_SYMBOL_PUBLISHER.keys());

export const INTERNAL_TIER_ENTRY_POINTS = new Set(['core', 'core-overlay']);
