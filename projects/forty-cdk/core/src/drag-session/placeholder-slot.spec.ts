import { layoutPlaceholderInSlot } from './placeholder-slot';

function element(style: string): HTMLElement {
  const el = document.createElement('div');
  el.setAttribute('style', style);
  return el;
}

describe('layoutPlaceholderInSlot', () => {
  it('copies the lifted item’s inline position, insets and transform onto the placeholder', () => {
    const lifted = element('position: absolute; left: 0; right: 0; transform: translateY(88px)');
    const placeholder = element('');

    layoutPlaceholderInSlot([placeholder], lifted);

    expect(placeholder.style.position).toBe('absolute');
    expect(placeholder.style.left).toBe(lifted.style.left);
    expect(placeholder.style.right).toBe(lifted.style.right);
    expect(placeholder.style.transform).toBe('translateY(88px)');
  });

  it('keeps a declaration the lifted item leaves unset', () => {
    const lifted = element('position: absolute; transform: translateY(88px)');
    const placeholder = element('height: 40px');

    layoutPlaceholderInSlot([placeholder], lifted);

    expect(placeholder.style.height).toBe('40px');
  });

  it('skips nodes that are not elements', () => {
    const lifted = element('transform: translateY(88px)');
    const text = document.createTextNode('gap');
    const placeholder = element('');

    layoutPlaceholderInSlot([text, placeholder], lifted);

    expect(placeholder.style.transform).toBe('translateY(88px)');
  });
});
