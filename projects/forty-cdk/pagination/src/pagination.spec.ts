import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { flush } from '../../src/test-utils/flush';
import { computePaginationItems } from './pagination-range';
import { ForPagination } from './pagination';
import { ForPaginationItem } from './pagination-item';
import { ForPaginationNext } from './pagination-next';
import { ForPaginationPrevious } from './pagination-previous';

function toShape(items: ReturnType<typeof computePaginationItems>): (number | 'e')[] {
  return items.map((i) => (i.type === 'page' ? (i.value as number) : 'e'));
}

describe('computePaginationItems (pure algorithm)', () => {
  it('{count:11,page:1,sib:1,bound:1} → [1,2,3,4,5,e,11]', () => {
    expect(
      toShape(computePaginationItems({ count: 11, page: 1, siblingCount: 1, boundaryCount: 1 })),
    ).toEqual([1, 2, 3, 4, 5, 'e', 11]);
  });

  it('{count:11,page:6,sib:1,bound:1} → [1,e,5,6,7,e,11]', () => {
    expect(
      toShape(computePaginationItems({ count: 11, page: 6, siblingCount: 1, boundaryCount: 1 })),
    ).toEqual([1, 'e', 5, 6, 7, 'e', 11]);
  });

  it('{count:11,page:11,sib:1,bound:1} → [1,e,7,8,9,10,11]', () => {
    expect(
      toShape(computePaginationItems({ count: 11, page: 11, siblingCount: 1, boundaryCount: 1 })),
    ).toEqual([1, 'e', 7, 8, 9, 10, 11]);
  });

  it('{count:5,page:3,sib:1,bound:1} → [1,2,3,4,5] (no ellipsis)', () => {
    expect(
      toShape(computePaginationItems({ count: 5, page: 3, siblingCount: 1, boundaryCount: 1 })),
    ).toEqual([1, 2, 3, 4, 5]);
  });

  it('{count:1,page:1,sib:1,bound:1} → [1]', () => {
    expect(
      toShape(computePaginationItems({ count: 1, page: 1, siblingCount: 1, boundaryCount: 1 })),
    ).toEqual([1]);
  });

  it('{count:0,page:1,sib:1,bound:1} → []', () => {
    expect(
      computePaginationItems({ count: 0, page: 1, siblingCount: 1, boundaryCount: 1 }),
    ).toEqual([]);
  });

  it('{count:20,page:10,sib:0,bound:1} → [1,e,10,e,20]', () => {
    expect(
      toShape(computePaginationItems({ count: 20, page: 10, siblingCount: 0, boundaryCount: 1 })),
    ).toEqual([1, 'e', 10, 'e', 20]);
  });

  it('{count:20,page:1,sib:1,bound:2} → [1,2,3,4,5,6,e,19,20]', () => {
    expect(
      toShape(computePaginationItems({ count: 20, page: 1, siblingCount: 1, boundaryCount: 2 })),
    ).toEqual([1, 2, 3, 4, 5, 6, 'e', 19, 20]);
  });
});

@Component({
  imports: [ForPagination, ForPaginationItem, ForPaginationPrevious, ForPaginationNext],
  template: `
    <nav
      forPagination
      [(page)]="page"
      [count]="count()"
      [disabled]="isDisabled()"
      [ariaLabel]="label()"
      #pg="forPagination"
    >
      <button forPaginationPrevious ariaLabel="Previous page" data-testid="prev">‹</button>
      @for (item of pg.items(); track $index) {
        @if (item.type === 'page') {
          <button forPaginationItem [page]="item.value!" [attr.data-testid]="'page-' + item.value">
            {{ item.value }}
          </button>
        } @else {
          <span aria-hidden="true">…</span>
        }
      }
      <button forPaginationNext ariaLabel="Next page" data-testid="next">›</button>
    </nav>
  `,
})
class TestHost {
  readonly page = signal(1);
  readonly count = signal(11);
  readonly isDisabled = signal(false);
  readonly label = signal<string | null>('Pagination');
}

function setup() {
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  const fixture = TestBed.createComponent(TestHost);
  fixture.detectChanges();
  return fixture;
}

function nav(fixture: ReturnType<typeof setup>): HTMLElement {
  return fixture.nativeElement.querySelector('nav') as HTMLElement;
}

function pageButtons(fixture: ReturnType<typeof setup>): HTMLButtonElement[] {
  return Array.from(
    fixture.nativeElement.querySelectorAll('[forPaginationItem]'),
  ) as HTMLButtonElement[];
}

function prev(fixture: ReturnType<typeof setup>): HTMLButtonElement {
  return fixture.nativeElement.querySelector('[data-testid="prev"]') as HTMLButtonElement;
}

function next(fixture: ReturnType<typeof setup>): HTMLButtonElement {
  return fixture.nativeElement.querySelector('[data-testid="next"]') as HTMLButtonElement;
}

function directive(fixture: ReturnType<typeof setup>): ForPagination {
  return fixture.debugElement.query(By.directive(ForPagination)).injector.get(ForPagination);
}

