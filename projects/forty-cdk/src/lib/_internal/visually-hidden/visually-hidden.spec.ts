import { Component, signal } from '@angular/core';

import { renderHost } from '../../../test-utils/render';
import { ForVisuallyHidden, VISUALLY_HIDDEN_STYLE } from './visually-hidden';

@Component({
  imports: [ForVisuallyHidden],
  template: `<span forVisuallyHidden [focusable]="focusable()">hidden text</span>`,
})
class VisuallyHiddenHost {
  readonly focusable = signal(false);
}

function focusIn(el: HTMLElement): void {
  el.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
}

function focusOut(el: HTMLElement, relatedTarget: EventTarget | null = null): void {
  el.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget }));
}

describe('ForVisuallyHidden', () => {
  it('clips the host with the visually-hidden rectangle by default', () => {
    const { query } = renderHost(VisuallyHiddenHost);
    const el = query<HTMLElement>('[forVisuallyHidden]')!;

    expect(el.style.position).toBe('absolute');
    expect(el.style.width).toBe('1px');
    expect(el.style.height).toBe('1px');
    expect(el.style.overflow).toBe('hidden');
    expect(el.style.whiteSpace).toBe('nowrap');
  });

  it('keeps the host in the accessibility tree (not display:none, hidden, or aria-hidden)', () => {
    const { query } = renderHost(VisuallyHiddenHost);
    const el = query<HTMLElement>('[forVisuallyHidden]')!;

    expect(el.style.display).not.toBe('none');
    expect(el.hasAttribute('hidden')).toBe(false);
    expect(el.getAttribute('aria-hidden')).toBeNull();
    expect(el.textContent).toBe('hidden text');
  });

  it('does not un-clip on focus when focusable is false', async () => {
    const { query, flush } = renderHost(VisuallyHiddenHost);
    const el = query<HTMLElement>('[forVisuallyHidden]')!;

    focusIn(el);
    await flush();

    expect(el.style.position).toBe('absolute');
  });

  it('un-clips on focus and re-clips on blur when focusable', async () => {
    const { fixture, query, flush } = renderHost(VisuallyHiddenHost);
    fixture.componentInstance.focusable.set(true);
    await flush();
    const el = query<HTMLElement>('[forVisuallyHidden]')!;
    expect(el.style.position).toBe('absolute');

    focusIn(el);
    await flush();
    expect(el.style.position).toBe('');
    expect(el.getAttribute('style')).toBeFalsy();

    focusOut(el);
    await flush();
    expect(el.style.position).toBe('absolute');
  });

  it('stays un-clipped while focus moves between descendants (focus-within)', async () => {
    @Component({
      imports: [ForVisuallyHidden],
      template: `
        <div forVisuallyHidden focusable>
          <button #a type="button">a</button>
          <button #b type="button">b</button>
        </div>
      `,
    })
    class FocusWithinHost {}

    const { query, flush } = renderHost(FocusWithinHost);
    const el = query<HTMLElement>('[forVisuallyHidden]')!;
    const a = query<HTMLButtonElement>('button')!;

    focusIn(el);
    await flush();
    expect(el.style.position).toBe('');

    focusOut(el, a);
    await flush();
    expect(el.style.position).toBe('');
  });

  it('exposes the clip rectangle as a reusable shared constant', () => {
    expect(VISUALLY_HIDDEN_STYLE).toContain('position:absolute');
    expect(VISUALLY_HIDDEN_STYLE).toContain('clip:rect(0, 0, 0, 0)');
  });
});
