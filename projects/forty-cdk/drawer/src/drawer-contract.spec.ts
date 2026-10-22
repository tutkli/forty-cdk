import { Component, inject, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEachOverlayCleanup } from '../../src/test-utils';
import {
  FOR_DRAWER_CONTRACT,
  type ForDrawerContract,
  type ForDrawerDataOf,
  type ForDrawerResultOf,
} from './drawer-contract';
import { ForDrawerManager, injectDrawerData } from './drawer-manager';
import { ForDrawerRef } from './drawer-ref';

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
class RenameDrawer {
  declare readonly [FOR_DRAWER_CONTRACT]: ForDrawerContract<RenameData, RenameResult>;
  readonly data = injectDrawerData<RenameDrawer>();
  readonly ref = inject(ForDrawerRef<RenameResult>);
}

@Component({ template: `<p>untyped</p>` })
class UntypedDrawer {
  readonly data = injectDrawerData<{ count: number }>();
}

function setup(): ForDrawerManager {
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  return TestBed.inject(ForDrawerManager);
}

describe('ForDrawerContract', () => {
  afterEachOverlayCleanup();

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('derives the data and result types a component declares', () => {
    const data: Equal<ForDrawerDataOf<RenameDrawer>, RenameData> = true;
    const result: Equal<ForDrawerResultOf<RenameDrawer>, RenameResult> = true;
    expect([data, result]).toEqual([true, true]);
  });

  it('derives unknown for a component that declares no contract', () => {
    const data: Equal<ForDrawerDataOf<UntypedDrawer>, unknown> = true;
    const result: Equal<ForDrawerResultOf<UntypedDrawer>, unknown> = true;
    expect([data, result]).toEqual([true, true]);
  });

  it('types injectDrawerData() from the contract when given the component', () => {
    const contract: Equal<RenameDrawer['data'], RenameData | null> = true;
    const plain: Equal<UntypedDrawer['data'], { count: number } | null> = true;
    expect([contract, plain]).toEqual([true, true]);
  });

  it('returns a ref typed with the declared result and delivers the declared data', async () => {
    const drawers = setup();
    const ref = drawers.open(RenameDrawer, { data: { name: 'Draft' } });
    const typed: Equal<typeof ref, ForDrawerRef<RenameResult>> = true;
    expect(typed).toBe(true);

    TestBed.tick();
    expect(document.querySelector('#name')!.textContent).toBe('Draft');

    document.querySelector<HTMLButtonElement>('#save')!.click();
    expect((await ref.closed).result).toBe('saved');
  });

  it('keeps the declared data type when the result is given explicitly', () => {
    const drawers = setup();
    // @ts-expect-error data must match the declared contract
    drawers.open<RenameDrawer, RenameResult>(RenameDrawer, { data: { title: 'Draft' } });
    expect(drawers.openCount()).toBe(1);
  });

  it('rejects a data payload that does not match the declared contract', () => {
    const drawers = setup();
    // @ts-expect-error data must match the declared contract
    drawers.open(RenameDrawer, { data: { title: 'Draft' } });
    expect(drawers.openCount()).toBe(1);
  });

  it('leaves data unchecked and the result unknown without a contract', () => {
    const drawers = setup();
    const _ref = drawers.open(UntypedDrawer, { data: { anything: true } });
    const typed: Equal<typeof _ref, ForDrawerRef<unknown>> = true;
    expect(typed).toBe(true);
  });
});
