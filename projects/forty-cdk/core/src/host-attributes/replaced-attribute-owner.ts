import { isDevMode, untracked } from '@angular/core';

import { fortyWarn } from '../errors/errors';

/** An id-reference attribute whose value one owner replaces rather than composes. */
export type ReplacedAttribute = 'aria-labelledby' | 'aria-errormessage';

/** One library piece's claim on a {@link ReplacedAttribute} of an element. */
export interface ReplacedAttributeClaim {
  /** The element's static value, captured before any claim wrote the attribute. */
  readonly consumer: string | null;
  /** Writes the element's resolved value. */
  write(): void;
  /** Drops this claim and rewrites the element from the claims that remain. */
  release(): void;
}

interface ReplacedAttributeOwner {
  readonly consumer: string | null;
  readonly claims: Set<() => string | null>;
  warned: boolean;
}

const owners: Record<ReplacedAttribute, WeakMap<Element, ReplacedAttributeOwner>> = {
  'aria-labelledby': new WeakMap(),
  'aria-errormessage': new WeakMap(),
};

/**
 * Registers a library piece's value for one of an element's replaced id-reference
 * attributes. Every claim on the element resolves the same value: the consumer's
 * static value, captured once by the first claim, else the earliest claim still
 * registered that resolves one. In dev mode a second claim that is still
 * registered once the pass settles, on an element with no consumer value, warns.
 *
 * @param element The element carrying the attribute.
 * @param name The attribute.
 * @param value The ids this piece supplies, or `null` while it supplies none.
 */
export function claimReplacedAttribute(
  element: Element,
  name: ReplacedAttribute,
  value: () => string | null,
): ReplacedAttributeClaim {
  const registry = owners[name];
  let owner = registry.get(element);
  if (!owner) {
    owner = { consumer: element.getAttribute(name) || null, claims: new Set(), warned: false };
    registry.set(element, owner);
  }
  const current = owner;
  const claim = (): string | null => value() || null;
  current.claims.add(claim);
  if (isDevMode() && current.claims.size > 1) {
    queueMicrotask(() => warnIfContested(element, name, current));
  }
  return {
    consumer: current.consumer,
    write: () => writeReplaced(element, name, current),
    release: () => {
      if (!current.claims.delete(claim)) {
        return;
      }
      if (current.claims.size <= 1) {
        current.warned = false;
      }
      if (current.claims.size === 0 && registry.get(element) === current) {
        registry.delete(element);
      }
      untracked(() => writeReplaced(element, name, current));
    },
  };
}

function writeReplaced(
  element: Element,
  name: ReplacedAttribute,
  owner: ReplacedAttributeOwner,
): void {
  let value = owner.consumer;
  for (const claim of owner.claims) {
    if (value !== null) {
      break;
    }
    value = claim();
  }
  if (value === null) {
    element.removeAttribute(name);
  } else if (element.getAttribute(name) !== value) {
    element.setAttribute(name, value);
  }
}

function warnIfContested(
  element: Element,
  name: ReplacedAttribute,
  owner: ReplacedAttributeOwner,
): void {
  if (owner.consumer !== null || owner.claims.size <= 1 || owner.warned) {
    return;
  }
  owner.warned = true;
  fortyWarn({
    code: 'FORCDK-CORE-013',
    message: `${owner.claims.size} library pieces supply \`${name}\` for the same <${element.localName}> element.`,
    cause:
      'The attribute holds one value, so the earliest piece that resolves one is written and ' +
      'the others are never announced.',
    fix: `Move one of the pieces to another element, or write a static \`${name}\` on it, which replaces every library value.`,
  });
}
