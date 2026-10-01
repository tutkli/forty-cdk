import {
  ChangeDetectionStrategy,
  Component,
  inject,
  provideZonelessChangeDetection,
  type Provider,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  FOR_DRAWER_CONTEXT,
  ForDrawerBackdrop,
  ForDrawerClose,
  ForDrawerDescription,
  ForDrawerHandle,
  ForDrawerRef,
  ForDrawerTitle,
  injectDrawerData,
} from 'forty-cdk/drawer';

import { afterEachOverlayCleanup, flush } from '../../src/test-utils';
import { createForDrawerRef, provideForDrawerTesting } from './drawer';

@Component({
  selector: 'test-filters-sheet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ForDrawerTitle,
    ForDrawerDescription,
    ForDrawerClose,
    ForDrawerBackdrop,
    ForDrawerHandle,
  ],
  template: `
    <div forDrawerBackdrop data-testid="backdrop"></div>
    <div forDrawerHandle></div>
    <h2 forDrawerTitle id="filters-title">Filters for {{ data?.list }}</h2>
    <p forDrawerDescription id="filters-description">Narrow the results.</p>
    <button forDrawerClose [closeWith]="'applied'">Apply</button>
  `,
})
class FiltersSheet {
  readonly ref = inject(ForDrawerRef);
  readonly data = injectDrawerData<{ list: string }>();
}

async function mount(providers: Provider[]) {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), ...providers],
  });
  const fixture = TestBed.createComponent(FiltersSheet);
  await flush(fixture);
  return fixture;
}

describe('createForDrawerRef', () => {
  it('resolves closed with the programmatic reason and the result on close(result)', async () => {
    const ref = createForDrawerRef<number>();

    ref.close(3);

    await expect(ref.closed).resolves.toEqual({ reason: 'programmatic', result: 3 });
    expect(ref.isClosed()).toBe(true);
    expect(ref.result()).toBe(3);
  });

  it('is a ForDrawerRef, and ignores every close after the first', async () => {
    const ref = createForDrawerRef<number>();

    ref.close(1, 'swipe');
    ref.close(2);

    expect(ref).toBeInstanceOf(ForDrawerRef);
    await expect(ref.closed).resolves.toEqual({ reason: 'swipe', result: 1 });
  });

  it('starts at no snap point and follows setActiveSnapPoint until it closes', () => {
    const ref = createForDrawerRef();

    expect(ref.activeSnapPoint()).toBeNull();
    ref.setActiveSnapPoint('50%');
    expect(ref.activeSnapPoint()).toBe('50%');

    ref.close();
    ref.setActiveSnapPoint(1);
    expect(ref.activeSnapPoint()).toBe('50%');
  });
});

describe('provideForDrawerTesting', () => {
  afterEachOverlayCleanup();

  it('mounts a component that injects ForDrawerRef and renders [forDrawerTitle]', async () => {
    const fixture = await mount(provideForDrawerTesting());

    expect(fixture.componentInstance.ref).toBe(TestBed.inject(ForDrawerRef));
    expect(fixture.nativeElement.querySelector('h2').id).toBe('filters-title');
  });

  it('registers the title and description into the context', async () => {
    const fixture = await mount(provideForDrawerTesting());
    const context = TestBed.inject(FOR_DRAWER_CONTEXT);

    expect(context.labelledBy()).toBe('filters-title');
    expect(context.describedBy()).toBe('filters-description');

    fixture.destroy();

    expect(context.labelledBy()).toBeNull();
    expect(context.describedBy()).toBeNull();
  });

  it('reports the manager defaults on the context, with no gesture in flight', async () => {
    await mount(provideForDrawerTesting());
    const context = TestBed.inject(FOR_DRAWER_CONTEXT);

    expect(context.dismissible()).toBe(true);
    expect(context.modal()).toBe(true);
    expect(context.alert()).toBe(false);
    expect(context.side()).toBe('bottom');
    expect(context.container()).toBeNull();
    expect(context.depth()).toBe(0);
    expect(context.dragging()).toBe(false);
    expect(context.swipeProgress()).toBe(0);
    expect(context.fadeFromActive()).toBe(false);
    expect(context.hostElement).toBeInstanceOf(HTMLElement);
  });

  it("reads the context's active snap point off the ref", async () => {
    await mount(provideForDrawerTesting());
    const ref = TestBed.inject(ForDrawerRef);
    const context = TestBed.inject(FOR_DRAWER_CONTEXT);

    ref.setActiveSnapPoint('200px');

    expect(context.activeSnapPoint()).toBe('200px');
  });

  it('closes the ref with the closeButton reason and the closeWith value', async () => {
    const fixture = await mount(provideForDrawerTesting());
    const ref = TestBed.inject(ForDrawerRef);

    fixture.nativeElement.querySelector('button').click();

    await expect(ref.closed).resolves.toEqual({ reason: 'closeButton', result: 'applied' });
  });

  it('closes the ref with the backdrop reason on a backdrop click', async () => {
    await mount(provideForDrawerTesting());
    const ref = TestBed.inject(ForDrawerRef);

    document.querySelector<HTMLElement>('[data-testid="backdrop"]')!.click();

    await expect(ref.closed).resolves.toEqual({ reason: 'backdrop', result: undefined });
  });

  it('provides the ref and the data it is given, and null data without any', async () => {
    const ref = createForDrawerRef();
    const withData = await mount(provideForDrawerTesting({ ref, data: { list: 'orders' } }));

    expect(withData.componentInstance.ref).toBe(ref);
    expect(withData.componentInstance.data).toEqual({ list: 'orders' });

    TestBed.resetTestingModule();
    const withoutData = await mount(provideForDrawerTesting());

    expect(withoutData.componentInstance.data).toBeNull();
  });
});
