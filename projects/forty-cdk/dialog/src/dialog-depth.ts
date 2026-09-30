import { Injectable } from '@angular/core';

interface DepthClaim {
  readonly host: HTMLElement;
  readonly depth: number;
  released: boolean;
}

/** A surface's stacking depth, fixed for its lifetime, and the call that gives it back. */
export interface DialogDepthHandle {
  readonly depth: number;
  release(): void;
}

/**
 * Application-scoped stacking order shared by every `[forDialog]`, declarative and managed alike.
 *
 * A surface claims `0` when no other surface is mounted, and otherwise one above the deepest
 * surface still mounted. A released surface keeps counting while its host is still connected, so a
 * dialog opened during another's exit animation stacks above it, and a depth is never handed out
 * twice to two surfaces mounted at once.
 */
@Injectable({ providedIn: 'root' })
export class DialogDepthRegistry {
  readonly #claims = new Set<DepthClaim>();

  claim(host: HTMLElement): DialogDepthHandle {
    let deepest = -1;
    for (const claim of this.#claims) {
      if (claim.released && !claim.host.isConnected) {
        this.#claims.delete(claim);
      } else if (claim.depth > deepest) {
        deepest = claim.depth;
      }
    }
    const claim: DepthClaim = { host, depth: deepest + 1, released: false };
    this.#claims.add(claim);
    return {
      depth: claim.depth,
      release: () => {
        claim.released = true;
        if (!host.isConnected) {
          this.#claims.delete(claim);
        }
      },
    };
  }
}
