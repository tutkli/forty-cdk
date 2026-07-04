import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ForTableVirtualized } from './table-virtualized';

describe('ForTableVirtualized', () => {
  it('throws a virtualization-prefixed error when used outside [forTable]', () => {
    @Component({
      imports: [ForTableVirtualized],
      template: `<div forTableVirtualized></div>`,
    })
    class Orphan {}

    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });

    expect(() => TestBed.createComponent(Orphan)).toThrow(
      /\[forty-cdk\/virtualization\] ForTableVirtualized must be used inside a \[forTable\] element\./,
    );
  });
});
