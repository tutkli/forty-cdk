import { createDragPreview, createTemplatePreview } from './drag-preview';

describe('createTemplatePreview', () => {
  afterEach(() => {
    document.querySelectorAll('[data-for-drag-preview]').forEach((n) => n.remove());
  });

  it('appends a single wrapper to document.body with data-for-drag-preview and aria-hidden="true"', () => {
    const nodes = [document.createElement('span')];
    createTemplatePreview(nodes, document, () => undefined);
    const wrapper = document.body.querySelector('[data-for-drag-preview]') as HTMLElement | null;
    expect(wrapper!.getAttribute('aria-hidden')).toBe('true');
  });

  it('wrapper has position: fixed and pointer-events: none', () => {
    const nodes = [document.createElement('span')];
    createTemplatePreview(nodes, document, () => undefined);
    const wrapper = document.body.querySelector('[data-for-drag-preview]') as HTMLElement;
    expect(wrapper.style.position).toBe('fixed');
    expect(wrapper.style.pointerEvents).toBe('none');
  });

  it('wrapper contains the supplied nodes', () => {
    const a = document.createElement('span');
    a.textContent = 'hello';
    const b = document.createElement('span');
    b.textContent = 'world';
    createTemplatePreview([a, b], document, () => undefined);
    const wrapper = document.body.querySelector('[data-for-drag-preview]') as HTMLElement;
    expect(wrapper.contains(a)).toBe(true);
    expect(wrapper.contains(b)).toBe(true);
  });

  it('moveTo sets transform: translate(x px, y px) on the wrapper', () => {
    const nodes = [document.createElement('span')];
    const preview = createTemplatePreview(nodes, document, () => undefined);
    preview.moveTo(10, 20);
    const wrapper = document.body.querySelector('[data-for-drag-preview]') as HTMLElement;
    expect(wrapper.style.transform).toBe('translate(10px, 20px)');
  });

  it('destroy removes the wrapper from document.body and invokes onDestroy', () => {
    const onDestroy = vi.fn();
    const nodes = [document.createElement('span')];
    const preview = createTemplatePreview(nodes, document, onDestroy);
    preview.destroy();
    expect(document.body.querySelector('[data-for-drag-preview]')).toBeNull();
    expect(onDestroy).toHaveBeenCalledTimes(1);
  });

  it('settle with no configured transition destroys the wrapper immediately and calls onDestroy once', () => {
    const onDestroy = vi.fn();
    const nodes = [document.createElement('span')];
    const preview = createTemplatePreview(nodes, document, onDestroy);
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

describe('settle fallback timeout scales from the computed transition duration', () => {
  afterEach(() => {
    document.querySelectorAll('[data-for-drag-preview]').forEach((n) => n.remove());
  });

  function fakeWin(transitionDuration: string): Window {
    const timeouts: { fn: () => void; delay: number }[] = [];
    return {
      getComputedStyle: () => ({ transitionDuration }) as CSSStyleDeclaration,
      setTimeout: ((fn: () => void, delay: number): number => {
        timeouts.push({ fn, delay });
        return timeouts.length;
      }) as Window['setTimeout'],
      __timeouts: timeouts,
    } as unknown as Window;
  }

  it('derives the fallback timeout from a long ms transition (kept alive past 500ms)', () => {
    const nodes = [document.createElement('span')];
    const preview = createTemplatePreview(nodes, document, () => undefined);
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
    const preview = createTemplatePreview(nodes, document, () => undefined);
    const win = fakeWin('0.8s');

    preview.settle(10, 20, win);

    const timeouts = (win as unknown as { __timeouts: { delay: number }[] }).__timeouts;
    expect(timeouts[0]!.delay).toBe(800 + 50);
  });

  it('uses only the first comma-separated segment for the fallback', () => {
    const nodes = [document.createElement('span')];
    const preview = createTemplatePreview(nodes, document, () => undefined);
    const win = fakeWin('600ms, 2s');

    preview.settle(10, 20, win);

    const timeouts = (win as unknown as { __timeouts: { delay: number }[] }).__timeouts;
    expect(timeouts[0]!.delay).toBe(600 + 50);
  });

  it('the scaled fallback still destroys the preview when it fires', () => {
    const onDestroy = vi.fn();
    const nodes = [document.createElement('span')];
    const preview = createTemplatePreview(nodes, document, onDestroy);
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
    const preview = createTemplatePreview(nodes, document, onDestroy);
    const win = fakeWin('0s');

    preview.settle(10, 20, win);

    const timeouts = (win as unknown as { __timeouts: { delay: number }[] }).__timeouts;
    expect(timeouts).toHaveLength(0);
    expect(document.body.querySelector('[data-for-drag-preview]')).toBeNull();
    expect(onDestroy).toHaveBeenCalledTimes(1);
  });
});
