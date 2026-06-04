import { Component, signal } from '@angular/core';

import { installObserverPolyfills, renderHost } from '../../test-utils';
import { ForScrollArea } from './scroll-area';
import { ForScrollAreaContent } from './scroll-area-content';
import { ForScrollAreaCorner } from './scroll-area-corner';
import { ForScrollAreaScrollbar } from './scroll-area-scrollbar';
import { ForScrollAreaThumb } from './scroll-area-thumb';
import { ForScrollAreaViewport } from './scroll-area-viewport';
import type { ForScrollAreaType } from './scroll-area-context';

@Component({
  imports: [
    ForScrollArea,
    ForScrollAreaViewport,
    ForScrollAreaContent,
    ForScrollAreaScrollbar,
    ForScrollAreaThumb,
    ForScrollAreaCorner,
  ],
  template: `
    <div forScrollArea [type]="type()">
      <div forScrollAreaViewport>
        <div forScrollAreaContent style="width: 1000px; height: 1000px;">content</div>
      </div>
      <div forScrollAreaScrollbar orientation="vertical" data-testid="vbar">
        <div forScrollAreaThumb data-testid="vthumb"></div>
      </div>
      <div forScrollAreaScrollbar orientation="horizontal" data-testid="hbar">
        <div forScrollAreaThumb data-testid="hthumb"></div>
      </div>
      <div forScrollAreaCorner data-testid="corner"></div>
    </div>
  `,
})
class ScrollAreaHost {
  readonly type = signal<ForScrollAreaType>('always');
}

@Component({
  imports: [ForScrollArea, ForScrollAreaViewport, ForScrollAreaScrollbar, ForScrollAreaThumb],
  template: `
    <div forScrollArea>
      <div forScrollAreaViewport>
        <div style="width: 1000px; height: 1000px;">content (no directive)</div>
      </div>
      <div forScrollAreaScrollbar orientation="vertical" data-testid="vbar">
        <div forScrollAreaThumb></div>
      </div>
    </div>
  `,
})
class ScrollAreaHostNoContent {}

// Geometry — thumb size / position, overflow-driven visibility, hover / scroll
// fade — is derived from `clientWidth` / `scrollWidth` / `scrollTop`, all of
// which jsdom returns as zeros. Those outcomes are covered against a real
// browser layout in `scroll-area.e2e.ts`; this suite asserts only wiring
// (style injection, observer / scroll-listener attachment) without faking
// measurements. See testing.md rule #8.
describe('ForScrollArea', () => {
  let restoreObservers: () => void;

  beforeAll(() => {
    restoreObservers = installObserverPolyfills();
  });
  afterAll(() => restoreObservers());

  beforeEach(() => {
    document.getElementById('for-scroll-area-hide-native')?.remove();
  });

  it('injects native-scrollbar-hiding styles once on first viewport mount', () => {
    expect(document.getElementById('for-scroll-area-hide-native')).toBeNull();
    renderHost(ScrollAreaHost);
    expect(document.getElementById('for-scroll-area-hide-native')).not.toBeNull();
  });

  it('mounts the scrollbar / thumb / corner pieces with their roles wired', () => {
    const { query } = renderHost(ScrollAreaHost);

    expect(query('[data-testid="vbar"]')).not.toBeNull();
    expect(query('[data-testid="hbar"]')).not.toBeNull();
    expect(query('[data-testid="vthumb"]')).not.toBeNull();
    expect(query('[data-testid="corner"]')).not.toBeNull();
  });

  it('wires the viewport scroll listener without throwing', () => {
    const { query, flush } = renderHost(ScrollAreaHost);
    flush();

    const viewport = query<HTMLElement>('[forScrollAreaViewport]')!;
    expect(() => {
      viewport.dispatchEvent(new Event('scroll'));
      flush();
    }).not.toThrow();
  });

  it('constructs with a registered [forScrollAreaContent] without throwing', () => {
    expect(() => renderHost(ScrollAreaHost)).not.toThrow();
  });

  it('renders without [forScrollAreaContent] and skips content observation', () => {
    expect(() => renderHost(ScrollAreaHostNoContent)).not.toThrow();
  });

  it('zoneless reactivity: changing [type] does not throw', () => {
    const { fixture, flush } = renderHost(ScrollAreaHost);
    flush();

    expect(() => {
      fixture.componentInstance.type.set('hover');
      flush();
      fixture.componentInstance.type.set('scroll');
      flush();
    }).not.toThrow();
  });
});
