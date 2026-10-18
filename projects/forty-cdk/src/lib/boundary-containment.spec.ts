import { Component, ErrorHandler, provideZonelessChangeDetection, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { ForDateField, ForDateFieldSegment } from 'forty-cdk/date-field';
import { provideInternationalizedDateAdapter } from 'forty-cdk/internationalized-date';
import { ForListbox, ForListboxOption, ForListboxVirtualized } from 'forty-cdk/listbox';
import {
  ForTable,
  ForTableBody,
  ForTableCellDef,
  ForTableColumnDef,
  ForTableHeaderCellDef,
} from 'forty-cdk/table';
import { ForTabs, ForTabsContent, ForTabsList, ForTabsTrigger } from 'forty-cdk/tabs';
import { installObserverPolyfills, pressKey } from 'forty-cdk/testing';

import { flush } from '../test-utils/flush';

class CapturingErrorHandler implements ErrorHandler {
  readonly captured: unknown[] = [];

  handleError(error: unknown): void {
    this.captured.push(error);
  }
}

function mount<T>(host: new () => T): {
  fixture: ComponentFixture<T>;
  el: HTMLElement;
  captured: readonly unknown[];
} {
  TestBed.configureTestingModule({
    rethrowApplicationErrors: false,
    providers: [
      provideZonelessChangeDetection(),
      { provide: ErrorHandler, useClass: CapturingErrorHandler },
    ],
  });
  const fixture = TestBed.createComponent(host);
  fixture.detectChanges();
  const handler = TestBed.inject(ErrorHandler) as CapturingErrorHandler;
  return { fixture, el: fixture.nativeElement as HTMLElement, captured: handler.captured };
}

const text = (el: HTMLElement, selector: string): string | null =>
  el.querySelector(selector)?.textContent?.trim() ?? null;

const messages = (captured: readonly unknown[]): string[] =>
  captured.map((e) => (e instanceof Error ? e.message : String(e)));

@Component({
  host: { 'data-fixture': 'table-track-host' },
  imports: [ForTable, ForTableBody, ForTableColumnDef, ForTableHeaderCellDef, ForTableCellDef],
  template: `
    <p data-test-id="outside">outside</p>
    @boundary {
      <div forTable aria-label="People" data-test-id="table">
        <for-table-body [rows]="rows">
          <ng-container forTableColumnDef="name" [width]="width()">
            <ng-template forTableHeaderCellDef>Name</ng-template>
            <ng-template forTableCellDef let-row>{{ row.name }}</ng-template>
          </ng-container>
        </for-table-body>
      </div>
    } @error (let error = $error; let reset = $reset) {
      <p data-test-id="fallback">{{ error.message }}</p>
      <button type="button" data-test-id="retry" (click)="reset()">Retry</button>
    }
  `,
})
class TableTrackHost {
  readonly rows = [{ name: 'Ada' }];
  readonly width = signal('160px; z-index: 9');
}

@Component({
  host: { 'data-fixture': 'date-field-adapter-host' },
  imports: [ForDateField, ForDateFieldSegment],
  providers: [...provideInternationalizedDateAdapter()],
  template: `
    <p data-test-id="outside">outside</p>
    @boundary {
      <div forDateField granularity="minute" #field="forDateField" data-test-id="field">
        @for (seg of field.segments(); track seg.id) {
          @if (!seg.isLiteral) {
            <span forDateFieldSegment [segment]="seg.type!"></span>
          }
        }
      </div>
    } @error (let error = $error) {
      <p data-test-id="fallback">{{ error.message }}</p>
    }
  `,
})
class DateFieldAdapterHost {}

@Component({
  host: { 'data-fixture': 'orphan-piece-host' },
  imports: [ForTabsTrigger],
  template: `
    <p data-test-id="outside">outside</p>
    @boundary {
      <button type="button" forTabsTrigger value="a">A</button>
    } @error (let error = $error) {
      <p data-test-id="fallback">{{ error.message }}</p>
    }
  `,
})
class OrphanPieceHost {}

@Component({
  host: { 'data-fixture': 'unbound-input-host' },
  imports: [ForTabs, ForTabsList, ForTabsTrigger, ForTabsContent],
  template: `
    <p data-test-id="outside">outside</p>
    @boundary {
      <div forTabs value="a">
        <div forTabsList aria-label="Sections">
          <button type="button" forTabsTrigger value="a">A</button>
          <button type="button" forTabsTrigger>B</button>
        </div>
        <div forTabsContent value="a">Panel A</div>
      </div>
    } @error (let error = $error) {
      <p data-test-id="fallback">{{ error.message }}</p>
    }
  `,
})
class UnboundInputHost {}

@Component({
  host: { 'data-fixture': 'listbox-keyboard-host' },
  imports: [ForListbox, ForListboxOption, ForListboxVirtualized],
  template: `
    @boundary {
      <div
        forListbox
        forListboxVirtualized
        aria-label="Letters"
        data-test-id="listbox"
        [totalCount]="3"
        [visibleRange]="range"
        [selectionFollowsFocus]="true"
      >
        @for (opt of options; track opt.index) {
          <button type="button" forListboxOption [value]="opt.label" [posInSet]="opt.index">
            {{ opt.label }}
          </button>
        }
      </div>
    } @error (let error = $error) {
      <p data-test-id="fallback">{{ error.message }}</p>
    }
  `,
})
class ListboxKeyboardHost {
  readonly range: readonly [number, number] = [0, 3];
  readonly options = [
    { index: 0, label: 'Alpha' },
    { index: 1, label: 'Bravo' },
    { index: 2, label: 'Charlie' },
  ];
}

describe('@boundary containment of library errors', () => {
  let restoreObservers: () => void;
  beforeAll(() => {
    restoreObservers = installObserverPolyfills();
  });
  afterAll(() => restoreObservers());

  describe('caught: the @error branch renders and the rest of the view keeps rendering', () => {
    it('a table column track that escapes its declaration', () => {
      const { el, captured } = mount(TableTrackHost);
      expect(el.querySelector('[data-test-id="table"]')).toBeNull();
      expect(text(el, '[data-test-id="fallback"]')).toMatch(
        /^\[forty-cdk\/table\][\s\S]*width[\s\S]*terminates the declaration/,
      );
      expect(text(el, '[data-test-id="outside"]')).toBe('outside');
      expect(messages(captured)).toEqual([expect.stringMatching(/^\[forty-cdk\/table\]/)]);
    });

    it('a date field whose granularity needs a time-capable adapter', () => {
      const { el, captured } = mount(DateFieldAdapterHost);
      expect(el.querySelector('[data-test-id="field"]')).toBeNull();
      expect(text(el, '[data-test-id="fallback"]')).toMatch(
        /^\[forty-cdk\/date-field\] FORCDK-CORE-003: ForDateField requires a time-capable DateAdapter/,
      );
      expect(text(el, '[data-test-id="outside"]')).toBe('outside');
      expect(captured).toHaveLength(1);
    });

    it('a piece rendered outside its root', () => {
      const { el, captured } = mount(OrphanPieceHost);
      expect(el.querySelector('[forTabsTrigger]')).toBeNull();
      expect(text(el, '[data-test-id="fallback"]')).toMatch(
        /^\[forty-cdk\/tabs\] FORCDK-TABS-001: ForTabsTrigger must be used inside a \[forTabs\] element\./,
      );
      expect(text(el, '[data-test-id="outside"]')).toBe('outside');
      expect(captured).toHaveLength(1);
    });

    it('a piece whose required binding was never written', () => {
      const { el, captured } = mount(UnboundInputHost);
      expect(el.querySelector('[forTabs]')).toBeNull();
      expect(text(el, '[data-test-id="fallback"]')).toMatch(
        /^\[forty-cdk\/tabs\] FORCDK-CORE-010: \[forTabsTrigger\] has no \[value\] binding\./,
      );
      expect(text(el, '[data-test-id="outside"]')).toBe('outside');
      expect(captured).toHaveLength(1);
    });

    it('re-renders the guarded content once the input is fixed and $reset is called', async () => {
      const { fixture, el } = mount(TableTrackHost);
      fixture.componentInstance.width.set('160px');
      el.querySelector<HTMLElement>('[data-test-id="retry"]')!.click();
      await flush(fixture);
      expect(el.querySelector('[data-test-id="fallback"]')).toBeNull();
      expect(el.querySelector('[forTableHeaderRow]')).not.toBeNull();
    });
  });

  describe('not caught: an assertion raised from an event handler', () => {
    it('reaches the ErrorHandler and leaves the guarded content rendered', async () => {
      const { fixture, el, captured } = mount(ListboxKeyboardHost);
      await flush(fixture);
      const listbox = el.querySelector<HTMLElement>('[data-test-id="listbox"]')!;
      listbox.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      await flush(fixture);
      pressKey(listbox, 'ArrowDown');
      await flush(fixture);
      expect(messages(captured)).toEqual([
        expect.stringMatching(
          /^\[forty-cdk\/listbox\] FORCDK-CORE-009: `selectionFollowsFocus` is not supported together with virtualization/,
        ),
      ]);
      expect(el.querySelector('[data-test-id="fallback"]')).toBeNull();
      expect(el.querySelector('[data-test-id="listbox"]')).toBe(listbox);
    });
  });
});
