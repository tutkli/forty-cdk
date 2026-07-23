import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';

import { createPointerDragSession, type PointerDragSession } from './pointer-session';
import { DismissableLayer, DismissableLayerStack } from '../dismissable-layer/dismissable-layer';

function pointer(type: string, x: number, y: number, button = 0, pointerId = 1): PointerEvent {
  return new PointerEvent(type, {
    clientX: x,
    clientY: y,
    button,
    pointerId,
    bubbles: true,
    cancelable: true,
  });
}

interface Recorder {
  lifts: number;
  moves: number;
  commits: number;
  cancels: number;
}

function setup(overrides: Partial<Parameters<typeof createPointerDragSession>[0]> = {}): {
  host: HTMLElement;
  session: PointerDragSession;
  rec: Recorder;
} {
  const host = document.createElement('div');
  document.body.appendChild(host);

  const rec: Recorder = { lifts: 0, moves: 0, commits: 0, cancels: 0 };

  const session = createPointerDragSession({
    host,
    document,
    armThreshold: 5,
    canStart: () => true,
    onLift: () => {
      rec.lifts++;
    },
    onMove: () => {
      rec.moves++;
    },
    onCommit: () => {
      rec.commits++;
    },
    onCancel: () => {
      rec.cancels++;
    },
    ...overrides,
  });

  return { host, session, rec };
}

