import {
  Component,
  Directive,
  ElementRef,
  inject,
  input,
  provideZonelessChangeDetection,
  signal,
  type Signal,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { injectHiddenInput } from './hidden-input';

@Directive({
  selector: '[mirror]',
})
class Mirror {
  readonly name = input('');
  readonly values = input<readonly string[]>([]);
  readonly disabled = input(false);

  constructor() {
    injectHiddenInput({
      name: this.name,
      values: this.values as Signal<readonly string[]>,
      disabled: this.disabled,
    });
  }
}

@Component({
  imports: [Mirror],
  template: `
    <form id="f">
      <button mirror [name]="name()" [values]="values()" [disabled]="disabled()">x</button>
    </form>
  `,
})
class Host {
  readonly name = signal('');
  readonly values = signal<readonly string[]>([]);
  readonly disabled = signal(false);
}

function setup(): { fixture: ComponentFixture<Host>; host: Host; form: HTMLFormElement } {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection()],
  });
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const host = fixture.componentInstance;
  const form = (fixture.nativeElement as HTMLElement).querySelector<HTMLFormElement>('form#f')!;
  return { fixture, host, form };
}

function flush(fixture: ComponentFixture<Host>): void {
  fixture.detectChanges();
}

function hiddenInputs(form: HTMLFormElement): HTMLInputElement[] {
  return Array.from(form.querySelectorAll<HTMLInputElement>('input[type="hidden"]'));
}

function formData(form: HTMLFormElement): Array<[string, string]> {
  return Array.from(new FormData(form).entries()) as Array<[string, string]>;
}

describe('injectHiddenInput', () => {
  it('does not mount any input while name is empty', () => {
    const { fixture, host, form } = setup();
    host.values.set(['a']);
    flush(fixture);

    expect(hiddenInputs(form)).toHaveLength(0);
  });

  it('does not mount any input while values is empty', () => {
    const { fixture, host, form } = setup();
    host.name.set('color');
    flush(fixture);

    expect(hiddenInputs(form)).toHaveLength(0);
  });

  it('mounts a single hidden input as a sibling after the host', () => {
    const { fixture, host, form } = setup();
    host.name.set('color');
    host.values.set(['red']);
    flush(fixture);

    const inputs = hiddenInputs(form);
    expect(inputs).toHaveLength(1);
    expect(inputs[0]!.name).toBe('color');
    expect(inputs[0]!.value).toBe('red');
    // Sibling, not child.
    const button = form.querySelector('button')!;
    expect(button.contains(inputs[0]!)).toBe(false);
    expect(button.nextElementSibling).toBe(inputs[0]!);
  });

  it('mounts one input per value for multi-value mirrors, in order', () => {
    const { fixture, host, form } = setup();
    host.name.set('tags');
    host.values.set(['a', 'b', 'c']);
    flush(fixture);

    const inputs = hiddenInputs(form);
    expect(inputs.map((i) => i.value)).toEqual(['a', 'b', 'c']);
    expect(inputs.every((i) => i.name === 'tags')).toBe(true);
  });

  it('contributes the values to native FormData submission', () => {
    const { fixture, host, form } = setup();
    host.name.set('tags');
    host.values.set(['x', 'y']);
    flush(fixture);

    expect(formData(form)).toEqual([
      ['tags', 'x'],
      ['tags', 'y'],
    ]);
  });

  it('grows / shrinks the input list as values change', () => {
    const { fixture, host, form } = setup();
    host.name.set('tags');
    host.values.set(['a']);
    flush(fixture);
    expect(hiddenInputs(form)).toHaveLength(1);

    host.values.set(['a', 'b', 'c']);
    flush(fixture);
    expect(hiddenInputs(form).map((i) => i.value)).toEqual(['a', 'b', 'c']);

    host.values.set(['z']);
    flush(fixture);
    expect(hiddenInputs(form).map((i) => i.value)).toEqual(['z']);
  });

  it('removes inputs when name becomes empty again', () => {
    const { fixture, host, form } = setup();
    host.name.set('color');
    host.values.set(['red']);
    flush(fixture);
    expect(hiddenInputs(form)).toHaveLength(1);

    host.name.set('');
    flush(fixture);
    expect(hiddenInputs(form)).toHaveLength(0);
  });

  it('reflects disabled and excludes the value from FormData when set', () => {
    const { fixture, host, form } = setup();
    host.name.set('color');
    host.values.set(['red']);
    host.disabled.set(true);
    flush(fixture);

    const inputs = hiddenInputs(form);
    expect(inputs[0]!.hasAttribute('disabled')).toBe(true);
    expect(formData(form)).toEqual([]);

    host.disabled.set(false);
    flush(fixture);
    expect(inputs[0]!.hasAttribute('disabled')).toBe(false);
    expect(formData(form)).toEqual([['color', 'red']]);
  });

  it('cleans up the inputs when the directive is destroyed', () => {
    const { fixture, host, form } = setup();
    host.name.set('color');
    host.values.set(['red']);
    flush(fixture);
    expect(hiddenInputs(form)).toHaveLength(1);

    fixture.destroy();
    expect(form.querySelectorAll('input[type="hidden"]').length).toBe(0);
  });
});
