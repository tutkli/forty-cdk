import { Component, provideZonelessChangeDetection, signal, type Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ForDialog, ForDialogManager, ForDialogTitle } from 'forty-cdk/dialog';
import { ForDrawer, ForDrawerManager, ForDrawerTitle } from 'forty-cdk/drawer';
import {
  ForPopover,
  ForPopoverContent,
  ForPopoverTitle,
  ForPopoverTrigger,
} from 'forty-cdk/popover';

import { afterEachOverlayCleanup, flush, renderHost } from '../test-utils';

@Component({
  imports: [ForDialog],
  host: { 'data-fixture': 'unnamed-dialog' },
  template: `<div forDialog><button type="button">ok</button></div>`,
})
class UnnamedDialog {}

@Component({
  imports: [ForDialog, ForDialogTitle],
  host: { 'data-fixture': 'titled-dialog' },
  template: `<div forDialog>
    <h2 forDialogTitle>Confirm</h2>
    <button type="button">ok</button>
  </div>`,
})
class TitledDialog {}

@Component({
  imports: [ForDialog],
  host: { 'data-fixture': 'aria-label-input-dialog' },
  template: `<div forDialog [ariaLabel]="label()"><button type="button">ok</button></div>`,
})
class AriaLabelInputDialog {
  readonly label = signal('Confirm');
}

@Component({
  imports: [ForDialog],
  host: { 'data-fixture': 'static-aria-label-dialog' },
  template: `<div forDialog aria-label="Confirm"><button type="button">ok</button></div>`,
})
class StaticAriaLabelDialog {}

@Component({
  imports: [ForDialog],
  host: { 'data-fixture': 'blank-aria-label-dialog' },
  template: `<div forDialog aria-label="  "><button type="button">ok</button></div>`,
})
class BlankAriaLabelDialog {}

@Component({
  imports: [ForDrawer],
  host: { 'data-fixture': 'unnamed-drawer' },
  template: `<div forDrawer><button type="button">ok</button></div>`,
})
class UnnamedDrawer {}

@Component({
  imports: [ForDrawer, ForDrawerTitle],
  host: { 'data-fixture': 'titled-drawer' },
  template: `<div forDrawer>
    <h2 forDrawerTitle>Filters</h2>
    <button type="button">ok</button>
  </div>`,
})
class TitledDrawer {}

@Component({
  imports: [ForPopover, ForPopoverTrigger, ForPopoverContent],
  host: { 'data-fixture': 'unnamed-popover' },
  template: `<div forPopover [open]="true">
    <button type="button" forPopoverTrigger>Open</button>
    <div forPopoverContent><button type="button">ok</button></div>
  </div>`,
})
class UnnamedPopover {}

@Component({
  imports: [ForPopover, ForPopoverTrigger, ForPopoverContent, ForPopoverTitle],
  host: { 'data-fixture': 'titled-popover' },
  template: `<div forPopover [open]="true">
    <button type="button" forPopoverTrigger>Open</button>
    <div forPopoverContent>
      <h2 forPopoverTitle>Settings</h2>
      <button type="button">ok</button>
    </div>
  </div>`,
})
class TitledPopover {}

@Component({
  imports: [ForPopover, ForPopoverTrigger, ForPopoverContent],
  host: { 'data-fixture': 'root-labelled-popover' },
  template: `<div forPopover [open]="true" ariaLabel="Settings">
    <button type="button" forPopoverTrigger>Open</button>
    <div forPopoverContent><button type="button">ok</button></div>
  </div>`,
})
class RootLabelledPopover {}

@Component({
  host: { 'data-fixture': 'managed-unnamed-content' },
  template: `<button type="button">ok</button>`,
})
class ManagedUnnamedContent {}

function nameWarnings(warn: { readonly mock: { readonly calls: unknown[][] } }): string[] {
  return warn.mock.calls
    .map(([message]) => String(message))
    .filter((message) => message.includes('FORCDK-CORE-011'));
}

async function warningsFor(host: Type<unknown>): Promise<string[]> {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  const { fixture } = renderHost(host);
  await flush(fixture);
  fixture.detectChanges();
  await flush(fixture);
  return nameWarnings(warn);
}

describe('dialog accessible-name warning (#2061)', () => {
  afterEachOverlayCleanup();

  it('warns once for a [forDialog] with no title and no ariaLabel', async () => {
    const warnings = await warningsFor(UnnamedDialog);

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('[forty-cdk/dialog] FORCDK-CORE-011: [forDialog]');
    expect(warnings[0]).toContain('[forDialogTitle]');
    expect(warnings[0]).toContain('ariaLabel');
  });

  it('warns once for a [forDrawer] with no title and no ariaLabel', async () => {
    const warnings = await warningsFor(UnnamedDrawer);

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('[forty-cdk/drawer] FORCDK-CORE-011: [forDrawer]');
    expect(warnings[0]).toContain('[forDrawerTitle]');
  });

  it('warns once for a [forPopoverContent] with no title and no ariaLabel', async () => {
    const warnings = await warningsFor(UnnamedPopover);

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('[forty-cdk/popover] FORCDK-CORE-011: [forPopoverContent]');
    expect(warnings[0]).toContain('[forPopoverTitle]');
    expect(warnings[0]).toContain('[forPopover]');
  });

  it('warns for an aria-label that is only whitespace', async () => {
    expect(await warningsFor(BlankAriaLabelDialog)).toHaveLength(1);
  });

  for (const [name, host] of [
    ['a title registered in the same render', TitledDialog],
    ['a bound ariaLabel', AriaLabelInputDialog],
    ['a static aria-label attribute', StaticAriaLabelDialog],
    ['a drawer title', TitledDrawer],
    ['a popover title', TitledPopover],
    ['an ariaLabel on the popover root', RootLabelledPopover],
  ] as const) {
    it(`does not warn for ${name}`, async () => {
      expect(await warningsFor(host)).toEqual([]);
    });
  }

  it('warns for a managed dialog opened without ariaLabel, and not with one', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const dialogs = TestBed.inject(ForDialogManager);

    dialogs.open(ManagedUnnamedContent, { ariaLabel: 'Confirm' });
    TestBed.tick();
    expect(nameWarnings(warn)).toEqual([]);

    dialogs.open(ManagedUnnamedContent);
    TestBed.tick();
    expect(nameWarnings(warn)).toHaveLength(1);
  });

  it('warns for a managed drawer opened without ariaLabel, and not with one', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const drawers = TestBed.inject(ForDrawerManager);

    drawers.open(ManagedUnnamedContent, { ariaLabel: 'Filters' });
    TestBed.tick();
    expect(nameWarnings(warn)).toEqual([]);

    drawers.open(ManagedUnnamedContent);
    TestBed.tick();
    expect(nameWarnings(warn)).toHaveLength(1);
  });

  it('registers no check in a production build', async () => {
    vi.stubGlobal('ngDevMode', false);

    expect(await warningsFor(UnnamedDialog)).toEqual([]);
  });
});
