import { createDragPreview, createTemplatePreview } from './drag-preview';

describe('createTemplatePreview', () => {
  afterEach(() => {
    document.querySelectorAll('[data-for-drag-preview]').forEach((n) => n.remove());
  });

  it('appends a single wrapper to document.body with data-for-drag-preview and aria-hidden="true"', () => {
    const nodes = [document.createElement('span')];
    createTemplatePreview(nodes, document.body, document, () => undefined);
    const wrapper = document.body.querySelector('[data-for-drag-preview]') as HTMLElement | null;
    expect(wrapper!.getAttribute('aria-hidden')).toBe('true');
  });

  it('wrapper has position: fixed and pointer-events: none', () => {
    const nodes = [document.createElement('span')];
    createTemplatePreview(nodes, document.body, document, () => undefined);
    const wrapper = document.body.querySelector('[data-for-drag-preview]') as HTMLElement;
    expect(wrapper.style.position).toBe('fixed');
    expect(wrapper.style.pointerEvents).toBe('none');
  });

  it('wrapper contains the supplied nodes', () => {
    const a = document.createElement('span');
    a.textContent = 'hello';
    const b = document.createElement('span');
    b.textContent = 'world';
    createTemplatePreview([a, b], document.body, document, () => undefined);
    const wrapper = document.body.querySelector('[data-for-drag-preview]') as HTMLElement;
    expect(wrapper.contains(a)).toBe(true);
    expect(wrapper.contains(b)).toBe(true);
  });

  it('moveTo sets transform: translate(x px, y px) on the wrapper', () => {
    const nodes = [document.createElement('span')];
    const preview = createTemplatePreview(nodes, document.body, document, () => undefined);
    preview.moveTo(10, 20);
    const wrapper = document.body.querySelector('[data-for-drag-preview]') as HTMLElement;
    expect(wrapper.style.transform).toBe('translate(10px, 20px)');
  });

  it('destroy removes the wrapper from document.body and invokes onDestroy', () => {
    const onDestroy = vi.fn();
    const nodes = [document.createElement('span')];
    const preview = createTemplatePreview(nodes, document.body, document, onDestroy);
    preview.destroy();
    expect(document.body.querySelector('[data-for-drag-preview]')).toBeNull();
    expect(onDestroy).toHaveBeenCalledTimes(1);
  });

  it('settle with no configured transition destroys the wrapper immediately and calls onDestroy once', () => {
    const onDestroy = vi.fn();
    const nodes = [document.createElement('span')];
    const preview = createTemplatePreview(nodes, document.body, document, onDestroy);
    preview.settle(10, 20, window);
    expect(document.body.querySelector('[data-for-drag-preview]')).toBeNull();
    expect(onDestroy).toHaveBeenCalledTimes(1);
  });
});

describe('createDragPreview settle', () => {
  afterEach(() => {
    document.querySelectorAll('[data-for-drag-preview]').forEach((n) => n.remove());
  });

  it('settle with no configured transition destroys the clone immediately', () => {
    const source = document.createElement('div');
    document.body.appendChild(source);
    try {
      const preview = createDragPreview(source, document);
      preview.settle(5, 10, window);
      expect(document.body.querySelector('[data-for-drag-preview]')).toBeNull();
    } finally {
      source.remove();
    }
  });
});

