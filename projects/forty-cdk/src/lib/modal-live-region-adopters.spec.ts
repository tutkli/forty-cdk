import { Component, inject, signal } from '@angular/core';

import { provideNativeDateAdapter } from 'forty-cdk/date-adapter';
import { ForDatePicker, ForDatePickerContent, ForDatePickerTrigger } from 'forty-cdk/date-picker';
import { ForDialog } from 'forty-cdk/dialog';
import { ForDrawer } from 'forty-cdk/drawer';
import { ForSelect, ForSelectContent, ForSelectOption, ForSelectTrigger } from 'forty-cdk/select';
import { ForToastViewport } from 'forty-cdk/toast';
import { LiveAnnouncer } from 'forty-cdk/visually-hidden';

import { afterEachOverlayCleanup } from '../test-utils/overlay-cleanup';
import { renderHost } from '../test-utils/render';
import { LIBRARY_CODE } from '../test-utils/source-scan';

const MODAL_SHELL = 'core-overlay/src/modal-shell/modal-shell.ts';
const MODAL_SURFACE_BASE = 'core-overlay/src/modal-shell/modal-surface-base.ts';

const ARIA_MODAL_HOST_BINDING = /['"](?:\[attr\.)?aria-modal\]?['"]\s*:/;
const EXEMPT_MARKER_WRITE =
  /\.(?:setAttribute|toggleAttribute)\(\s*MODAL_EXEMPT_ATTRIBUTE|['"](?:\[attr\.)?data-for-modal-exempt\]?['"]\s*:/;

function filesWhere(predicate: (code: string) => boolean): string[] {
  return [...LIBRARY_CODE]
    .filter(([, code]) => predicate(code))
    .map(([path]) => path)
    .sort();
}

type ModalKind = 'dialog' | 'alert-dialog' | 'drawer' | 'date-picker';

@Component({
  imports: [
    ForDialog,
    ForDrawer,
    ForDatePicker,
    ForDatePickerTrigger,
    ForDatePickerContent,
    ForToastViewport,
  ],
  providers: [...provideNativeDateAdapter()],
  template: `
    @let activeKind = kind();
    @switch (activeKind) {
      @case ('dialog') {
        @if (open()) {
          <div forDialog [modal]="modal()" ariaLabel="Dialog" data-test-id="surface">
            <button type="button">inside</button>
            @if (stacked()) {
              <div forDialog ariaLabel="Nested" data-test-id="stacked">
                <button type="button">nested</button>
              </div>
            }
          </div>
        }
      }
      @case ('alert-dialog') {
        @if (open()) {
          <div forDialog alert ariaLabel="Alert" data-test-id="surface">
            <button type="button">ok</button>
          </div>
        }
      }
      @case ('drawer') {
        @if (open()) {
          <div forDrawer ariaLabel="Drawer" data-test-id="surface">
            <button type="button">inside</button>
          </div>
        }
      }
      @case ('date-picker') {
        <div forDatePicker modal [(open)]="open" ariaLabel="Date">
          <button type="button" forDatePickerTrigger>Date</button>
          @if (open()) {
            <div forDatePickerContent data-test-id="surface">
              <button type="button">Next month</button>
            </div>
          }
        </div>
      }
      @default never;
    }
    @if (viewport()) {
      <for-toast-viewport />
    }
  `,
})
class ModalHost {
  readonly announcer = inject(LiveAnnouncer);
  readonly kind = signal<ModalKind>('dialog');
  readonly open = signal(false);
  readonly modal = signal(true);
  readonly stacked = signal(false);
  readonly viewport = signal(true);
}

@Component({
  imports: [ForSelect, ForSelectTrigger, ForSelectContent, ForSelectOption],
  template: `
    <div forSelect modal [(open)]="open" ariaLabel="Fruit">
      <button type="button" forSelectTrigger>Fruit</button>
      @if (open()) {
        <div forSelectContent data-test-id="surface">
          <div forSelectOption value="apple">Apple</div>
        </div>
      }
    </div>
  `,
})
class ModalSelectHost {
  readonly announcer = inject(LiveAnnouncer);
  readonly open = signal(false);
}

const MODAL_KINDS: readonly ModalKind[] = ['dialog', 'alert-dialog', 'drawer', 'date-picker'];

function query(testId: string): HTMLElement {
  return document.querySelector<HTMLElement>(`[data-test-id="${testId}"]`)!;
}

function owned(el: HTMLElement): string[] {
  return (el.getAttribute('aria-owns') ?? '').split(/\s+/).filter((id) => id !== '');
}

function announcerRegionIds(): string[] {
  return Array.from(document.querySelectorAll<HTMLElement>('body > [aria-live]'), (r) => r.id);
}

function viewportId(): string {
  return document.querySelector<HTMLElement>('for-toast-viewport')!.id;
}

async function mountOpen(kind: ModalKind) {
  const r = renderHost(ModalHost);
  r.instance.kind.set(kind);
  await r.flush();
  r.instance.open.set(true);
  await r.flush();
  return r;
}

describe('modal live-region adoption', () => {
  afterEachOverlayCleanup();

  it('derives the hosts binding aria-modal', () => {
    expect(filesWhere((code) => ARIA_MODAL_HOST_BINDING.test(code))).toEqual([
      MODAL_SURFACE_BASE,
      'date-picker/src/date-picker-content.ts',
    ]);
  });

  it('routes every host binding aria-modal through the modal shell', () => {
    const subclasses = filesWhere((code) => /\bextends ModalSurfaceBase\b/.test(code));
    const adopters = filesWhere((code) => ARIA_MODAL_HOST_BINDING.test(code)).flatMap((path) =>
      path === MODAL_SURFACE_BASE ? subclasses : [path],
    );

    expect(subclasses.length).toBeGreaterThan(0);
    expect(
      adopters.filter((path) => !LIBRARY_CODE.get(path)!.includes('injectModalShell(')),
    ).toEqual([]);
  });

  it('claims the owned regions from the modal shell alone', () => {
    expect(filesWhere((code) => /\bModalOwnedRegions\b[\s\S]*\.claim\(/.test(code))).toEqual([
      MODAL_SHELL,
    ]);
  });

  it('registers every element carrying the exempt marker', () => {
    const writers = filesWhere((code) => EXEMPT_MARKER_WRITE.test(code));
    const registrants = filesWhere((code) => /\bModalOwnedRegions\b[\s\S]*\.register\(/.test(code));

    expect(writers).toEqual([
      'core/src/live-announcer/live-announcer.ts',
      'toast/src/toast-viewport.ts',
    ]);
    expect(registrants).toEqual(writers);
  });

  describe.each(MODAL_KINDS)('an open modal %s', (kind) => {
    it('lists every announcer region and the exempt toast viewport in its aria-owns', async () => {
      await mountOpen(kind);
      const surface = query('surface');

      const regionIds = announcerRegionIds();
      expect(regionIds).toHaveLength(2);
      expect(regionIds.every((id) => id !== '')).toBe(true);
      expect(surface.getAttribute('aria-modal')).toBe('true');
      expect(owned(surface).sort()).toEqual([...regionIds, viewportId()].sort());
    });

    it('releases the regions on close', async () => {
      const r = await mountOpen(kind);
      const surface = query('surface');

      r.instance.open.set(false);
      await r.flush();

      expect(surface.hasAttribute('aria-owns')).toBe(false);
    });

    it('takes in a toast viewport mounted while it is open and drops it when it unmounts', async () => {
      const r = renderHost(ModalHost);
      r.instance.kind.set(kind);
      r.instance.viewport.set(false);
      await r.flush();
      r.instance.open.set(true);
      await r.flush();
      const surface = query('surface');
      expect(owned(surface).sort()).toEqual(announcerRegionIds().sort());

      r.instance.viewport.set(true);
      await r.flush();
      expect(owned(surface)).toContain(viewportId());

      r.instance.viewport.set(false);
      await r.flush();
      expect(owned(surface).sort()).toEqual(announcerRegionIds().sort());
    });
  });

  it('hands the regions to a stacked modal and takes them back when it closes', async () => {
    const r = await mountOpen('dialog');
    const lower = query('surface');
    const expected = [...announcerRegionIds(), viewportId()].sort();

    r.instance.stacked.set(true);
    await r.flush();
    const upper = query('stacked');
    expect(owned(upper).sort()).toEqual(expected);
    expect(lower.hasAttribute('aria-owns')).toBe(false);

    r.instance.stacked.set(false);
    await r.flush();
    expect(owned(lower).sort()).toEqual(expected);
    expect(upper.hasAttribute('aria-owns')).toBe(false);
  });

  it('keeps a consumer aria-owns on the surface beside the regions', async () => {
    const r = await mountOpen('dialog');
    const lower = query('surface');
    lower.setAttribute('aria-owns', 'consumer-owned');
    r.instance.stacked.set(true);
    await r.flush();
    expect(lower.getAttribute('aria-owns')).toBe('consumer-owned');

    r.instance.stacked.set(false);
    await r.flush();
    expect(owned(lower)[0]).toBe('consumer-owned');
    expect(owned(lower)).toHaveLength(4);

    r.instance.open.set(false);
    await r.flush();
    expect(lower.getAttribute('aria-owns')).toBe('consumer-owned');
  });

  it('leaves a non-modal dialog without aria-owns', async () => {
    const r = renderHost(ModalHost);
    r.instance.modal.set(false);
    await r.flush();
    r.instance.open.set(true);
    await r.flush();

    expect(query('surface').hasAttribute('aria-owns')).toBe(false);
  });

  it('leaves a modal surface that does not bind aria-modal without aria-owns', async () => {
    const r = renderHost(ModalSelectHost);
    await r.flush();
    r.instance.open.set(true);
    await r.flush();
    const surface = query('surface');

    expect(surface.getAttribute('role')).toBe('listbox');
    expect(surface.hasAttribute('aria-modal')).toBe(false);
    expect(surface.hasAttribute('aria-owns')).toBe(false);
  });
});
