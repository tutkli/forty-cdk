import { untracked } from '@angular/core';

export interface DescribedByContribution {
  readonly consumer: string | null;
  write(): void;
  release(): void;
}

interface DescribedByOwner {
  readonly consumer: string | null;
  readonly sources: Set<() => string | null>;
}

const owners = new WeakMap<Element, DescribedByOwner>();

export function contributeDescribedBy(
  element: Element,
  ids: () => string | null,
): DescribedByContribution {
  let owner = owners.get(element);
  if (!owner) {
    owner = { consumer: element.getAttribute('aria-describedby') || null, sources: new Set() };
    owners.set(element, owner);
  }
  const current = owner;
  const source = (): string | null => ids();
  current.sources.add(source);
  return {
    consumer: current.consumer,
    write: () => writeDescribedBy(element, current),
    release: () => {
      if (!current.sources.delete(source)) {
        return;
      }
      if (current.sources.size === 0 && owners.get(element) === current) {
        owners.delete(element);
      }
      untracked(() => writeDescribedBy(element, current));
    },
  };
}

function writeDescribedBy(element: Element, owner: DescribedByOwner): void {
  let value = owner.consumer;
  for (const source of owner.sources) {
    value = composeIds(value, source());
  }
  if (value === null) {
    element.removeAttribute('aria-describedby');
  } else if (element.getAttribute('aria-describedby') !== value) {
    element.setAttribute('aria-describedby', value);
  }
}

/**
 * Composes a consumer's own id-reference list with the library's own ids: the
 * consumer's ids first, then any library id not already present. Returns `null`
 * when both sides are empty so the caller removes the attribute rather than
 * setting it to `""`.
 *
 * @param consumer The consumer-authored value, captured before the library
 *   touched the element.
 * @param libraryIds The library-owned ids to append.
 */
export function composeIds(consumer: string | null, libraryIds: string | null): string | null {
  if (!consumer) {
    return libraryIds;
  }
  if (!libraryIds) {
    return consumer;
  }
  const seen = new Set(consumer.split(/\s+/).filter(Boolean));
  const extra = libraryIds.split(/\s+/).filter((id) => id && !seen.has(id));
  return extra.length > 0 ? `${consumer} ${extra.join(' ')}` : consumer;
}
