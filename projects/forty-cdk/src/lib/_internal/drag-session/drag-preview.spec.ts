import { createTemplatePreview } from './drag-preview';

describe('createTemplatePreview', () => {
  afterEach(() => {
    document.querySelectorAll('[data-for-drag-preview]').forEach((n) => n.remove());
  });

  it('appends a single wrapper to document.body with data-for-drag-preview and aria-hidden="true"', () => {
    const nodes = [document.createElement('span')];
    createTemplatePreview(nodes, document, () => undefined);
    const wrapper = document.body.querySelector('[data-for-drag-preview]') as HTMLElement | null;
    expect(wrapper).not.toBeNull();
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
});
