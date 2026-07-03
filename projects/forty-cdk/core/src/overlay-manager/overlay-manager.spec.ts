import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  createComponent,
  DestroyRef,
  effect,
  ErrorHandler,
  inject,
  Injectable,
  InjectionToken,
  Injector,
  type OnInit,
  type Provider,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { flush } from '../../../src/test-utils';
import {
  OverlayManagerCore,
  type OverlayManagerEntry,
  type OverlayManagerOutlet,
  type OverlayManagerOutletHost,
} from './overlay-manager';
import { OverlayRef } from './overlay-ref';

interface TestEntry extends OverlayManagerEntry {
  readonly component: Type<unknown>;
  injectorFor(parent: Injector): Injector;
}

@Component({
  selector: 'test-overlay-outlet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ``,
})
class TestOverlayOutlet implements OverlayManagerOutlet<TestEntry> {
  readonly #destroyRef = inject(DestroyRef);
  host: OverlayManagerOutletHost<TestEntry> | null = null;

  init(host: OverlayManagerOutletHost<TestEntry>): void {
    this.host = host;
    this.#destroyRef.onDestroy(() => host.closeAllForDestroy());
  }
}

@Injectable({ providedIn: 'root' })
class TestManager extends OverlayManagerCore<TestEntry> {
  lastOutlet: TestOverlayOutlet | null = null;

  constructor() {
    super({
      idPrefix: 'test-overlay-instance',
      idAttribute: 'data-test-overlay-id',
      backdropAttribute: 'data-test-overlay-backdrop',
      createOutlet: (environmentInjector) => {
        const ref = createComponent(TestOverlayOutlet, { environmentInjector });
        this.lastOutlet = ref.instance;
        return ref;
      },
    });
  }

  open(): OverlayRef {
    const { id, remove } = this.nextId();
    const ref = new OverlayRef(
      () => this.beginLeave(id, undefined, undefined, remove),
      'programmatic',
    );
    const entry: TestEntry = {
      id,
      ref,
      component: TestOverlayOutlet,
      injectorFor: this.createInjectorFactory([]),
    };
    this.register(entry);
    return ref;
  }

  exposeInjectorFactory(providers: readonly Provider[]): (parent: Injector) => Injector {
    return this.createInjectorFactory(providers);
  }
}

function makeManager(): TestManager {
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  return TestBed.inject(TestManager);
}

describe('OverlayManagerCore', () => {
  afterEach(() => {
    document.querySelectorAll('test-overlay-outlet').forEach((n) => n.remove());
    TestBed.resetTestingModule();
  });

  it('reports openCount reactively as entries open and close', () => {
    const manager = makeManager();
    expect(manager.openCount()).toBe(0);

    const a = manager.open();
    const b = manager.open();
    expect(manager.openCount()).toBe(2);

    a.close();
    expect(manager.openCount()).toBe(1);

    b.close();
    expect(manager.openCount()).toBe(0);
  });

  it('creates the outlet lazily on the first open() and reuses it', () => {
    const manager = makeManager();
    expect(manager.lastOutlet).toBeNull();

    manager.open();
    const first = manager.lastOutlet;
    expect(first).not.toBeNull();

    manager.open();
    expect(manager.lastOutlet).toBe(first);
  });

  it('wires the outlet host with a reactive entries signal', () => {
    const manager = makeManager();
    manager.open();
    expect(manager.lastOutlet!.host!.entries().length).toBe(1);
  });

  it('close() removes the entry immediately when there is nothing to animate', () => {
    const manager = makeManager();
    const ref = manager.open();
    ref.close();
    expect(manager.openCount()).toBe(0);
  });

  it('a second close() is a no-op (the entry is already gone)', () => {
    const manager = makeManager();
    const ref = manager.open();
    ref.close();
    ref.close();
    expect(manager.openCount()).toBe(0);
  });

  it('closes every open entry when the outlet is destroyed', () => {
    const manager = makeManager();
    const a = manager.open();
    const b = manager.open();

    manager.lastOutlet!.host!.closeAllForDestroy();

    expect(a.isClosed()).toBe(true);
    expect(b.isClosed()).toBe(true);
    expect(manager.openCount()).toBe(0);
  });

  describe('open() from within change detection (NG0101 — #1138)', () => {
    class CapturingErrorHandler implements ErrorHandler {
      readonly errors: unknown[] = [];
      handleError(error: unknown): void {
        this.errors.push(error);
      }
    }

    async function openIn(host: Type<unknown>): Promise<{
      handler: CapturingErrorHandler;
      manager: TestManager;
    }> {
      const handler = new CapturingErrorHandler();
      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection(), { provide: ErrorHandler, useValue: handler }],
      });
      const manager = TestBed.inject(TestManager);
      const fixture = TestBed.createComponent(host);
      fixture.detectChanges();
      await flush(fixture);
      return { handler, manager };
    }

    @Component({
      selector: 'effect-opener',
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: ``,
    })
    class EffectOpener {
      constructor() {
        const manager = inject(TestManager);
        effect(() => {
          manager.open();
        });
      }
    }

    @Component({
      selector: 'oninit-opener',
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: ``,
    })
    class OnInitOpener implements OnInit {
      readonly #manager = inject(TestManager);
      ngOnInit(): void {
        this.#manager.open();
      }
    }

    @Component({
      selector: 'after-render-opener',
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: ``,
    })
    class AfterRenderOpener {
      constructor() {
        const manager = inject(TestManager);
        afterNextRender(() => {
          manager.open();
        });
      }
    }

    it('does not throw NG0101 when open() runs inside effect()', async () => {
      const { handler, manager } = await openIn(EffectOpener);
      expect(handler.errors).toEqual([]);
      expect(manager.openCount()).toBe(1);
    });

    it('does not throw NG0101 when open() runs inside ngOnInit', async () => {
      const { handler, manager } = await openIn(OnInitOpener);
      expect(handler.errors).toEqual([]);
      expect(manager.openCount()).toBe(1);
    });

    it('does not throw NG0101 when open() runs inside afterNextRender', async () => {
      const { handler, manager } = await openIn(AfterRenderOpener);
      expect(handler.errors).toEqual([]);
      expect(manager.openCount()).toBe(1);
    });
  });

  describe('createInjectorFactory', () => {
    const TOKEN = new InjectionToken<{ value: string }>('test-overlay-token');

    it('builds an injector that resolves the supplied providers', () => {
      const manager = makeManager();
      const provided = { value: 'x' };
      const factory = manager.exposeInjectorFactory([{ provide: TOKEN, useValue: provided }]);
      const parent = TestBed.inject(Injector);
      const injector = factory(parent);
      expect(injector.get(TOKEN)).toBe(provided);
    });

    it('caches the injector for the same parent', () => {
      const manager = makeManager();
      const factory = manager.exposeInjectorFactory([]);
      const parent = TestBed.inject(Injector);
      expect(factory(parent)).toBe(factory(parent));
    });

    it('rebuilds the injector when the parent changes', () => {
      const manager = makeManager();
      const factory = manager.exposeInjectorFactory([]);
      const parentA = TestBed.inject(Injector);
      const parentB = Injector.create({ parent: parentA, providers: [] });
      expect(factory(parentA)).not.toBe(factory(parentB));
    });
  });
});
