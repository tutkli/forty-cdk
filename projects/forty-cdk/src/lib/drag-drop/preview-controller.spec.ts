import type { DragPreview } from '../_internal/drag-session/drag-preview';
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
});
