import { ChangeDetectionStrategy, Component, Directive, input, signal } from '@angular/core';

import { renderHost } from '../../../src/test-utils';
import { pressFocusesDescendant, preventPointerFocus } from './pointer-focus';

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

describe('pressFocusesDescendant', () => {
  let host: HTMLElement;

  beforeEach(() => {
    host = document.createElement('div');
    host.tabIndex = -1;
    document.body.appendChild(host);
  });

  afterEach(() => host.remove());

  function pressOn(target: EventTarget): boolean {
    let result: boolean | null = null;
    const record = (event: Event): void => {
      result = pressFocusesDescendant(event, host);
    };
    host.addEventListener('mousedown', record);
    target.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, cancelable: true, composed: true }),
    );
    host.removeEventListener('mousedown', record);
    return result!;
  }

  it('reports false for a press on the boundary itself', () => {
    expect(pressOn(host)).toBe(false);
  });

  it('reports false for a press on a descendant with no focusable element on the way up', () => {
    host.innerHTML = '<div><span data-target>label</span></div>';
    expect(pressOn(host.querySelector('[data-target]')!)).toBe(false);
  });

  it('reports false for a press on a disabled control', () => {
    host.innerHTML = '<button disabled data-target>off</button>';
    expect(pressOn(host.querySelector('[data-target]')!)).toBe(false);
  });

  for (const [name, markup] of [
    ['a native control', '<button><b data-target>go</b></button>'],
    ['an element carrying tabindex="-1"', '<div tabindex="-1"><b data-target>go</b></div>'],
    ['a contenteditable region', '<div contenteditable="true"><b data-target>go</b></div>'],
  ] as const) {
    it(`reports true for a press inside ${name}`, () => {
      host.innerHTML = markup;
      expect(pressOn(host.querySelector('[data-target]')!)).toBe(true);
    });
  }

  it('reports true for a press inside an open shadow root', () => {
    const shell = document.createElement('div');
    host.appendChild(shell);
    const inner = document.createElement('button');
    shell.attachShadow({ mode: 'open' }).appendChild(inner);
    expect(pressOn(inner)).toBe(true);
  });
});