describe('createDragPreview strips the identity hooks from the clone', () => {
  afterEach(() => {
    document.querySelectorAll('[data-for-drag-preview]').forEach((n) => n.remove());
  });

  function appendSourceWithIds(): HTMLElement {
    const source = document.createElement('div');
    source.setAttribute('id', 'row-root');
    source.setAttribute('data-testid', 'row-0');

    const child = document.createElement('span');
    child.setAttribute('id', 'row-child');
    child.setAttribute('data-testid', 'cell-0-name');

    const grandchild = document.createElement('em');
    grandchild.setAttribute('id', 'row-grandchild');

    child.appendChild(grandchild);
    source.appendChild(child);
    document.body.appendChild(source);
    return source;
  }

  function previewClone(): HTMLElement {
    return document.body.querySelector('[data-for-drag-preview]') as HTMLElement;
  }

  it('removes id from the clone root and from every descendant carrying one', () => {
    const source = appendSourceWithIds();
    try {
      createDragPreview(source, document);
      expect(previewClone().hasAttribute('id')).toBe(false);
      expect(previewClone().querySelectorAll('[id]')).toHaveLength(0);
    } finally {
      source.remove();
    }
  });

  it('removes data-testid from the clone root and from every descendant carrying one', () => {
    const source = appendSourceWithIds();
    try {
      createDragPreview(source, document);
      expect(previewClone().hasAttribute('data-testid')).toBe(false);
      expect(previewClone().querySelectorAll('[data-testid]')).toHaveLength(0);
    } finally {
      source.remove();
    }
  });

  it('leaves the source subtree untouched', () => {
    const source = appendSourceWithIds();
    try {
      createDragPreview(source, document);
      expect(source.getAttribute('id')).toBe('row-root');
      expect(source.getAttribute('data-testid')).toBe('row-0');
      expect(source.querySelectorAll('[id]')).toHaveLength(2);
    } finally {
      source.remove();
    }
  });

  it('keeps the stripped clone reachable by [data-for-drag-preview] and hidden from assistive tech', () => {
    const source = appendSourceWithIds();
    try {
      createDragPreview(source, document);
      expect(document.body.querySelectorAll('[data-for-drag-preview]')).toHaveLength(1);
      expect(previewClone().getAttribute('aria-hidden')).toBe('true');
    } finally {
      source.remove();
    }
  });
});

describe('createDragPreview keeps the cloned live content from acting on the page', () => {
  let source: HTMLElement;

  beforeEach(() => {
    source = document.createElement('div');
    document.body.appendChild(source);
  });

  afterEach(() => {
    source.remove();
    document.querySelectorAll('[data-for-drag-preview]').forEach((n) => n.remove());
  });

  function previewClone(): HTMLElement {
    return document.body.querySelector<HTMLElement>('[data-for-drag-preview]')!;
  }

  it('leaves the dragged item radio checked when the clone joins the document', () => {
    source.innerHTML = '<input type="radio" name="primary" checked />';
    const radio = source.querySelector('input')!;

    createDragPreview(source, document);

    expect(radio.checked).toBe(true);
  });

  it('strips name and form from every cloned form control', () => {
    source.innerHTML = `
      <input name="a" form="f" />
      <select name="b" form="f"></select>
      <textarea name="c" form="f"></textarea>
      <button name="d" form="f"></button>
    `;

    createDragPreview(source, document);

    expect(previewClone().querySelectorAll('[name], [form]')).toHaveLength(0);
    expect(source.querySelectorAll('[name]')).toHaveLength(4);
  });

  it('strips autoplay from cloned media', () => {
    source.innerHTML = '<video autoplay></video><audio autoplay></audio>';

    createDragPreview(source, document);

    expect(previewClone().querySelectorAll('[autoplay]')).toHaveLength(0);
    expect(source.querySelectorAll('[autoplay]')).toHaveLength(2);
  });

  it('replaces a cloned iframe with an empty box the size of the source frame', () => {
    source.innerHTML = '<iframe src="about:blank"></iframe>';
    source.querySelector('iframe')!.getBoundingClientRect = () =>
      ({ width: 120, height: 80 }) as DOMRect;

    createDragPreview(source, document);

    expect(previewClone().querySelector('iframe')).toBeNull();
    const box = previewClone().firstElementChild as HTMLElement;
    expect(box.style.width).toBe('120px');
    expect(box.style.height).toBe('80px');
    expect(source.querySelector('iframe')).not.toBeNull();
  });
});

