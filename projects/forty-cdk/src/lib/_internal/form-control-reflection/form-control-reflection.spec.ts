import {
  Component,
  Directive,
  input,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { injectFormControlReflection } from './form-control-reflection';

@Directive({ selector: '[reflect]' })
class Reflect {
  readonly touched = input(false);
  readonly dirty = input(false);
  readonly pending = input(false);
  readonly invalid = input(false);

  constructor() {
    injectFormControlReflection({
      touched: this.touched,
      dirty: this.dirty,
      pending: this.pending,
      invalid: this.invalid,
    });
  }
}

@Component({
  imports: [Reflect],
  template: `
    <button
      reflect
      [touched]="touched()"
      [dirty]="dirty()"
      [pending]="pending()"
      [invalid]="invalid()"
    ></button>
  `,
})
class Host {
  readonly touched = signal(false);
  readonly dirty = signal(false);
  readonly pending = signal(false);
  readonly invalid = signal(false);
}

function setup(): { fixture: ComponentFixture<Host>; host: Host; button: HTMLButtonElement } {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection()],
  });
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  return {
    fixture,
    host: fixture.componentInstance,
    button: (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button')!,
  };
}

describe('injectFormControlReflection', () => {
  it('omits all four data attributes by default', () => {
    const { button } = setup();
    expect(button.hasAttribute('data-touched')).toBe(false);
    expect(button.hasAttribute('data-dirty')).toBe(false);
    expect(button.hasAttribute('data-pending')).toBe(false);
    expect(button.hasAttribute('data-invalid')).toBe(false);
  });

  it('reflects each flag as an empty-string data attribute when set', () => {
    const { fixture, host, button } = setup();
    host.touched.set(true);
    host.dirty.set(true);
    host.pending.set(true);
    host.invalid.set(true);
    fixture.detectChanges();

    expect(button.getAttribute('data-touched')).toBe('');
    expect(button.getAttribute('data-dirty')).toBe('');
    expect(button.getAttribute('data-pending')).toBe('');
    expect(button.getAttribute('data-invalid')).toBe('');
  });

  it('removes the attribute when the flag flips back to false', () => {
    const { fixture, host, button } = setup();
    host.invalid.set(true);
    fixture.detectChanges();
    expect(button.hasAttribute('data-invalid')).toBe(true);

    host.invalid.set(false);
    fixture.detectChanges();
    expect(button.hasAttribute('data-invalid')).toBe(false);
  });
});
