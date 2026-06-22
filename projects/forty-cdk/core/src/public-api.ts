/*
 * Internal shared surface of forty-cdk — the `forty-cdk/core` entry point.
 *
 * This entry point holds everything formerly under `src/lib/_internal/`: the
 * cross-primitive DI singletons (`LiveAnnouncer`, focus-trap / dismissable-layer
 * / inert-siblings / drawer stacks, the id-generator salt, the defaults
 * registry), the framework-free geometry / interaction / overlay helpers, and
 * the cross-cutting public tokens.
 *
 * It exists so that every primitive entry point can import the shared core by
 * the `forty-cdk/core` specifier and the bundler compiles it exactly ONCE —
 * never duplicated per primitive, which would split the DI singletons into
 * multiple instances and break cross-primitive coordination.
 *
 * Stability: the symbols re-exported here carry NO semver guarantees. They are
 * an internal composition surface shared between forty-cdk's own entry points,
 * not a supported public API. Consume primitives from their own
 * `forty-cdk/<primitive>` entry points (or the main `forty-cdk` barrel), not
 * from here.
 */

export * from './body-scroll-lock/body-scroll-lock';
export * from './class-list/resolve-config-class';
export * from './collection/collection';
export * from './collection/first-enabled-host';
export * from './collection/fold-snapshot';
export * from './collection/register-handle';
export * from './date-adapter/date-adapter';
export * from './datetime/hour-cycle';
export * from './datetime/literal-directive';
export * from './datetime/segment-directive';
export * from './datetime/segment-editor';
export * from './datetime/segment-types';
export * from './datetime/serialize';
export * from './datetime/time-value-source';
export * from './defaults/defaults';
export * from './disabled-reflection/disabled-reflection';
export * from './dismissable-layer/dismissable-layer';
export * from './drag-session/auto-scroll';
export * from './drag-session/clamp-preview';
export * from './drag-session/drag-geometry';
export * from './drag-session/drag-positions';
export * from './drag-session/drag-preview';
export * from './drag-session/flip';
export * from './drag-session/keyboard-drag-keys';
export * from './drag-session/keyboard-drag-mediator';
export * from './drag-session/placeholder-position';
export * from './drag-session/pointer-session';
export * from './drag-session/preview-controller';
export * from './drag-session/tree-drop-resolver';
export * from './drawer-scale/drawer-scale-coordinator';
export * from './drawer-stack/drawer-side';
export * from './drawer-stack/drawer-stack';
export * from './element-size/element-size';
export * from './field/field-wiring';
export * from './fieldset/fieldset-context';
export * from './flat-hierarchy/flat-hierarchy';
export * from './floating/anchored-positioning-inputs';
export * from './floating/floating';
export * from './focusable-content/focusable-content';
export * from './form-ui-control/form-ui-control-base';
export * from './form-ui-control/unfocused-value-mirror';
export * from './form-ui-control/text-value-control-base';
export * from './hidden-input/hidden-input';
export * from './host-id/host-id';
export * from './hover-intent/debounced-action';
export * from './hover-intent/force-close-when-disabled';
export * from './hover-intent/hover-intent';
export * from './hover-intent/skip-delay-coordinator';
export * from './id-generator/id-generator';
export * from './inert-siblings/inert-siblings';
export * from './interactions/focus-visible';
export * from './interactions/hovered';
export * from './interactions/pressed';
export * from './keyboard-navigation/keyboard-navigation';
export * from './keyboard-navigation/move-in-collection';
export * from './listbox-overlay/listbox-overlay-controller';
export * from './live-announcer/live-announcer';
export * from './locale-number/locale-number';
export * from './media-query/media-query';
export * from './menu-overlay/menu-context';
export * from './menu-overlay/menu-focus-state';
export * from './menu-overlay/menu-item-list';
export * from './menu-overlay/menu-overlay';
export * from './menu-overlay/menu-overlay-host';
export * from './menu-overlay/menu-positioning-inputs';
export * from './modal-shell/modal-shell';
export * from './numeric-step/numeric-step';
export * from './overlay-manager/overlay-context-injector';
export * from './overlay-manager/overlay-manager';
export * from './overlay-manager/overlay-ref';
export * from './overlay-shell/overlay-shell';
export * from './pausable/pause-controller';
export * from './pointer-grace/pointer-grace';
export * from './pointer-suppression/pointer-suppression';
export * from './portal/portal';
export * from './resize-geometry/resize-geometry';
export * from './roving-tabindex/host-roving-context';
export * from './roving-tabindex/reconcile-roving-active';
export * from './roving-tabindex/roving-tabindex';
export * from './scroll-boundary/scroll-boundary';
export * from './selection-model/selection-model';
export * from './selection/selection';
export * from './signal-graph/read-handle';
export * from './snap-points/snap-points';
export * from './swipe-dismiss/swipe-dismiss';
export * from './text-direction/text-direction';
export * from './typeahead/match-options';
export * from './typeahead/typeahead';
export * from './vetoable-event/vetoable-event';
export * from './virtualized-navigator/virtualized-navigator';
export * from './visually-hidden/visually-hidden';
export * from './window-index-map/window-index-map';
