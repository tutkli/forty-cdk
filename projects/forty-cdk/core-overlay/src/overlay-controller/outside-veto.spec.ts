import { signal } from '@angular/core';

import { type VetoableNativeEvent } from 'forty-cdk/core';
import { buildOutsideVetoOptions, outsideVetoChannels } from './outside-veto';

function pointerEvent(): PointerEvent {
  return new PointerEvent('pointerdown', { bubbles: true, cancelable: true });
}

function focusEvent(): FocusEvent {
  return new FocusEvent('focusin', { bubbles: true });
}

describe('buildOutsideVetoOptions', () => {
  it('shares one veto object across the specific pointerDownOutside and composite interactOutside emitters', () => {
    const pointerVetoes: Array<VetoableNativeEvent<PointerEvent>> = [];
    const interactVetoes: Array<VetoableNativeEvent<PointerEvent | FocusEvent>> = [];
    const reasons: string[] = [];

    const options = buildOutsideVetoOptions({
      dismissible: signal(true),
      requestClose: (reason) => reasons.push(reason),
      emitPointerDownOutside: (veto) => pointerVetoes.push(veto),
      emitInteractOutside: (veto) => interactVetoes.push(veto),
    });

    options.onPointerDownOutside!(pointerEvent());

    expect(pointerVetoes).toHaveLength(1);
    expect(interactVetoes).toHaveLength(1);
    expect(pointerVetoes[0]).toBe(interactVetoes[0]);
    expect(reasons).toEqual(['pointerDownOutside']);
  });

  it('does not close when the specific pointer emitter vetoes', () => {
    const reasons: string[] = [];

    const options = buildOutsideVetoOptions({
      dismissible: signal(true),
      requestClose: (reason) => reasons.push(reason),
      emitPointerDownOutside: (veto) => veto.preventDefault(),
      emitInteractOutside: () => {},
    });

    options.onPointerDownOutside!(pointerEvent());

    expect(reasons).toEqual([]);
  });

  it('does not close when the composite emitter vetoes while the specific channel is wired', () => {
    const reasons: string[] = [];

    const options = buildOutsideVetoOptions({
      dismissible: signal(true),
      requestClose: (reason) => reasons.push(reason),
      emitPointerDownOutside: () => {},
      emitInteractOutside: (veto) => veto.preventDefault(),
    });

    options.onPointerDownOutside!(pointerEvent());

    expect(reasons).toEqual([]);
  });

  it('shares one veto across the focusOutside and interactOutside emitters with the focusOutside reason', () => {
    const focusVetoes: Array<VetoableNativeEvent<FocusEvent>> = [];
    const interactVetoes: Array<VetoableNativeEvent<PointerEvent | FocusEvent>> = [];
    const reasons: string[] = [];

    const options = buildOutsideVetoOptions({
      dismissible: signal(true),
      requestClose: (reason) => reasons.push(reason),
      emitFocusOutside: (veto) => focusVetoes.push(veto),
      emitInteractOutside: (veto) => interactVetoes.push(veto),
    });

    options.onFocusOutside!(focusEvent());

    expect(focusVetoes[0]).toBe(interactVetoes[0]);
    expect(reasons).toEqual(['focusOutside']);
  });

  it('closes on both pointer and focus for an interact-only wiring', () => {
    const interactVetoes: Array<VetoableNativeEvent<PointerEvent | FocusEvent>> = [];
    const reasons: string[] = [];

    const options = buildOutsideVetoOptions({
      dismissible: signal(true),
      requestClose: (reason) => reasons.push(reason),
      emitInteractOutside: (veto) => interactVetoes.push(veto),
    });

    options.onPointerDownOutside!(pointerEvent());
    options.onFocusOutside!(focusEvent());

    expect(interactVetoes).toHaveLength(2);
    expect(reasons).toEqual(['pointerDownOutside', 'focusOutside']);
  });

  it('closes a pointer channel wired without the composite interactOutside emitter', () => {
    const reasons: string[] = [];

    const options = buildOutsideVetoOptions({
      dismissible: signal(true),
      requestClose: (reason) => reasons.push(reason),
      emitPointerDownOutside: () => {},
    });

    options.onPointerDownOutside!(pointerEvent());

    expect(reasons).toEqual(['pointerDownOutside']);
  });

  it('closes a focus channel wired without the composite interactOutside emitter', () => {
    const reasons: string[] = [];

    const options = buildOutsideVetoOptions({
      dismissible: signal(true),
      requestClose: (reason) => reasons.push(reason),
      emitFocusOutside: () => {},
    });

    options.onFocusOutside!(focusEvent());

    expect(reasons).toEqual(['focusOutside']);
  });

  it('does not requestClose when dismissible() is false', () => {
    const reasons: string[] = [];

    const options = buildOutsideVetoOptions({
      dismissible: signal(false),
      requestClose: (reason) => reasons.push(reason),
      emitInteractOutside: () => {},
    });

    options.onPointerDownOutside!(pointerEvent());

    expect(reasons).toEqual([]);
  });

  it('registers both outside handlers for an interact-only wiring', () => {
    const options = buildOutsideVetoOptions({
      dismissible: signal(true),
      requestClose: () => {},
      emitInteractOutside: () => {},
    });

    expect(typeof options.onPointerDownOutside).toBe('function');
    expect(typeof options.onFocusOutside).toBe('function');
  });

  it('registers only the pointer handler when the specific pointer channel alone is wired', () => {
    const options = buildOutsideVetoOptions({
      emitPointerDownOutside: () => {},
    });

    expect(typeof options.onPointerDownOutside).toBe('function');
    expect(options.onFocusOutside).toBeUndefined();
  });

  it('does not close when requestClose is omitted even if dismissible() is true', () => {
    const interactVetoes: Array<VetoableNativeEvent<PointerEvent | FocusEvent>> = [];

    const options = buildOutsideVetoOptions({
      dismissible: signal(true),
      emitInteractOutside: (veto) => interactVetoes.push(veto),
    });

    expect(() => options.onPointerDownOutside!(pointerEvent())).not.toThrow();
    expect(interactVetoes).toHaveLength(1);
  });
});

describe('outsideVetoChannels', () => {
  it('declares both channels when the composite interactOutside is wired', () => {
    expect(outsideVetoChannels({ emitInteractOutside: () => {} })).toEqual(['pointer', 'focus']);
  });

  it('declares only pointer when the specific pointer channel alone is wired', () => {
    expect(outsideVetoChannels({ emitPointerDownOutside: () => {} })).toEqual(['pointer']);
  });

  it('declares only focus when the specific focus channel alone is wired', () => {
    expect(outsideVetoChannels({ emitFocusOutside: () => {} })).toEqual(['focus']);
  });

  it('declares no channels for an Escape-only surface that forwards nothing outside', () => {
    expect(outsideVetoChannels({ dismissible: signal(true), requestClose: () => {} })).toEqual([]);
  });
});
