import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Presence } from './presence';

interface FakeAnimation {
  finished: Promise<unknown>;
  resolve(): void;
}

function fakeAnimation(): FakeAnimation {
  let resolveFn: () => void = () => {};
  const finished = new Promise<void>((res) => {
    resolveFn = res;
  });
  return { finished, resolve: resolveFn };
}

function withAnimations(host: HTMLElement, animations: readonly FakeAnimation[]): void {
  Object.defineProperty(host, 'getAnimations', {
    configurable: true,
    value: () => animations.map((a) => ({ finished: a.finished })),
  });
}

function createPresence(host: HTMLElement, open: ReturnType<typeof signal<boolean>>, force?: ReturnType<typeof signal<boolean>>): Presence {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection()],
  });
  return TestBed.runInInjectionContext(
    () => new Presence(host, { open, forceMount: force }),
  );
}

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  TestBed.tick();
}

describe('Presence', () => {
  let host: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    host = document.createElement('div');
    document.body.appendChild(host);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('reports present=true while open is true', () => {
    const open = signal(true);
    const presence = createPresence(host, open);

    expect(presence.present()).toBe(true);
  });

  it('reports present=false when open starts false', () => {
    const open = signal(false);
    const presence = createPresence(host, open);

    expect(presence.present()).toBe(false);
  });

  it('falls back to immediate unmount when no animations are running', async () => {
    const open = signal(true);
    const presence = createPresence(host, open);
    expect(presence.present()).toBe(true);

    open.set(false);
    TestBed.tick();
    expect(presence.present()).toBe(false);
  });

  it('keeps present=true while a closing animation is running, then flips false', async () => {
    const animation = fakeAnimation();
    withAnimations(host, [animation]);

    const open = signal(true);
    const presence = createPresence(host, open);

    open.set(false);
    TestBed.tick();
    expect(presence.present()).toBe(true);

    animation.resolve();
    await flushMicrotasks();

    expect(presence.present()).toBe(false);
  });

  it('waits for all animations before unmounting', async () => {
    const a1 = fakeAnimation();
    const a2 = fakeAnimation();
    withAnimations(host, [a1, a2]);

    const open = signal(true);
    const presence = createPresence(host, open);

    open.set(false);
    TestBed.tick();
    expect(presence.present()).toBe(true);

    a1.resolve();
    await flushMicrotasks();
    expect(presence.present()).toBe(true);

    a2.resolve();
    await flushMicrotasks();
    expect(presence.present()).toBe(false);
  });

  it('cancels pending unmount when open flips back to true mid-exit', async () => {
    const animation = fakeAnimation();
    withAnimations(host, [animation]);

    const open = signal(true);
    const presence = createPresence(host, open);

    open.set(false);
    TestBed.tick();
    open.set(true);
    TestBed.tick();
    expect(presence.present()).toBe(true);

    animation.resolve();
    await flushMicrotasks();

    expect(presence.present()).toBe(true);
  });

  it('handles rapid open→close→open→close cycles using only the latest exit', async () => {
    const first = fakeAnimation();
    const second = fakeAnimation();
    let next: readonly FakeAnimation[] = [first];
    Object.defineProperty(host, 'getAnimations', {
      configurable: true,
      value: () => next.map((a) => ({ finished: a.finished })),
    });

    const open = signal(true);
    const presence = createPresence(host, open);

    open.set(false);
    TestBed.tick();
    open.set(true);
    TestBed.tick();
    next = [second];
    open.set(false);
    TestBed.tick();
    expect(presence.present()).toBe(true);

    first.resolve();
    await flushMicrotasks();
    expect(presence.present()).toBe(true);

    second.resolve();
    await flushMicrotasks();
    expect(presence.present()).toBe(false);
  });

  it('forceMount forces present=true even when open is false', () => {
    const open = signal(false);
    const force = signal(true);
    const presence = createPresence(host, open, force);

    expect(presence.present()).toBe(true);

    open.set(true);
    expect(presence.present()).toBe(true);

    open.set(false);
    expect(presence.present()).toBe(true);
  });
});
