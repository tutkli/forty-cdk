import { Component, Directive, signal } from '@angular/core';

import { afterEachOverlayCleanup, renderHost } from '../../src/test-utils';
import { FOR_MENU_CONTEXT } from 'forty-cdk/core-overlay';
import { ForMenuContent, ForMenuItem } from 'forty-cdk/menu';

import { ForMenubar } from './menubar';
import { FOR_MENUBAR_CONTEXT } from './menubar-context';
import { ForMenubarTrigger } from './menubar-trigger';

@Directive({
  selector: '[wrapperMenubar]',
  exportAs: 'wrapperMenubar',
  providers: [
    { provide: FOR_MENUBAR_CONTEXT, useExisting: WrapperMenubar },
    {
      provide: FOR_MENU_CONTEXT,
      useFactory: (bar: WrapperMenubar) => bar.menuCtx,
      deps: [WrapperMenubar],
    },
  ],
})
class WrapperMenubar extends ForMenubar {}

@Directive({
  selector: '[halfWrappedMenubar]',
  providers: [{ provide: FOR_MENUBAR_CONTEXT, useExisting: HalfWrappedMenubar }],
})
class HalfWrappedMenubar extends ForMenubar {}

@Component({
  imports: [WrapperMenubar, ForMenubarTrigger, ForMenuContent, ForMenuItem],
  template: `
    <div wrapperMenubar [(value)]="open" aria-label="Main">
      <button forMenubarTrigger value="file" data-test-id="file">File</button>
      @if (open() === 'file') {
        <div forMenuContent>
          <button forMenuItem data-test-id="new" (activate)="activated.set('new')">New</button>
          <button forMenuItem data-test-id="quit">Quit</button>
        </div>
      }
    </div>
  `,
})
class WrapperHost {
  readonly open = signal<string | null>(null);
  readonly activated = signal<string | null>(null);
}

@Component({
  imports: [HalfWrappedMenubar, ForMenubarTrigger, ForMenuContent, ForMenuItem],
  template: `
    <div halfWrappedMenubar [(value)]="open" aria-label="Main">
      <button forMenubarTrigger value="file">File</button>
      @if (open() === 'file') {
        <div forMenuContent>
          <button forMenuItem>New</button>
        </div>
      }
    </div>
  `,
})
class HalfWrappedHost {
  readonly open = signal<string | null>('file');
}

const byTestId = (id: string) => document.querySelector<HTMLElement>(`[data-test-id="${id}"]`)!;

describe('ForMenubar subclass wrapper (#2321)', () => {
  afterEachOverlayCleanup();

  it('opens a trigger menu through the subclass re-providing both tokens', async () => {
    const r = renderHost(WrapperHost);

    byTestId('file').click();
    await r.flush();

    expect(r.instance.open()).toBe('file');
    expect(document.querySelector('[forMenuContent]')!.getAttribute('role')).toBe('menu');
    expect(byTestId('file').getAttribute('aria-expanded')).toBe('true');
  });

  it('activates an item of the shared menu context', async () => {
    const r = renderHost(WrapperHost);
    byTestId('file').click();
    await r.flush();

    byTestId('new').click();
    await r.flush();

    expect(r.instance.activated()).toBe('new');
    expect(r.instance.open()).toBeNull();
  });

  it('fails the menu content when FOR_MENU_CONTEXT is left out', () => {
    expect(() => renderHost(HalfWrappedHost)).toThrow(/FORCDK-MENU-001/);
  });
});
