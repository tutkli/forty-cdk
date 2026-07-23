import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  inject,
  Injectable,
  Injector,
  isSignal,
  provideZonelessChangeDetection,
  runInInjectionContext,
  signal,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { flush } from '../../../src/test-utils';
import { registerA11yDescription, registerA11yName, registerHandle } from './register-handle';

interface Handle {
  readonly id: string;
}

@Injectable()
class FakeOwner {
  readonly registered: string[] = [];
  readonly unregistered: string[] = [];
  readonly handlesAdded: Handle[] = [];
  readonly handlesRemoved: Handle[] = [];

  registerLabel(id: string): void {
    this.registered.push(id);
  }
  unregisterLabel(id: string): void {
    this.unregistered.push(id);
  }
  registerDescription(id: string): void {
    this.registered.push(id);
  }
  unregisterDescription(id: string): void {
    this.unregistered.push(id);
  }

  registerHandle(handle: Handle): void {
    this.handlesAdded.push(handle);
  }
  unregisterHandle(handle: Handle): void {
    this.handlesRemoved.push(handle);
  }
}

function setup(): { injector: Injector; owner: FakeOwner } {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), FakeOwner],
  });
  return {
    injector: TestBed.inject(Injector),
    owner: TestBed.inject(FakeOwner),
  };
}

describe('registerHandle', () => {
  it('registers eagerly on construction (sync scheduling)', () => {
    const { injector, owner } = setup();
    const handle: Handle = { id: 'a' };

    runInInjectionContext(injector, () => {
      registerHandle(
        handle,
        (h) => owner.registerHandle(h),
        (h) => owner.unregisterHandle(h),
      );
    });

    expect(owner.handlesAdded).toEqual([handle]);
    expect(owner.handlesRemoved).toEqual([]);
  });

  it('unregisters when the injection context is destroyed', () => {
    const { owner } = setup();

    @Directive({ selector: '[child]' })
    class ChildDir {
      constructor() {
        registerHandle(
          { id: 'a' } as Handle,
          (h) => owner.registerHandle(h),
          (h) => owner.unregisterHandle(h),
        );
      }
    }

    @Component({
      selector: 'host-cmp',
      imports: [ChildDir],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `@if (mounted()) {
        <div child></div>
      }`,
    })
    class HostCmp {
      readonly mounted = signal(true);
    }

    const fixture = TestBed.createComponent(HostCmp);
    fixture.detectChanges();
    expect(owner.handlesAdded.length).toBe(1);
    expect(owner.handlesRemoved.length).toBe(0);

    fixture.componentInstance.mounted.set(false);
    fixture.detectChanges();
    expect(owner.handlesRemoved.length).toBe(1);
    expect(owner.handlesAdded[0]).toBe(owner.handlesRemoved[0]);
  });

  it('handles repeated register / unregister cycles without leaking across destroys', () => {
    const { owner } = setup();
    const ids: string[] = [];

    @Directive({ selector: '[child]' })
    class ChildDir {
      constructor() {
        const id = `h-${owner.handlesAdded.length}`;
        ids.push(id);
        registerHandle(
          { id } as Handle,
          (h) => owner.registerHandle(h),
          (h) => owner.unregisterHandle(h),
        );
      }
    }

    @Component({
      selector: 'host-cmp',
      imports: [ChildDir],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `@for (k of keys(); track k) {
        <div child></div>
      }`,
    })
    class HostCmp {
      readonly keys = signal<number[]>([1, 2, 3]);
    }

    const fixture = TestBed.createComponent(HostCmp);
    fixture.detectChanges();
    expect(owner.handlesAdded.length).toBe(3);
    expect(owner.handlesRemoved.length).toBe(0);

    fixture.componentInstance.keys.set([]);
    fixture.detectChanges();
    expect(owner.handlesRemoved.length).toBe(3);

    fixture.componentInstance.keys.set([4, 5]);
    fixture.detectChanges();
    expect(owner.handlesAdded.length).toBe(5);
    expect(owner.handlesRemoved.length).toBe(3);

    fixture.componentInstance.keys.set([]);
    fixture.detectChanges();
    expect(owner.handlesRemoved.length).toBe(5);
  });

  it('defers register to afterNextRender when scheduling is "afterNextRender"', async () => {
    const { owner } = setup();

    @Directive({ selector: '[child]' })
    class ChildDir {
      constructor() {
        registerHandle(
          { id: 'a' } as Handle,
          (h) => owner.registerHandle(h),
          (h) => owner.unregisterHandle(h),
          'afterNextRender',
        );
      }
    }

    @Component({
      selector: 'host-cmp',
      imports: [ChildDir],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `<div child></div>`,
    })
    class HostCmp {}

    const fixture = TestBed.createComponent(HostCmp);
    // Construction runs but `afterNextRender` hasn't fired yet.
    expect(owner.handlesAdded).toEqual([]);

    await flush(fixture);
    expect(owner.handlesAdded.length).toBe(1);
  });

  it('still calls unregister on destroy when deferred register has already fired', async () => {
    const { owner } = setup();

    @Directive({ selector: '[child]' })
    class ChildDir {
      constructor() {
        registerHandle(
          { id: 'a' } as Handle,
          (h) => owner.registerHandle(h),
          (h) => owner.unregisterHandle(h),
          'afterNextRender',
        );
      }
    }

    @Component({
      selector: 'host-cmp',
      imports: [ChildDir],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `@if (mounted()) {
        <div child></div>
      }`,
    })
    class HostCmp {
      readonly mounted = signal(true);
    }

    const fixture = TestBed.createComponent(HostCmp);
    await flush(fixture);
    expect(owner.handlesAdded.length).toBe(1);

    fixture.componentInstance.mounted.set(false);
    fixture.detectChanges();
    expect(owner.handlesRemoved.length).toBe(1);
    expect(owner.handlesAdded[0]).toBe(owner.handlesRemoved[0]);
  });
});

