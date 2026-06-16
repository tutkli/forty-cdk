import { computed, inject, InjectionToken, type ModelSignal, type Signal } from '@angular/core';
import type { ReferenceElement } from '@floating-ui/dom';

import type { CollectionHandle } from '../_internal/collection/collection';
import type { FloatingAlign, FloatingSide } from '../_internal/floating/floating';
import type {
  ListNavigationAction,
  WritingDirection,
} from '../_internal/keyboard-navigation/keyboard-navigation';
import type { VetoableNativeEvent } from '../_internal/vetoable-event/vetoable-event';
import type { ForTimeSlot, TimePickerGranularity } from './build-time-slots';

/**
 * Why a time picker requested close.
 */
export type ForTimePickerCloseReason =
  | 'escape'
  | 'pointerDownOutside'
  | 'focusOutside'
  | 'select'
  | 'tab'
  | 'programmatic';

/**
 * Where focus lands when the listbox opens.
 * `'selected'` snaps to the selected slot (or first enabled if none selected).
 */
export type ForTimePickerInitialFocus = 'first' | 'last' | 'selected';

/**
 * Handle every `[forTimePickerOption]` registers with the root.
 */
export interface ForTimePickerOptionHandle extends CollectionHandle {
  readonly value: Signal<unknown>;
  readonly disabled: Signal<boolean>;
}

/**
 * Coordination contract owned by `[forTimePicker]`.
 *
 * @typeParam D The adapter's date-time type.
 */
export interface ForTimePickerContext<D = unknown> {
  readonly value: ModelSignal<D | null>;
  readonly open: ModelSignal<boolean>;
  readonly effectiveDisabled: Signal<boolean>;
  readonly readonly: Signal<boolean>;
  readonly required: Signal<boolean>;
  readonly invalid: Signal<boolean>;
  readonly pending: Signal<boolean>;
  readonly modal: Signal<boolean>;
  readonly dismissible: Signal<boolean>;
  readonly returnFocus: Signal<boolean>;
  readonly side: Signal<FloatingSide | undefined>;
  readonly align: Signal<FloatingAlign | undefined>;
  readonly sideOffset: Signal<number>;
  readonly alignOffset: Signal<number>;
  readonly avoidCollisions: Signal<boolean>;
  readonly collisionPadding: Signal<number>;
  readonly arrowPadding: Signal<number>;
  readonly sticky: Signal<'partial' | 'always' | false>;
  readonly hideWhenDetached: Signal<boolean>;
  readonly clipUntilPositioned: Signal<boolean>;
  readonly loop: Signal<boolean>;
  readonly orientation: Signal<'horizontal' | 'vertical'>;
  readonly dir: Signal<WritingDirection>;
  readonly placeholder: Signal<string>;
  readonly granularity: Signal<TimePickerGranularity>;
  readonly formattedValue: Signal<string | null>;
  readonly triggerId: Signal<string>;
  readonly contentId: Signal<string>;
  readonly ariaLabel: Signal<string | null>;
  readonly initialFocus: Signal<ForTimePickerInitialFocus>;
  setInitialFocus(target: ForTimePickerInitialFocus): void;
  readonly lastCloseReason: Signal<ForTimePickerCloseReason | null>;
  readonly anchor: Signal<ReferenceElement | null>;
  readonly trigger: Signal<HTMLElement | null>;
  registerTrigger(el: HTMLElement): void;
  unregisterTrigger(el: HTMLElement): void;
  readonly content: Signal<HTMLElement | null>;
  registerContent(el: HTMLElement): void;
  unregisterContent(el: HTMLElement): void;
  registerOption(handle: ForTimePickerOptionHandle): void;
  unregisterOption(handle: ForTimePickerOptionHandle): void;
  readonly options: Signal<readonly ForTimePickerOptionHandle[]>;
  readonly slots: Signal<readonly ForTimeSlot<D>[]>;
  isSelected(value: D): boolean;
  activate(value: D): void;
  navigate(currentOption: HTMLElement, action: ListNavigationAction): void;
  focusFirstEnabledOption(): boolean;
  focusLastEnabledOption(): boolean;
  focusSelectedOption(): boolean;
  toggle(initialFocus?: ForTimePickerInitialFocus): void;
  openMenu(initialFocus?: ForTimePickerInitialFocus): void;
  closeMenu(reason: ForTimePickerCloseReason): void;
  commitOnTab(value: D): void;
  emitEscapeKeyDown(event: KeyboardEvent): void;
  emitPointerDownOutside(veto: VetoableNativeEvent<PointerEvent>): void;
  emitFocusOutside(veto: VetoableNativeEvent<FocusEvent>): void;
  emitInteractOutside(veto: VetoableNativeEvent<PointerEvent | FocusEvent>): void;
  requestClose(reason: 'pointerDownOutside' | 'focusOutside'): void;
  forwardEscapeKeyDown(veto: VetoableNativeEvent<KeyboardEvent>): void;
  emitAutoFocusOnOpen(): boolean;
  emitAutoFocusOnClose(): boolean;
  markTouched(): void;
}

export const FOR_TIME_PICKER_CONTEXT = new InjectionToken<ForTimePickerContext>(
  'FOR_TIME_PICKER_CONTEXT',
);

export function injectTimePickerContext<D = unknown>(piece: string): ForTimePickerContext<D> {
  const ctx = inject(FOR_TIME_PICKER_CONTEXT, { optional: true });
  if (!ctx) {
    throw new Error(
      `[forty-cdk/time-picker] ${piece} must be used inside a [forTimePicker] element. ` +
        "If it is declared inside an ng-template, DI resolves at the template's declaration site — " +
        'not where it is stamped (e.g. via ngTemplateOutlet) — so declare the template inside the ' +
        '[forTimePicker] root.',
    );
  }
  return ctx as unknown as ForTimePickerContext<D>;
}

export function injectTimePickerTriggerContext<D = unknown>(
  explicitRoot: Signal<ForTimePickerContext<D> | ''>,
): Signal<ForTimePickerContext<D>> {
  const injected = inject(FOR_TIME_PICKER_CONTEXT, { optional: true });
  return computed(() => {
    const explicit = explicitRoot();
    if (explicit !== '') {
      return explicit;
    }
    if (injected) {
      return injected as unknown as ForTimePickerContext<D>;
    }
    throw new Error(
      '[forty-cdk/time-picker] ForTimePickerTrigger could not resolve its [forTimePicker] root: ' +
        'no FOR_TIME_PICKER_CONTEXT provider is visible and no explicit root reference was passed. ' +
        "If this trigger is declared inside an ng-template, DI resolves at the template's declaration " +
        'site — not where it is stamped — so either declare the template inside the root or pass the ' +
        'root explicitly: [forTimePickerTrigger]="root" with #root="forTimePicker".',
    );
  });
}
