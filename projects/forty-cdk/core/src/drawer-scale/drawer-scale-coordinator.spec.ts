import {
  Component,
  inject,
  provideZonelessChangeDetection,
  signal,
  type WritableSignal,
} from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { type ForDrawerSide } from '../drawer-stack/drawer-side';
import { type DrawerStackNode, ForDrawerStack } from '../drawer-stack/drawer-stack';
import { flush, withReducedMotion } from '../../../src/test-utils';
import { ForDrawerScaleCoordinator, type ForDrawerScaleConfig } from './drawer-scale-coordinator';

const DEFAULT_CONFIG: ForDrawerScaleConfig = {
  setBackgroundColorOnScale: true,
  scaleAmount: 0.95,
  scaleTranslateYpx: 14,
  scaleBorderRadiusPx: 8,
  scaleBackgroundColor: 'black',
};

@Component({ template: `` })
class CoordinatorHost {
  readonly coordinator = inject(ForDrawerScaleCoordinator);
  readonly drawerStack = inject(ForDrawerStack);
}

function makeWrapper(): HTMLElement {
  const el = document.createElement('div');
  el.id = 'wrapper';
  document.body.appendChild(el);
  return el;
}

function makeDrawerHost(id: string): HTMLElement {
  const el = document.createElement('div');
  el.id = id;
  document.body.appendChild(el);
  return el;
}

interface PushedNode {
  readonly node: DrawerStackNode;
  readonly dragging: WritableSignal<boolean>;
  readonly side: WritableSignal<ForDrawerSide>;
  cleanup(): void;
}

function pushNode(
  drawerStack: ForDrawerStack,
  partial: Pick<DrawerStackNode, 'host' | 'parent'> & {
    side?: ForDrawerSide;
    nestedScaleAmount?: number;
    nestedTranslateYpx?: number;
  },
): PushedNode {
  const draggingSig = signal(false);
  const sideSig = signal<ForDrawerSide>(partial.side ?? 'bottom');
  const node: DrawerStackNode = {
    host: partial.host,
    parent: partial.parent,
    nestedScaleAmount: partial.nestedScaleAmount ?? 0.93,
    nestedTranslateYpx: partial.nestedTranslateYpx ?? 8,
    dragging: draggingSig.asReadonly(),
    side: sideSig.asReadonly(),
  };
  const handle = drawerStack.push(node);
  return {
    node,
    dragging: draggingSig,
    side: sideSig,
    cleanup: handle.cleanup,
  };
}

async function createHost(): Promise<{
  coordinator: ForDrawerScaleCoordinator;
  drawerStack: ForDrawerStack;
  fixture: ComponentFixture<CoordinatorHost>;
}> {
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  const fixture = TestBed.createComponent(CoordinatorHost);
  await flush(fixture);
  return {
    coordinator: fixture.componentInstance.coordinator,
    drawerStack: fixture.componentInstance.drawerStack,
    fixture,
  };
}

