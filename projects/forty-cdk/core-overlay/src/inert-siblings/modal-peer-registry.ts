import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * What keeps a registered peer interactive over a modal: the elements it was opened from, which
 * must belong to the topmost owner, or `'always'` for a host exempt under every owner.
 */
export type PeerAnchors = readonly Element[] | 'always';

/**
 * The overlays that may stay interactive over a modal, kept apart from `InertSiblingsStack` so
 * that registering one does not construct the modal isolation engine. Until a modal activates, a
 * registration is a map write; the stack reads {@link ModalPeerRegistry.peers} when it first
 * applies, so a peer registered before then is honoured.
 *
 * SSR: registration is a no-op on the server.
 */
@Injectable({ providedIn: 'root' })
export class ModalPeerRegistry {
  readonly #isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly #peers = new Map<HTMLElement, PeerAnchors>();
  #listener: ((released: HTMLElement | null) => void) | null = null;

  /** Every registered peer host, with the anchors it was registered with. */
  get peers(): ReadonlyMap<HTMLElement, PeerAnchors> {
    return this.#peers;
  }

  /**
   * Register `host` as a peer of the modal owning `anchors`. Returns a release function, which is
   * a no-op once `host` has been registered again with other anchors.
   */
  registerPeer(host: HTMLElement, anchors: PeerAnchors): () => void {
    if (!this.#isBrowser) {
      return () => {};
    }
    this.#peers.set(host, anchors);
    this.#listener?.(null);
    return () => {
      if (this.#peers.get(host) !== anchors) {
        return;
      }
      this.#peers.delete(host);
      this.#listener?.(host);
    };
  }

  /**
   * Install the single callback run after every registration change, with the released host, or
   * `null` for a new registration.
   */
  connect(listener: (released: HTMLElement | null) => void): void {
    this.#listener = listener;
  }
}
