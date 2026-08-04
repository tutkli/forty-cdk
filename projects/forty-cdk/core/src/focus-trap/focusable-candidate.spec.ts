import {
  FOCUSABLE_SELECTOR,
  isFocusableCandidate,
  isTabbableCandidate,
  queryFocusableCandidates,
} from './focusable-candidate';

describe('focusable-candidate filter', () => {
  let root: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    root = document.createElement('div');
    document.body.appendChild(root);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  function add(html: string): HTMLElement {
    root.innerHTML = html;
    return root.querySelector<HTMLElement>('#target')!;
  }

  describe('isFocusableCandidate', () => {
    it('accepts a plain focusable element', () => {
      const el = add('<button id="target">go</button>');
      expect(isFocusableCandidate(el, root)).toBe(true);
    });

    it('rejects a [hidden] element', () => {
      const el = add('<button id="target" hidden>go</button>');
      expect(isFocusableCandidate(el, root)).toBe(false);
    });

    it('rejects an element carrying [inert] itself', () => {
      const el = add('<button id="target" inert>go</button>');
      expect(isFocusableCandidate(el, root)).toBe(false);
    });

    it('rejects an element nested under an [inert] ancestor below root', () => {
      const el = add('<div inert><button id="target">go</button></div>');
      expect(isFocusableCandidate(el, root)).toBe(false);
    });

    it('rejects a display:none element', () => {
      const el = add('<button id="target" style="display:none">go</button>');
      expect(isFocusableCandidate(el, root)).toBe(false);
    });

    it('rejects an element nested under a display:none ancestor below root', () => {
      const el = add('<div style="display:none"><button id="target">go</button></div>');
      expect(isFocusableCandidate(el, root)).toBe(false);
    });

    it('rejects a visibility:hidden element', () => {
      const el = add('<button id="target" style="visibility:hidden">go</button>');
      expect(isFocusableCandidate(el, root)).toBe(false);
    });

    it('accepts an element carrying tabindex="-1" (focusable, not tabbable)', () => {
      const el = add('<button id="target" tabindex="-1">go</button>');
      expect(isFocusableCandidate(el, root)).toBe(true);
    });

    it('does not consult the root element itself for inert / display:none', () => {
      root.setAttribute('inert', '');
      root.style.display = 'none';
      const el = add('<button id="target">go</button>');
      expect(isFocusableCandidate(el, root)).toBe(true);
    });
  });

  describe('shadow DOM', () => {
    function addShadowHost(html: string): { host: HTMLElement; shadow: ShadowRoot } {
      const host = document.createElement('shadow-widget');
      root.appendChild(host);
      const shadow = host.attachShadow({ mode: 'open' });
      shadow.innerHTML = html;
      return { host, shadow };
    }

    it('accepts a candidate inside an open shadow root under root', () => {
      const { shadow } = addShadowHost('<button id="target">go</button>');
      const el = shadow.querySelector<HTMLElement>('#target')!;

      expect(isFocusableCandidate(el, root)).toBe(true);
      expect(isTabbableCandidate(el, root)).toBe(true);
    });

    it('rejects a candidate whose shadow host carries [inert]', () => {
      const { host, shadow } = addShadowHost('<button id="target">go</button>');
      host.setAttribute('inert', '');
      const el = shadow.querySelector<HTMLElement>('#target')!;

      expect(isFocusableCandidate(el, root)).toBe(false);
    });

    it('rejects a candidate whose shadow host is display:none', () => {
      const { host, shadow } = addShadowHost('<button id="target">go</button>');
      host.style.display = 'none';
      const el = shadow.querySelector<HTMLElement>('#target')!;

      expect(isFocusableCandidate(el, root)).toBe(false);
    });
  });

  describe('queryFocusableCandidates', () => {
    it('descends into open shadow roots, in composed order', () => {
      root.innerHTML = `
        <button id="light-first">one</button>
        <shadow-widget id="host"></shadow-widget>
        <button id="light-last">three</button>
      `;
      const host = root.querySelector<HTMLElement>('#host')!;
      host.attachShadow({ mode: 'open' }).innerHTML =
        '<button id="shadow-a">a</button><button id="shadow-b">b</button>';

      expect(queryFocusableCandidates(root).map((el) => el.id)).toEqual([
        'light-first',
        'shadow-a',
        'shadow-b',
        'light-last',
      ]);
    });

    it('does not descend into a closed shadow root', () => {
      root.innerHTML = '<shadow-widget id="host"></shadow-widget>';
      const host = root.querySelector<HTMLElement>('#host')!;
      host.attachShadow({ mode: 'closed' }).innerHTML = '<button id="hidden-away">a</button>';

      expect(queryFocusableCandidates(root)).toEqual([]);
    });

    it('includes a focusable shadow host before its own shadow content', () => {
      root.innerHTML = '<shadow-widget id="host" tabindex="0"></shadow-widget>';
      const host = root.querySelector<HTMLElement>('#host')!;
      host.attachShadow({ mode: 'open' }).innerHTML = '<button id="shadow-a">a</button>';

      expect(queryFocusableCandidates(root).map((el) => el.id)).toEqual(['host', 'shadow-a']);
    });

    it("descends into the container's own shadow root", () => {
      const shadowRoot = root.attachShadow({ mode: 'open' });
      shadowRoot.innerHTML = '<button id="own-a">a</button><button id="own-b">b</button>';

      expect(queryFocusableCandidates(root).map((el) => el.id)).toEqual(['own-a', 'own-b']);
    });

    it("orders the container's own shadow content before its light children", () => {
      root.innerHTML = '<button id="light">light</button>';
      root.attachShadow({ mode: 'open' }).innerHTML = '<button id="own">own</button><slot></slot>';

      expect(queryFocusableCandidates(root).map((el) => el.id)).toEqual(['own', 'light']);
    });

    it("filters the container's own shadow content through the candidate filter", () => {
      const shadowRoot = root.attachShadow({ mode: 'open' });
      shadowRoot.innerHTML = '<div inert><button id="own">a</button></div>';
      const el = shadowRoot.querySelector<HTMLElement>('#own')!;

      expect(queryFocusableCandidates(root)).toEqual([el]);
      expect(isFocusableCandidate(el, root)).toBe(false);
    });
  });

  describe('candidate pre-filter', () => {
    const CLAUSE_FIXTURES: Record<string, string> = {
      'a[href]': '<a href="#x">link</a>',
      'area[href]': '<map><area href="#x" /></map>',
      'button:not([disabled])': '<button>go</button>',
      'input:not([disabled]):not([type="hidden"])': '<input />',
      'select:not([disabled])': '<select></select>',
      'textarea:not([disabled])': '<textarea></textarea>',
      '[tabindex]:not([tabindex="-1"])': '<div tabindex="0"></div>',
      '[contenteditable="true"]': '<div contenteditable="true"></div>',
      'audio[controls]': '<audio controls></audio>',
      'video[controls]': '<video controls></video>',
      iframe: '<iframe></iframe>',
      summary: '<details><summary>more</summary></details>',
    };

    it('has a fixture for every clause of FOCUSABLE_SELECTOR', () => {
      expect(Object.keys(CLAUSE_FIXTURES).sort()).toEqual(FOCUSABLE_SELECTOR.split(',').sort());
    });

    for (const [clause, html] of Object.entries(CLAUSE_FIXTURES)) {
      it(`admits an element matching ${clause}`, () => {
        root.innerHTML = html;
        const matching = Array.from(root.querySelectorAll<HTMLElement>('*')).filter((el) =>
          el.matches(clause),
        );

        expect(matching.length).toBe(1);
        expect(queryFocusableCandidates(root)).toContain(matching[0]);
      });
    }

    it('returns exactly what an unfiltered matches() walk returns, over a mixed subtree', () => {
      root.innerHTML = `
        <div tabindex="-1">
          <span>cell</span>
          <button tabindex="-1">roving</button>
        </div>
        <table><tr><td><span>text</span></td><td><a href="#x">link</a></td></tr></table>
        <svg><a href="#x"><rect /></a></svg>
        <div contenteditable="false">plain</div>
        <div contenteditable="true">editable</div>
        <input type="hidden" />
        <button disabled>off</button>
      `;
      const reference = Array.from(root.querySelectorAll<HTMLElement>('*')).filter((el) =>
        el.matches(FOCUSABLE_SELECTOR),
      );

      expect(reference.length).toBeGreaterThan(0);
      expect(queryFocusableCandidates(root)).toEqual(reference);
    });

    it('keeps a natively-focusable element carrying tabindex="-1"', () => {
      root.innerHTML = '<div tabindex="-1"><button id="roving" tabindex="-1">go</button></div>';

      expect(queryFocusableCandidates(root).map((el) => el.id)).toEqual(['roving']);
    });

    it('skips a structural element carrying tabindex="-1"', () => {
      root.innerHTML = '<div tabindex="-1"><span>cell</span></div>';

      expect(queryFocusableCandidates(root)).toEqual([]);
    });
  });

  describe('isTabbableCandidate', () => {
    it('accepts a plain focusable element (tabIndex 0)', () => {
      const el = add('<button id="target">go</button>');
      expect(isTabbableCandidate(el, root)).toBe(true);
    });

    it('rejects a focusable element carrying tabindex="-1"', () => {
      const el = add('<button id="target" tabindex="-1">go</button>');
      expect(isTabbableCandidate(el, root)).toBe(false);
    });

    it('rejects a CSS-hidden element even with a valid tabindex', () => {
      const el = add('<button id="target" style="display:none">go</button>');
      expect(isTabbableCandidate(el, root)).toBe(false);
    });
  });
});