describe('ForDrawerScaleCoordinator', () => {
  let wrapper: HTMLElement;

  beforeEach(() => {
    document.body.style.backgroundColor = '';
    wrapper = makeWrapper();
  });

  afterEach(() => {
    wrapper.remove();
    document.body.style.backgroundColor = '';
  });

  it('does nothing while no drawer is registered', async () => {
    const { coordinator, fixture } = await createHost();
    coordinator.registerWrapper(wrapper);
    await flush(fixture);

    expect(coordinator.active()).toBe(false);
    expect(wrapper.style.transform).toBe('');
    expect(document.body.style.backgroundColor).toBe('');
  });

  it('applies wrapper styles + body color on first drawer registration', async () => {
    const { coordinator, fixture } = await createHost();
    coordinator.registerWrapper(wrapper);
    coordinator.registerDrawer(DEFAULT_CONFIG);
    await flush(fixture);

    expect(coordinator.active()).toBe(true);
    expect(wrapper.style.transform).toContain('scale(0.95)');
    expect(wrapper.style.transform).toContain('14px');
    expect(wrapper.style.borderRadius).toBe('8px');
    expect(wrapper.style.overflow).toBe('hidden');
    expect(wrapper.style.transformOrigin).toBe('top');
    expect(document.body.style.backgroundColor).toBe('black');
  });

  it('honours setBackgroundColorOnScale=false (no body color)', async () => {
    const { coordinator, fixture } = await createHost();
    coordinator.registerWrapper(wrapper);
    coordinator.registerDrawer({ ...DEFAULT_CONFIG, setBackgroundColorOnScale: false });
    await flush(fixture);

    expect(coordinator.active()).toBe(true);
    expect(wrapper.style.transform).toContain('scale(0.95)');
    expect(document.body.style.backgroundColor).toBe('');
  });

  it('LIFO: 2 drawers — closing the bottom keeps topmost styles applied', async () => {
    const { coordinator, fixture } = await createHost();
    coordinator.registerWrapper(wrapper);
    const cleanupBottom = coordinator.registerDrawer(DEFAULT_CONFIG);
    coordinator.registerDrawer({ ...DEFAULT_CONFIG, scaleAmount: 0.9 });
    await flush(fixture);

    expect(wrapper.style.transform).toContain('scale(0.9)');

    cleanupBottom();
    await flush(fixture);
    expect(wrapper.style.transform).toContain('scale(0.9)');
  });

  it('LIFO: closing topmost reveals previous drawer config', async () => {
    const { coordinator, fixture } = await createHost();
    coordinator.registerWrapper(wrapper);
    coordinator.registerDrawer(DEFAULT_CONFIG);
    const cleanupTop = coordinator.registerDrawer({ ...DEFAULT_CONFIG, scaleAmount: 0.9 });
    await flush(fixture);
    expect(wrapper.style.transform).toContain('scale(0.9)');

    cleanupTop();
    await flush(fixture);
    expect(wrapper.style.transform).toContain('scale(0.95)');
  });

  it('reverts wrapper + body to captured snapshot when last drawer closes', async () => {
    wrapper.style.transform = 'translateZ(0)';
    wrapper.style.borderRadius = '4px';
    document.body.style.backgroundColor = 'rgb(255, 255, 255)';

    const { coordinator, fixture } = await createHost();
    coordinator.registerWrapper(wrapper);
    const cleanup = coordinator.registerDrawer(DEFAULT_CONFIG);
    await flush(fixture);

    expect(wrapper.style.transform).toContain('scale(0.95)');
    expect(document.body.style.backgroundColor).toBe('black');

    cleanup();
    await flush(fixture);

    expect(wrapper.style.transform).toBe('translateZ(0)');
    expect(wrapper.style.borderRadius).toBe('4px');
    expect(document.body.style.backgroundColor).toBe('rgb(255, 255, 255)');
  });

  it('throws if a second wrapper is registered while another is alive', async () => {
    const { coordinator } = await createHost();
    coordinator.registerWrapper(wrapper);

    const second = makeWrapper();
    try {
      expect(() => coordinator.registerWrapper(second)).toThrow(
        /Multiple \[forDrawerWrapper\] registered/,
      );
    } finally {
      second.remove();
    }
  });

  it('allows re-registering after the previous wrapper is cleaned up', async () => {
    const { coordinator } = await createHost();
    const cleanup = coordinator.registerWrapper(wrapper);
    cleanup();

    const second = makeWrapper();
    try {
      expect(() => coordinator.registerWrapper(second)).not.toThrow();
    } finally {
      second.remove();
    }
  });

  it('drawer registered before wrapper does not crash; effect applies once wrapper mounts', async () => {
    const { coordinator, fixture } = await createHost();
    expect(() => coordinator.registerDrawer(DEFAULT_CONFIG)).not.toThrow();
    await flush(fixture);

    expect(coordinator.active()).toBe(false);
    expect(wrapper.style.transform).toBe('');

    coordinator.registerWrapper(wrapper);
    await flush(fixture);

    expect(coordinator.active()).toBe(true);
    expect(wrapper.style.transform).toContain('scale(0.95)');
  });
});

