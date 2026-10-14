import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { StationaryPointerMoves } from './stationary-pointer-moves';

function move(clientX: number, clientY: number, pointerId = 1): PointerEvent {
  return new PointerEvent('pointermove', { bubbles: true, clientX, clientY, pointerId });
}

function scroll(): void {
  document.body.dispatchEvent(new Event('scroll'));
}

describe('StationaryPointerMoves', () => {
  let moves: StationaryPointerMoves;
  let releases: (() => void)[];

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    moves = TestBed.inject(StationaryPointerMoves);
    releases = [moves.acquire()];
  });

  afterEach(() => {
    for (const release of releases) {
      release();
    }
  });

  it('marks a move at the previous coordinates after a scroll', () => {
    moves.isStationary(move(10, 20));
    scroll();
    expect(moves.isStationary(move(10, 20))).toBe(true);
  });

  it('marks the moves of a scroll that keeps going under a resting cursor', () => {
    moves.isStationary(move(10, 20));
    scroll();
    moves.isStationary(move(10, 20));
    scroll();
    expect(moves.isStationary(move(10, 20))).toBe(true);
  });

  it('does not mark a repeated move with no scroll between', () => {
    moves.isStationary(move(10, 20));
    expect(moves.isStationary(move(10, 20))).toBe(false);
  });

  it('does not mark a move that changed coordinates after a scroll', () => {
    moves.isStationary(move(10, 20));
    scroll();
    expect(moves.isStationary(move(10, 21))).toBe(false);
  });

  it('does not mark a move from a different pointer', () => {
    moves.isStationary(move(10, 20, 1));
    scroll();
    expect(moves.isStationary(move(10, 20, 2))).toBe(false);
  });

  it('does not mark the first move it sees', () => {
    scroll();
    expect(moves.isStationary(move(10, 20))).toBe(false);
  });

  it('answers the same for one event however many hosts it bubbles through', () => {
    moves.isStationary(move(10, 20));
    scroll();
    const stationary = move(10, 20);
    expect(moves.isStationary(stationary)).toBe(true);
    expect(moves.isStationary(stationary)).toBe(true);

    const moved = move(11, 20);
    expect(moves.isStationary(moved)).toBe(false);
    expect(moves.isStationary(moved)).toBe(false);
  });

  it('sees a scroll of any element through the capture phase', () => {
    const scroller = document.createElement('div');
    document.body.appendChild(scroller);
    try {
      moves.isStationary(move(10, 20));
      scroller.dispatchEvent(new Event('scroll'));
      expect(moves.isStationary(move(10, 20))).toBe(true);
    } finally {
      scroller.remove();
    }
  });

  it('installs a document scroll listener only, and removes it once every holder released', () => {
    releases.pop()!();
    const add = vi.spyOn(document, 'addEventListener');
    const release = moves.acquire();
    releases.push(moves.acquire());
    expect(add.mock.calls.map(([type]) => type)).toEqual(['scroll']);
    const signal = (add.mock.calls[0]![2] as AddEventListenerOptions).signal!;

    release();
    release();
    expect(signal.aborted).toBe(false);
    releases.pop()!();
    expect(signal.aborted).toBe(true);
  });

  it('forgets the last move when it starts listening again', () => {
    moves.isStationary(move(10, 20));
    releases.pop()!();
    releases.push(moves.acquire());
    scroll();
    expect(moves.isStationary(move(10, 20))).toBe(false);
  });
});
