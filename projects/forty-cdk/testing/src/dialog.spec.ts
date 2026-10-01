import {
  ChangeDetectionStrategy,
  Component,
  inject,
  provideZonelessChangeDetection,
  type Provider,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  FOR_DIALOG_CONTEXT,
  ForDialogBackdrop,
  ForDialogClose,
  ForDialogDescription,
  ForDialogRef,
  ForDialogTitle,
  injectDialogData,
} from 'forty-cdk/dialog';

import { afterEachOverlayCleanup, flush } from '../../src/test-utils';
import { createForDialogRef, provideForDialogTesting } from './dialog';

@Component({
  selector: 'test-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForDialogTitle, ForDialogDescription, ForDialogClose, ForDialogBackdrop],
  template: `
    <div forDialogBackdrop data-testid="backdrop"></div>
    <h2 forDialogTitle id="confirm-title">Delete {{ data?.name }}</h2>
    <p forDialogDescription id="confirm-description">This cannot be undone.</p>
    <button forDialogClose [closeWith]="true">Delete</button>
  `,
})
class ConfirmDialog {
  readonly ref = inject(ForDialogRef);
  readonly data = injectDialogData<{ name: string }>();
}

async function mount(providers: Provider[]) {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), ...providers],
  });
  const fixture = TestBed.createComponent(ConfirmDialog);
  await flush(fixture);
  return fixture;
}

describe('createForDialogRef', () => {
  it('resolves closed with the programmatic reason and the result on close(result)', async () => {
    const ref = createForDialogRef<string>();

    ref.close('saved');

    await expect(ref.closed).resolves.toEqual({ reason: 'programmatic', result: 'saved' });
    expect(ref.isClosed()).toBe(true);
    expect(ref.result()).toBe('saved');
  });

  it('is a ForDialogRef, and ignores every close after the first', async () => {
    const ref = createForDialogRef<string>();

    ref.close('first', 'escape');
    ref.close('second');

    expect(ref).toBeInstanceOf(ForDialogRef);
    await expect(ref.closed).resolves.toEqual({ reason: 'escape', result: 'first' });
    expect(ref.result()).toBe('first');
  });

  it('starts open with no result', () => {
    const ref = createForDialogRef();

    expect(ref.isClosed()).toBe(false);
    expect(ref.result()).toBeUndefined();
  });
});

describe('provideForDialogTesting', () => {
  afterEachOverlayCleanup();

  it('mounts a component that injects ForDialogRef and renders [forDialogTitle]', async () => {
    const fixture = await mount(provideForDialogTesting());

    expect(fixture.componentInstance.ref).toBe(TestBed.inject(ForDialogRef));
    expect(fixture.nativeElement.querySelector('h2').id).toBe('confirm-title');
  });

  it('registers the title and description into the context', async () => {
    await mount(provideForDialogTesting());
    const context = TestBed.inject(FOR_DIALOG_CONTEXT);

    expect(context.labelledBy()).toBe('confirm-title');
    expect(context.describedBy()).toBe('confirm-description');
  });

  it('unregisters the title when the component is destroyed', async () => {
    const fixture = await mount(provideForDialogTesting());
    const context = TestBed.inject(FOR_DIALOG_CONTEXT);

    fixture.destroy();

    expect(context.labelledBy()).toBeNull();
    expect(context.describedBy()).toBeNull();
  });

  it('reports the manager defaults on the context', async () => {
    await mount(provideForDialogTesting());
    const context = TestBed.inject(FOR_DIALOG_CONTEXT);

    expect(context.dismissible()).toBe(true);
    expect(context.modal()).toBe(true);
    expect(context.alert()).toBe(false);
    expect(context.container()).toBeNull();
    expect(context.depth()).toBe(0);
  });

  it('closes the ref with the closeButton reason and the closeWith value', async () => {
    const fixture = await mount(provideForDialogTesting());
    const ref = TestBed.inject(ForDialogRef);

    fixture.nativeElement.querySelector('button').click();

    await expect(ref.closed).resolves.toEqual({ reason: 'closeButton', result: true });
    expect(ref.isClosed()).toBe(true);
  });

  it('closes the ref with the backdrop reason on a backdrop click', async () => {
    await mount(provideForDialogTesting());
    const ref = TestBed.inject(ForDialogRef);

    document.querySelector<HTMLElement>('[data-testid="backdrop"]')!.click();

    await expect(ref.closed).resolves.toEqual({ reason: 'backdrop', result: undefined });
  });

  it('provides the ref it is given', async () => {
    const ref = createForDialogRef();

    const fixture = await mount(provideForDialogTesting({ ref }));

    expect(fixture.componentInstance.ref).toBe(ref);
  });

  it('provides the data it is given, and null without any', async () => {
    const withData = await mount(provideForDialogTesting({ data: { name: 'report.pdf' } }));

    expect(withData.componentInstance.data).toEqual({ name: 'report.pdf' });
    expect(withData.nativeElement.querySelector('h2').textContent).toContain('report.pdf');

    TestBed.resetTestingModule();
    const withoutData = await mount(provideForDialogTesting());

    expect(withoutData.componentInstance.data).toBeNull();
  });

  it('creates a fresh ref per injector when none is given', async () => {
    const providers = provideForDialogTesting();
    await mount(providers);
    const first = TestBed.inject(ForDialogRef);
    first.close();

    TestBed.resetTestingModule();
    await mount(providers);

    expect(TestBed.inject(ForDialogRef)).not.toBe(first);
    expect(TestBed.inject(ForDialogRef).isClosed()).toBe(false);
  });
});
