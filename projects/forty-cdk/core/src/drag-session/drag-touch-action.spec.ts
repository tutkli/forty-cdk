import {
  BOTH_DRAG_AXES,
  dragHandleTouchAction,
  dragSurfaceTouchAction,
  NO_DRAG_AXES,
} from './drag-touch-action';

describe('dragSurfaceTouchAction', () => {
  const surface = { armable: true, handles: false, hostScrolls: NO_DRAG_AXES };

  it('withholds every pan from a surface dragged along both axes', () => {
    expect(dragSurfaceTouchAction({ ...surface, axes: BOTH_DRAG_AXES })).toBe('none');
  });

  it('leaves the browser the axis the gesture does not move along', () => {
    expect(dragSurfaceTouchAction({ ...surface, axes: { x: true, y: false } })).toBe('pan-y');
    expect(dragSurfaceTouchAction({ ...surface, axes: { x: false, y: true } })).toBe('pan-x');
  });

  it('leaves the browser the axis the host scrolls on by itself', () => {
    expect(
      dragSurfaceTouchAction({
        ...surface,
        axes: BOTH_DRAG_AXES,
        hostScrolls: { x: false, y: true },
      }),
    ).toBe('pan-y');
    expect(
      dragSurfaceTouchAction({
        ...surface,
        axes: { x: false, y: true },
        hostScrolls: { x: false, y: true },
      }),
    ).toBeNull();
  });

  it('sets nothing while the surface cannot arm or while handles carry the drag', () => {
    expect(dragSurfaceTouchAction({ ...surface, axes: BOTH_DRAG_AXES, armable: false })).toBeNull();
    expect(dragSurfaceTouchAction({ ...surface, axes: BOTH_DRAG_AXES, handles: true })).toBeNull();
  });

  it('sets nothing for a gesture that claims no axis', () => {
    expect(dragSurfaceTouchAction({ ...surface, axes: NO_DRAG_AXES })).toBeNull();
  });
});

describe('dragHandleTouchAction', () => {
  it("is 'none' while the drag can arm, else null", () => {
    expect(dragHandleTouchAction(true)).toBe('none');
    expect(dragHandleTouchAction(false)).toBeNull();
  });
});
