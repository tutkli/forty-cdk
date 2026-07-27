export const CORE_PUBLISHERS = {
  shared: [
    'assertTimeCapable',
    'DateAdapter',
    'DateRange',
    'DateSegmentType',
    'DragPreview',
    'ElementBox',
    'FieldGranularity',
    'FieldSegment',
    'FloatingAlign',
    'FloatingFallbackAxisSideDirection',
    'FloatingSide',
    'FOR_DATE_ADAPTER',
    'FOR_FIELDSET_CONTEXT',
    'FOR_ID_SALT',
    'FOR_MENU_CONTEXT',
    'ForFieldsetContext',
    'ForMenuCloseReason',
    'ForMenuContext',
    'ForMenuItemHandle',
    'HostRovingItemHandle',
    'injectDateAdapter',
    'ListboxOverlayContext',
    'ListNavigationAction',
    'MenuActivationModality',
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
    'TimeCapableDateAdapter',
    'TimeGranularity',
    'TimeSegmentType',
    'VetoableEvent',
    'VetoableNativeEvent',
    'WritingDirection',
  ],
  drawer: ['ForDrawerSide'],
  field: ['FieldControlHandle', 'FOR_FIELD_CONTEXT', 'ForFieldContext', 'injectFieldWiring'],
  'visually-hidden': ['ForVisuallyHidden'],
};

export const SHARED_ENTRY_POINT = 'shared';

export const CORE_SYMBOL_PUBLISHER = new Map(
  Object.entries(CORE_PUBLISHERS).flatMap(([entry, symbols]) =>
    symbols.map((symbol) => [symbol, entry]),
  ),
);

export const BLESSED_CORE_SYMBOLS = new Set(CORE_SYMBOL_PUBLISHER.keys());