describe('settle fallback timeout scales from the computed transition duration', () => {
  afterEach(() => {
    document.querySelectorAll('[data-for-drag-preview]').forEach((n) => n.remove());
  });

  function fakeWin(
    transitionDuration: string,
    transition: Partial<Pick<CSSStyleDeclaration, 'transitionProperty' | 'transitionDelay'>> = {},
  ): Window {
    const timeouts: { fn: () => void; delay: number }[] = [];
    return {
      getComputedStyle: () => ({ transitionDuration, ...transition }) as CSSStyleDeclaration,
      setTimeout: ((fn: () => void, delay: number): number => {
        timeouts.push({ fn, delay });
        return timeouts.length;
      }) as Window['setTimeout'],
      __timeouts: timeouts,
    } as unknown as Window;
  }

  it('derives the fallback timeout from a long ms transition (kept alive past 500ms)', () => {
    const nodes = [document.createElement('span')];
    const preview = createTemplatePreview(nodes, document.body, document, () => undefined);
    const win = fakeWin('1200ms');

    preview.settle(10, 20, win);

    const timeouts = (win as unknown as { __timeouts: { delay: number }[] }).__timeouts;
    expect(timeouts).toHaveLength(1);
    expect(timeouts[0]!.delay).toBeGreaterThan(500);
    expect(timeouts[0]!.delay).toBe(1200 + 50);
    expect(document.body.querySelector('[data-for-drag-preview]')).not.toBeNull();
  });

  it('parses a seconds transition into milliseconds for the fallback', () => {
    const nodes = [document.createElement('span')];
    const preview = createTemplatePreview(nodes, document.body, document, () => undefined);
    const win = fakeWin('0.8s');

    preview.settle(10, 20, win);

    const timeouts = (win as unknown as { __timeouts: { delay: number }[] }).__timeouts;
    expect(timeouts[0]!.delay).toBe(800 + 50);
  });

  function settleDelay(
    transitionDuration: string,
    transition: Partial<Pick<CSSStyleDeclaration, 'transitionProperty' | 'transitionDelay'>>,
  ): number | undefined {
    const nodes = [document.createElement('span')];
    const preview = createTemplatePreview(nodes, document.body, document, () => undefined);
    const win = fakeWin(transitionDuration, transition);

    preview.settle(10, 20, win);

    return (win as unknown as { __timeouts: { delay: number }[] }).__timeouts[0]?.delay;
  }

  it('times the fallback from the transform entry rather than the first one', () => {
    expect(
      settleDelay('120ms, 300ms', {
        transitionProperty: 'opacity, transform',
        transitionDelay: '0s, 0s',
      }),
    ).toBe(300 + 50);
  });

  it('adds the transform transition delay to its duration', () => {
    expect(
      settleDelay('200ms', { transitionProperty: 'transform', transitionDelay: '100ms' }),
    ).toBe(200 + 100 + 50);
  });

  it('repeats a shorter duration or delay list to match the property list', () => {
    expect(
      settleDelay('100ms, 400ms', {
        transitionProperty: 'opacity, color, transform',
        transitionDelay: '20ms',
      }),
    ).toBe(100 + 20 + 50);
  });

  it('lets a later transform entry override an earlier all', () => {
    expect(
      settleDelay('1s, 200ms', { transitionProperty: 'all, transform', transitionDelay: '0s' }),
    ).toBe(200 + 50);
  });

  it('subtracts a negative delay from the transform duration', () => {
    expect(
      settleDelay('300ms', { transitionProperty: 'transform', transitionDelay: '-100ms' }),
    ).toBe(200 + 50);
  });

  it('falls back to the longest transition when none targets transform', () => {
    expect(
      settleDelay('200ms, 100ms', {
        transitionProperty: 'opacity, color',
        transitionDelay: '50ms, 0s',
      }),
    ).toBe(250 + 50);
  });

  it('destroys immediately when transition-property is none', () => {
    const onDestroy = vi.fn();
    const nodes = [document.createElement('span')];
    const preview = createTemplatePreview(nodes, document.body, document, onDestroy);
    const win = fakeWin('300ms', { transitionProperty: 'none', transitionDelay: '0s' });

    preview.settle(10, 20, win);

    const timeouts = (win as unknown as { __timeouts: { delay: number }[] }).__timeouts;
    expect(timeouts).toHaveLength(0);
    expect(onDestroy).toHaveBeenCalledTimes(1);
  });

  it('the scaled fallback still destroys the preview when it fires', () => {
    const onDestroy = vi.fn();
    const nodes = [document.createElement('span')];
    const preview = createTemplatePreview(nodes, document.body, document, onDestroy);
    const timeouts: { fn: () => void; delay: number }[] = [];
    const win = {
      getComputedStyle: () => ({ transitionDuration: '1000ms' }) as CSSStyleDeclaration,
      setTimeout: ((fn: () => void, delay: number): number => {
        timeouts.push({ fn, delay });
        return timeouts.length;
      }) as Window['setTimeout'],
    } as unknown as Window;

    preview.settle(10, 20, win);
    expect(document.body.querySelector('[data-for-drag-preview]')).not.toBeNull();

    timeouts[0]!.fn();
    expect(document.body.querySelector('[data-for-drag-preview]')).toBeNull();
    expect(onDestroy).toHaveBeenCalledTimes(1);
  });

  it('a zero transition duration still destroys immediately', () => {
    const onDestroy = vi.fn();
    const nodes = [document.createElement('span')];
    const preview = createTemplatePreview(nodes, document.body, document, onDestroy);
    const win = fakeWin('0s');

    preview.settle(10, 20, win);

    const timeouts = (win as unknown as { __timeouts: { delay: number }[] }).__timeouts;
    expect(timeouts).toHaveLength(0);
    expect(document.body.querySelector('[data-for-drag-preview]')).toBeNull();
    expect(onDestroy).toHaveBeenCalledTimes(1);
  });
});

