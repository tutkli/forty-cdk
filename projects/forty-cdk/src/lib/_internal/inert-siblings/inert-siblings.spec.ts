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

  it('inerts a sibling appended to body while an owner is active', async () => {
    const sibling1 = appendChild();
    const sibling2 = appendChild();
    const owner = appendChild();
    track(sibling1, sibling2, owner);

    const handle = stack.activate(owner);

    expect(sibling1.hasAttribute('inert')).toBe(true);
    expect(sibling2.hasAttribute('inert')).toBe(true);

    const lateSibling = appendChild();
    track(lateSibling);

    await Promise.resolve();

    expect(lateSibling.hasAttribute('inert')).toBe(true);
    expect(lateSibling.getAttribute('aria-hidden')).toBe('true');
    expect(owner.hasAttribute('inert')).toBe(false);

    handle.deactivate();

    expect(sibling1.hasAttribute('inert')).toBe(false);
    expect(sibling1.hasAttribute('aria-hidden')).toBe(false);
    expect(lateSibling.hasAttribute('inert')).toBe(false);
    expect(lateSibling.hasAttribute('aria-hidden')).toBe(false);
  });

  it('does not inert a late sibling flagged data-for-modal-peer (overlay opened inside the modal)', async () => {
    const owner = appendChild();
    track(owner);

    const handle = stack.activate(owner);

    // An anchored overlay (Select / DropdownMenu) opened from inside the modal
    // portals its content to body *after* the modal opened, but marks itself a
    // peer first — the observer must leave it interactive, unlike a toast.
    const overlay = appendChild();
    overlay.setAttribute('data-for-modal-peer', '');
    track(overlay);

    // A toast portaled from background context the same way carries no peer
    // marker, so the observer still inerts it (#388 stays green).
    const toast = appendChild();
    track(toast);

    await Promise.resolve();

    expect(overlay.hasAttribute('inert')).toBe(false);
    expect(overlay.hasAttribute('aria-hidden')).toBe(false);
    expect(toast.hasAttribute('inert')).toBe(true);
    expect(toast.getAttribute('aria-hidden')).toBe('true');

    handle.deactivate();
  });

  it('stops inerting late siblings once the stack empties', async () => {
    const owner = appendChild();
    track(owner);

    const handle = stack.activate(owner);
    handle.deactivate();

    const lateSibling = appendChild();
    track(lateSibling);

    await Promise.resolve();

    expect(lateSibling.hasAttribute('inert')).toBe(false);
    expect(lateSibling.hasAttribute('aria-hidden')).toBe(false);
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

  describe('container-scoped (region) modal', () => {
    let container: HTMLElement;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
      cleanup.push(container);
    });

    it('inerts only the container children; a body-level sibling stays interactive', () => {
      const sibInContainer = document.createElement('div');
      container.appendChild(sibInContainer);

      const owner = document.createElement('div');
      container.appendChild(owner);

      const sibBody = appendChild();
      track(sibBody);

      const handle = stack.activate(owner, container);

      expect(sibInContainer.hasAttribute('inert')).toBe(true);
      expect(sibInContainer.getAttribute('aria-hidden')).toBe('true');
      expect(owner.hasAttribute('inert')).toBe(false);
      expect(container.hasAttribute('inert')).toBe(false);
      expect(sibBody.hasAttribute('inert')).toBe(false);
      expect(sibBody.hasAttribute('aria-hidden')).toBe(false);

      handle.deactivate();
    });

    it('restores the container child on deactivate', () => {
      const sib = document.createElement('div');
      container.appendChild(sib);

      const owner = document.createElement('div');
      container.appendChild(owner);

      const handle = stack.activate(owner, container);
      expect(sib.hasAttribute('inert')).toBe(true);

      handle.deactivate();

      expect(sib.hasAttribute('inert')).toBe(false);
      expect(sib.hasAttribute('aria-hidden')).toBe(false);
    });

    it('LIFO within the same container: second owner inerts the first; pop restores', () => {
      const sib = document.createElement('div');
      container.appendChild(sib);

      const ownerA = document.createElement('div');
      container.appendChild(ownerA);
      const handleA = stack.activate(ownerA, container);

      expect(sib.hasAttribute('inert')).toBe(true);
      expect(ownerA.hasAttribute('inert')).toBe(false);

      const ownerB = document.createElement('div');
      container.appendChild(ownerB);
      const handleB = stack.activate(ownerB, container);

      expect(ownerA.hasAttribute('inert')).toBe(true);
      expect(ownerA.getAttribute('aria-hidden')).toBe('true');
      expect(ownerB.hasAttribute('inert')).toBe(false);

      handleB.deactivate();

      expect(ownerA.hasAttribute('inert')).toBe(false);
      expect(ownerA.hasAttribute('aria-hidden')).toBe(false);
      expect(sib.hasAttribute('inert')).toBe(true);

      handleA.deactivate();
      expect(sib.hasAttribute('inert')).toBe(false);
    });

    it('skips a container child flagged data-for-modal-peer', () => {
      const peer = document.createElement('div');
      peer.setAttribute('data-for-modal-peer', '');
      container.appendChild(peer);

      const owner = document.createElement('div');
      container.appendChild(owner);

      const handle = stack.activate(owner, container);

      expect(peer.hasAttribute('inert')).toBe(false);
      expect(peer.hasAttribute('aria-hidden')).toBe(false);

      handle.deactivate();
    });

    it('inerts a child appended to the container while an owner is active', async () => {
      const owner = document.createElement('div');
      container.appendChild(owner);

      const handle = stack.activate(owner, container);

      const late = document.createElement('div');
      container.appendChild(late);

      await Promise.resolve();

      expect(late.hasAttribute('inert')).toBe(true);
      expect(late.getAttribute('aria-hidden')).toBe('true');

      handle.deactivate();
      expect(late.hasAttribute('inert')).toBe(false);
    });

    it('ownsAnchor returns true inside the container root; false after deactivate', () => {
      const anchor = document.createElement('button');
      const owner = document.createElement('div');
      owner.appendChild(anchor);
      container.appendChild(owner);

      const handle = stack.activate(owner, container);

      expect(stack.ownsAnchor(anchor)).toBe(true);

      handle.deactivate();

      expect(stack.ownsAnchor(anchor)).toBe(false);
    });
  });

  describe('ownsAnchor', () => {
    it('returns false when no owner is active', () => {
      const anchor = appendChild('button');
      track(anchor);

      expect(stack.ownsAnchor(anchor)).toBe(false);
    });

    it('returns true for an anchor inside the active protected root', () => {
      const owner = appendChild();
      const anchor = document.createElement('button');
      owner.appendChild(anchor);
      track(owner);

      const handle = stack.activate(owner);

      expect(stack.ownsAnchor(anchor)).toBe(true);

      handle.deactivate();
    });

    it('returns true when the anchor is the protected root itself', () => {
      const owner = appendChild();
      track(owner);

      const handle = stack.activate(owner);

      expect(stack.ownsAnchor(owner)).toBe(true);

      handle.deactivate();
    });

    it('returns false for an anchor in an inerted background subtree', () => {
      const background = appendChild();
      const anchor = document.createElement('button');
      background.appendChild(anchor);
      const owner = appendChild();
      track(background, owner);

      const handle = stack.activate(owner);

      // The background sibling is inerted; an overlay anchored there must not
      // escape isolation.
      expect(background.hasAttribute('inert')).toBe(true);
      expect(stack.ownsAnchor(anchor)).toBe(false);

      handle.deactivate();
    });

    it('returns false after the owner deactivates', () => {
      const owner = appendChild();
      const anchor = document.createElement('button');
      owner.appendChild(anchor);
      track(owner);

      const handle = stack.activate(owner);
      handle.deactivate();

      expect(stack.ownsAnchor(anchor)).toBe(false);
    });

    it('non-portaled owner: owns an anchor anywhere inside the protected app shell', () => {
      const appShell = appendChild();
      const ownerInPlace = document.createElement('div');
      appShell.appendChild(ownerInPlace);
      const anchorElsewhereInShell = document.createElement('button');
      appShell.appendChild(anchorElsewhereInShell);
      track(appShell);

      const handle = stack.activate(ownerInPlace);

      // The protected root is the app shell (body-level ancestor of the
      // in-place owner), so an anchor anywhere inside it is owned.
      expect(stack.ownsAnchor(anchorElsewhereInShell)).toBe(true);

      handle.deactivate();
    });

    it('tracks the topmost owner when stacked', () => {
      const ownerA = appendChild();
      const anchorA = document.createElement('button');
      ownerA.appendChild(anchorA);
      const ownerB = appendChild();
      const anchorB = document.createElement('button');
      ownerB.appendChild(anchorB);
      track(ownerA, ownerB);

      const handleA = stack.activate(ownerA);
      const handleB = stack.activate(ownerB);

      // B is topmost: its subtree is the protected root, A is now inerted.
      expect(stack.ownsAnchor(anchorB)).toBe(true);
      expect(stack.ownsAnchor(anchorA)).toBe(false);

      handleB.deactivate();

      // A is topmost again.
      expect(stack.ownsAnchor(anchorA)).toBe(true);

      handleA.deactivate();
    });
  });
});
