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
  orientation: 'horizontal' | 'vertical' | 'mixed' = 'vertical',
  dir: 'ltr' | 'rtl' = 'ltr',
): DropContainerGeometry {
  return { rect: rect(l, t, r, b), itemRects, orientation, dir };
}

describe('resolveDropTarget', () => {
  describe('empty containers', () => {
    it('returns null when containers array is empty', () => {
      const result = resolveDropTarget({ x: 100, y: 100 }, []);
      expect(result).toBeNull();
    });
  });

  describe('vertical list — insertion index', () => {
    const items = [rect(0, 0, 200, 40), rect(0, 40, 200, 80), rect(0, 80, 200, 120)];
    const c = container(0, 0, 200, 120, items);

    it('pointer above item 0 midpoint returns index 0', () => {
      const result = resolveDropTarget({ x: 100, y: 10 }, [c]);
      expect(result).not.toBeNull();
      expect(result!.containerIndex).toBe(0);
      expect(result!.index).toBe(0);
    });

    it('pointer between item 0 and item 1 midpoints returns index 1', () => {
      const result = resolveDropTarget({ x: 100, y: 45 }, [c]);
      expect(result!.index).toBe(1);
    });

    it('pointer between item 1 and item 2 midpoints returns index 2', () => {
      const result = resolveDropTarget({ x: 100, y: 90 }, [c]);
      expect(result!.index).toBe(2);
    });

    it('pointer below last item midpoint returns itemRects.length', () => {
      const result = resolveDropTarget({ x: 100, y: 115 }, [c]);
      expect(result!.index).toBe(3);
    });
  });

  describe('horizontal LTR — insertion index', () => {
    const items = [rect(0, 0, 60, 40), rect(60, 0, 120, 40)];
    const c = container(0, 0, 120, 40, items, 'horizontal');

    it('pointer before item 0 midpoint returns index 0', () => {
      const result = resolveDropTarget({ x: 10, y: 20 }, [c]);
      expect(result!.index).toBe(0);
    });

    it('pointer after item 0 midpoint and before item 1 midpoint returns index 1', () => {
      const result = resolveDropTarget({ x: 65, y: 20 }, [c]);
      expect(result!.index).toBe(1);
    });

    it('pointer after item 1 midpoint returns itemRects.length', () => {
      const result = resolveDropTarget({ x: 110, y: 20 }, [c]);
      expect(result!.index).toBe(2);
    });
  });

  describe('horizontal RTL — insertion index mirrors LTR', () => {
    const items = [rect(0, 0, 60, 40), rect(60, 0, 120, 40)];
    const c = container(0, 0, 120, 40, items, 'horizontal', 'rtl');

    it('pointer to the right of item 0 midpoint returns index 0 (RTL: past means x > mid)', () => {
      const result = resolveDropTarget({ x: 110, y: 20 }, [c]);
      expect(result!.index).toBe(0);
    });

    it('pointer between item midpoints in RTL (x=65) returns index 0', () => {
      const result = resolveDropTarget({ x: 65, y: 20 }, [c]);
      expect(result!.index).toBe(0);
    });

    it('pointer to the left of both midpoints in RTL returns itemRects.length', () => {
      const result = resolveDropTarget({ x: 10, y: 20 }, [c]);
      expect(result!.index).toBe(2);
    });

    it('RTL and LTR resolve different indices for the same x=65 (mirrored semantics)', () => {
      const cLtr = container(0, 0, 120, 40, items, 'horizontal');
      const cRtl = container(0, 0, 120, 40, items, 'horizontal', 'rtl');
      const ltr = resolveDropTarget({ x: 65, y: 20 }, [cLtr]);
      const rtl = resolveDropTarget({ x: 65, y: 20 }, [cRtl]);
      expect(ltr!.index).toBe(1);
      expect(rtl!.index).toBe(0);
    });
  });

  describe('mixed orientation — 2D wrapping grid', () => {
    const row0 = [rect(0, 0, 60, 40), rect(60, 0, 120, 40), rect(120, 0, 180, 40)];
    const row1 = [rect(0, 40, 60, 80), rect(60, 40, 120, 80), rect(120, 40, 180, 80)];
    const gridItems = [...row0, ...row1];
    const c = container(0, 0, 180, 80, gridItems, 'mixed');

    it('pointer in row 2 resolves to a row-2 slot, not the nearest row-1 column', () => {
      const result = resolveDropTarget({ x: 70, y: 60 }, [c]);
      expect(result!.index).toBe(4);
    });

    it('single-axis horizontal mis-resolves the same row-2 point to a row-1 index', () => {
      const cHorizontal = container(0, 0, 180, 80, gridItems, 'horizontal');
      const mixed = resolveDropTarget({ x: 70, y: 60 }, [c]);
      const horizontal = resolveDropTarget({ x: 70, y: 60 }, [cHorizontal]);
      expect(mixed!.index).toBe(4);
      expect(horizontal!.index).toBe(1);
    });

    it('pointer within row 1 resolves by column on that row', () => {
      const result = resolveDropTarget({ x: 70, y: 20 }, [c]);
      expect(result!.index).toBe(1);
    });

    it('pointer past the last item resolves to itemRects.length', () => {
      const result = resolveDropTarget({ x: 170, y: 60 }, [c]);
      expect(result!.index).toBe(6);
    });

    it('pointer below the whole grid resolves to itemRects.length', () => {
      const result = resolveDropTarget({ x: 70, y: 100 }, [c]);
      expect(result!.index).toBe(6);
    });

    it('RTL flips the within-row comparison', () => {
      const cMixedRtl = container(0, 0, 180, 80, gridItems, 'mixed', 'rtl');
      const ltr = resolveDropTarget({ x: 70, y: 60 }, [c]);
      const rtl = resolveDropTarget({ x: 70, y: 60 }, [cMixedRtl]);
      expect(ltr!.index).toBe(4);
      expect(rtl!.index).toBe(3);
    });
  });

  describe('mixed orientation — reduces to single-axis layouts', () => {
    it('a single row resolves identically to horizontal (LTR and RTL, in and out of band)', () => {
      const items = [rect(0, 0, 60, 40), rect(60, 0, 120, 40), rect(120, 0, 180, 40)];
      const points = [
        { x: 10, y: 20 },
        { x: 70, y: 20 },
        { x: 170, y: 20 },
        { x: 70, y: 100 },
      ];
      for (const dir of ['ltr', 'rtl'] as const) {
        const cMixed = container(0, 0, 180, 40, items, 'mixed', dir);
        const cHorizontal = container(0, 0, 180, 40, items, 'horizontal', dir);
        for (const p of points) {
          const mixed = resolveDropTarget(p, [cMixed]);
          const horizontal = resolveDropTarget(p, [cHorizontal]);
          expect(mixed!.index).toBe(horizontal!.index);
        }
      }
    });

    it('a single column resolves identically to vertical', () => {
      const items = [rect(0, 0, 200, 40), rect(0, 40, 200, 80), rect(0, 80, 200, 120)];
      const cMixed = container(0, 0, 200, 120, items, 'mixed');
      const cVertical = container(0, 0, 200, 120, items, 'vertical');
      const points = [
        { x: 100, y: 10 },
        { x: 100, y: 45 },
        { x: 100, y: 90 },
        { x: 100, y: 115 },
      ];
      for (const p of points) {
        const mixed = resolveDropTarget(p, [cMixed]);
        const vertical = resolveDropTarget(p, [cVertical]);
        expect(mixed!.index).toBe(vertical!.index);
      }
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
      const result = resolveDropTarget({ x: 100, y: 10 }, [cA, cB]);
      expect(result!.containerIndex).toBe(0);
    });

    it('point inside container B resolves to containerIndex 1', () => {
      const result = resolveDropTarget({ x: 300, y: 10 }, [cA, cB]);
      expect(result!.containerIndex).toBe(1);
      expect(result!.index).toBe(0);
    });

    it('connected container B with point below all items returns its full count (append)', () => {
      const result = resolveDropTarget({ x: 300, y: 100 }, [cA, cB]);
      expect(result!.containerIndex).toBe(1);
      expect(result!.index).toBe(2);
    });
  });

  describe('nearest-container fallback', () => {
    const cA = container(0, 0, 100, 100, []);
    const cB = container(200, 0, 300, 100, []);

    it('point between two containers snaps to the closer one (closer to cA)', () => {
      const result = resolveDropTarget({ x: 120, y: 50 }, [cA, cB]);
      expect(result!.containerIndex).toBe(0);
    });

    it('point between two containers snaps to the closer one (closer to cB)', () => {
      const result = resolveDropTarget({ x: 190, y: 50 }, [cA, cB]);
      expect(result!.containerIndex).toBe(1);
    });

    it('point directly above a container resolves to that container', () => {
      const result = resolveDropTarget({ x: 50, y: -50 }, [cA, cB]);
      expect(result!.containerIndex).toBe(0);
    });
  });

  describe('per-container orientation / dir', () => {
    const vertical = container(0, 0, 200, 160, [
      rect(0, 0, 200, 40),
      rect(0, 40, 200, 80),
      rect(0, 80, 200, 120),
    ]);
    const bItems = [rect(300, 0, 400, 40), rect(400, 0, 500, 40)];
    const horizontal = container(300, 0, 500, 40, bItems, 'horizontal');
    const horizontalRtl = container(300, 0, 500, 40, bItems, 'horizontal', 'rtl');
    const verticalTwin = container(300, 0, 500, 40, bItems);

    it('resolves the insertion index on the target container own orientation, not the source container one', () => {
      const onHorizontal = resolveDropTarget({ x: 360, y: 20 }, [vertical, horizontal]);
      expect(onHorizontal!.containerIndex).toBe(1);
      expect(onHorizontal!.index).toBe(1);

      const onVertical = resolveDropTarget({ x: 360, y: 20 }, [vertical, verticalTwin]);
      expect(onVertical!.containerIndex).toBe(1);
      expect(onVertical!.index).toBe(2);
    });

    it('resolves the insertion index on the target container own dir, not the source container one', () => {
      expect(resolveDropTarget({ x: 360, y: 20 }, [vertical, horizontalRtl])!.index).toBe(0);
      expect(resolveDropTarget({ x: 360, y: 20 }, [vertical, horizontal])!.index).toBe(1);
    });

    it('applies the nearest-container axis when the point is outside every container', () => {
      const onHorizontal = resolveDropTarget({ x: 600, y: -100 }, [vertical, horizontal]);
      expect(onHorizontal!.containerIndex).toBe(1);
      expect(onHorizontal!.index).toBe(2);

      const onVertical = resolveDropTarget({ x: 600, y: -100 }, [vertical, verticalTwin]);
      expect(onVertical!.containerIndex).toBe(1);
      expect(onVertical!.index).toBe(0);
    });
  });
});
