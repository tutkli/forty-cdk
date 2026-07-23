import { isFocusableCandidate, isTabbableCandidate } from './focusable-candidate';

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
