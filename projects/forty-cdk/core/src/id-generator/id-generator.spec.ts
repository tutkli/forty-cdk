import { TestBed } from '@angular/core/testing';
import { APP_ID, provideZonelessChangeDetection } from '@angular/core';

import { IdGenerator, provideForIdSalt } from './id-generator';

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

  it('defaults the salt to APP_ID when no provider is given', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), { provide: APP_ID, useValue: 'salt-default' }],
    });
    expect(TestBed.inject(IdGenerator).next()).toBe('for-salt-default-1');
  });

  it('provideForIdSalt overrides the salt without touching the global APP_ID', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    const defaultAppId = TestBed.inject(APP_ID);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideForIdSalt('x')],
    });
    const id = TestBed.inject(IdGenerator).next();

    expect(id).toBe('for-x-1');
    expect(TestBed.inject(APP_ID)).toBe(defaultAppId);
    expect(defaultAppId).not.toBe('x');
  });

  it('two apps with distinct provideForIdSalt values emit non-colliding ids at identical render order', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideForIdSalt('a')],
    });
    const genA = TestBed.inject(IdGenerator);
    const a1 = genA.next();
    const a2 = genA.next();

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideForIdSalt('b')],
    });
    const genB = TestBed.inject(IdGenerator);
    const b1 = genB.next();
    const b2 = genB.next();

    expect(a1).toBe('for-a-1');
    expect(b1).toBe('for-b-1');
    expect(a1).not.toBe(b1);
    expect(a2).not.toBe(b2);
  });

  it('same salt + same render order produces identical ids across bootstraps (SSR determinism)', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideForIdSalt('app')],
    });
    const a = TestBed.inject(IdGenerator).next();

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideForIdSalt('app')],
    });
    const b = TestBed.inject(IdGenerator).next();

    expect(a).toBe(b);
  });
});