describe('ForPagination directive', () => {
  describe('root ARIA attributes', () => {
    it('renders role="navigation"', () => {
      const fixture = setup();
      expect(nav(fixture).getAttribute('role')).toBe('navigation');
    });

    it('emits aria-label when ariaLabel is set', () => {
      const fixture = setup();
      expect(nav(fixture).getAttribute('aria-label')).toBe('Pagination');
    });

    it('omits aria-label when ariaLabel is null', async () => {
      const fixture = setup();
      fixture.componentInstance.label.set(null);
      await flush(fixture);
      expect(nav(fixture).hasAttribute('aria-label')).toBe(false);
    });
  });

  describe('items list', () => {
    it('renders 6 page buttons for count=11 page=1 (1,2,3,4,5,11)', () => {
      const fixture = setup();
      expect(pageButtons(fixture).length).toBe(6);
    });

    it('page 1 button has aria-current="page" at initial state', () => {
      const fixture = setup();
      const btns = pageButtons(fixture);
      const page1 = btns.find((b) => b.getAttribute('data-testid') === 'page-1');
      expect(page1?.getAttribute('aria-current')).toBe('page');
    });

    it('other page buttons do not have aria-current', () => {
      const fixture = setup();
      const btns = pageButtons(fixture);
      const others = btns.filter((b) => b.getAttribute('data-testid') !== 'page-1');
      others.forEach((b) => {
        expect(b.hasAttribute('aria-current')).toBe(false);
      });
    });
  });

  describe('page navigation via clicks', () => {
    it('clicking page 2 button updates the page model to 2', async () => {
      const fixture = setup();
      fixture.componentInstance.page.set(1);
      await flush(fixture);
      const btns = pageButtons(fixture);
      const page2 = btns.find((b) => b.getAttribute('data-testid') === 'page-2');
      page2?.click();
      await flush(fixture);
      expect(fixture.componentInstance.page()).toBe(2);
    });

    it('clicking page 2 moves aria-current to that button', async () => {
      const fixture = setup();
      fixture.componentInstance.page.set(1);
      await flush(fixture);
      const btns = pageButtons(fixture);
      const page2 = btns.find((b) => b.getAttribute('data-testid') === 'page-2');
      page2?.click();
      await flush(fixture);
      const btnsAfter = pageButtons(fixture);
      const current = btnsAfter.find((b) => b.getAttribute('aria-current') === 'page');
      expect(current?.getAttribute('data-testid')).toBe('page-2');
    });
  });

  describe('previous / next buttons', () => {
    it('prev has native disabled at page 1', () => {
      const fixture = setup();
      expect(prev(fixture).hasAttribute('disabled')).toBe(true);
    });

    it('prev loses disabled after navigating to page 2', async () => {
      const fixture = setup();
      fixture.componentInstance.page.set(2);
      await flush(fixture);
      expect(prev(fixture).hasAttribute('disabled')).toBe(false);
    });

    it('next has native disabled at the last page', async () => {
      const fixture = setup();
      fixture.componentInstance.page.set(11);
      await flush(fixture);
      expect(next(fixture).hasAttribute('disabled')).toBe(true);
    });

    it('next loses disabled when not on the last page', async () => {
      const fixture = setup();
      fixture.componentInstance.page.set(5);
      await flush(fixture);
      expect(next(fixture).hasAttribute('disabled')).toBe(false);
    });

    it('clicking prev decrements page', async () => {
      const fixture = setup();
      fixture.componentInstance.page.set(5);
      await flush(fixture);
      prev(fixture).click();
      await flush(fixture);
      expect(fixture.componentInstance.page()).toBe(4);
    });

    it('clicking next increments page', async () => {
      const fixture = setup();
      fixture.componentInstance.page.set(5);
      await flush(fixture);
      next(fixture).click();
      await flush(fixture);
      expect(fixture.componentInstance.page()).toBe(6);
    });

    it('clicking prev at page 1 does not go below 1', async () => {
      const fixture = setup();
      fixture.componentInstance.page.set(1);
      await flush(fixture);
      prev(fixture).click();
      await flush(fixture);
      expect(fixture.componentInstance.page()).toBe(1);
    });

    it('clicking next at last page does not go above count', async () => {
      const fixture = setup();
      fixture.componentInstance.page.set(11);
      await flush(fixture);
      next(fixture).click();
      await flush(fixture);
      expect(fixture.componentInstance.page()).toBe(11);
    });
  });

  describe('root disabled', () => {
    it('prev/next are disabled when root is disabled', async () => {
      const fixture = setup();
      fixture.componentInstance.page.set(5);
      fixture.componentInstance.isDisabled.set(true);
      await flush(fixture);
      expect(prev(fixture).hasAttribute('disabled')).toBe(true);
      expect(next(fixture).hasAttribute('disabled')).toBe(true);
    });

    it('clicking a page button does not change page when root is disabled', async () => {
      const fixture = setup();
      fixture.componentInstance.page.set(1);
      fixture.componentInstance.isDisabled.set(true);
      await flush(fixture);
      const btns = pageButtons(fixture);
      const page2 = btns.find((b) => b.getAttribute('data-testid') === 'page-2');
      page2?.click();
      await flush(fixture);
      expect(fixture.componentInstance.page()).toBe(1);
    });
  });

  describe('orphan errors', () => {
    it('ForPaginationItem outside [forPagination] throws prefixed error', () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

      @Component({
        imports: [ForPaginationItem],
        template: `<button forPaginationItem [page]="1"></button>`,
      })
      class OrphanHost {}

      expect(() => {
        TestBed.createComponent(OrphanHost).detectChanges();
      }).toThrow(/\[forty-cdk\/pagination\]/);
    });

    it('ForPaginationPrevious outside [forPagination] throws prefixed error', () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

      @Component({
        imports: [ForPaginationPrevious],
        template: `<button forPaginationPrevious></button>`,
      })
      class OrphanHost2 {}

      expect(() => {
        TestBed.createComponent(OrphanHost2).detectChanges();
      }).toThrow(/\[forty-cdk\/pagination\]/);
    });
  });
});

