import { Component, inject, provideZonelessChangeDetection } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { flush, withReducedMotion } from '../../../test-utils';
import {
  ForDrawerScaleCoordinator,
  type ForDrawerScaleConfig,
} from './drawer-scale-coordinator';

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
}

function makeWrapper(): HTMLElement {
  const el = document.createElement('div');
  el.id = 'wrapper';
  document.body.appendChild(el);
  return el;
}

async function createHost(): Promise<{
  coordinator: ForDrawerScaleCoordinator;
  fixture: ComponentFixture<CoordinatorHost>;
}> {
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  const fixture = TestBed.createComponent(CoordinatorHost);
  await flush(fixture);
  return { coordinator: fixture.componentInstance.coordinator, fixture };
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
