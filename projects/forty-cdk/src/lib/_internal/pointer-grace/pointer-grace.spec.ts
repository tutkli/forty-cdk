import {
  attachPointerGrace,
  buildSubmenuGracePolygon,
  isPointInPolygon,
  resolveGraceSide,
  type GraceRect,
  type Point,
  type Polygon,
} from './pointer-grace';

describe('isPointInPolygon', () => {
  const square: Polygon = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ];

  it('reports a point strictly inside as inside', () => {
    expect(isPointInPolygon({ x: 5, y: 5 }, square)).toBe(true);
  });

  it('reports a point outside as outside', () => {
    expect(isPointInPolygon({ x: 20, y: 5 }, square)).toBe(false);
    expect(isPointInPolygon({ x: 5, y: 20 }, square)).toBe(false);
    expect(isPointInPolygon({ x: -1, y: 5 }, square)).toBe(false);
  });

  it('handles a concave / arrow-like polygon', () => {
    // A simple triangle apex-left, base-right.
    const triangle: Polygon = [
      { x: 0, y: 5 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ];
    expect(isPointInPolygon({ x: 8, y: 5 }, triangle)).toBe(true);
    expect(isPointInPolygon({ x: 1, y: 9 }, triangle)).toBe(false);
  });
});

describe('resolveGraceSide', () => {
  const trigger: GraceRect = { left: 100, top: 50, right: 200, bottom: 80 };

  it('resolves "right" when the content sits to the right of the trigger', () => {
    const content: GraceRect = { left: 208, top: 50, right: 388, bottom: 200 };
    expect(resolveGraceSide(trigger, content)).toBe('right');
  });

  it('resolves "left" when the content sits to the left of the trigger', () => {
    const content: GraceRect = { left: -88, top: 50, right: 92, bottom: 200 };
    expect(resolveGraceSide(trigger, content)).toBe('left');
  });

  it('resolves the real side after a flip even when the requested side was the opposite', () => {
    // Requested side was "right", but a viewport-edge flip rendered the
    // content to the left. The geometry must report "left" regardless.
    const flipped: GraceRect = { left: -88, top: 50, right: 92, bottom: 200 };
    expect(resolveGraceSide(trigger, flipped)).toBe('left');
  });

  it('resolves "bottom" when the content sits below the trigger', () => {
    const content: GraceRect = { left: 100, top: 88, right: 280, bottom: 238 };
    expect(resolveGraceSide(trigger, content)).toBe('bottom');
  });

  it('resolves "top" when the content sits above the trigger', () => {
    const content: GraceRect = { left: 100, top: -160, right: 280, bottom: -10 };
    expect(resolveGraceSide(trigger, content)).toBe('top');
  });

  it('prefers the axis with the larger centre-to-centre separation', () => {
    // Content is slightly right but far below: vertical separation dominates.
    const content: GraceRect = { left: 210, top: 300, right: 390, bottom: 450 };
    expect(resolveGraceSide(trigger, content)).toBe('bottom');
  });
});