describe('ForPagination — effective page reconciliation', () => {
  it('an out-of-range page (50 with count 10) reads through as effective page 10', async () => {
    const fixture = setup();
    fixture.componentInstance.count.set(10);
    fixture.componentInstance.page.set(50);
    await flush(fixture);
    const pg = directive(fixture);
    expect(pg.effectivePage()).toBe(10);
  });

  it('aria-current="page" lands on the page-10 button for page=50 count=10', async () => {
    const fixture = setup();
    fixture.componentInstance.count.set(10);
    fixture.componentInstance.page.set(50);
    await flush(fixture);
    const current = pageButtons(fixture).find((b) => b.getAttribute('aria-current') === 'page');
    expect(current?.getAttribute('data-testid')).toBe('page-10');
  });

  it('previous() from out-of-range 50 (count 10) goes to 9, not 10', async () => {
    const fixture = setup();
    fixture.componentInstance.count.set(10);
    fixture.componentInstance.page.set(50);
    await flush(fixture);
    prev(fixture).click();
    await flush(fixture);
    expect(fixture.componentInstance.page()).toBe(9);
  });

  it('isFirst/isLast reflect the effective page for an out-of-range page', async () => {
    const fixture = setup();
    fixture.componentInstance.count.set(10);
    fixture.componentInstance.page.set(50);
    await flush(fixture);
    expect(prev(fixture).hasAttribute('disabled')).toBe(false);
    expect(next(fixture).hasAttribute('disabled')).toBe(true);
  });

  it('a below-range page (0) clamps to effective page 1', async () => {
    const fixture = setup();
    fixture.componentInstance.count.set(10);
    fixture.componentInstance.page.set(0);
    await flush(fixture);
    const pg = directive(fixture);
    expect(pg.effectivePage()).toBe(1);
    expect(prev(fixture).hasAttribute('disabled')).toBe(true);
    const current = pageButtons(fixture).find((b) => b.getAttribute('aria-current') === 'page');
    expect(current?.getAttribute('data-testid')).toBe('page-1');
  });

  it('a negative page clamps to effective page 1', async () => {
    const fixture = setup();
    fixture.componentInstance.count.set(10);
    fixture.componentInstance.page.set(-5);
    await flush(fixture);
    const pg = directive(fixture);
    expect(pg.effectivePage()).toBe(1);
  });

  it('the in-range path is unchanged: effectivePage equals page', async () => {
    const fixture = setup();
    fixture.componentInstance.count.set(10);
    fixture.componentInstance.page.set(4);
    await flush(fixture);
    const pg = directive(fixture);
    expect(pg.effectivePage()).toBe(4);
    const current = pageButtons(fixture).find((b) => b.getAttribute('aria-current') === 'page');
    expect(current?.getAttribute('data-testid')).toBe('page-4');
  });
});

describe('ForPagination — zoneless', () => {
  it('click-driven page change reflects in aria-current without Zone.js', async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(TestHost);
    fixture.detectChanges();

    const btns = pageButtons(fixture);
    const page3 = btns.find((b) => b.getAttribute('data-testid') === 'page-3');
    page3?.click();
    await flush(fixture);

    const btnsAfter = pageButtons(fixture);
    const current = btnsAfter.find((b) => b.getAttribute('aria-current') === 'page');
    expect(current?.getAttribute('data-testid')).toBe('page-3');
    expect(fixture.componentInstance.page()).toBe(3);
  });

  it('reconciles an out-of-range page to aria-current without Zone.js', async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(TestHost);
    fixture.componentInstance.count.set(10);
    fixture.componentInstance.page.set(50);
    fixture.detectChanges();
    await flush(fixture);

    const current = pageButtons(fixture).find((b) => b.getAttribute('aria-current') === 'page');
    expect(current?.getAttribute('data-testid')).toBe('page-10');
  });
});
