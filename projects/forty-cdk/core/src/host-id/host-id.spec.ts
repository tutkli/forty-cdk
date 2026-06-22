import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  Injector,
  provideZonelessChangeDetection,
  runInInjectionContext,
  signal,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { adoptHostId, hostId, resolveHostId } from './host-id';

function withInjector<T>(fn: () => T): T {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection()],
  });
  const injector = TestBed.inject(Injector);
  return runInInjectionContext(injector, fn);
}

describe('resolveHostId', () => {
  it('returns the host element pre-existing static id when present', () => {
    const host = document.createElement('button');
    host.setAttribute('id', 'consumer-id');

    const id = withInjector(() => resolveHostId(host, 'for-x'));

    expect(id).toBe('consumer-id');
  });

  it('returns a generated <prefix>-* id when the host has none', () => {
    const host = document.createElement('button');

    const id = withInjector(() => resolveHostId(host, 'for-x'));

    expect(id).toMatch(/^for-x-[A-Za-z0-9]+-\d+$/);
  });

  it('advances the id counter even when a host id is adopted (stable sequence)', () => {
    const host = document.createElement('button');
    host.setAttribute('id', 'consumer-id');
    const plain = document.createElement('button');

    const { adopted, next } = withInjector(() => ({
      adopted: resolveHostId(host, 'for-x'),
      next: resolveHostId(plain, 'for-x'),
    }));

    expect(adopted).toBe('consumer-id');
    // The adopted call still consumed a counter tick, so the next generated id
    // is the second in the sequence — not the first.
    expect(next).toMatch(/-2$/);
  });
});

describe('adoptHostId', () => {
  it('overwrites the signal with the host static id when present', () => {
    const host = document.createElement('div');
    host.setAttribute('id', 'consumer-id');
    const id = signal('generated-fallback');

    adoptHostId(host, id);

    expect(id()).toBe('consumer-id');
  });

  it('leaves the generated fallback in place when the host has no id', () => {
    const host = document.createElement('div');
    const id = signal('generated-fallback');

    adoptHostId(host, id);

    expect(id()).toBe('generated-fallback');
  });

  it('treats an empty-string id as absent', () => {
    const host = document.createElement('div');
    host.setAttribute('id', '');
    const id = signal('generated-fallback');

    adoptHostId(host, id);

    expect(id()).toBe('generated-fallback');
  });
});

describe('hostId', () => {
  it('adopts a consumer-set static id from the directive host and re-emits it', () => {
    @Directive({
      selector: '[probe]',
      host: { '[id]': 'id()' },
    })
    class ProbeDir {
      readonly id = hostId('for-probe');
    }

    @Component({
      selector: 'host-cmp',
      imports: [ProbeDir],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `<div probe id="my-anchor"></div>`,
    })
    class HostCmp {}

    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(HostCmp);
    fixture.detectChanges();

    const el = fixture.nativeElement.querySelector('div') as HTMLElement;
    expect(el.id).toBe('my-anchor');
  });

  it('falls back to a generated id when the host has none', () => {
    @Directive({
      selector: '[probe]',
      exportAs: 'probe',
      host: { '[id]': 'id()' },
    })
    class ProbeDir {
      readonly id = hostId('for-probe');
    }

    @Component({
      selector: 'host-cmp',
      imports: [ProbeDir],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `<div probe></div>`,
    })
    class HostCmp {}

    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(HostCmp);
    fixture.detectChanges();

    const el = fixture.nativeElement.querySelector('div') as HTMLElement;
    expect(el.id).toMatch(/^for-probe-[A-Za-z0-9]+-\d+$/);
  });

  it('works under provideZonelessChangeDetection', () => {
    const host = document.createElement('div');
    host.setAttribute('id', 'zoneless-id');

    const id = withInjector(() => resolveHostId(host, 'for-x'));

    expect(id).toBe('zoneless-id');
  });
});
