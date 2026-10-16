import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ForContextMenu, ForContextMenuTrigger } from 'forty-cdk/context-menu';
import { ForDialogManager } from 'forty-cdk/dialog';
import { ForDrawerManager } from 'forty-cdk/drawer';
import { ForMenuContent, ForMenuItem } from 'forty-cdk/menu';
import { pressKey } from 'forty-cdk/testing';

import { afterEachOverlayCleanup, flush, nextMacrotask, renderHost } from '../test-utils';

@Component({ template: `<button id="surface-action">Action</button>` })
class SurfaceContent {}

interface ManagedRef {
  close(): void;
  readonly closed: Promise<unknown>;
}

const MANAGERS: readonly (readonly [string, () => ManagedRef])[] = [
  ['ForDialogManager', () => TestBed.inject(ForDialogManager).open(SurfaceContent)],
  ['ForDrawerManager', () => TestBed.inject(ForDrawerManager).open(SurfaceContent)],
];

@Component({
  imports: [ForContextMenu, ForContextMenuTrigger, ForMenuContent, ForMenuItem],
  template: `
    <div forContextMenu [(open)]="open">
      <div id="region" forContextMenuTrigger>
        <button id="row-a" type="button">Row A</button>
        <button id="row-b" type="button">Row B</button>
      </div>
      @if (open()) {
        <div forMenuContent>
          <button forMenuItem>Cut</button>
        </div>
      }
    </div>
  `,
})
class ContextMenuRowsHost {
  readonly open = signal(false);
}

async function openAndClose(open: () => ManagedRef): Promise<void> {
  const ref = open();
  TestBed.tick();
  ref.close();
  await ref.closed;
  TestBed.tick();
  await nextMacrotask();
}

describe('a recorded return-focus origin lives as long as the open that recorded it', () => {
  afterEachOverlayCleanup();

  afterEach(() => {
    document.querySelectorAll('#unrelated-trigger').forEach((node) => node.remove());
    TestBed.resetTestingModule();
  });

  for (const [name, open] of MANAGERS) {
    it(`${name}: an unrelated open after the chain ended does not return focus to its trigger`, async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const trigger = document.createElement('button');
      trigger.id = 'unrelated-trigger';
      document.body.appendChild(trigger);
      trigger.focus();

      await openAndClose(open);
      expect(document.activeElement).toBe(trigger);

      trigger.blur();
      await openAndClose(open);

      expect(document.activeElement).not.toBe(trigger);
    });
  }

  it('[forContextMenu]: a model-driven open after a descendant keyboard open returns focus to the region', async () => {
    const r = renderHost(ContextMenuRowsHost);
    const rowA = r.query<HTMLElement>('#row-a')!;
    rowA.focus();
    pressKey(rowA, 'F10', { shiftKey: true });
    await flush(r.fixture);
    pressKey(document, 'Escape');
    await flush(r.fixture);
    expect(document.activeElement).toBe(rowA);

    r.query<HTMLElement>('#row-b')!.focus();
    r.instance.open.set(true);
    await flush(r.fixture);
    pressKey(document, 'Escape');
    await flush(r.fixture);

    expect(r.instance.open()).toBe(false);
    expect(document.activeElement).toBe(r.query<HTMLElement>('#region'));
  });
});
