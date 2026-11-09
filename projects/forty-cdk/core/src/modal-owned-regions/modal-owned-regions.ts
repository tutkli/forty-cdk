import { Injectable, inject } from '@angular/core';

import { composedContains } from '../composed-tree/composed-tree';
import { IdGenerator } from '../id-generator/id-generator';

interface AppliedOwnership {
  readonly owner: HTMLElement;
  readonly added: readonly string[];
}

/**
 * Keeps the regions that must stay readable over a modal inside the accessibility subtree of the
 * topmost `aria-modal` surface.
 *
 * A region lives outside every modal and still has to reach assistive technology while one is
 * open: each `LiveAnnouncer` region, and a toast viewport exempt from the modal. A screen reader
 * that hides everything outside an `aria-modal="true"` element would drop whatever is written into
 * one, so the topmost claiming surface lists every registered region in its `aria-owns`.
 *
 * Only the topmost claim owns the regions, because an element can have one owner: a stacked modal
 * takes them over and hands them back when it releases, whatever the release order. The ids the
 * registry adds are merged with the surface's own `aria-owns`, and they are the only ones it
 * removes. A region with no `id` is given one the first time it is owned, and a region inside the
 * owning surface is left out.
 *
 * Internal core tier — exported from `forty-cdk/core` for the library's own entry points, with
 * no semver guarantee.
 */
@Injectable({ providedIn: 'root' })
export class ModalOwnedRegions {
  readonly #ids = inject(IdGenerator);
  readonly #regions: HTMLElement[] = [];
  readonly #claims: HTMLElement[] = [];
  #applied: AppliedOwnership | null = null;

  /** Adds `region` to what the topmost claiming surface owns. Returns the matching removal. */
  register(region: HTMLElement): () => void {
    return this.#track(this.#regions, region);
  }

  /** Makes `surface` the topmost owner of every registered region. Returns the matching release. */
  claim(surface: HTMLElement): () => void {
    return this.#track(this.#claims, surface);
  }

  #track(list: HTMLElement[], el: HTMLElement): () => void {
    list.push(el);
    this.#sync();
    let active = true;
    return () => {
      if (!active) {
        return;
      }
      active = false;
      list.splice(list.indexOf(el), 1);
      this.#sync();
    };
  }

  #sync(): void {
    if (this.#applied !== null) {
      removeOwnedIds(this.#applied.owner, this.#applied.added);
      this.#applied = null;
    }
    const owner = this.#claims.at(-1);
    if (owner === undefined) {
      return;
    }
    const ids = this.#regions
      .filter((region) => !composedContains(owner, region))
      .map((region) => this.#idOf(region));
    const added = addOwnedIds(owner, ids);
    if (added.length > 0) {
      this.#applied = { owner, added };
    }
  }

  #idOf(region: HTMLElement): string {
    if (region.id === '') {
      region.id = this.#ids.next('for-modal-owned');
    }
    return region.id;
  }
}

function ownedIds(el: HTMLElement): string[] {
  return (el.getAttribute('aria-owns') ?? '').split(/\s+/).filter((id) => id !== '');
}

function addOwnedIds(el: HTMLElement, ids: readonly string[]): string[] {
  const current = ownedIds(el);
  const added = [...new Set(ids)].filter((id) => !current.includes(id));
  if (added.length > 0) {
    el.setAttribute('aria-owns', [...current, ...added].join(' '));
  }
  return added;
}

function removeOwnedIds(el: HTMLElement, ids: readonly string[]): void {
  const remaining = ownedIds(el).filter((id) => !ids.includes(id));
  if (remaining.length > 0) {
    el.setAttribute('aria-owns', remaining.join(' '));
  } else {
    el.removeAttribute('aria-owns');
  }
}
