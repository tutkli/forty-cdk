import { TestBed } from '@angular/core/testing';
import { APP_ID, provideZonelessChangeDetection } from '@angular/core';

import { IdGenerator } from './id-generator';

describe('IdGenerator', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
  });

  it('produces unique ids on consecutive calls', () => {
    const gen = TestBed.inject(IdGenerator);
    const a = gen.next();
    const b = gen.next();
    const c = gen.next();

    expect(a).not.toBe(b);
    expect(b).not.toBe(c);
    expect(a).not.toBe(c);
  });

  it('uses the default `for` prefix', () => {
    const gen = TestBed.inject(IdGenerator);
    expect(gen.next()).toMatch(/^for-[A-Za-z0-9]+-\d+$/);
  });

  it('honors a custom prefix', () => {
    const gen = TestBed.inject(IdGenerator);
    const id = gen.next('disclosure-trigger');
    expect(id).toMatch(/^disclosure-trigger-[A-Za-z0-9]+-\d+$/);
  });

  it('shares the same singleton across the app injector', () => {
    expect(TestBed.inject(IdGenerator)).toBe(TestBed.inject(IdGenerator));
  });

  it('salts ids with APP_ID so distinct apps do not collide', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), { provide: APP_ID, useValue: 'app-a' }],
    });
    const a = TestBed.inject(IdGenerator).next();

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), { provide: APP_ID, useValue: 'app-b' }],
    });
    const b = TestBed.inject(IdGenerator).next();

    expect(a).toContain('app-a');
    expect(b).toContain('app-b');
    expect(a).not.toBe(b);
  });

  it('two distinct-APP_ID apps emit non-colliding ids at identical render order', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), { provide: APP_ID, useValue: 'app-a' }],
    });
    const genA = TestBed.inject(IdGenerator);
    const a1 = genA.next();
    const a2 = genA.next();

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), { provide: APP_ID, useValue: 'app-b' }],
    });
    const genB = TestBed.inject(IdGenerator);
    const b1 = genB.next();
    const b2 = genB.next();

    expect(a1).not.toBe(b1);
    expect(a2).not.toBe(b2);
  });
});