describe('drag preview writing direction', () => {
  let region: HTMLElement;

  beforeEach(() => {
    region = document.createElement('section');
    document.body.append(region);
  });

  afterEach(() => {
    region.remove();
    document.querySelectorAll('[data-for-drag-preview]').forEach((n) => n.remove());
  });

  function item(): HTMLElement {
    const el = document.createElement('div');
    el.textContent = 'عنصر';
    region.append(el);
    return el;
  }

  function preview(): HTMLElement {
    return document.body.querySelector<HTMLElement>('[data-for-drag-preview]')!;
  }

  it('stamps the dir of the subtree the cloned source sits in', () => {
    region.dir = 'rtl';
    createDragPreview(item(), document);

    expect(preview().getAttribute('dir')).toBe('rtl');
  });

  it('leaves the clone unstamped when nothing above the source sets a dir', () => {
    createDragPreview(item(), document);

    expect(preview().hasAttribute('dir')).toBe(false);
  });

  it('keeps a dir the source carries itself', () => {
    region.dir = 'rtl';
    const source = item();
    source.dir = 'ltr';
    createDragPreview(source, document);

    expect(preview().getAttribute('dir')).toBe('ltr');
  });
});

describe('template preview writing direction', () => {
  let region: HTMLElement;

  beforeEach(() => {
    region = document.createElement('section');
    document.body.append(region);
  });

  afterEach(() => {
    region.remove();
    document.querySelectorAll('[data-for-drag-preview]').forEach((n) => n.remove());
  });

  function wrapper(): HTMLElement {
    return document.body.querySelector<HTMLElement>('[data-for-drag-preview]')!;
  }

  it('stamps the dir of the subtree the dragged item sits in', () => {
    region.dir = 'rtl';
    const source = document.createElement('div');
    region.append(source);
    createTemplatePreview([document.createElement('span')], source, document, () => undefined);

    expect(wrapper().getAttribute('dir')).toBe('rtl');
  });

  it('leaves the wrapper unstamped when nothing above the item sets a dir', () => {
    const source = document.createElement('div');
    region.append(source);
    createTemplatePreview([document.createElement('span')], source, document, () => undefined);

    expect(wrapper().hasAttribute('dir')).toBe(false);
  });
});
