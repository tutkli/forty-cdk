import { TestBed } from '@angular/core/testing';

import type { ForDrawerSide } from 'forty-cdk/core-overlay';

import { FOR_DIALOG_DEFAULTS, type ForDialogDefaults } from './dialog-defaults';
import { FOR_DRAWER_DEFAULTS, type ForDrawerDefaults } from './drawer-defaults';

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

type OptionalKeys<T> = {
  [K in keyof T]-?: object extends Pick<T, K> ? K : never;
}[keyof T];

type NoDefaultKeys = 'animateEnter' | 'animateLeave' | 'backdropAnimateLeave';

describe('modal surface defaults shape', () => {
  it('declares only the keys with no library default optional on ForDialogDefaults', () => {
    const optional: Equal<OptionalKeys<ForDialogDefaults>, NoDefaultKeys> = true;

    expect(optional).toBe(true);
  });

  it('declares only the keys with no library default optional on ForDrawerDefaults', () => {
    const optional: Equal<OptionalKeys<ForDrawerDefaults>, NoDefaultKeys> = true;

    expect(optional).toBe(true);
  });

  it('types the keys a consumer reads off the resolved tokens without undefined', () => {
    const drawer = TestBed.inject(FOR_DRAWER_DEFAULTS);
    const dialog = TestBed.inject(FOR_DIALOG_DEFAULTS);

    const side: ForDrawerSide = drawer.side;
    const closeThreshold: number = drawer.closeThreshold;
    const dismissible: boolean = dialog.dismissible;

    expect({ side, closeThreshold, dismissible }).toEqual({
      side: 'bottom',
      closeThreshold: 0.25,
      dismissible: true,
    });
  });
});
