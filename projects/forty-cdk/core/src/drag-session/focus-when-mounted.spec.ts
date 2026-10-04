import { ChangeDetectionStrategy, Component, inject, Injector, signal } from '@angular/core';

import { renderHost } from '../../../src/test-utils';
import { focusWhenMounted, type FocusWhenMountedOptions } from './focus-when-mounted';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (showFrom()) {
      <div data-testid="from" tabindex="-1">
        <button type="button" data-testid="inner">inner</button>
      </div>
    }
    @if (showTarget()) {
      <button type="button" data-testid="target">target</button>
    }
    <button type="button" data-testid="other">other</button>
    <span>{{ tick() }}</span>
  `,
})
class FocusHost {
  readonly injector = inject(Injector);
  readonly showFrom = signal(true);
  readonly showTarget = signal(false);
  readonly tick = signal(0);
}

async function setup() {
  const harness = renderHost(FocusHost);
  await harness.flush();
  const calls = { reveal: 0, release: 0 };
  const start = (overrides: Partial<FocusWhenMountedOptions> = {}) =>
    focusWhenMounted({
      injector: harness.instance.injector,
      document,
      from: harness.query('[data-testid="from"]')!,
      target: () => harness.query('[data-testid="target"]'),
      reveal: () => calls.reveal++,
      release: () => calls.release++,
      ...overrides,
    });
  const render = async (): Promise<void> => {
    harness.instance.tick.update((n) => n + 1);
    await harness.flush();
  };
  return { ...harness, calls, start, render };
}

describe('focusWhenMounted', () => {
  it('does nothing when focus is outside the element it starts from', async () => {
    const { query, instance, calls, start, flush } = await setup();
    const other = query('[data-testid="other"]')!;
    other.focus();

    start();
    instance.showTarget.set(true);
    await flush();

    expect(document.activeElement).toBe(other);
    expect(calls).toEqual({ reveal: 0, release: 0 });
  });

  it('reveals synchronously, then focuses the target once a render mounts it', async () => {
    const { query, instance, calls, start, render } = await setup();
    query('[data-testid="from"]')!.focus();

    start();
    expect(calls.reveal).toBe(1);
    await render();
    await render();
    expect(document.activeElement).toBe(query('[data-testid="from"]'));
    expect(calls.release).toBe(0);

    instance.showTarget.set(true);
    await render();

    expect(document.activeElement).toBe(query('[data-testid="target"]'));
    expect(calls).toEqual({ reveal: 1, release: 1 });
  });

  it('starts from focus on a descendant of the element it starts from', async () => {
    const { query, instance, start, flush } = await setup();
    query('[data-testid="inner"]')!.focus();

    start({ target: (origin) => (origin.isConnected ? origin : null) });
    instance.showTarget.set(true);
    await flush();

    expect(document.activeElement).toBe(query('[data-testid="inner"]'));
  });

  it('still moves focus when the element that held it was destroyed', async () => {
    const { query, instance, calls, start, flush } = await setup();
    query('[data-testid="from"]')!.focus();

    start();
    instance.showFrom.set(false);
    instance.showTarget.set(true);
    await flush();

    expect(document.activeElement).toBe(query('[data-testid="target"]'));
    expect(calls.release).toBe(1);
  });

  it('yields to a focus move made elsewhere before the target mounts', async () => {
    const { query, instance, calls, start, flush } = await setup();
    query('[data-testid="from"]')!.focus();

    start();
    const other = query('[data-testid="other"]')!;
    other.focus();
    instance.showTarget.set(true);
    await flush();

    expect(document.activeElement).toBe(other);
    expect(calls.release).toBe(1);
  });

  it('gives up on a target that never mounts, releasing once', async () => {
    const { query, instance, calls, start, render } = await setup();
    const from = query('[data-testid="from"]')!;
    from.focus();

    start();
    for (let i = 0; i < 12; i++) {
      await render();
    }
    expect(calls.release).toBe(1);

    instance.showTarget.set(true);
    await render();

    expect(document.activeElement).toBe(from);
    expect(calls.release).toBe(1);
  });

  it('cancel abandons the step without moving focus or releasing', async () => {
    const { query, instance, calls, start, flush } = await setup();
    const from = query('[data-testid="from"]')!;
    from.focus();

    const ref = start();
    ref.cancel();
    instance.showTarget.set(true);
    await flush();

    expect(document.activeElement).toBe(from);
    expect(calls).toEqual({ reveal: 1, release: 0 });
  });
});
