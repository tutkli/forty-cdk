import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { InertSiblingsStack } from './inert-siblings';

function appendChild(tag = 'div'): HTMLElement {
  const el = document.createElement(tag);
  document.body.appendChild(el);
  return el;
}

describe('InertSiblingsStack', () => {
  let stack: InertSiblingsStack;
  let cleanup: HTMLElement[] = [];

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    stack = TestBed.inject(InertSiblingsStack);
    cleanup = [];
  });

  afterEach(() => {
    for (const el of cleanup) {
      el.remove();
    }
    cleanup = [];
    TestBed.resetTestingModule();
  });

  function track(...els: HTMLElement[]): void {
    cleanup.push(...els);
  }

  it('inerts every direct child of body other than the owner', () => {
    const sibling1 = appendChild();
    const sibling2 = appendChild();
    const owner = appendChild();
    track(sibling1, sibling2, owner);

    const handle = stack.activate(owner);

    expect(sibling1.hasAttribute('inert')).toBe(true);
    expect(sibling1.getAttribute('aria-hidden')).toBe('true');
    expect(sibling2.hasAttribute('inert')).toBe(true);
    expect(sibling2.getAttribute('aria-hidden')).toBe('true');

    expect(owner.hasAttribute('inert')).toBe(false);
    expect(owner.hasAttribute('aria-hidden')).toBe(false);

    handle.deactivate();
  });

  it('clears inert + aria-hidden on deactivate when no owner remains', () => {
    const sibling = appendChild();
    const owner = appendChild();
    track(sibling, owner);

    const handle = stack.activate(owner);
    expect(sibling.hasAttribute('inert')).toBe(true);

    handle.deactivate();

    expect(sibling.hasAttribute('inert')).toBe(false);
    expect(sibling.hasAttribute('aria-hidden')).toBe(false);
  });

  it('preserves a pre-existing inert attribute when restoring', () => {
    const sibling = appendChild();
    sibling.setAttribute('inert', '');
    track(sibling);

    const owner = appendChild();
    track(owner);

    const handle = stack.activate(owner);
    expect(sibling.hasAttribute('inert')).toBe(true);

    handle.deactivate();

    expect(sibling.hasAttribute('inert')).toBe(true);
  });

  it('preserves a pre-existing aria-hidden value when restoring', () => {
    const sibling = appendChild();
    sibling.setAttribute('aria-hidden', 'false');
    track(sibling);

    const owner = appendChild();
    track(owner);

    const handle = stack.activate(owner);
    expect(sibling.getAttribute('aria-hidden')).toBe('true');

    handle.deactivate();

    expect(sibling.getAttribute('aria-hidden')).toBe('false');
  });

  it('skips elements flagged data-for-modal-peer', () => {
    const peer = appendChild();
    peer.setAttribute('data-for-modal-peer', '');
    track(peer);

    const owner = appendChild();
    track(owner);

    const handle = stack.activate(owner);

    expect(peer.hasAttribute('inert')).toBe(false);
    expect(peer.hasAttribute('aria-hidden')).toBe(false);

    handle.deactivate();
  });

  it('does not touch the owner element itself', () => {
    const owner = appendChild();
    track(owner);

    const handle = stack.activate(owner);

    expect(owner.hasAttribute('inert')).toBe(false);
    expect(owner.hasAttribute('aria-hidden')).toBe(false);

    handle.deactivate();
  });

  it('LIFO stacking: opening B inerts A; closing B unhides A', () => {
    const sibling = appendChild();
    track(sibling);

    const ownerA = appendChild();
    track(ownerA);
    const handleA = stack.activate(ownerA);
    expect(sibling.hasAttribute('inert')).toBe(true);
    expect(ownerA.hasAttribute('inert')).toBe(false);

    const ownerB = appendChild();
    track(ownerB);
    const handleB = stack.activate(ownerB);

    // B is the new topmost: A and the unrelated sibling are both inert.
    expect(ownerA.hasAttribute('inert')).toBe(true);
    expect(ownerA.getAttribute('aria-hidden')).toBe('true');
    expect(sibling.hasAttribute('inert')).toBe(true);
    expect(ownerB.hasAttribute('inert')).toBe(false);

    // Pop B → A becomes topmost again.
    handleB.deactivate();

    expect(ownerA.hasAttribute('inert')).toBe(false);
    expect(ownerA.hasAttribute('aria-hidden')).toBe(false);
    expect(sibling.hasAttribute('inert')).toBe(true);

    handleA.deactivate();
    expect(sibling.hasAttribute('inert')).toBe(false);
  });

  it('out-of-order teardown: closing A while B is on top keeps B isolated', () => {
    const sibling = appendChild();
    track(sibling);

    const ownerA = appendChild();
    track(ownerA);
    const handleA = stack.activate(ownerA);

    const ownerB = appendChild();
    track(ownerB);
    const handleB = stack.activate(ownerB);

    // Close A first (atypical, but must not break B's isolation).
    handleA.deactivate();

    expect(ownerA.hasAttribute('inert')).toBe(true);
    expect(sibling.hasAttribute('inert')).toBe(true);
    expect(ownerB.hasAttribute('inert')).toBe(false);

    handleB.deactivate();

    // Stack is empty — everything fully restored.
    expect(ownerA.hasAttribute('inert')).toBe(false);
    expect(sibling.hasAttribute('inert')).toBe(false);
    expect(ownerB.hasAttribute('inert')).toBe(false);
  });

  it('repeated deactivate is a no-op', () => {
    const sibling = appendChild();
    track(sibling);

    const owner = appendChild();
    track(owner);

    const handle = stack.activate(owner);
    expect(handle.isActive).toBe(true);

    handle.deactivate();
    expect(handle.isActive).toBe(false);
    expect(sibling.hasAttribute('inert')).toBe(false);

    expect(() => handle.deactivate()).not.toThrow();
    expect(sibling.hasAttribute('inert')).toBe(false);
  });

  it('only walks direct children of body, not deep descendants', () => {
    const wrapper = appendChild();
    const deepChild = document.createElement('span');
    wrapper.appendChild(deepChild);
    track(wrapper);

    const owner = appendChild();
    track(owner);

    const handle = stack.activate(owner);

    expect(wrapper.hasAttribute('inert')).toBe(true);
    // Inheritance handles deep descendants — we don't separately tag them.
    expect(deepChild.hasAttribute('inert')).toBe(false);

    handle.deactivate();
  });

  it('non-portaled owner: protects its body-level ancestor instead of itself', () => {
    const appShell = appendChild();
    const ownerInPlace = document.createElement('div');
    appShell.appendChild(ownerInPlace);
    const otherTopLevel = appendChild();
    track(appShell, otherTopLevel);

    const handle = stack.activate(ownerInPlace);

    // The app shell containing the dialog stays interactive...
    expect(appShell.hasAttribute('inert')).toBe(false);
    // ...while siblings of the app shell at body level are inerted.
    expect(otherTopLevel.hasAttribute('inert')).toBe(true);

    handle.deactivate();

    expect(otherTopLevel.hasAttribute('inert')).toBe(false);
  });
});
