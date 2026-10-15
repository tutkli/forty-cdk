import { ChangeDetectionStrategy, Component, Directive, input, signal } from '@angular/core';

import { renderHost } from '../../../src/test-utils';
import {
  createPressFocus,
  DEFAULT_PRESS_FOCUS_WINDOW_MS,
  mouseFocusTarget,
  pressFocusesDescendant,
  preventPointerFocus,
} from './pointer-focus';

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

  it('reports false for a press on a disabled control that carries tabindex', () => {
    host.innerHTML = '<button disabled tabindex="0" data-target>off</button>';
    expect(pressOn(host.querySelector('[data-target]')!)).toBe(false);
  });
});

describe('mouseFocusTarget', () => {
  let root: HTMLElement;

  beforeEach(() => {
    root = document.createElement('div');
    document.body.appendChild(root);
  });

  afterEach(() => root.remove());

  const target = (): HTMLElement => root.querySelector<HTMLElement>('[data-target]')!;
  const focused = (): HTMLElement => root.querySelector<HTMLElement>('[data-focused]')!;

  for (const [name, markup] of [
    ['the pressed element itself', '<button data-target data-focused>go</button>'],
    ['the nearest focusable ancestor', '<a href="#" data-focused><b data-target>go</b></a>'],
    [
      'an editable region inside a focusable cell',
      '<div tabindex="0"><div contenteditable="true" data-target data-focused>x</div></div>',
    ],
    ['a summary', '<details><summary data-target data-focused>s</summary>x</details>'],
    [
      'an element carrying tabindex="-1"',
      '<div tabindex="-1" data-focused><b data-target>x</b></div>',
    ],
    [
      'the ancestor of a disabled control',
      '<div tabindex="0" data-focused><button disabled data-target>off</button></div>',
    ],
    [
      'a control in the first legend of a disabled fieldset',
      '<fieldset disabled><legend><input data-target data-focused></legend></fieldset>',
    ],
  ] as const) {
    it(`resolves ${name}`, () => {
      root.innerHTML = markup;
      expect(mouseFocusTarget(target())).toBe(focused());
    });
  }

  it('skips a control inside a disabled fieldset', () => {
    root.innerHTML =
      '<div tabindex="0" data-focused><fieldset disabled><input data-target></fieldset></div>';
    expect(mouseFocusTarget(target())).toBe(focused());
  });

  it('skips a hidden input', () => {
    root.innerHTML = '<input type="hidden" data-target>';
    expect(mouseFocusTarget(target())).toBeNull();
  });

  it('crosses an open shadow boundary to a focusable host', () => {
    const shell = document.createElement('div');
    shell.tabIndex = 0;
    root.appendChild(shell);
    const inner = document.createElement('span');
    shell.attachShadow({ mode: 'open' }).appendChild(inner);

    expect(mouseFocusTarget(inner)).toBe(shell);
  });

  it('resolves nothing at or above the boundary', () => {
    root.tabIndex = 0;
    root.innerHTML = '<span data-target>x</span>';

    expect(mouseFocusTarget(target(), root)).toBeNull();
    expect(mouseFocusTarget(target())).toBe(root);
  });

  it('resolves nothing for a press with no focusable ancestor', () => {
    root.innerHTML = '<p data-target>x</p>';
    expect(mouseFocusTarget(target())).toBeNull();
  });
});

describe('createPressFocus', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reads no press as a keyboard focus', () => {
    expect(createPressFocus().consume()).toBe(false);
  });

  it('attributes a focus right after a press to it, once', () => {
    const tracker = createPressFocus();
    tracker.press();

    expect(tracker.consume()).toBe(true);
    expect(tracker.consume()).toBe(false);
  });

  it('stops attributing a focus once the window after the press elapses', () => {
    const tracker = createPressFocus();
    tracker.press();
    vi.advanceTimersByTime(DEFAULT_PRESS_FOCUS_WINDOW_MS);

    expect(tracker.consume()).toBe(false);
  });

  it('restarts the window when the press is released', () => {
    const tracker = createPressFocus();
    tracker.press();
    vi.advanceTimersByTime(DEFAULT_PRESS_FOCUS_WINDOW_MS + 300);
    tracker.release();
    vi.advanceTimersByTime(DEFAULT_PRESS_FOCUS_WINDOW_MS - 1);

    expect(tracker.consume()).toBe(true);
  });

  it('ignores a release with no recorded press', () => {
    const tracker = createPressFocus();
    tracker.release();

    expect(tracker.consume()).toBe(false);
  });

  it('forgets the press on reset', () => {
    const tracker = createPressFocus();
    tracker.press();
    tracker.reset();

    expect(tracker.consume()).toBe(false);
  });

  it('honours a custom window', () => {
    const tracker = createPressFocus(50);
    tracker.press();
    vi.advanceTimersByTime(50);

    expect(tracker.consume()).toBe(false);
  });
});
