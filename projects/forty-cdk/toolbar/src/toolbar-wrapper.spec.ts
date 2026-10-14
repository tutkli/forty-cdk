import { Component, Directive } from '@angular/core';

import { pressKey } from 'forty-cdk/testing';
import { ForToggleGroup, ForToggleGroupItem } from 'forty-cdk/toggle';

import { renderHost } from '../../src/test-utils';

import { ForToolbar, provideForToolbar } from './toolbar';
import { ForToolbarButton } from './toolbar-button';
import { FOR_TOOLBAR_CONTEXT } from './toolbar-context';

@Directive({
  selector: '[wrapperToolbar]',
  exportAs: 'wrapperToolbar',
  providers: provideForToolbar(WrapperToolbar),
  host: { class: 'wrapper-toolbar' },
})
class WrapperToolbar extends ForToolbar {}

@Directive({
  selector: '[handWrittenToolbar]',
  providers: [{ provide: FOR_TOOLBAR_CONTEXT, useExisting: HandWrittenToolbar }],
})
class HandWrittenToolbar extends ForToolbar {}

@Component({
  imports: [WrapperToolbar, ForToolbarButton, ForToggleGroup, ForToggleGroupItem],
  template: `
    <div wrapperToolbar aria-label="Formatting">
      <button forToolbarButton data-testid="a">A</button>
      <div forToggleGroup>
        <button forToggleGroupItem value="b" data-testid="b">B</button>
        <button forToggleGroupItem value="c" data-testid="c">C</button>
      </div>
    </div>
  `,
})
class WrapperHost {}

@Component({
  imports: [HandWrittenToolbar, ForToolbarButton, ForToggleGroup, ForToggleGroupItem],
  template: `
    <div handWrittenToolbar aria-label="Formatting">
      <button forToolbarButton data-testid="a">A</button>
      <div forToggleGroup>
        <button forToggleGroupItem value="b" data-testid="b">B</button>
        <button forToggleGroupItem value="c" data-testid="c">C</button>
      </div>
    </div>
  `,
})
class HandWrittenHost {}

function tabStops(el: HTMLElement): string[] {
  return Array.from(el.querySelectorAll<HTMLElement>('[tabindex="0"]')).map(
    (node) => node.dataset['testid']!,
  );
}

describe('ForToolbar subclass wrapper', () => {
  it('keeps a single tab stop across a nested toggle group when the subclass spreads provideForToolbar', async () => {
    const { el, flush } = renderHost(WrapperHost);
    await flush();

    expect(el.querySelector('[wrapperToolbar]')?.getAttribute('role')).toBe('toolbar');
    expect(tabStops(el)).toEqual(['a']);
  });

  it('moves focus from a toolbar button into the nested toggle items with the arrow keys', async () => {
    const { el, flush } = renderHost(WrapperHost);
    await flush();
    const a = el.querySelector<HTMLElement>('[data-testid="a"]')!;
    const b = el.querySelector<HTMLElement>('[data-testid="b"]')!;
    const c = el.querySelector<HTMLElement>('[data-testid="c"]')!;

    a.focus();
    pressKey(a, 'ArrowRight');
    await flush();
    expect(document.activeElement).toBe(b);

    pressKey(b, 'ArrowRight');
    await flush();
    expect(document.activeElement).toBe(c);
    expect(tabStops(el)).toEqual(['c']);
  });

  it('splits the tab stop when a subclass re-provides only FOR_TOOLBAR_CONTEXT', async () => {
    const { el, flush } = renderHost(HandWrittenHost);
    await flush();

    expect(tabStops(el)).toEqual(['a', 'b']);
  });
});
