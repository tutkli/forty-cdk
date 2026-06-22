import { computed } from '@angular/core';

import { RovingTabindex } from './roving-tabindex';

describe('RovingTabindex', () => {
  it('starts with no active element', () => {
    const r = new RovingTabindex();
    expect(r.active()).toBe(null);
  });

  it('returns -1 for any element when no active is set', () => {
    const r = new RovingTabindex();
    const a = document.createElement('button');
    const b = document.createElement('button');
    expect(r.tabindexFor(a)).toBe(-1);
    expect(r.tabindexFor(b)).toBe(-1);
  });

  it('returns 0 for the active element and -1 for the rest', () => {
    const r = new RovingTabindex();
    const a = document.createElement('button');
    const b = document.createElement('button');
    document.body.append(a, b);
    try {
      r.setActive(a);
      expect(r.tabindexFor(a)).toBe(0);
      expect(r.tabindexFor(b)).toBe(-1);
    } finally {
      a.remove();
      b.remove();
    }
  });

  it('reacts to setActive in computed signals', () => {
    const r = new RovingTabindex();
    const a = document.createElement('button');
    const b = document.createElement('button');
    document.body.append(a, b);
    try {
      const aTabindex = computed(() => r.tabindexFor(a));
      const bTabindex = computed(() => r.tabindexFor(b));

      expect(aTabindex()).toBe(-1);
      r.setActive(a);
      expect(aTabindex()).toBe(0);
      expect(bTabindex()).toBe(-1);
      r.setActive(b);
      expect(aTabindex()).toBe(-1);
      expect(bTabindex()).toBe(0);
    } finally {
      a.remove();
      b.remove();
    }
  });

  it('setActive(null) clears the active', () => {
    const r = new RovingTabindex();
    const a = document.createElement('button');
    r.setActive(a);
    r.setActive(null);
    expect(r.active()).toBe(null);
    expect(r.tabindexFor(a)).toBe(-1);
  });

  it('focusActive moves active and focuses the new element', () => {
    const r = new RovingTabindex();
    const a = document.createElement('button');
    const b = document.createElement('button');
    document.body.append(a, b);
    try {
      r.setActive(a);
      r.focusActive(b);
      expect(r.active()).toBe(b);
      expect(document.activeElement).toBe(b);
    } finally {
      a.remove();
      b.remove();
    }
  });

  it('focusActive with no argument focuses the current active', () => {
    const r = new RovingTabindex();
    const a = document.createElement('button');
    document.body.append(a);
    try {
      r.setActive(a);
      r.focusActive();
      expect(document.activeElement).toBe(a);
    } finally {
      a.remove();
    }
  });

  describe('self-healing active', () => {
    it('hasActive is false when nothing is active', () => {
      const r = new RovingTabindex();
      expect(r.hasActive()).toBe(false);
    });

    it('hasActive is true for a connected, enabled active element', () => {
      const r = new RovingTabindex();
      const a = document.createElement('button');
      document.body.append(a);
      try {
        r.setActive(a);
        expect(r.hasActive()).toBe(true);
      } finally {
        a.remove();
      }
    });

    it('treats a detached active element as stale (no tab stop)', () => {
      const r = new RovingTabindex();
      const a = document.createElement('button');
      // Never appended → not connected.
      r.setActive(a);
      expect(r.hasActive()).toBe(false);
      expect(r.tabindexFor(a)).toBe(-1);
    });

    it('treats a [disabled] active element as stale', () => {
      const r = new RovingTabindex();
      const a = document.createElement('button');
      document.body.append(a);
      try {
        r.setActive(a);
        expect(r.tabindexFor(a)).toBe(0);
        a.setAttribute('disabled', '');
        expect(r.hasActive()).toBe(false);
        expect(r.tabindexFor(a)).toBe(-1);
      } finally {
        a.remove();
      }
    });

    it('treats an aria-disabled="true" active element as stale', () => {
      const r = new RovingTabindex();
      const a = document.createElement('div');
      document.body.append(a);
      try {
        r.setActive(a);
        a.setAttribute('aria-disabled', 'true');
        expect(r.hasActive()).toBe(false);
        expect(r.tabindexFor(a)).toBe(-1);
      } finally {
        a.remove();
      }
    });

    it('reacts to setActive in the hasActive computed', () => {
      const r = new RovingTabindex();
      const a = document.createElement('button');
      document.body.append(a);
      try {
        const has = computed(() => r.hasActive());
        expect(has()).toBe(false);
        r.setActive(a);
        expect(has()).toBe(true);
        r.setActive(null);
        expect(has()).toBe(false);
      } finally {
        a.remove();
      }
    });
  });

  describe('unregister', () => {
    it('clears the active element when it unregisters', () => {
      const r = new RovingTabindex();
      const a = document.createElement('button');
      r.setActive(a);
      r.unregister(a);
      expect(r.active()).toBe(null);
    });

    it('is a no-op when unregistering a non-active element', () => {
      const r = new RovingTabindex();
      const a = document.createElement('button');
      const b = document.createElement('button');
      r.setActive(a);
      r.unregister(b);
      expect(r.active()).toBe(a);
    });
  });
});
