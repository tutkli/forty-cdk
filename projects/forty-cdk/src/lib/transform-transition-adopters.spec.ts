import { createDragPreview, createTemplatePreview } from 'forty-cdk/core';

import { FLIP_ANIMATING_ATTR, playFlip } from '../../drag-drop/src/flip';
import { LIBRARY_CODE } from '../test-utils/source-scan';

/**
 * A library animation that waits for its element's own `transform` transition does so through
 * `awaitTransformTransition`, the one `transitionend` listener in library source
 * ([#2748](https://github.com/tutkli/forty-cdk/issues/2748)). The drag-drop FLIP and the drag
 * preview settle each carried a copy registered with `{ once: true }` and no target check, so the
 * first transition of any property, on the element or on a descendant, spent or ended the wait.
 */

const HELPER = 'core/src/drag-session/transform-transition.ts';

const END_LISTENER =
  /addEventListener\(\s*['"`](?:transition|animation)end['"`]|['"`]\(\s*(?:transition|animation)end\s*\)['"`]\s*:|\.on(?:transition|animation)end\s*=/g;

const ADOPTERS = ['core/src/drag-session/drag-preview.ts', 'drag-drop/src/flip.ts'];

interface Adopter {
  readonly name: string;
  /** Starts the adopter's wait and returns the element it waits on, plus whether it finished. */
  start(child: Element, win: Window): { element: HTMLElement; finished(): boolean };
}

const MOVED_FROM = { left: 0, top: 80 };

const FLIP_FIXTURE_ATTR = 'data-flip-fixture';

const ADOPTER_CASES: readonly Adopter[] = [
  {
    name: 'playFlip',
    start(child, win) {
      const element = document.body.appendChild(document.createElement('div'));
      element.setAttribute(FLIP_FIXTURE_ATTR, '');
      element.appendChild(child);
      element.getBoundingClientRect = () => ({ left: 0, top: 120 }) as DOMRect;
      playFlip({ first: new Map([[element, MOVED_FROM]]), win });
      return { element, finished: () => !element.hasAttribute(FLIP_ANIMATING_ATTR) };
    },
  },
  {
    name: 'createDragPreview',
    start(child, win) {
      const source = document.createElement('div');
      source.appendChild(child);
      const preview = createDragPreview(source, document);
      preview.settle(10, 20, win);
      const element = preview.element!;
      return { element, finished: () => !element.isConnected };
    },
  },
  {
    name: 'createTemplatePreview',
    start(child, win) {
      const preview = createTemplatePreview([child], document.body, document, () => undefined);
      preview.settle(10, 20, win);
      const element = preview.element!;
      return { element, finished: () => !element.isConnected };
    },
  },
];

function fakeWin(): Window {
  return {
    getComputedStyle: () =>
      ({
        transitionProperty: 'opacity, transform',
        transitionDuration: '120ms, 300ms',
        transitionDelay: '0s, 0s',
      }) as CSSStyleDeclaration,
    setTimeout: ((): number => 1) as Window['setTimeout'],
  } as unknown as Window;
}

function transitionEnd(target: Element, propertyName: string): void {
  const event = new Event('transitionend', { bubbles: true });
  Object.defineProperty(event, 'propertyName', { value: propertyName });
  target.dispatchEvent(event);
}

describe('transform transition adopters (#2748)', () => {
  afterEach(() => {
    document.querySelectorAll('[data-for-drag-preview]').forEach((n) => n.remove());
    document.querySelectorAll(`[${FLIP_FIXTURE_ATTR}]`).forEach((n) => n.remove());
  });

  it('the listener patterns still match the shapes they were written for', () => {
    const probe = [
      "el.addEventListener('transitionend', onEnd, { once: true });",
      'el.addEventListener("animationend", onEnd);',
      "'(transitionend)': 'onEnd($event)',",
      'el.ontransitionend = onEnd;',
    ].join('\n');

    expect([...probe.matchAll(END_LISTENER)]).toHaveLength(4);
  });

  it('no library source but the helper listens for a transition or animation end', () => {
    expect([...(LIBRARY_CODE.get(HELPER) ?? '').matchAll(END_LISTENER)]).toHaveLength(1);

    const offenders = [...LIBRARY_CODE].flatMap(([path, code]) =>
      path === HELPER
        ? []
        : [...code.matchAll(END_LISTENER)].map((match) => `${path}: ${match[0]}`),
    );

    expect(offenders).toEqual([]);
  });

  it('every adopter waits through awaitTransformTransition', () => {
    const missing = ADOPTERS.filter(
      (path) => !LIBRARY_CODE.get(path)?.includes('awaitTransformTransition('),
    );

    expect(missing).toEqual([]);
  });

  describe.each(ADOPTER_CASES)('$name', (adopter) => {
    it('finishes on the transform end that follows an opacity end', () => {
      const { element, finished } = adopter.start(document.createElement('span'), fakeWin());

      transitionEnd(element, 'opacity');
      expect(finished(), 'an opacity end must not finish the wait').toBe(false);

      transitionEnd(element, 'transform');
      expect(finished(), 'the transform end after an opacity end was not heard').toBe(true);
    });

    it('does not finish on a transform end bubbling up from a descendant', () => {
      const { element, finished } = adopter.start(document.createElement('span'), fakeWin());

      transitionEnd(element.firstElementChild!, 'transform');
      expect(finished(), 'a descendant transform end finished the wait').toBe(false);

      transitionEnd(element, 'transform');
      expect(finished()).toBe(true);
    });
  });
});
