import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';

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
    expect(gen.next()).toMatch(/^for-\d+$/);
  });

  it('honors a custom prefix', () => {
    const gen = TestBed.inject(IdGenerator);
    const id = gen.next('disclosure-trigger');
    expect(id).toMatch(/^disclosure-trigger-\d+$/);
  });

  it('shares the same singleton across the app injector', () => {
    expect(TestBed.inject(IdGenerator)).toBe(TestBed.inject(IdGenerator));
  });
});
