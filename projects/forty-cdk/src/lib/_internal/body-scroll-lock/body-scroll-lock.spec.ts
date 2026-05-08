import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { BodyScrollLock } from './body-scroll-lock';

describe('BodyScrollLock', () => {
  let lock: BodyScrollLock;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    lock = TestBed.inject(BodyScrollLock);
  });

  afterEach(() => {
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    TestBed.resetTestingModule();
  });

  it('sets overflow:hidden on the first lock', () => {
    expect(document.body.style.overflow).toBe('');
    lock.lock();
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('restores overflow on the last unlock', () => {
    document.body.style.overflow = 'auto';
    lock.lock();
    expect(document.body.style.overflow).toBe('hidden');
    lock.unlock();
    expect(document.body.style.overflow).toBe('auto');
  });

  it('refcounts: nested locks only restore on final unlock', () => {
    document.body.style.overflow = 'scroll';
    lock.lock();
    lock.lock();
    expect(document.body.style.overflow).toBe('hidden');

    lock.unlock();
    expect(document.body.style.overflow).toBe('hidden');

    lock.unlock();
    expect(document.body.style.overflow).toBe('scroll');
  });

  it('extra unlock calls are no-ops', () => {
    expect(() => lock.unlock()).not.toThrow();
    expect(() => lock.unlock()).not.toThrow();
    expect(document.body.style.overflow).toBe('');
  });

  it('restores empty padding-right when none was set', () => {
    lock.lock();
    lock.unlock();
    expect(document.body.style.paddingRight).toBe('');
  });

  it('preserves a pre-existing padding-right inline style on unlock', () => {
    document.body.style.paddingRight = '24px';
    lock.lock();
    lock.unlock();
    expect(document.body.style.paddingRight).toBe('24px');
  });

  it('isolates state across application bootstraps', () => {
    lock.lock();
    expect(document.body.style.overflow).toBe('hidden');

    // Tearing down the injector blows away the previous BodyScrollLock
    // instance (and its counter). The next bootstrap starts fresh.
    document.body.style.overflow = '';
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fresh = TestBed.inject(BodyScrollLock);

    fresh.lock();
    expect(document.body.style.overflow).toBe('hidden');
    fresh.unlock();
    expect(document.body.style.overflow).toBe('');
  });
});
