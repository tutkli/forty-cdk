import { Component, inject, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEachOverlayCleanup } from '../../src/test-utils';
import {
  FOR_DIALOG_CONTRACT,
  type ForDialogContract,
  type ForDialogDataOf,
  type ForDialogResultOf,
} from './dialog-contract';
import { ForDialogManager, injectDialogData } from './dialog-manager';
import { ForDialogRef } from './dialog-ref';

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

interface RenameData {
  readonly name: string;
}

type RenameResult = 'saved' | 'discarded';

@Component({
  template: `
    <p id="name">{{ data?.name }}</p>
    <button id="save" (click)="ref.close('saved')">Save</button>
  `,
})
class RenameDialog {
  declare readonly [FOR_DIALOG_CONTRACT]: ForDialogContract<RenameData, RenameResult>;
  readonly data = injectDialogData<RenameDialog>();
  readonly ref = inject(ForDialogRef<RenameResult>);
}

@Component({ template: `<p>untyped</p>` })
class UntypedDialog {
  readonly data = injectDialogData<{ count: number }>();
}

function setup(): ForDialogManager {
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  return TestBed.inject(ForDialogManager);
}

describe('ForDialogContract', () => {
  afterEachOverlayCleanup();

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('derives the data and result types a component declares', () => {
    const data: Equal<ForDialogDataOf<RenameDialog>, RenameData> = true;
    const result: Equal<ForDialogResultOf<RenameDialog>, RenameResult> = true;
    expect([data, result]).toEqual([true, true]);
  });

  it('derives unknown for a component that declares no contract', () => {
    const data: Equal<ForDialogDataOf<UntypedDialog>, unknown> = true;
    const result: Equal<ForDialogResultOf<UntypedDialog>, unknown> = true;
    expect([data, result]).toEqual([true, true]);
  });

  it('types injectDialogData() from the contract when given the component', () => {
    const contract: Equal<RenameDialog['data'], RenameData | null> = true;
    const plain: Equal<UntypedDialog['data'], { count: number } | null> = true;
    expect([contract, plain]).toEqual([true, true]);
  });

  it('returns a ref typed with the declared result and delivers the declared data', async () => {
    const dialogs = setup();
    const ref = dialogs.open(RenameDialog, { data: { name: 'Draft' } });
    const typed: Equal<typeof ref, ForDialogRef<RenameResult>> = true;
    expect(typed).toBe(true);

    TestBed.tick();
    expect(document.querySelector('#name')!.textContent).toBe('Draft');

    document.querySelector<HTMLButtonElement>('#save')!.click();
    expect((await ref.closed).result).toBe('saved');
  });

  it('keeps the declared data type when the result is given explicitly', () => {
    const dialogs = setup();
    // @ts-expect-error data must match the declared contract
    dialogs.open<RenameDialog, RenameResult>(RenameDialog, { data: { title: 'Draft' } });
    expect(dialogs.openCount()).toBe(1);
  });

  it('rejects a data payload that does not match the declared contract', () => {
    const dialogs = setup();
    // @ts-expect-error data must match the declared contract
    dialogs.open(RenameDialog, { data: { title: 'Draft' } });
    expect(dialogs.openCount()).toBe(1);
  });

  it('leaves data unchecked and the result unknown without a contract', () => {
    const dialogs = setup();
    const _ref = dialogs.open(UntypedDialog, { data: { anything: true } });
    const typed: Equal<typeof _ref, ForDialogRef<unknown>> = true;
    expect(typed).toBe(true);
  });
});
