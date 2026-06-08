import {
  Component,
  Directive,
  ElementRef,
  inject,
  provideZonelessChangeDetection,
  signal,
  type Signal,
  computed,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { flush } from '../../../test-utils/flush';
import {
  FOR_FIELD_CONTEXT,
  injectFieldWiring,
  type ForFieldContext,
  type FieldControlHandle,
} from './field-wiring';

function makeFieldContext(): ForFieldContext {
  const control = signal<FieldControlHandle | null>(null);
  return {
    controlId: signal('field-control-id'),
    labelId: signal('field-label-id'),
    descriptionId: signal('field-desc-id'),
    errorId: signal('field-error-id'),
    labelledBy: signal<string | null>('field-label-id'),
    describedBy: signal<string | null>('field-desc-id'),
    errorMessageId: signal<string | null>(null),
    invalid: signal(false),
    required: signal(false),
    disabled: signal(false),
    touched: signal(false),
    control: control.asReadonly(),
    registerControl: (handle) => control.set(handle),
    unregisterControl: () => control.set(null),
    registerLabel: () => () => {},
    registerDescription: () => () => {},
    registerError: () => () => {},
    clickControl: () => {},
  };
}

@Directive({
  selector: '[probeControl]',
})
class ProbeControl {
  readonly labelled = signal<HTMLElement | null>(null);
  readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  constructor() {
    const labelledElement: Signal<HTMLElement | null> = computed(() => this.labelled());
    injectFieldWiring({ labelledElement });
  }
}

@Component({
  imports: [ProbeControl],
  template: `<div probeControl></div>`,
})
class HostComp {}

describe('injectFieldWiring — foreign labelledElement cleanup', () => {
  let context: ForFieldContext;

  beforeEach(() => {
    context = makeFieldContext();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: FOR_FIELD_CONTEXT, useValue: context },
      ],
    });
  });

  afterEach(() => {
    document.querySelectorAll('[data-foreign]').forEach((n) => n.remove());
  });

  it('clears field aria-* and the field-owned id from a foreign labelledElement on destroy', async () => {
    const foreign = document.createElement('button');
    foreign.setAttribute('data-foreign', '');
    document.body.appendChild(foreign);

    const fixture = TestBed.createComponent(HostComp);
    const probe = fixture.debugElement.children[0].injector.get(ProbeControl);
    probe.labelled.set(foreign);
    await flush(fixture);

    expect(foreign.getAttribute('id')).toBe('field-control-id');
    expect(foreign.getAttribute('aria-labelledby')).toBe('field-label-id');
    expect(foreign.getAttribute('aria-describedby')).toBe('field-desc-id');

    fixture.destroy();

    expect(foreign.hasAttribute('aria-labelledby')).toBe(false);
    expect(foreign.hasAttribute('aria-describedby')).toBe(false);
    expect(foreign.hasAttribute('aria-errormessage')).toBe(false);
    expect(foreign.hasAttribute('id')).toBe(false);
  });

  it('does not remove a pre-existing id it did not set, but still clears aria-* on destroy', async () => {
    const foreign = document.createElement('button');
    foreign.setAttribute('data-foreign', '');
    foreign.id = 'consumer-owned-id';
    document.body.appendChild(foreign);

    const fixture = TestBed.createComponent(HostComp);
    const probe = fixture.debugElement.children[0].injector.get(ProbeControl);
    probe.labelled.set(foreign);
    await flush(fixture);

    expect(foreign.getAttribute('id')).toBe('consumer-owned-id');

    fixture.destroy();

    expect(foreign.getAttribute('id')).toBe('consumer-owned-id');
    expect(foreign.hasAttribute('aria-labelledby')).toBe(false);
  });
});