describe('buildSubmenuGracePolygon', () => {
  describe('side="right" (content to the right of the trigger)', () => {
    const cursor: Point = { x: 100, y: 50 };
    const rect: GraceRect = { left: 150, top: 0, right: 250, bottom: 100 };
    const polygon = buildSubmenuGracePolygon(cursor, rect, 'right');

    it('places the bleeded cursor apex and the four content corners', () => {
      expect(polygon).toEqual([
        { x: 95, y: 50 }, // cursor pulled 5px left, back toward the trigger
        { x: 150, y: 0 },
        { x: 250, y: 0 },
        { x: 250, y: 100 },
        { x: 150, y: 100 },
      ]);
    });

    it('keeps a point travelling from the cursor toward the content inside', () => {
      expect(isPointInPolygon({ x: 140, y: 50 }, polygon)).toBe(true);
    });

    it('keeps a point over the content itself inside', () => {
      expect(isPointInPolygon({ x: 200, y: 50 }, polygon)).toBe(true);
    });

    it('reports a point diverging away from the triangle as outside', () => {
      expect(isPointInPolygon({ x: 100, y: 200 }, polygon)).toBe(false);
      expect(isPointInPolygon({ x: 300, y: 50 }, polygon)).toBe(false);
      // Same x as the apex but well above the narrow triangle mouth.
      expect(isPointInPolygon({ x: 100, y: 10 }, polygon)).toBe(false);
    });
  });

  describe('side="left" (content to the left of the trigger)', () => {
    const cursor: Point = { x: 100, y: 50 };
    const rect: GraceRect = { left: 0, top: 0, right: 50, bottom: 100 };
    const polygon = buildSubmenuGracePolygon(cursor, rect, 'left');

    it('bleeds the cursor apex to the right (back toward the trigger)', () => {
      expect(polygon[0]).toEqual({ x: 105, y: 50 });
    });

    it('keeps a point travelling left toward the content inside', () => {
      expect(isPointInPolygon({ x: 60, y: 50 }, polygon)).toBe(true);
    });

    it('reports a point diverging away as outside', () => {
      expect(isPointInPolygon({ x: 100, y: 200 }, polygon)).toBe(false);
    });
  });

  describe('side="bottom" (content below the trigger)', () => {
    const cursor: Point = { x: 50, y: 100 };
    const rect: GraceRect = { left: 0, top: 150, right: 100, bottom: 250 };
    const polygon = buildSubmenuGracePolygon(cursor, rect, 'bottom');

    it('bleeds the cursor apex upward (back toward the trigger)', () => {
      expect(polygon[0]).toEqual({ x: 50, y: 95 });
    });

    it('keeps a point travelling down toward the content inside', () => {
      expect(isPointInPolygon({ x: 50, y: 160 }, polygon)).toBe(true);
    });

    it('reports a point off to the side as outside', () => {
      expect(isPointInPolygon({ x: 200, y: 160 }, polygon)).toBe(false);
    });
  });

  describe('side="top" (content above the trigger)', () => {
    const cursor: Point = { x: 50, y: 100 };
    const rect: GraceRect = { left: 0, top: 0, right: 100, bottom: 50 };
    const polygon = buildSubmenuGracePolygon(cursor, rect, 'top');

    it('bleeds the cursor apex downward (back toward the trigger)', () => {
      expect(polygon[0]).toEqual({ x: 50, y: 105 });
    });

    it('keeps a point travelling up toward the content inside', () => {
      expect(isPointInPolygon({ x: 50, y: 80 }, polygon)).toBe(true);
      expect(isPointInPolygon({ x: 50, y: 40 }, polygon)).toBe(true);
    });

    it('reports a point off to the side as outside', () => {
      expect(isPointInPolygon({ x: 200, y: 80 }, polygon)).toBe(false);
    });
  });
});

describe('attachPointerGrace', () => {
  // A square far from the origin so the default (0,0) of a bare event is outside.
  const polygon: Polygon = [
    { x: 100, y: 100 },
    { x: 200, y: 100 },
    { x: 200, y: 200 },
    { x: 100, y: 200 },
  ];

  function dispatchMove(x: number, y: number, pointerType = 'mouse'): void {
    const event = new Event('pointermove') as PointerEvent;
    Object.defineProperties(event, {
      clientX: { value: x, configurable: true },
      clientY: { value: y, configurable: true },
      pointerType: { value: pointerType, configurable: true },
    });
    document.dispatchEvent(event);
  }

  it('does not fire onExit while the mouse stays inside the polygon', () => {
    let exits = 0;
    const cleanup = attachPointerGrace(document, polygon, () => exits++);
    try {
      dispatchMove(150, 150);
      expect(exits).toBe(0);
    } finally {
      cleanup();
    }
  });

  it('fires onExit when the mouse leaves the polygon', () => {
    let exits = 0;
    const cleanup = attachPointerGrace(document, polygon, () => exits++);
    try {
      dispatchMove(300, 300);
      expect(exits).toBe(1);
    } finally {
      cleanup();
    }
  });

  it('ignores non-mouse pointer moves', () => {
    let exits = 0;
    const cleanup = attachPointerGrace(document, polygon, () => exits++);
    try {
      dispatchMove(300, 300, 'touch');
      expect(exits).toBe(0);
    } finally {
      cleanup();
    }
  });

  it('removes the listener on cleanup', () => {
    let exits = 0;
    const cleanup = attachPointerGrace(document, polygon, () => exits++);
    cleanup();
    dispatchMove(300, 300);
    expect(exits).toBe(0);
  });
});
