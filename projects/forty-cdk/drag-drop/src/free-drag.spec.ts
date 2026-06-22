import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { flush, renderHost } from '../../src/test-utils';
import { ForDragHandle } from './drag-handle';
import { ForFreeDrag } from './free-drag';

interface Pos {
  x: number;
  y: number;
}

@Component({
  imports: [ForFreeDrag],
  template: `
    <div
      forFreeDrag
      data-testid="box"
      [(position)]="pos"
      [disabled]="disabled()"
      [lockAxis]="lockAxis()"
      (dragStart)="starts.set([...starts(), $event])"
      (dragMove)="moves.set([...moves(), $event])"
      (dragEnd)="ends.set([...ends(), $event])"
    >
      Drag me
    </div>
  `,
})
class BoxHost {
  readonly pos = signal<Pos>({ x: 0, y: 0 });
  readonly disabled = signal(false);
  readonly lockAxis = signal<'x' | 'y' | null>(null);
  readonly starts = signal<Pos[]>([]);
  readonly moves = signal<Pos[]>([]);
  readonly ends = signal<Pos[]>([]);
}

@Component({
  imports: [ForFreeDrag, ForDragHandle],
  template: `
    <div forFreeDrag data-testid="box" [(position)]="pos">
      <span forDragHandle data-testid="handle">::</span>
      <span data-testid="body">body</span>
    </div>
  `,
})
class HandleHost {
  readonly pos = signal<Pos>({ x: 0, y: 0 });
}

@Component({
  imports: [ForFreeDrag],
  template: `
    <div class="dialog" data-testid="dialog">
      <header forFreeDrag rootElement=".dialog" data-testid="header" [(position)]="pos">
        Drag
      </header>
    </div>
  `,
})
class RootElementHost {
  readonly pos = signal<Pos>({ x: 0, y: 0 });
}

function fire(
  target: EventTarget,
  type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel',
  x: number,
  y: number,
): void {
  target.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      pointerId: 1,
      button: 0,
      pointerType: 'mouse',
    }),
  );
}

