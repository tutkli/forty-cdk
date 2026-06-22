import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { forceCloseWhenDisabled } from './force-close-when-disabled';

describe('forceCloseWhenDisabled', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('force-closes an open overlay and runs onForceClose when disabled flips to true', () => {
    const open = signal(true);
    const disabled = signal(false);
    let forceCloseCalls = 0;

    TestBed.runInInjectionContext(() => {
      forceCloseWhenDisabled({
        open,
        disabled,
        onForceClose: () => forceCloseCalls++,
      });
    });
    TestBed.tick();

    disabled.set(true);
    TestBed.tick();

    expect(open()).toBe(false);
    expect(forceCloseCalls).toBe(1);
  });

  it('does nothing when disabled flips to true while already closed', () => {
    const open = signal(false);
    const disabled = signal(false);
    let forceCloseCalls = 0;

    TestBed.runInInjectionContext(() => {
      forceCloseWhenDisabled({
        open,
        disabled,
        onForceClose: () => forceCloseCalls++,
      });
    });
    TestBed.tick();

    disabled.set(true);
    TestBed.tick();

    expect(open()).toBe(false);
    expect(forceCloseCalls).toBe(0);
  });

  it('does not re-run as a function of open alone (no read+write cycle)', () => {
    const open = signal(false);
    const disabled = signal(true);
    let forceCloseCalls = 0;

    TestBed.runInInjectionContext(() => {
      forceCloseWhenDisabled({
        open,
        disabled,
        onForceClose: () => forceCloseCalls++,
      });
    });
    TestBed.tick();

    // Opening while disabled does not re-trigger the effect (open is untracked):
    // the carve-out reacts to `disabled` only, so a programmatic open stays open.
    open.set(true);
    TestBed.tick();

    expect(open()).toBe(true);
    expect(forceCloseCalls).toBe(0);
  });
});
