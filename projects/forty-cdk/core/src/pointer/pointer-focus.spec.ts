import { ChangeDetectionStrategy, Component, Directive, input, signal } from '@angular/core';

import { renderHost } from '../../../src/test-utils';
import { preventPointerFocus } from './pointer-focus';

@Directive({ selector: '[guarded]' })
class Guarded {
  readonly guarded = input(true);

  constructor() {
    preventPointerFocus(() => this.guarded());
  }
}

@Directive({ selector: '[alwaysGuarded]' })
class AlwaysGuarded {
  constructor() {
    preventPointerFocus();
  }
}

@Component({
  imports: [Guarded, AlwaysGuarded],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (mounted()) {
      <span [guarded]="guard()" data-test-id="guarded">guarded</span>
    }
    <span alwaysGuarded data-test-id="always">always</span>
  `,
})
class Host {
  readonly mounted = signal(true);
  readonly guard = signal(true);
}

function mouseDown(target: EventTarget): MouseEvent {
  const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
}

describe('preventPointerFocus', () => {
  it('cancels every mousedown on the host when no predicate is given', () => {
    const { el } = renderHost(Host);
    expect(mouseDown(el.querySelector('[data-test-id="always"]')!).defaultPrevented).toBe(true);
  });

  it('cancels a mousedown that bubbles from a descendant of the host', () => {
    const { el } = renderHost(Host);
    const inner = document.createElement('b');
    el.querySelector('[data-test-id="always"]')!.appendChild(inner);
    expect(mouseDown(inner).defaultPrevented).toBe(true);
  });

  it('cancels only while the predicate holds', async () => {
    const { el, fixture, flush } = renderHost(Host);
    const guarded = el.querySelector('[data-test-id="guarded"]')!;
    expect(mouseDown(guarded).defaultPrevented).toBe(true);

    fixture.componentInstance.guard.set(false);
    await flush();
    expect(mouseDown(guarded).defaultPrevented).toBe(false);
  });

  it('stops cancelling once the host is destroyed', async () => {
    const { el, fixture, flush } = renderHost(Host);
    const guarded = el.querySelector('[data-test-id="guarded"]')!;

    fixture.componentInstance.mounted.set(false);
    await flush();
    expect(mouseDown(guarded).defaultPrevented).toBe(false);
  });
});
