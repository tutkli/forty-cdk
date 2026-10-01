import { signal } from '@angular/core';

export interface IdRegistry {
  readonly joined: () => string | null;
  readonly register: (id: string) => void;
  readonly unregister: (id: string) => void;
}

export function createIdRegistry(): IdRegistry {
  const ids = signal<readonly string[]>([]);
  return {
    joined: () => {
      const current = ids();
      return current.length === 0 ? null : current.join(' ');
    },
    register: (id) => ids.update((all) => (all.includes(id) ? all : [...all, id])),
    unregister: (id) => ids.update((all) => all.filter((one) => one !== id)),
  };
}
