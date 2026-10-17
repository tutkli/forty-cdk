import type { DragPreview } from './drag-preview';
import { PreviewController } from './preview-controller';

function fakeFullPreview(): DragPreview & { moves: number; settles: number; destroys: number } {
  return {
    moves: 0,
    settles: 0,
    destroys: 0,
    moveTo() {
      this.moves++;
    },
    settle() {
      this.settles++;
    },
    destroy() {
      this.destroys++;
    },
  };
}

function fakeMinimalPreview(): {
  moveTo(x: number, y: number): void;
  destroy(): void;
  moves: number;
  destroys: number;
} {
  return {
    moves: 0,
    destroys: 0,
    moveTo() {
      this.moves++;
    },
    destroy() {
      this.destroys++;
    },
  };
}

describe('PreviewController', () => {
  let source: HTMLElement;

  beforeEach(() => {
    source = document.createElement('div');
    document.body.appendChild(source);
  });

  afterEach(() => {
    source.remove();
    document.querySelectorAll('[data-for-drag-preview]').forEach((el) => el.remove());
  });

  it('uses a supplied full DragPreview as-is (no wrapping) and positions it on construction', () => {
    const preview = fakeFullPreview();
    const controller = new PreviewController({
      source,
      point: { x: 10, y: 10 },
      preview,
      doc: document,
      boundary: null,
      lockAxis: () => null,
    });
    expect(controller.preview).toBe(preview);
    expect(preview.moves).toBe(1);
  });

  it('wraps a minimal { moveTo, destroy } preview so settle falls back to destroy', () => {
    const minimal = fakeMinimalPreview();
    const controller = new PreviewController({
      source,
      point: { x: 0, y: 0 },
      preview: minimal,
      doc: document,
      boundary: null,
      lockAxis: () => null,
    });
    expect(controller.preview).not.toBe(minimal);
    controller.preview.settle(0, 0, window);
    expect(minimal.destroys).toBe(1);
  });

  it('clones the source into a default preview when none is supplied', () => {
    const controller = new PreviewController({
      source,
      point: { x: 0, y: 0 },
      preview: null,
      doc: document,
      boundary: null,
      lockAxis: () => null,
    });
    expect(document.querySelector('[data-for-drag-preview]')).not.toBeNull();
    controller.destroy();
    expect(document.querySelector('[data-for-drag-preview]')).toBeNull();
  });

  it('moveTo delegates to the underlying preview', () => {
    const preview = fakeFullPreview();
    const controller = new PreviewController({
      source,
      point: { x: 0, y: 0 },
      preview,
      doc: document,
      boundary: null,
      lockAxis: () => null,
    });
    const before = preview.moves;
    controller.moveTo({ x: 5, y: 5 });
    expect(preview.moves).toBe(before + 1);
  });

  it('destroy delegates to the underlying preview', () => {
    const preview = fakeFullPreview();
    const controller = new PreviewController({
      source,
      point: { x: 0, y: 0 },
      preview,
      doc: document,
      boundary: null,
      lockAxis: () => null,
    });
    controller.destroy();
    expect(preview.destroys).toBe(1);
  });

  it('reads the lockAxis accessor live on every move (not captured once at lift)', () => {
    const lockAxis = vi.fn<() => 'x' | 'y' | null>(() => null);
    const controller = new PreviewController({
      source,
      point: { x: 0, y: 0 },
      preview: fakeFullPreview(),
      doc: document,
      boundary: null,
      lockAxis,
    });
    const callsAfterConstruction = lockAxis.mock.calls.length;
    controller.moveTo({ x: 5, y: 5 });
    controller.moveTo({ x: 6, y: 6 });
    expect(lockAxis.mock.calls.length).toBe(callsAfterConstruction + 2);
  });

  describe('boundary clamp measures the floating preview box', () => {
    function rectOf(left: number, top: number, width: number, height: number): DOMRect {
      return {
        left,
        top,
        right: left + width,
        bottom: top + height,
        width,
        height,
        x: left,
        y: top,
        toJSON() {},
      };
    }

    function suppliedPreview(width: number, height: number): DragPreview & { lastX: number } {
      const element = document.createElement('div');
      element.getBoundingClientRect = () => rectOf(0, 0, width, height);
      return {
        lastX: Number.NaN,
        element,
        moveTo(x: number) {
          this.lastX = x;
        },
        settle() {},
        destroy() {},
      };
    }

    function liftWith(preview: DragPreview): PreviewController {
      source.getBoundingClientRect = () => rectOf(0, 0, 50, 40);
      const boundary = document.createElement('div');
      boundary.getBoundingClientRect = () => rectOf(0, 0, 300, 100);
      return new PreviewController({
        source,
        point: { x: 10, y: 20 },
        preview,
        doc: document,
        boundary,
        lockAxis: () => null,
      });
    }

    it('keeps a supplied preview wider than the item inside the boundary', () => {
      const preview = suppliedPreview(200, 40);
      liftWith(preview).moveTo({ x: 290, y: 20 });

      expect(preview.lastX).toBe(100);
    });

    it('lets a supplied preview narrower than the item reach the boundary end edge', () => {
      const preview = suppliedPreview(20, 40);
      liftWith(preview).moveTo({ x: 290, y: 20 });

      expect(preview.lastX).toBe(280);
    });

    it('falls back to the item box for a supplied preview that exposes no element', () => {
      const preview = suppliedPreview(200, 40);
      delete (preview as { element?: HTMLElement }).element;
      liftWith(preview).moveTo({ x: 290, y: 20 });

      expect(preview.lastX).toBe(250);
    });
  });
});
