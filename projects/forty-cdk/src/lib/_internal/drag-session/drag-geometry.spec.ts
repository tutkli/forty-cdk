import { resolveDropTarget, type DropContainerGeometry } from './drag-geometry';

function rect(left: number, top: number, right: number, bottom: number) {
  return { left, top, right, bottom };
}

function container(
  l: number,
  t: number,
  r: number,
  b: number,
  itemRects: ReturnType<typeof rect>[],
): DropContainerGeometry {
  return { rect: rect(l, t, r, b), itemRects };
}

describe('resolveDropTarget', () => {
  describe('empty containers', () => {
    it('returns null when containers array is empty', () => {
      const result = resolveDropTarget({ x: 100, y: 100 }, [], 'vertical', 'ltr');
      expect(result).toBeNull();
    });
  });

  describe('vertical list — insertion index', () => {
    const items = [rect(0, 0, 200, 40), rect(0, 40, 200, 80), rect(0, 80, 200, 120)];
    const c = container(0, 0, 200, 120, items);

    it('pointer above item 0 midpoint returns index 0', () => {
      const result = resolveDropTarget({ x: 100, y: 10 }, [c], 'vertical', 'ltr');
      expect(result).not.toBeNull();
      expect(result!.containerIndex).toBe(0);
      expect(result!.index).toBe(0);
    });

    it('pointer between item 0 and item 1 midpoints returns index 1', () => {
      const result = resolveDropTarget({ x: 100, y: 45 }, [c], 'vertical', 'ltr');
      expect(result!.index).toBe(1);
    });

    it('pointer between item 1 and item 2 midpoints returns index 2', () => {
      const result = resolveDropTarget({ x: 100, y: 90 }, [c], 'vertical', 'ltr');
      expect(result!.index).toBe(2);
    });

    it('pointer below last item midpoint returns itemRects.length', () => {
      const result = resolveDropTarget({ x: 100, y: 115 }, [c], 'vertical', 'ltr');
      expect(result!.index).toBe(3);
    });
  });

  describe('horizontal LTR — insertion index', () => {
    const items = [rect(0, 0, 60, 40), rect(60, 0, 120, 40)];
    const c = container(0, 0, 120, 40, items);

    it('pointer before item 0 midpoint returns index 0', () => {
      const result = resolveDropTarget({ x: 10, y: 20 }, [c], 'horizontal', 'ltr');
      expect(result!.index).toBe(0);
    });

    it('pointer after item 0 midpoint and before item 1 midpoint returns index 1', () => {
      const result = resolveDropTarget({ x: 65, y: 20 }, [c], 'horizontal', 'ltr');
      expect(result!.index).toBe(1);
    });

    it('pointer after item 1 midpoint returns itemRects.length', () => {
      const result = resolveDropTarget({ x: 110, y: 20 }, [c], 'horizontal', 'ltr');
      expect(result!.index).toBe(2);
    });
  });

  describe('horizontal RTL — insertion index mirrors LTR', () => {
    const items = [rect(0, 0, 60, 40), rect(60, 0, 120, 40)];
    const c = container(0, 0, 120, 40, items);

    it('pointer to the right of item 0 midpoint returns index 0 (RTL: past means x > mid)', () => {
      const result = resolveDropTarget({ x: 110, y: 20 }, [c], 'horizontal', 'rtl');
      expect(result!.index).toBe(0);
    });

    it('pointer between item midpoints in RTL (x=65) returns index 0', () => {
      const result = resolveDropTarget({ x: 65, y: 20 }, [c], 'horizontal', 'rtl');
      expect(result!.index).toBe(0);
    });

    it('pointer to the left of both midpoints in RTL returns itemRects.length', () => {
      const result = resolveDropTarget({ x: 10, y: 20 }, [c], 'horizontal', 'rtl');
      expect(result!.index).toBe(2);
    });

    it('RTL and LTR resolve different indices for the same x=65 (mirrored semantics)', () => {
      const ltr = resolveDropTarget({ x: 65, y: 20 }, [c], 'horizontal', 'ltr');
      const rtl = resolveDropTarget({ x: 65, y: 20 }, [c], 'horizontal', 'rtl');
      expect(ltr!.index).toBe(1);
      expect(rtl!.index).toBe(0);
    });
  });

  describe('multi-container', () => {
    const cA = container(0, 0, 200, 160, [
      rect(0, 0, 200, 40),
      rect(0, 40, 200, 80),
      rect(0, 80, 200, 120),
    ]);
    const cB = container(250, 0, 450, 120, [rect(250, 0, 450, 40), rect(250, 40, 450, 80)]);

    it('point inside container A resolves to containerIndex 0', () => {
      const result = resolveDropTarget({ x: 100, y: 10 }, [cA, cB], 'vertical', 'ltr');
      expect(result!.containerIndex).toBe(0);
    });

    it('point inside container B resolves to containerIndex 1', () => {
      const result = resolveDropTarget({ x: 300, y: 10 }, [cA, cB], 'vertical', 'ltr');
      expect(result!.containerIndex).toBe(1);
      expect(result!.index).toBe(0);
    });

    it('connected container B with point below all items returns its full count (append)', () => {
      const result = resolveDropTarget({ x: 300, y: 100 }, [cA, cB], 'vertical', 'ltr');
      expect(result!.containerIndex).toBe(1);
      expect(result!.index).toBe(2);
    });
  });

  describe('nearest-container fallback', () => {
    const cA = container(0, 0, 100, 100, []);
    const cB = container(200, 0, 300, 100, []);

    it('point between two containers snaps to the closer one (closer to cA)', () => {
      const result = resolveDropTarget({ x: 120, y: 50 }, [cA, cB], 'vertical', 'ltr');
      expect(result!.containerIndex).toBe(0);
    });

    it('point between two containers snaps to the closer one (closer to cB)', () => {
      const result = resolveDropTarget({ x: 190, y: 50 }, [cA, cB], 'vertical', 'ltr');
      expect(result!.containerIndex).toBe(1);
    });

    it('point directly above a container resolves to that container', () => {
      const result = resolveDropTarget({ x: 50, y: -50 }, [cA, cB], 'vertical', 'ltr');
      expect(result!.containerIndex).toBe(0);
    });
  });
});
