import { PLATFORM_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { MODAL_PEER_ATTRIBUTE } from 'forty-cdk/core';

import { InertSiblingsStack } from './inert-siblings';
import { ModalPeerRegistry } from './modal-peer-registry';

describe('ModalPeerRegistry', () => {
  let cleanup: HTMLElement[] = [];

  function appendChild(parent: HTMLElement = document.body): HTMLElement {
    const el = document.createElement('div');
    parent.appendChild(el);
    if (parent === document.body) {
      cleanup.push(el);
    }
    return el;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  afterEach(() => {
    for (const el of cleanup) {
      el.remove();
    }
    cleanup = [];
    TestBed.resetTestingModule();
  });

  it('records a registration without constructing the inert-siblings stack', () => {
    const constructed = vi.fn();
    TestBed.overrideProvider(InertSiblingsStack, { useFactory: constructed });
    const registry = TestBed.inject(ModalPeerRegistry);
    const host = appendChild();

    const release = registry.registerPeer(host, 'always');

    expect(registry.peers.get(host)).toBe('always');
    expect(constructed).not.toHaveBeenCalled();
    expect(host.hasAttribute(MODAL_PEER_ATTRIBUTE)).toBe(false);

    release();

    expect(registry.peers.has(host)).toBe(false);
  });

  it('honours a peer registered before the first modal opens', () => {
    const registry = TestBed.inject(ModalPeerRegistry);
    const owner = appendChild();
    const trigger = appendChild(owner);
    const insidePeer = appendChild();
    const outsidePeer = appendChild();
    registry.registerPeer(insidePeer, [trigger]);
    registry.registerPeer(outsidePeer, [appendChild()]);

    const handle = TestBed.inject(InertSiblingsStack).activate(owner);

    expect(insidePeer.hasAttribute('inert')).toBe(false);
    expect(insidePeer.hasAttribute(MODAL_PEER_ATTRIBUTE)).toBe(true);
    expect(outsidePeer.hasAttribute('inert')).toBe(true);
    expect(outsidePeer.hasAttribute(MODAL_PEER_ATTRIBUTE)).toBe(false);

    handle.deactivate();
  });

  it('inerts and unmarks a pre-registered peer released while the modal is open', () => {
    const registry = TestBed.inject(ModalPeerRegistry);
    const owner = appendChild();
    const peer = appendChild();
    const release = registry.registerPeer(peer, [appendChild(owner)]);
    const handle = TestBed.inject(InertSiblingsStack).activate(owner);

    release();

    expect(peer.hasAttribute(MODAL_PEER_ATTRIBUTE)).toBe(false);
    expect(peer.hasAttribute('inert')).toBe(true);

    handle.deactivate();

    expect(peer.hasAttribute('inert')).toBe(false);
  });

  it('keeps the newer registration when a stale release runs', () => {
    const registry = TestBed.inject(ModalPeerRegistry);
    const host = appendChild();
    const releaseFirst = registry.registerPeer(host, 'always');
    const anchors = [appendChild()];
    registry.registerPeer(host, anchors);

    releaseFirst();

    expect(registry.peers.get(host)).toBe(anchors);
  });

  it('registers nothing on the server', () => {
    TestBed.overrideProvider(PLATFORM_ID, { useValue: 'server' });
    const registry = TestBed.inject(ModalPeerRegistry);

    registry.registerPeer(appendChild(), 'always');

    expect(registry.peers.size).toBe(0);
  });
});
