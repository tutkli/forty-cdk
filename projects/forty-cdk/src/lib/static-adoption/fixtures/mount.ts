import { type Provider, provideZonelessChangeDetection, type Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { StaticAdoptionClaim, StaticAdoptionMountResult } from '../../../test-utils/contract';
import { flush } from '../../../test-utils/flush';

/**
 * One adopter group: the two fixtures that differ only in whether the consumer
 * named the pieces, plus the claims stated over them.
 */
export interface StaticAdoptionAdopter {
  /** Appended to the contract's `describe` title. */
  label: string;
  /** Renders every claim's `probe` as a plain static attribute. */
  adopted: Type<unknown>;
  /** Renders the same pieces with none of the probes. */
  bare: Type<unknown>;
  /** Extra providers the fixtures need (a `DateAdapter`, a defaults scope). */
  providers?: readonly Provider[];
  /**
   * The claims. Each `key` is the CSS selector the piece is located by — a
   * directive attribute, never an `id`, which would beg the question.
   */
  claims: readonly StaticAdoptionClaim[];
}

export interface MountedHost<T> {
  /** The host component instance, for driving a state transition. */
  instance: T;
  /**
   * Locate an element by selector, checking the (detached) fixture host first
   * and then `document.body` for a surface portaled out of it.
   */
  query: (selector: string) => HTMLElement | null;
  /** The canonical async waiter bound to this fixture. */
  flush: () => Promise<void>;
}

/**
 * Mounts a host component for this suite.
 *
 * Not `renderHost`: the date / time fixtures need a `DateAdapter` provider, and
 * every case here resolves pieces that may be portaled out of the fixture host.
 *
 * Resets the `TestBed` first, because the contract's resolution case mounts both
 * variants inside a single test and `configureTestingModule` throws once the
 * module has been instantiated.
 */
export function mount<T>(host: Type<T>, providers: readonly Provider[] = []): MountedHost<T> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), ...providers],
  });

  const fixture = TestBed.createComponent(host);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;

  return {
    instance: fixture.componentInstance,
    query: (selector) =>
      root.querySelector<HTMLElement>(selector) ??
      document.body.querySelector<HTMLElement>(selector),
    flush: () => flush(fixture),
  };
}

/**
 * Mount one variant of an adopter's fixture for `assertStaticAdoptionContract`.
 *
 * The pieces resolver answers the claim keys plus every selector a
 * `{ pairs: … }` fallback references, so a fallback may name an element that is
 * not itself an adopter.
 */
export function mountStaticAdoptionFixture(
  adopter: StaticAdoptionAdopter,
  variant: 'adopted' | 'bare',
): StaticAdoptionMountResult {
  const ctx = mount(variant === 'adopted' ? adopter.adopted : adopter.bare, adopter.providers);

  const selectors = new Set(adopter.claims.map((claim) => claim.key));
  for (const claim of adopter.claims) {
    const { fallback } = claim;
    if (fallback !== null && typeof fallback === 'object' && 'pairs' in fallback) {
      selectors.add(fallback.pairs);
    }
  }

  return {
    flush: ctx.flush,
    pieces: () =>
      Object.fromEntries([...selectors].map((selector) => [selector, ctx.query(selector)])),
  };
}
