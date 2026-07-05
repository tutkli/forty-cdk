import { signal } from '@angular/core';

import type { VetoableNativeEvent } from '../vetoable-event/vetoable-event';
import { buildOutsideVetoOptions } from './outside-veto';

function pointerEvent(): PointerEvent {
  return new PointerEvent('pointerdown', { bubbles: true, cancelable: true });
}

function focusEvent(): FocusEvent {
  return new FocusEvent('focusin', { bubbles: true });
}

describe('buildOutsideVetoOptions', () => {
  it('shares one veto object across pointerDownOutside and the composite interactOutside', () => {
    const pointerVetoes: Array<VetoableNativeEvent<PointerEvent>> = [];
    const interactVetoes: Array<VetoableNativeEvent<PointerEvent | FocusEvent>> = [];
    const reasons: string[] = [];

    const options = buildOutsideVetoOptions({
      dismissible: signal(true),
      requestClose: (reason) => reasons.push(reason),
      emitPointerDownOutside: (veto) => pointerVetoes.push(veto),
      emitInteractOutside: (veto) => interactVetoes.push(veto),
    });

    const event = pointerEvent();
    options.onPointerDownOutside!(event);
    options.onInteractOutside!(event);

    expect(pointerVetoes).toHaveLength(1);
    expect(interactVetoes).toHaveLength(1);
    // The SAME object instance in both channels is what makes the triple-veto
    // work: a preventDefault() on the specific call is visible to the composite.
    expect(pointerVetoes[0]).toBe(interactVetoes[0]);
    expect(reasons).toEqual(['pointerDownOutside']);
  });

  it('vetoing the shared wrapper on the specific channel blocks the composite-driven close', () => {
    const reasons: string[] = [];

    const options = buildOutsideVetoOptions({
      dismissible: signal(true),
      requestClose: (reason) => reasons.push(reason),
      emitPointerDownOutside: (veto) => veto.preventDefault(),
      emitInteractOutside: () => {},
    });

    const event = pointerEvent();
    options.onPointerDownOutside!(event);
    options.onInteractOutside!(event);

    expect(reasons).toEqual([]);
  });

  it('shares one veto across focusOutside and interactOutside with the focusOutside reason', () => {
    const focusVetoes: Array<VetoableNativeEvent<FocusEvent>> = [];
    const interactVetoes: Array<VetoableNativeEvent<PointerEvent | FocusEvent>> = [];
    const reasons: string[] = [];

    const options = buildOutsideVetoOptions({
      dismissible: signal(true),
      requestClose: (reason) => reasons.push(reason),
      emitFocusOutside: (veto) => focusVetoes.push(veto),
      emitInteractOutside: (veto) => interactVetoes.push(veto),
    });

    const event = focusEvent();
    options.onFocusOutside!(event);
    options.onInteractOutside!(event);

    expect(focusVetoes[0]).toBe(interactVetoes[0]);
    expect(reasons).toEqual(['focusOutside']);
  });

  it('falls back to a fresh veto when interactOutside fires without a prior specific channel', () => {
    const interactVetoes: Array<VetoableNativeEvent<PointerEvent | FocusEvent>> = [];
    const reasons: string[] = [];

    const options = buildOutsideVetoOptions({
      dismissible: signal(true),
      requestClose: (reason) => reasons.push(reason),
      emitInteractOutside: (veto) => interactVetoes.push(veto),
    });

    options.onInteractOutside!(pointerEvent());

    expect(interactVetoes).toHaveLength(1);
    expect(reasons).toEqual(['pointerDownOutside']);
  });

  it('does not requestClose when dismissible() is false', () => {
    const reasons: string[] = [];

    const options = buildOutsideVetoOptions({
      dismissible: signal(false),
      requestClose: (reason) => reasons.push(reason),
      emitInteractOutside: () => {},
    });

    options.onInteractOutside!(pointerEvent());

    expect(reasons).toEqual([]);
  });

  it('registers a channel only when its emitter is provided', () => {
    const options = buildOutsideVetoOptions({
      dismissible: signal(true),
      requestClose: () => {},
      emitInteractOutside: () => {},
    });

    expect(options.onPointerDownOutside).toBeUndefined();
    expect(options.onFocusOutside).toBeUndefined();
    expect(typeof options.onInteractOutside).toBe('function');
  });

  it('does not close when requestClose is omitted even if dismissible() is true', () => {
    const interactVetoes: Array<VetoableNativeEvent<PointerEvent | FocusEvent>> = [];

    const options = buildOutsideVetoOptions({
      dismissible: signal(true),
      emitInteractOutside: (veto) => interactVetoes.push(veto),
    });

    expect(() => options.onInteractOutside!(pointerEvent())).not.toThrow();
    expect(interactVetoes).toHaveLength(1);
  });
});
