import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEachOverlayCleanup, flush, renderHost } from '../../src/test-utils';
import { ForDialog } from './dialog';
import { ForDialogBackdrop } from './dialog-backdrop';
import { ForDialogManager } from './dialog-manager';
import { ForDialogTitle } from './dialog-title';

@Component({
  imports: [ForDialog, ForDialogBackdrop, ForDialogTitle],
  host: { 'data-fixture': 'stacked-depth-host' },
  template: `
    @for (name of names; track name) {
      @if (open()[name]) {
        <div forDialog [attr.data-name]="name" (dismiss)="close(name)">
          <div forDialogBackdrop [attr.data-name]="name"></div>
          <h2 forDialogTitle>{{ name }}</h2>
          <button type="button">ok</button>
        </div>
      }
    }
  `,
})
class StackedDepthHost {
  readonly names = ['a', 'b', 'c'] as const;
  readonly open = signal<Record<string, boolean>>({});

  show(name: string): void {
    this.open.update((state) => ({ ...state, [name]: true }));
  }

  close(name: string): void {
    this.open.update((state) => ({ ...state, [name]: false }));
  }
}

@Component({
  imports: [ForDialogBackdrop, ForDialogTitle],
  host: { 'data-fixture': 'managed-depth-dialog' },
  template: `<div forDialogBackdrop></div>
    <h2 forDialogTitle>Managed</h2>
    <button type="button">ok</button>`,
})
class ManagedDepthDialog {}

function surface(name: string): HTMLElement {
  return document.querySelector<HTMLElement>(`[forDialog][data-name="${name}"]`)!;
}

function backdrop(name: string): HTMLElement {
  return document.querySelector<HTMLElement>(`[forDialogBackdrop][data-name="${name}"]`)!;
}

function depthOf(el: HTMLElement): { attr: string | null; property: string } {
  return {
    attr: el.getAttribute('data-depth'),
    property: el.style.getPropertyValue('--for-dialog-depth'),
  };
}

describe('ForDialog stacking depth (#2063)', () => {
  afterEachOverlayCleanup();

  it('gives the surfaces and their backdrops depths 0, 1 and 2 in open order', async () => {
    const { fixture } = renderHost(StackedDepthHost);
    for (const name of ['a', 'b', 'c']) {
      fixture.componentInstance.show(name);
      await flush(fixture);
    }

    expect(['a', 'b', 'c'].map((name) => depthOf(surface(name)))).toEqual([
      { attr: '0', property: '0' },
      { attr: '1', property: '1' },
      { attr: '2', property: '2' },
    ]);
    expect(['a', 'b', 'c'].map((name) => depthOf(backdrop(name)))).toEqual([
      { attr: '0', property: '0' },
      { attr: '1', property: '1' },
      { attr: '2', property: '2' },
    ]);
  });

  it('stacks a new dialog above the deepest one still mounted, never reusing a level', async () => {
    const { fixture } = renderHost(StackedDepthHost);
    fixture.componentInstance.show('a');
    await flush(fixture);
    fixture.componentInstance.show('b');
    await flush(fixture);

    fixture.componentInstance.close('a');
    await flush(fixture);
    fixture.componentInstance.show('c');
    await flush(fixture);

    expect(depthOf(surface('b')).attr).toBe('1');
    expect(depthOf(surface('c')).attr).toBe('2');
  });

  it('starts again at 0 once every dialog has closed', async () => {
    const { fixture } = renderHost(StackedDepthHost);
    fixture.componentInstance.show('a');
    await flush(fixture);
    fixture.componentInstance.close('a');
    await flush(fixture);

    fixture.componentInstance.show('b');
    await flush(fixture);

    expect(depthOf(surface('b')).attr).toBe('0');
  });

  it('shares one count between declarative and managed dialogs', async () => {
    const { fixture } = renderHost(StackedDepthHost);
    fixture.componentInstance.show('a');
    await flush(fixture);

    TestBed.inject(ForDialogManager).open(ManagedDepthDialog);
    await flush(fixture);

    const managed = document.querySelector<HTMLElement>('[forDialog]:not([data-name])')!;
    expect(depthOf(managed)).toEqual({ attr: '1', property: '1' });
    expect(
      depthOf(document.querySelector<HTMLElement>('[forDialogBackdrop]:not([data-name])')!),
    ).toEqual({ attr: '1', property: '1' });
  });

  it('stacks a dialog opened while another is still animating out above it', async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const dialogs = TestBed.inject(ForDialogManager);
    const leaving = dialogs.open(ManagedDepthDialog, { animateLeave: 'out' });
    TestBed.tick();
    const leavingHost = document.querySelector<HTMLElement>('[forDialog]')!;
    leavingHost.getAnimations = () =>
      [{ finished: new Promise<void>(() => undefined) }] as unknown as Animation[];

    leaving.close();
    await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve)));
    TestBed.tick();
    expect(leavingHost.isConnected).toBe(true);

    dialogs.open(ManagedDepthDialog);
    TestBed.tick();

    const hosts = Array.from(document.querySelectorAll<HTMLElement>('[forDialog]'));
    expect(hosts.map((host) => host.getAttribute('data-depth'))).toEqual(['0', '1']);
  });
});

@Component({
  imports: [ForDialog, ForDialogTitle],
  host: { 'data-fixture': 'depth-context-reader' },
  template: `
    @if (open()) {
      <div forDialog #dialog="forDialog" (dismiss)="open.set(false)">
        <h2 forDialogTitle>Depth {{ dialog.depth() }}</h2>
      </div>
    }
  `,
})
class DepthContextReader {
  readonly open = signal(true);
}

describe('ForDialogContext.depth', () => {
  afterEachOverlayCleanup();

  it('publishes the same depth the surface reflects', async () => {
    const { fixture } = renderHost(DepthContextReader);
    await flush(fixture);

    const heading = document.querySelector('[forDialogTitle]')!;
    expect(heading.textContent).toBe('Depth 0');
    expect(document.querySelector('[forDialog]')!.getAttribute('data-depth')).toBe('0');
  });
});
