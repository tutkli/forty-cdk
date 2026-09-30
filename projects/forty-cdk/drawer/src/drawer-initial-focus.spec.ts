import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEachOverlayCleanup, flush, renderHost } from '../../src/test-utils';
import { ForDrawer } from './drawer';
import { ForDrawerBackdrop } from './drawer-backdrop';
import { ForDrawerClose } from './drawer-close';
import { ForDrawerInitialFocus } from './drawer-initial-focus';
import { ForDrawerManager } from './drawer-manager';
import { ForDrawerTitle } from './drawer-title';

@Component({
  imports: [ForDrawer, ForDrawerTitle, ForDrawerClose, ForDrawerInitialFocus],
  host: { 'data-fixture': 'drawer-initial-focus-host' },
  template: `
    <button id="opener" type="button">Open</button>
    @if (open()) {
      <div forDrawer [modal]="modal()" (dismiss)="open.set(false)">
        <h2 forDrawerTitle>Filters</h2>
        <button id="close" type="button" forDrawerClose aria-label="Close">×</button>
        @if (marked()) {
          <button id="apply" type="button" [disabled]="disabled()" forDrawerInitialFocus>
            Apply
          </button>
        } @else {
          <button id="apply" type="button">Apply</button>
        }
      </div>
    }
  `,
})
class DrawerInitialFocusHost {
  readonly open = signal(false);
  readonly modal = signal(true);
  readonly marked = signal(true);
  readonly disabled = signal(false);
}

@Component({
  imports: [ForDrawerTitle, ForDrawerClose, ForDrawerInitialFocus],
  host: { 'data-fixture': 'managed-initial-focus-drawer' },
  template: `
    <h2 forDrawerTitle>Filters</h2>
    <button id="close" type="button" forDrawerClose aria-label="Close">×</button>
    <button id="apply" type="button" forDrawerInitialFocus>Apply</button>
  `,
})
class ManagedInitialFocusDrawer {}

async function openWith(setup: (host: DrawerInitialFocusHost) => void): Promise<void> {
  const r = renderHost(DrawerInitialFocusHost);
  setup(r.instance);
  document.querySelector<HTMLElement>('#opener')!.focus();
  r.instance.open.set(true);
  await flush(r.fixture);
}

describe('ForDrawerInitialFocus (#2056)', () => {
  afterEachOverlayCleanup();

  it('focuses the marked element when a modal drawer opens', async () => {
    await openWith(() => undefined);

    expect(document.activeElement?.id).toBe('apply');
  });

  it('focuses the marked element when a non-modal drawer opens', async () => {
    await openWith((host) => host.modal.set(false));

    expect(document.activeElement?.id).toBe('apply');
  });

  it('falls back to initialFocus when no marker is rendered', async () => {
    await openWith((host) => host.marked.set(false));

    expect(document.activeElement?.id).toBe('close');
  });

  it('falls back to initialFocus when the marked element is disabled', async () => {
    await openWith((host) => host.disabled.set(true));

    expect(document.activeElement?.id).toBe('close');
  });

  it('focuses the marked element inside a component opened with ForDrawerManager', () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    TestBed.inject(ForDrawerManager).open(ManagedInitialFocusDrawer);
    TestBed.tick();

    expect(document.activeElement?.id).toBe('apply');
  });
});

@Component({
  imports: [ForDrawer, ForDrawerBackdrop, ForDrawerTitle],
  host: { 'data-fixture': 'drawer-backdrop-depth-host' },
  template: `
    @if (open()) {
      <div forDrawer data-name="parent" (dismiss)="open.set(false)">
        <div forDrawerBackdrop data-name="parent"></div>
        <h2 forDrawerTitle>Parent</h2>
        @if (childOpen()) {
          <div forDrawer data-name="child" (dismiss)="childOpen.set(false)">
            <div forDrawerBackdrop data-name="child"></div>
            <h2 forDrawerTitle>Child</h2>
          </div>
        }
      </div>
    }
  `,
})
class DrawerBackdropDepthHost {
  readonly open = signal(true);
  readonly childOpen = signal(true);
}

describe('ForDrawerBackdrop depth (#2063)', () => {
  afterEachOverlayCleanup();

  it("mirrors its drawer's nesting depth as data-depth and --for-drawer-depth", async () => {
    const { fixture } = renderHost(DrawerBackdropDepthHost);
    await flush(fixture);

    const read = (selector: string): { attr: string | null; property: string } => {
      const el = document.querySelector<HTMLElement>(selector)!;
      return {
        attr: el.getAttribute('data-depth'),
        property: el.style.getPropertyValue('--for-drawer-depth'),
      };
    };
    expect(read('[forDrawer][data-name="parent"]')).toEqual({ attr: '0', property: '0' });
    expect(read('[forDrawer][data-name="child"]')).toEqual({ attr: '1', property: '1' });
    expect(read('[forDrawerBackdrop][data-name="parent"]')).toEqual({ attr: '0', property: '0' });
    expect(read('[forDrawerBackdrop][data-name="child"]')).toEqual({ attr: '1', property: '1' });
  });
});
