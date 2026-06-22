import { clampPreviewPosition } from './clamp-preview';

describe('clampPreviewPosition', () => {
  it('no-op when boundary is null and lockAxis is null — returns desired unchanged', () => {
    const result = clampPreviewPosition({ x: 50, y: 80 }, { width: 40, height: 20 }, null, null, {
      x: 50,
      y: 80,
    });
    expect(result).toEqual({ x: 50, y: 80 });
  });

  it('lockAxis "x" holds y at origin.y while x tracks desired.x', () => {
    const result = clampPreviewPosition({ x: 120, y: 200 }, { width: 40, height: 20 }, null, 'x', {
      x: 50,
      y: 80,
    });
    expect(result).toEqual({ x: 120, y: 80 });
  });

  it('lockAxis "y" holds x at origin.x while y tracks desired.y', () => {
    const result = clampPreviewPosition({ x: 120, y: 200 }, { width: 40, height: 20 }, null, 'y', {
      x: 50,
      y: 80,
    });
    expect(result).toEqual({ x: 50, y: 200 });
  });

  it('boundary clamp — inside: passes position through unchanged when preview fits inside', () => {
    const result = clampPreviewPosition(
      { x: 10, y: 10 },
      { width: 40, height: 20 },
      { left: 0, top: 0, right: 200, bottom: 100 },
      null,
      { x: 10, y: 10 },
    );
    expect(result).toEqual({ x: 10, y: 10 });
  });

  it('boundary clamp — left/top edges: clamps x to boundary.left and y to boundary.top', () => {
    const result = clampPreviewPosition(
      { x: -20, y: -10 },
      { width: 40, height: 20 },
      { left: 0, top: 0, right: 200, bottom: 100 },
      null,
      { x: -20, y: -10 },
    );
    expect(result).toEqual({ x: 0, y: 0 });
  });

  it('boundary clamp — right/bottom edges: clamps to boundary.right - width and boundary.bottom - height', () => {
    const result = clampPreviewPosition(
      { x: 180, y: 90 },
      { width: 40, height: 20 },
      { left: 0, top: 0, right: 200, bottom: 100 },
      null,
      { x: 180, y: 90 },
    );
    expect(result).toEqual({ x: 160, y: 80 });
  });

  it('boundary smaller than preview on an axis pins the preview to the boundary start edge', () => {
    const result = clampPreviewPosition(
      { x: 50, y: 50 },
      { width: 100, height: 60 },
      { left: 10, top: 20, right: 50, bottom: 60 },
      null,
      { x: 50, y: 50 },
    );
    expect(result.x).toBe(10);
    expect(result.y).toBe(20);
  });

  it('lock + boundary combined — locked coordinate held at origin and free coordinate clamped', () => {
    const result = clampPreviewPosition(
      { x: 250, y: 50 },
      { width: 40, height: 20 },
      { left: 0, top: 0, right: 200, bottom: 100 },
      'x',
      { x: 50, y: 30 },
    );
    expect(result.x).toBe(160);
    expect(result.y).toBe(30);
  });
});