describe('ForFreeDrag', () => {
  it('lift → move → commit updates position and emits dragStart / dragMove / dragEnd', () => {
    const { instance, query } = renderHost(BoxHost);
    const box = query('[data-testid="box"]')!;

    fire(box, 'pointerdown', 0, 0);
    fire(box, 'pointermove', 10, 0);
    fire(box, 'pointermove', 40, 30);
    fire(box, 'pointerup', 40, 30);

    expect(instance.pos()).toEqual({ x: 30, y: 30 });
    expect(instance.starts()).toEqual([{ x: 0, y: 0 }]);
    expect(instance.moves().at(-1)).toEqual({ x: 30, y: 30 });
    expect(instance.ends()).toEqual([{ x: 30, y: 30 }]);
  });

  it('lockAxis="x" pins the y axis to its lift-time value', () => {
    const { fixture, instance, query } = renderHost(BoxHost);
    instance.pos.set({ x: 5, y: 7 });
    instance.lockAxis.set('x');
    fixture.detectChanges();
    const box = query('[data-testid="box"]')!;

    fire(box, 'pointerdown', 0, 0);
    fire(box, 'pointermove', 10, 0);
    fire(box, 'pointermove', 40, 30);
    fire(box, 'pointerup', 40, 30);

    expect(instance.pos()).toEqual({ x: 35, y: 7 });
  });

  it('lockAxis="y" pins the x axis to its lift-time value', () => {
    const { fixture, instance, query } = renderHost(BoxHost);
    instance.pos.set({ x: 5, y: 7 });
    instance.lockAxis.set('y');
    fixture.detectChanges();
    const box = query('[data-testid="box"]')!;

    fire(box, 'pointerdown', 0, 0);
    fire(box, 'pointermove', 10, 0);
    fire(box, 'pointermove', 40, 30);
    fire(box, 'pointerup', 40, 30);

    expect(instance.pos()).toEqual({ x: 5, y: 37 });
  });

  it('pointercancel restores the lift-time snapshot and emits dragEnd with it', () => {
    const { fixture, instance, query } = renderHost(BoxHost);
    instance.pos.set({ x: 12, y: 8 });
    fixture.detectChanges();
    const box = query('[data-testid="box"]')!;

    fire(box, 'pointerdown', 0, 0);
    fire(box, 'pointermove', 10, 0);
    fire(box, 'pointermove', 40, 30);
    expect(instance.pos()).toEqual({ x: 42, y: 38 });

    fire(box, 'pointercancel', 40, 30);

    expect(instance.pos()).toEqual({ x: 12, y: 8 });
    expect(instance.ends()).toEqual([{ x: 12, y: 8 }]);
  });

  it('Escape cancels an armed drag and restores the snapshot', () => {
    const { instance, query } = renderHost(BoxHost);
    const box = query('[data-testid="box"]')!;

    fire(box, 'pointerdown', 0, 0);
    fire(box, 'pointermove', 10, 0);
    fire(box, 'pointermove', 40, 30);
    expect(instance.pos()).toEqual({ x: 30, y: 30 });

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(instance.pos()).toEqual({ x: 0, y: 0 });
    expect(instance.ends()).toEqual([{ x: 0, y: 0 }]);
  });

  it('disabled no-ops: no lift, position unchanged, no events', () => {
    const { fixture, instance, query } = renderHost(BoxHost);
    instance.disabled.set(true);
    fixture.detectChanges();
    const box = query('[data-testid="box"]')!;

    fire(box, 'pointerdown', 0, 0);
    fire(box, 'pointermove', 10, 0);
    fire(box, 'pointermove', 40, 30);
    fire(box, 'pointerup', 40, 30);

    expect(instance.pos()).toEqual({ x: 0, y: 0 });
    expect(instance.starts()).toEqual([]);
    expect(instance.moves()).toEqual([]);
    expect(instance.ends()).toEqual([]);
  });

  it('reflects data-dragging while armed and clears it on commit', async () => {
    const { fixture, query } = renderHost(BoxHost);
    const box = query('[data-testid="box"]')!;

    fire(box, 'pointerdown', 0, 0);
    fire(box, 'pointermove', 10, 0);
    await flush(fixture);
    expect(box.hasAttribute('data-dragging')).toBe(true);

    fire(box, 'pointerup', 10, 0);
    await flush(fixture);
    expect(box.hasAttribute('data-dragging')).toBe(false);
  });

  it('sets touch-action:none when no handle is present', () => {
    const { query } = renderHost(BoxHost);
    expect(query('[data-testid="box"]')!.style.touchAction).toBe('none');
  });

  it('clears touch-action when a handle is present', () => {
    const { query } = renderHost(HandleHost);
    expect(query('[data-testid="box"]')!.style.touchAction).toBe('');
  });

  describe('drag handle gating', () => {
    it('does not start a drag from outside the handle', () => {
      const { instance, query } = renderHost(HandleHost);
      const body = query('[data-testid="body"]')!;

      fire(body, 'pointerdown', 0, 0);
      fire(body, 'pointermove', 10, 0);
      fire(body, 'pointermove', 40, 30);
      fire(body, 'pointerup', 40, 30);

      expect(instance.pos()).toEqual({ x: 0, y: 0 });
    });

    it('starts a drag from within the handle', () => {
      const { instance, query } = renderHost(HandleHost);
      const handle = query('[data-testid="handle"]')!;

      fire(handle, 'pointerdown', 0, 0);
      fire(handle, 'pointermove', 10, 0);
      fire(handle, 'pointermove', 40, 30);
      fire(handle, 'pointerup', 40, 30);

      expect(instance.pos()).toEqual({ x: 30, y: 30 });
    });
  });

  it('moves the resolved rootElement ancestor, not the host', async () => {
    const { fixture, query } = renderHost(RootElementHost);
    const header = query('[data-testid="header"]')!;
    const dialog = query('[data-testid="dialog"]')!;

    fire(header, 'pointerdown', 0, 0);
    fire(header, 'pointermove', 10, 0);
    fire(header, 'pointermove', 40, 30);
    fire(header, 'pointerup', 40, 30);
    await flush(fixture);

    expect(dialog.style.transform).toBe('translate(30px, 30px)');
    expect(header.style.transform).toBe('');
  });

  it('applies the position transform to the host (zoneless)', async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(BoxHost);
    fixture.detectChanges();
    await flush(fixture);
    const box = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="box"]',
    ) as HTMLElement;

    fire(box, 'pointerdown', 0, 0);
    fire(box, 'pointermove', 10, 0);
    fire(box, 'pointermove', 40, 30);
    fire(box, 'pointerup', 40, 30);
    await flush(fixture);

    expect(box.style.transform).toBe('translate(30px, 30px)');
    expect(fixture.componentInstance.pos()).toEqual({ x: 30, y: 30 });
  });
});