describe('registerA11yName / registerA11yDescription', () => {
  function setupOwner(): { owner: FakeOwner; injector: Injector } {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), FakeOwner],
    });
    return {
      owner: TestBed.inject(FakeOwner),
      injector: TestBed.inject(Injector),
    };
  }

  it('returns the generated id string and registers it on the owner', () => {
    const { owner, injector } = setupOwner();

    const id = runInInjectionContext(injector, () => registerA11yName(owner, 'for-dialog-title'));

    expect(typeof id).toBe('string');
    expect(isSignal(id)).toBe(false);
    expect(id).toMatch(/^for-dialog-title-[A-Za-z0-9]+-\d+$/);
    expect(owner.registered).toEqual([id]);
  });

  it('unregisters the same id on destroy (label)', () => {
    const { owner } = setupOwner();
    let captured = '';

    @Directive({ selector: '[label]' })
    class LabelDir {
      readonly id = registerA11yName(owner, 'for-x-label');
      constructor() {
        captured = this.id;
      }
    }

    @Component({
      selector: 'host-cmp',
      imports: [LabelDir],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `@if (mounted()) {
        <div label></div>
      }`,
    })
    class HostCmp {
      readonly mounted = signal(true);
    }

    const fixture = TestBed.createComponent(HostCmp);
    fixture.detectChanges();
    expect(owner.registered).toEqual([captured]);

    fixture.componentInstance.mounted.set(false);
    fixture.detectChanges();
    expect(owner.unregistered).toEqual([captured]);
  });

  it('unregisters the same id on destroy (description)', () => {
    const { owner } = setupOwner();
    let captured = '';

    @Directive({ selector: '[desc]' })
    class DescDir {
      readonly id = registerA11yDescription(owner, 'for-x-desc');
      constructor() {
        captured = this.id;
      }
    }

    @Component({
      selector: 'host-cmp',
      imports: [DescDir],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `@if (mounted()) {
        <div desc></div>
      }`,
    })
    class HostCmp {
      readonly mounted = signal(true);
    }

    const fixture = TestBed.createComponent(HostCmp);
    fixture.detectChanges();
    expect(owner.registered).toEqual([captured]);

    fixture.componentInstance.mounted.set(false);
    fixture.detectChanges();
    expect(owner.unregistered).toEqual([captured]);
  });

  it('produces a fresh id per call so multiple titles do not collide', () => {
    const { owner, injector } = setupOwner();

    const a = runInInjectionContext(injector, () => registerA11yName(owner, 'for-x'));
    const b = runInInjectionContext(injector, () => registerA11yName(owner, 'for-x'));

    expect(a).not.toBe(b);
    expect(owner.registered).toEqual([a, b]);
  });

  // Demonstrate that the helpers are usable independently of the application's
  // ChangeDetection mode — covers the "must work zoneless" rule explicitly.
  it('works under provideZonelessChangeDetection', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), FakeOwner],
    });
    const owner = TestBed.inject(FakeOwner);
    const injector = TestBed.inject(Injector);

    const id = runInInjectionContext(injector, () => registerA11yName(owner, 'for-x'));
    expect(owner.registered).toEqual([id]);
  });
});
