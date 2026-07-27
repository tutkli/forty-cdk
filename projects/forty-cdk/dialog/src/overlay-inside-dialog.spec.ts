import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEachOverlayCleanup, flush, renderHost } from '../../src/test-utils';
import { ForDropdownMenu, ForDropdownMenuTrigger } from 'forty-cdk/dropdown-menu';
import { ForMenuContent, ForMenuItem } from 'forty-cdk/menu';
import { ForSelect, ForSelectContent, ForSelectOption, ForSelectTrigger } from 'forty-cdk/select';
import { ForDialog } from './dialog';

/**
 * #676 — an anchored overlay (Select / DropdownMenu) opened from a form inside
 * a modal `ForDialog` portals its content to `document.body`. The modal inert
 * pass would otherwise swallow that late body sibling, leaving it painted but
 * `inert` + `aria-hidden` (clicks fall through to the controls behind it, and
 * screen readers can't reach the options). The shared `injectOverlayShell`
 * stamps `data-for-modal-peer` on the portaled host because the trigger lives
 * inside the dialog's protected root, so the pass / observer skips it. A toast
 * portaled from background context the same way stays isolated (#388).
 */
@Component({
  imports: [
    ForDialog,
    ForSelect,
    ForSelectTrigger,
    ForSelectContent,
    ForSelectOption,
    ForDropdownMenu,
    ForDropdownMenuTrigger,
    ForMenuContent,
    ForMenuItem,
  ],
  template: `
    @if (dialogOpen()) {
      <div forDialog (dismiss)="dialogOpen.set(false)" [ariaLabel]="'Form dialog'">
        <div forSelect [(open)]="selectOpen">
          <button forSelectTrigger>Pick</button>
          @if (selectOpen()) {
            <div forSelectContent>
              <button data-test-id="opt-apple" forSelectOption value="apple">Apple</button>
              <button data-test-id="opt-banana" forSelectOption value="banana">Banana</button>
            </div>
          }
        </div>

        <div forDropdownMenu [(open)]="menuOpen">
          <button forDropdownMenuTrigger>Menu</button>
          @if (menuOpen()) {
            <div forMenuContent>
              <button data-test-id="item-a" forMenuItem>A</button>
              <button data-test-id="item-b" forMenuItem>B</button>
            </div>
          }
        </div>
      </div>
    }
  `,
})
class DialogWithOverlaysHost {
  readonly dialogOpen = signal(false);
  readonly selectOpen = signal(false);
  readonly menuOpen = signal(false);
}

describe('overlays opened inside a modal ForDialog (#676)', () => {
  afterEachOverlayCleanup();

  let bodyExtras: HTMLElement[] = [];

  afterEach(() => {
    for (const el of bodyExtras) {
      el.remove();
    }
    bodyExtras = [];
  });

  it('keeps a Select opened inside the dialog interactive (peer, not inert / aria-hidden)', async () => {
    const r = renderHost(DialogWithOverlaysHost);
    r.instance.dialogOpen.set(true);
    await flush(r.fixture);

    r.instance.selectOpen.set(true);
    await flush(r.fixture);

    const content = document.querySelector<HTMLElement>('[forSelectContent]');
    // Portaled to body as a sibling of the dialog, so it would be swept by the
    // inert pass without the peer marker.
    expect(content!.parentElement).toBe(document.body);
    expect(content!.hasAttribute('data-for-modal-peer')).toBe(true);
    expect(content!.hasAttribute('inert')).toBe(false);
    expect(content!.hasAttribute('aria-hidden')).toBe(false);
    // No inerted ancestor — the options are reachable.
    expect(content!.closest('[inert]')).toBeNull();

    r.fixture.destroy();
  });

  it('keeps a DropdownMenu opened inside the dialog interactive', async () => {
    const r = renderHost(DialogWithOverlaysHost);
    r.instance.dialogOpen.set(true);
    await flush(r.fixture);

    r.instance.menuOpen.set(true);
    await flush(r.fixture);

    const content = document.querySelector<HTMLElement>('[forMenuContent]');
    expect(content!.parentElement).toBe(document.body);
    expect(content!.hasAttribute('data-for-modal-peer')).toBe(true);
    expect(content!.hasAttribute('inert')).toBe(false);
    expect(content!.hasAttribute('aria-hidden')).toBe(false);
    expect(content!.closest('[inert]')).toBeNull();

    r.fixture.destroy();
  });

  it('still inerts a toast portaled to body while the dialog is open (#388 stays green)', async () => {
    const r = renderHost(DialogWithOverlaysHost);
    r.instance.dialogOpen.set(true);
    await flush(r.fixture);

    // A toast shows (portaled to body) while the modal is open. It has no
    // anchor inside the dialog and carries no peer marker, so the late-sibling
    // observer must still inert it.
    const toast = document.createElement('div');
    toast.setAttribute('data-test-id', 'toast');
    document.body.appendChild(toast);
    bodyExtras.push(toast);

    // Let the MutationObserver microtask run, then settle the render pipeline.
    await Promise.resolve();
    await flush(r.fixture);

    expect(toast.hasAttribute('inert')).toBe(true);
    expect(toast.getAttribute('aria-hidden')).toBe('true');

    r.fixture.destroy();
  });

  it('runs under provideZonelessChangeDetection', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    const r = renderHost(DialogWithOverlaysHost);
    r.instance.dialogOpen.set(true);
    await flush(r.fixture);
    r.instance.selectOpen.set(true);
    await flush(r.fixture);

    const content = document.querySelector<HTMLElement>('[forSelectContent]');
    expect(content!.hasAttribute('data-for-modal-peer')).toBe(true);
    expect(content!.hasAttribute('inert')).toBe(false);

    r.fixture.destroy();
  });
});