describe('ForDrawerScaleCoordinator under prefers-reduced-motion: reduce', () => {
  let wrapper: HTMLElement;
  let restoreReducedMotion: () => void;

  beforeEach(() => {
    restoreReducedMotion = withReducedMotion();
    document.body.style.backgroundColor = '';
    wrapper = makeWrapper();
  });

  afterEach(() => {
    wrapper.remove();
    document.body.style.backgroundColor = '';
    restoreReducedMotion();
  });

  it('suppresses the effect entirely while reduced-motion is set', async () => {
    const { coordinator, fixture } = await createHost();
    coordinator.registerWrapper(wrapper);
    coordinator.registerDrawer(DEFAULT_CONFIG);
    await flush(fixture);

    expect(coordinator.active()).toBe(false);
    expect(wrapper.style.transform).toBe('');
    expect(document.body.style.backgroundColor).toBe('');
  });
});

describe('ForDrawerScaleCoordinator nested-state transform', () => {
  const created: HTMLElement[] = [];
  function track(el: HTMLElement): HTMLElement {
    created.push(el);
    return el;
  }

  afterEach(() => {
    for (const el of created.splice(0)) el.remove();
  });

  it('applies the parent nested-state transform when a child is pushed', async () => {
    const { drawerStack, fixture } = await createHost();
    const parentEl = track(makeDrawerHost('parent'));

    const parent = pushNode(drawerStack, { host: parentEl, parent: null });
    await flush(fixture);

    expect(parentEl.style.transform).toBe('');

    const childEl = track(makeDrawerHost('child'));
    pushNode(drawerStack, { host: childEl, parent: parentEl });
    await flush(fixture);

    expect(parentEl.style.transform).toContain('scale(0.93)');
    // bottom side → translate up by 8px on Y axis.
    expect(parentEl.style.transform).toContain('-8px');

    // Sanity: child has no descendants → no transform.
    expect(childEl.style.transform).toBe('');

    // Sanity: parent kept the visual no matter how the parent's
    // own dragging signal flips later.
    expect(parent.dragging()).toBe(false);
  });

  it('releases the parent transform when the child pops', async () => {
    const { drawerStack, fixture } = await createHost();
    const parentEl = track(makeDrawerHost('parent'));
    const childEl = track(makeDrawerHost('child'));

    pushNode(drawerStack, { host: parentEl, parent: null });
    const child = pushNode(drawerStack, { host: childEl, parent: parentEl });
    await flush(fixture);
    expect(parentEl.style.transform).toContain('scale(0.93)');

    child.cleanup();
    await flush(fixture);

    expect(parentEl.style.transform).toBe('');
  });

  it('honours per-side direction: top → translates down on Y', async () => {
    const { drawerStack, fixture } = await createHost();
    const parentEl = track(makeDrawerHost('parent'));
    const childEl = track(makeDrawerHost('child'));

    pushNode(drawerStack, { host: parentEl, parent: null, side: 'top' });
    pushNode(drawerStack, { host: childEl, parent: parentEl, side: 'top' });
    await flush(fixture);

    expect(parentEl.style.transform).toContain('scale(0.93)');
    // top side → sign +1 → translate down by +8px.
    expect(parentEl.style.transform).toContain('8px');
    expect(parentEl.style.transform).not.toContain('-8px');
  });

  it('honours per-side direction: left → negative X translation', async () => {
    const { drawerStack, fixture } = await createHost();
    const parentEl = track(makeDrawerHost('parent'));
    const childEl = track(makeDrawerHost('child'));

    pushNode(drawerStack, { host: parentEl, parent: null, side: 'left' });
    pushNode(drawerStack, { host: childEl, parent: parentEl, side: 'left' });
    await flush(fixture);

    // Match the canonical translate3d(-8px, 0px, 0) substring.
    expect(parentEl.style.transform).toContain('translate3d(-8px, 0px, 0)');
  });

  it('honours per-side direction: right → positive X translation', async () => {
    const { drawerStack, fixture } = await createHost();
    const parentEl = track(makeDrawerHost('parent'));
    const childEl = track(makeDrawerHost('child'));

    pushNode(drawerStack, { host: parentEl, parent: null, side: 'right' });
    pushNode(drawerStack, { host: childEl, parent: parentEl, side: 'right' });
    await flush(fixture);

    expect(parentEl.style.transform).toContain('translate3d(8px, 0px, 0)');
  });

  it('recomputes the parent nested transform when the parent side flips at runtime', async () => {
    const { drawerStack, fixture } = await createHost();
    const parentEl = track(makeDrawerHost('parent'));
    const childEl = track(makeDrawerHost('child'));

    const parent = pushNode(drawerStack, { host: parentEl, parent: null });
    pushNode(drawerStack, { host: childEl, parent: parentEl });
    await flush(fixture);

    expect(parentEl.style.transform).toContain('translate3d(0px, -8px, 0)');

    parent.side.set('right');
    await flush(fixture);

    expect(parentEl.style.transform).toContain('translate3d(8px, 0px, 0)');
  });

  it('uses per-node nestedScaleAmount / nestedTranslateYpx (resolved from its scope)', async () => {
    const { drawerStack, fixture } = await createHost();
    const parentEl = track(makeDrawerHost('parent'));
    const childEl = track(makeDrawerHost('child'));

    pushNode(drawerStack, {
      host: parentEl,
      parent: null,
      nestedScaleAmount: 0.85,
      nestedTranslateYpx: 12,
    });
    pushNode(drawerStack, { host: childEl, parent: parentEl });
    await flush(fixture);

    expect(parentEl.style.transform).toContain('scale(0.85)');
    expect(parentEl.style.transform).toContain('-12px');
  });

  it('does not stomp the host transform while the parent is dragging', async () => {
    const { drawerStack, fixture } = await createHost();
    const parentEl = track(makeDrawerHost('parent'));
    const childEl = track(makeDrawerHost('child'));

    const parent = pushNode(drawerStack, { host: parentEl, parent: null });
    pushNode(drawerStack, { host: childEl, parent: parentEl });
    await flush(fixture);
    expect(parentEl.style.transform).toContain('scale(0.93)');

    // Simulate the swipe handler entering a gesture. The drawer flips
    // `dragging` to true and writes its own translate3d to style.transform.
    parent.dragging.set(true);
    parentEl.style.transform = 'translate3d(0px, 30px, 0)';
    await flush(fixture);

    // Coordinator must NOT have stomped the imperative transform.
    expect(parentEl.style.transform).toBe('translate3d(0px, 30px, 0)');

    // Release: dragging flips back to false. Coordinator reapplies the
    // nested transform.
    parent.dragging.set(false);
    await flush(fixture);
    expect(parentEl.style.transform).toContain('scale(0.93)');
  });

  it('applies nested transform on grandparent + parent in a 3-level stack', async () => {
    const { drawerStack, fixture } = await createHost();
    const grandparentEl = track(makeDrawerHost('grandparent'));
    const parentEl = track(makeDrawerHost('parent'));
    const childEl = track(makeDrawerHost('child'));

    pushNode(drawerStack, { host: grandparentEl, parent: null });
    pushNode(drawerStack, { host: parentEl, parent: grandparentEl });
    pushNode(drawerStack, { host: childEl, parent: parentEl });
    await flush(fixture);

    expect(grandparentEl.style.transform).toContain('scale(0.93)');
    expect(parentEl.style.transform).toContain('scale(0.93)');
    expect(childEl.style.transform).toBe('');
  });
});

describe('ForDrawerScaleCoordinator nested-state transform under prefers-reduced-motion: reduce', () => {
  const created: HTMLElement[] = [];
  function track(el: HTMLElement): HTMLElement {
    created.push(el);
    return el;
  }

  let restoreReducedMotion: () => void;

  beforeEach(() => {
    restoreReducedMotion = withReducedMotion();
  });

  afterEach(() => {
    for (const el of created.splice(0)) el.remove();
    restoreReducedMotion();
  });

  it('suppresses the parent transform under reduced-motion', async () => {
    const { drawerStack, fixture } = await createHost();
    const parentEl = track(makeDrawerHost('parent'));
    const childEl = track(makeDrawerHost('child'));

    pushNode(drawerStack, { host: parentEl, parent: null });
    pushNode(drawerStack, { host: childEl, parent: parentEl });
    await flush(fixture);

    expect(parentEl.style.transform).toBe('');
  });
});
