import { Component, output, type OutputEmitterRef, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  createVetoableEvent,
  createVetoableNativeEvent,
  emitVetoableEvent,
  emitVetoableNativeEvent,
  type VetoableEvent,
  type VetoableNativeEvent,
} from './vetoable-event';

@Component({ template: '' })
class EmitterHost {
  readonly plain = output<VetoableEvent>();
  readonly native = output<VetoableNativeEvent<KeyboardEvent>>();
}

function createEmitters(): EmitterHost {
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  return TestBed.createComponent(EmitterHost).componentInstance;
}

describe('createVetoableEvent', () => {
  it('starts not prevented', () => {
    expect(createVetoableEvent().defaultPrevented).toBe(false);
  });

  it('flips defaultPrevented after preventDefault()', () => {
    const veto = createVetoableEvent();
    veto.preventDefault();
    expect(veto.defaultPrevented).toBe(true);
  });

  it('stays prevented on repeat preventDefault() calls', () => {
    const veto = createVetoableEvent();
    veto.preventDefault();
    veto.preventDefault();
    expect(veto.defaultPrevented).toBe(true);
  });
});

describe('createVetoableNativeEvent', () => {
  it('starts not prevented and exposes the wrapped event identity', () => {
    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    const veto = createVetoableNativeEvent(event);
    expect(veto.defaultPrevented).toBe(false);
    expect(veto.event).toBe(event);
  });

  it('flips defaultPrevented after preventDefault() while keeping the event identity', () => {
    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    const veto = createVetoableNativeEvent(event);
    veto.preventDefault();
    expect(veto.defaultPrevented).toBe(true);
    expect(veto.event).toBe(event);
  });

  it('stays prevented on repeat preventDefault() calls', () => {
    const veto = createVetoableNativeEvent(new MouseEvent('pointerdown'));
    veto.preventDefault();
    veto.preventDefault();
    expect(veto.defaultPrevented).toBe(true);
  });
});

describe('emitVetoableEvent', () => {
  it('returns false when no subscriber vetoes', () => {
    const host = createEmitters();
    expect(emitVetoableEvent(host.plain)).toBe(false);
  });

  it('returns false when a subscriber observes but does not veto', () => {
    const host = createEmitters();
    let seen: VetoableEvent | null = null;
    host.plain.subscribe((event) => {
      seen = event;
    });
    expect(emitVetoableEvent(host.plain)).toBe(false);
    expect(seen).not.toBe(null);
  });

  it('returns true when a subscriber calls preventDefault()', () => {
    const host = createEmitters();
    host.plain.subscribe((event) => event.preventDefault());
    expect(emitVetoableEvent(host.plain)).toBe(true);
  });
});

describe('emitVetoableNativeEvent', () => {
  it('returns false when no subscriber vetoes', () => {
    const host = createEmitters();
    expect(emitVetoableNativeEvent(host.native, new KeyboardEvent('keydown'))).toBe(false);
  });

  it('passes the wrapped native event to the subscriber', () => {
    const host = createEmitters();
    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    let received: KeyboardEvent | null = null;
    host.native.subscribe((veto) => {
      received = veto.event;
    });
    emitVetoableNativeEvent(host.native, event);
    expect(received).toBe(event);
  });

  it('returns true when a subscriber calls preventDefault()', () => {
    const host = createEmitters();
    host.native.subscribe((veto) => veto.preventDefault());
    expect(emitVetoableNativeEvent(host.native, new KeyboardEvent('keydown'))).toBe(true);
  });
});