describe('createPointerDragSession', () => {
  let teardown: (() => void)[] = [];

  afterEach(() => {
    for (const fn of teardown) {
      fn();
    }
    teardown = [];
  });

  function track(host: HTMLElement, session: PointerDragSession): void {
    teardown.push(() => {
      session.destroy();
      host.remove();
    });
  }

  it('does not lift before the pointer crosses the arm threshold', () => {
    const { host, session, rec } = setup();
    track(host, session);

    host.dispatchEvent(pointer('pointerdown', 100, 100));
    document.dispatchEvent(pointer('pointermove', 102, 102));

    expect(rec.lifts).toBe(0);
    expect(rec.moves).toBe(0);
  });

  it('lifts once on the first move past the threshold, then moves on subsequent moves', () => {
    const { host, session, rec } = setup();
    track(host, session);

    host.dispatchEvent(pointer('pointerdown', 100, 100));
    document.dispatchEvent(pointer('pointermove', 110, 100));

    expect(rec.lifts).toBe(1);
    expect(rec.moves).toBe(1);

    document.dispatchEvent(pointer('pointermove', 120, 100));
    expect(rec.lifts).toBe(1);
    expect(rec.moves).toBe(2);
  });

  it('commits on pointerup after an armed drag', () => {
    const { host, session, rec } = setup();
    track(host, session);

    host.dispatchEvent(pointer('pointerdown', 100, 100));
    document.dispatchEvent(pointer('pointermove', 110, 100));
    document.dispatchEvent(pointer('pointerup', 110, 100));

    expect(rec.commits).toBe(1);
    expect(rec.cancels).toBe(0);
  });

  it('does not commit when the pointer never armed', () => {
    const { host, session, rec } = setup();
    track(host, session);

    host.dispatchEvent(pointer('pointerdown', 100, 100));
    document.dispatchEvent(pointer('pointerup', 101, 101));

    expect(rec.commits).toBe(0);
    expect(rec.lifts).toBe(0);
  });

  it('cancels on pointercancel', () => {
    const { host, session, rec } = setup();
    track(host, session);

    host.dispatchEvent(pointer('pointerdown', 100, 100));
    document.dispatchEvent(pointer('pointermove', 110, 100));
    document.dispatchEvent(pointer('pointercancel', 110, 100));

    expect(rec.cancels).toBe(1);
    expect(rec.commits).toBe(0);
  });

  it('ignores a press when canStart returns false', () => {
    const { host, session, rec } = setup({ canStart: () => false });
    track(host, session);

    host.dispatchEvent(pointer('pointerdown', 100, 100));
    document.dispatchEvent(pointer('pointermove', 120, 100));

    expect(rec.lifts).toBe(0);
    expect(rec.moves).toBe(0);
  });

  it('stands down when a descendant preventDefaults the pointerdown (no lift, move, or commit)', () => {
    const { host, session, rec } = setup();
    track(host, session);

    const child = document.createElement('button');
    host.appendChild(child);
    const preventer = (event: PointerEvent): void => event.preventDefault();
    child.addEventListener('pointerdown', preventer);
    teardown.push(() => child.removeEventListener('pointerdown', preventer));

    child.dispatchEvent(pointer('pointerdown', 100, 100));
    document.dispatchEvent(pointer('pointermove', 120, 100));
    document.dispatchEvent(pointer('pointerup', 120, 100));

    expect(rec.lifts).toBe(0);
    expect(rec.moves).toBe(0);
    expect(rec.commits).toBe(0);
  });

  it('does not suppress the click after standing down on a prevented pointerdown', () => {
    const { host, session } = setup();
    track(host, session);

    const child = document.createElement('button');
    host.appendChild(child);
    const preventer = (event: PointerEvent): void => event.preventDefault();
    child.addEventListener('pointerdown', preventer);
    teardown.push(() => child.removeEventListener('pointerdown', preventer));

    child.dispatchEvent(pointer('pointerdown', 100, 100));
    document.dispatchEvent(pointer('pointermove', 120, 100));

    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    document.dispatchEvent(click);

    expect(click.defaultPrevented).toBe(false);
  });

  it('still lifts when the pointerdown is not prevented (descendant present)', () => {
    const { host, session, rec } = setup();
    track(host, session);

    const child = document.createElement('button');
    host.appendChild(child);

    child.dispatchEvent(pointer('pointerdown', 100, 100));
    document.dispatchEvent(pointer('pointermove', 120, 100));

    expect(rec.lifts).toBe(1);
    expect(rec.moves).toBe(1);
  });

  it('a canStart that preventDefaults its own pointerdown still arms and lifts (self-prevention)', () => {
    const { host, session, rec } = setup({
      canStart: (event) => {
        event.preventDefault();
        return true;
      },
    });
    track(host, session);

    host.dispatchEvent(pointer('pointerdown', 100, 100));
    document.dispatchEvent(pointer('pointermove', 120, 100));
    document.dispatchEvent(pointer('pointerup', 120, 100));

    expect(rec.lifts).toBe(1);
    expect(rec.moves).toBe(1);
    expect(rec.commits).toBe(1);
  });

  it('stands down when the pointerdown was defaultPrevented before canStart (foreign prevention)', () => {
    const { host, session, rec } = setup();
    track(host, session);

    const preventer = (event: PointerEvent): void => event.preventDefault();
    document.addEventListener('pointerdown', preventer, { capture: true });
    teardown.push(() => document.removeEventListener('pointerdown', preventer, { capture: true }));

    host.dispatchEvent(pointer('pointerdown', 100, 100));
    document.dispatchEvent(pointer('pointermove', 120, 100));
    document.dispatchEvent(pointer('pointerup', 120, 100));

    expect(rec.lifts).toBe(0);
    expect(rec.moves).toBe(0);
    expect(rec.commits).toBe(0);
  });

  it('nested sessions: the inner self-preventing session lifts while the outer stands down', () => {
    const outerHost = document.createElement('div');
    const innerHost = document.createElement('div');
    outerHost.appendChild(innerHost);
    document.body.appendChild(outerHost);

    const outer: Recorder = { lifts: 0, moves: 0, commits: 0, cancels: 0 };
    const inner: Recorder = { lifts: 0, moves: 0, commits: 0, cancels: 0 };

    const outerSession = createPointerDragSession({
      host: outerHost,
      document,
      armThreshold: 5,
      canStart: () => true,
      onLift: () => {
        outer.lifts++;
      },
      onMove: () => {
        outer.moves++;
      },
      onCommit: () => {
        outer.commits++;
      },
      onCancel: () => {
        outer.cancels++;
      },
    });
    const innerSession = createPointerDragSession({
      host: innerHost,
      document,
      armThreshold: 5,
      canStart: (event) => {
        event.preventDefault();
        return true;
      },
      onLift: () => {
        inner.lifts++;
      },
      onMove: () => {
        inner.moves++;
      },
      onCommit: () => {
        inner.commits++;
      },
      onCancel: () => {
        inner.cancels++;
      },
    });
    teardown.push(() => {
      outerSession.destroy();
      innerSession.destroy();
      outerHost.remove();
    });

    innerHost.dispatchEvent(pointer('pointerdown', 100, 100));
    document.dispatchEvent(pointer('pointermove', 120, 100));

    expect(inner.lifts).toBe(1);
    expect(inner.moves).toBe(1);
    expect(outer.lifts).toBe(0);
    expect(outer.moves).toBe(0);
  });

  it('ignores a second pointerdown while a press is already tracked', () => {
    const starts: number[] = [];
    const { host, session } = setup({
      canStart: () => {
        starts.push(1);
        return true;
      },
    });
    track(host, session);

    host.dispatchEvent(pointer('pointerdown', 100, 100));
    host.dispatchEvent(pointer('pointerdown', 200, 200));

    expect(starts.length).toBe(1);
  });

  it('aborts the session when onLift returns false (no further callbacks)', () => {
    const rec: Recorder = { lifts: 0, moves: 0, commits: 0, cancels: 0 };
    const host = document.createElement('div');
    document.body.appendChild(host);
    const session = createPointerDragSession({
      host,
      document,
      armThreshold: 5,
      canStart: () => true,
      onLift: () => {
        rec.lifts++;
        return false;
      },
      onMove: () => {
        rec.moves++;
      },
      onCommit: () => {
        rec.commits++;
      },
      onCancel: () => {
        rec.cancels++;
      },
    });
    track(host, session);

    host.dispatchEvent(pointer('pointerdown', 100, 100));
    document.dispatchEvent(pointer('pointermove', 110, 100));

    expect(rec.lifts).toBe(1);
    expect(rec.moves).toBe(0);

    document.dispatchEvent(pointer('pointermove', 130, 100));
    document.dispatchEvent(pointer('pointerup', 130, 100));

    expect(rec.moves).toBe(0);
    expect(rec.commits).toBe(0);
  });

  it('cancel() aborts an armed drag: fires onCancel and stops further callbacks', () => {
    const { host, session, rec } = setup();
    track(host, session);

    host.dispatchEvent(pointer('pointerdown', 100, 100));
    document.dispatchEvent(pointer('pointermove', 110, 100));
    expect(rec.lifts).toBe(1);

    session.cancel();
    expect(rec.cancels).toBe(1);

    document.dispatchEvent(pointer('pointermove', 130, 100));
    document.dispatchEvent(pointer('pointerup', 130, 100));
    expect(rec.moves).toBe(1);
    expect(rec.commits).toBe(0);
  });

  it('cancel(event) forwards the triggering event to onCancel', () => {
    let received: PointerEvent | undefined = undefined;
    const { host, session } = setup({
      onCancel: (event) => {
        received = event;
      },
    });
    track(host, session);

    host.dispatchEvent(pointer('pointerdown', 100, 100));
    document.dispatchEvent(pointer('pointermove', 110, 100));

    const move = pointer('pointermove', 120, 100);
    session.cancel(move);
    expect(received).toBe(move);
  });

  it('cancel() is a no-op when no press is being tracked', () => {
    const { host, session, rec } = setup();
    track(host, session);

    session.cancel();
    expect(rec.cancels).toBe(0);
  });

  it('a fresh press still arms after cancel() (host listener stays attached)', () => {
    const { host, session, rec } = setup();
    track(host, session);

    host.dispatchEvent(pointer('pointerdown', 100, 100));
    document.dispatchEvent(pointer('pointermove', 110, 100));
    session.cancel();
    expect(rec.cancels).toBe(1);

    host.dispatchEvent(pointer('pointerdown', 200, 200));
    document.dispatchEvent(pointer('pointermove', 210, 200));
    expect(rec.lifts).toBe(2);
  });

  it('suppresses the click that follows an armed release', () => {
    const { host, session } = setup();
    track(host, session);

    host.dispatchEvent(pointer('pointerdown', 100, 100));
    document.dispatchEvent(pointer('pointermove', 110, 100));
    document.dispatchEvent(pointer('pointerup', 110, 100));

    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    document.dispatchEvent(click);

    expect(click.defaultPrevented).toBe(true);
  });

  it('only suppresses the first click after a release', () => {
    const { host, session } = setup();
    track(host, session);

    host.dispatchEvent(pointer('pointerdown', 100, 100));
    document.dispatchEvent(pointer('pointermove', 110, 100));
    document.dispatchEvent(pointer('pointerup', 110, 100));

    document.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    const second = new MouseEvent('click', { bubbles: true, cancelable: true });
    document.dispatchEvent(second);

    expect(second.defaultPrevented).toBe(false);
  });

  it('does not suppress a click after a non-armed release', () => {
    const { host, session } = setup();
    track(host, session);

    host.dispatchEvent(pointer('pointerdown', 100, 100));
    document.dispatchEvent(pointer('pointerup', 101, 101));

    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    document.dispatchEvent(click);

    expect(click.defaultPrevented).toBe(false);
  });

  it('cancels an armed drag on Escape when cancelOnEscape is set', () => {
    const { host, session, rec } = setup({ cancelOnEscape: true });
    track(host, session);

    host.dispatchEvent(pointer('pointerdown', 100, 100));
    document.dispatchEvent(pointer('pointermove', 110, 100));
    expect(rec.lifts).toBe(1);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(rec.cancels).toBe(1);

    document.dispatchEvent(pointer('pointerup', 110, 100));
    expect(rec.commits).toBe(0);
  });

  it('ignores Escape before the drag arms (cancelOnEscape set)', () => {
    const { host, session, rec } = setup({ cancelOnEscape: true });
    track(host, session);

    host.dispatchEvent(pointer('pointerdown', 100, 100));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(rec.cancels).toBe(0);

    document.dispatchEvent(pointer('pointermove', 110, 100));
    expect(rec.lifts).toBe(1);
  });

  it('does not listen for Escape when cancelOnEscape is unset (default)', () => {
    const { host, session, rec } = setup();
    track(host, session);

    host.dispatchEvent(pointer('pointerdown', 100, 100));
    document.dispatchEvent(pointer('pointermove', 110, 100));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(rec.cancels).toBe(0);

    document.dispatchEvent(pointer('pointerup', 110, 100));
    expect(rec.commits).toBe(1);
  });

  it('an armed-drag Escape consumes the event so an ancestor keydown listener never sees it', () => {
    const { host, session, rec } = setup({ cancelOnEscape: true });
    track(host, session);

    let ancestorSaw = false;
    const ancestor = (): void => {
      ancestorSaw = true;
    };
    document.addEventListener('keydown', ancestor);
    teardown.push(() => document.removeEventListener('keydown', ancestor));

    host.dispatchEvent(pointer('pointerdown', 100, 100));
    document.dispatchEvent(pointer('pointermove', 110, 100));
    expect(rec.lifts).toBe(1);

    const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    host.dispatchEvent(escape);

    expect(rec.cancels).toBe(1);
    expect(escape.defaultPrevented).toBe(true);
    expect(ancestorSaw).toBe(false);
  });

  it('leaves Escape untouched before the drag arms, so a plain Escape still reaches ancestors', () => {
    const { host, session, rec } = setup({ cancelOnEscape: true });
    track(host, session);

    let ancestorSaw = false;
    const ancestor = (): void => {
      ancestorSaw = true;
    };
    document.addEventListener('keydown', ancestor);
    teardown.push(() => document.removeEventListener('keydown', ancestor));

    host.dispatchEvent(pointer('pointerdown', 100, 100));
    const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    host.dispatchEvent(escape);

    expect(rec.cancels).toBe(0);
    expect(escape.defaultPrevented).toBe(false);
    expect(ancestorSaw).toBe(true);
  });

  it('an armed-drag Escape cancels the drag without dismissing an enclosing dismissable layer', () => {
    const stack = TestBed.inject(DismissableLayerStack);
    const overlayHost = document.createElement('div');
    document.body.appendChild(overlayHost);
    const layer = new DismissableLayer(overlayHost, stack);
    let dismissed = 0;
    layer.activate({ onDismiss: () => dismissed++ });

    const host = document.createElement('div');
    overlayHost.appendChild(host);
    const rec: Recorder = { lifts: 0, moves: 0, commits: 0, cancels: 0 };
    const session = createPointerDragSession({
      host,
      document,
      armThreshold: 5,
      cancelOnEscape: true,
      canStart: () => true,
      onLift: () => {
        rec.lifts++;
      },
      onMove: () => {
        rec.moves++;
      },
      onCommit: () => {
        rec.commits++;
      },
      onCancel: () => {
        rec.cancels++;
      },
    });
    teardown.push(() => {
      session.destroy();
      layer.deactivate();
      overlayHost.remove();
    });

    host.dispatchEvent(pointer('pointerdown', 100, 100));
    document.dispatchEvent(pointer('pointermove', 110, 100));
    expect(rec.lifts).toBe(1);

    host.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    );
    expect(rec.cancels).toBe(1);
    expect(dismissed).toBe(0);

    host.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    );
    expect(dismissed).toBe(1);
  });

  it('lift → move → commit still works with capturePointer set (capture no-ops in jsdom)', () => {
    const { host, session, rec } = setup({ capturePointer: true });
    track(host, session);

    host.dispatchEvent(pointer('pointerdown', 100, 100));
    document.dispatchEvent(pointer('pointermove', 110, 100));
    document.dispatchEvent(pointer('pointermove', 120, 100));
    document.dispatchEvent(pointer('pointerup', 120, 100));

    expect(rec.lifts).toBe(1);
    expect(rec.moves).toBe(2);
    expect(rec.commits).toBe(1);
  });

  it('ignores a pointermove from a different pointerId (multi-touch)', () => {
    const { host, session, rec } = setup();
    track(host, session);

    host.dispatchEvent(pointer('pointerdown', 100, 100, 0, 1));
    document.dispatchEvent(pointer('pointermove', 200, 100, 0, 2));

    expect(rec.lifts).toBe(0);
    expect(rec.moves).toBe(0);
  });

  it('ignores a pointerup from a different pointerId (does not commit the first drag)', () => {
    const { host, session, rec } = setup();
    track(host, session);

    host.dispatchEvent(pointer('pointerdown', 100, 100, 0, 1));
    document.dispatchEvent(pointer('pointermove', 110, 100, 0, 1));
    expect(rec.lifts).toBe(1);

    document.dispatchEvent(pointer('pointerup', 110, 100, 0, 2));
    expect(rec.commits).toBe(0);

    document.dispatchEvent(pointer('pointerup', 110, 100, 0, 1));
    expect(rec.commits).toBe(1);
  });

  it('ignores a pointercancel from a different pointerId (does not cancel the first drag)', () => {
    const { host, session, rec } = setup();
    track(host, session);

    host.dispatchEvent(pointer('pointerdown', 100, 100, 0, 1));
    document.dispatchEvent(pointer('pointermove', 110, 100, 0, 1));
    expect(rec.lifts).toBe(1);

    document.dispatchEvent(pointer('pointercancel', 110, 100, 0, 2));
    expect(rec.cancels).toBe(0);

    document.dispatchEvent(pointer('pointercancel', 110, 100, 0, 1));
    expect(rec.cancels).toBe(1);
  });

  it('the initiating pointerId still drives and commits the session', () => {
    const { host, session, rec } = setup();
    track(host, session);

    host.dispatchEvent(pointer('pointerdown', 100, 100, 0, 1));
    document.dispatchEvent(pointer('pointermove', 110, 100, 0, 1));
    document.dispatchEvent(pointer('pointermove', 200, 100, 0, 2));
    document.dispatchEvent(pointer('pointermove', 120, 100, 0, 1));
    document.dispatchEvent(pointer('pointerup', 120, 100, 0, 1));

    expect(rec.lifts).toBe(1);
    expect(rec.moves).toBe(2);
    expect(rec.commits).toBe(1);
  });

  it('destroy() stops the host listener from starting new sessions', () => {
    const { host, session, rec } = setup();
    host.remove();
    session.destroy();

    host.dispatchEvent(pointer('pointerdown', 100, 100));
    document.dispatchEvent(pointer('pointermove', 120, 100));

    expect(rec.lifts).toBe(0);
  });

  it('destroy() aborts an in-flight armed drag and fires onCancel when cancelOnDestroy is set', () => {
    const { host, session, rec } = setup({ cancelOnDestroy: true });
    teardown.push(() => host.remove());

    host.dispatchEvent(pointer('pointerdown', 100, 100));
    document.dispatchEvent(pointer('pointermove', 110, 100));
    expect(rec.lifts).toBe(1);

    session.destroy();
    expect(rec.cancels).toBe(1);
  });

  it('destroy() does not fire onCancel by default (cancelOnDestroy unset)', () => {
    const { host, session, rec } = setup();
    teardown.push(() => host.remove());

    host.dispatchEvent(pointer('pointerdown', 100, 100));
    document.dispatchEvent(pointer('pointermove', 110, 100));
    expect(rec.lifts).toBe(1);

    session.destroy();
    expect(rec.cancels).toBe(0);
  });

  it('destroy() fires onCancel for a tracked-but-not-armed press when cancelOnDestroy is set', () => {
    const { host, session, rec } = setup({ cancelOnDestroy: true });
    teardown.push(() => host.remove());

    host.dispatchEvent(pointer('pointerdown', 100, 100));

    session.destroy();
    expect(rec.cancels).toBe(1);
    expect(rec.lifts).toBe(0);
  });

  it('destroy() after a completed drag fires no onCancel even with cancelOnDestroy set', () => {
    const { host, session, rec } = setup({ cancelOnDestroy: true });
    teardown.push(() => host.remove());

    host.dispatchEvent(pointer('pointerdown', 100, 100));
    document.dispatchEvent(pointer('pointermove', 110, 100));
    document.dispatchEvent(pointer('pointerup', 110, 100));
    expect(rec.commits).toBe(1);

    session.destroy();
    expect(rec.cancels).toBe(0);
  });

  it('works under provideZonelessChangeDetection', () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    const { host, session, rec } = setup();
    track(host, session);

    host.dispatchEvent(pointer('pointerdown', 100, 100));
    document.dispatchEvent(pointer('pointermove', 110, 100));
    document.dispatchEvent(pointer('pointerup', 110, 100));

    expect(rec.lifts).toBe(1);
    expect(rec.commits).toBe(1);
  });

  it('stands down on a prevented pointerdown under provideZonelessChangeDetection', () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    const { host, session, rec } = setup();
    track(host, session);

    const child = document.createElement('button');
    host.appendChild(child);
    const preventer = (event: PointerEvent): void => event.preventDefault();
    child.addEventListener('pointerdown', preventer);
    teardown.push(() => child.removeEventListener('pointerdown', preventer));

    child.dispatchEvent(pointer('pointerdown', 100, 100));
    document.dispatchEvent(pointer('pointermove', 120, 100));
    document.dispatchEvent(pointer('pointerup', 120, 100));

    expect(rec.lifts).toBe(0);
    expect(rec.commits).toBe(0);
  });
});
