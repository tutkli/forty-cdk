import { Component, Directive, model, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { type DebugElement } from '@angular/core';

import { renderHost } from '../../../test-utils/render';
import { ForFieldset } from '../../fieldset/fieldset';
import { FormUiControlBase } from './form-ui-control-base';

@Directive({
  selector: '[forTestControl]',
  exportAs: 'forTestControl',
  host: {
    '[attr.aria-disabled]': 'effectiveDisabled() ? "true" : null',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
  },
})
class ForTestControl extends FormUiControlBase {
  readonly value = model<string>('');

  fireTouch(): void {
    this.markTouched();
  }
}

const q = (host: HTMLElement, testId: string) =>
  host.querySelector<HTMLElement>(`[data-test-id="${testId}"]`)!;

describe('FormUiControlBase', () => {
  describe('form-state data-* reflection', () => {
    @Component({
      imports: [ForTestControl],
      template: `
        <div
          forTestControl
          data-test-id="control"
          [touched]="touched()"
          [dirty]="dirty()"
          [pending]="pending()"
          [invalid]="invalid()"
        ></div>
      `,
    })
    class Host {
      readonly touched = signal(false);
      readonly dirty = signal(false);
      readonly pending = signal(false);
      readonly invalid = signal(false);
    }

    it('emits none of the data-* attributes while all flags are false', () => {
      const { el } = renderHost(Host);
      const control = q(el, 'control');
      expect(control.hasAttribute('data-touched')).toBe(false);
      expect(control.hasAttribute('data-dirty')).toBe(false);
      expect(control.hasAttribute('data-pending')).toBe(false);
      expect(control.hasAttribute('data-invalid')).toBe(false);
    });

    it('reflects data-touched when the touched model flips', async () => {
      const { el, fixture, flush } = renderHost(Host);
      const control = q(el, 'control');
      fixture.componentInstance.touched.set(true);
      await flush();
      expect(control.hasAttribute('data-touched')).toBe(true);

      fixture.componentInstance.touched.set(false);
      await flush();
      expect(control.hasAttribute('data-touched')).toBe(false);
    });

    it('reflects data-dirty, data-pending and data-invalid when each input flips', async () => {
      const { el, fixture, flush } = renderHost(Host);
      const control = q(el, 'control');

      fixture.componentInstance.dirty.set(true);
      fixture.componentInstance.pending.set(true);
      fixture.componentInstance.invalid.set(true);
      await flush();

      expect(control.hasAttribute('data-dirty')).toBe(true);
      expect(control.hasAttribute('data-pending')).toBe(true);
      expect(control.hasAttribute('data-invalid')).toBe(true);
    });
  });

  describe('markTouched', () => {
    @Component({
      imports: [ForTestControl],
      template: `
        <div
          forTestControl
          #ctrl="forTestControl"
          data-test-id="control"
          (touch)="touchCount.set(touchCount() + 1)"
        ></div>
      `,
    })
    class Host {
      readonly touchCount = signal(0);
    }

    it('flips data-touched and emits touch exactly once per call', async () => {
      const { el, fixture, flush } = renderHost(Host);
      const control = q(el, 'control');
      const directive = fixture.debugElement
        .query((node: DebugElement) => node.nativeElement === control)
        .references['ctrl'] as ForTestControl;

      expect(control.hasAttribute('data-touched')).toBe(false);
      expect(fixture.componentInstance.touchCount()).toBe(0);

      directive.fireTouch();
      await flush();

      expect(control.hasAttribute('data-touched')).toBe(true);
      expect(fixture.componentInstance.touchCount()).toBe(1);
    });
  });

  describe('effectiveDisabled inside a forFieldset', () => {
    @Component({
      imports: [ForTestControl, ForFieldset],
      template: `
        <div forFieldset [disabled]="fieldsetDisabled()">
          <div forTestControl data-test-id="control" [disabled]="controlDisabled()"></div>
        </div>
      `,
    })
    class Host {
      readonly fieldsetDisabled = signal(false);
      readonly controlDisabled = signal(false);
    }

    it('is not disabled when neither source is disabled', () => {
      const { el } = renderHost(Host);
      const control = q(el, 'control');
      expect(control.hasAttribute('aria-disabled')).toBe(false);
      expect(control.hasAttribute('data-disabled')).toBe(false);
    });

    it('reflects disabled when the control input is set', async () => {
      const { el, fixture, flush } = renderHost(Host);
      const control = q(el, 'control');
      fixture.componentInstance.controlDisabled.set(true);
      await flush();
      expect(control.getAttribute('aria-disabled')).toBe('true');
      expect(control.hasAttribute('data-disabled')).toBe(true);
    });

    it('ORs in a surrounding disabled forFieldset even when the control input is false', async () => {
      const { el, fixture, flush } = renderHost(Host);
      const control = q(el, 'control');
      expect(control.hasAttribute('aria-disabled')).toBe(false);

      fixture.componentInstance.fieldsetDisabled.set(true);
      await flush();
      expect(control.getAttribute('aria-disabled')).toBe('true');
      expect(control.hasAttribute('data-disabled')).toBe(true);

      fixture.componentInstance.fieldsetDisabled.set(false);
      await flush();
      expect(control.hasAttribute('aria-disabled')).toBe(false);
    });
  });

  describe('zoneless reactivity', () => {
    it('updates data-touched reflection without Zone.js', () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

      @Component({
        imports: [ForTestControl],
        template: `<div forTestControl data-test-id="control" [touched]="touched()"></div>`,
      })
      class Host {
        readonly touched = signal(false);
      }

      const fixture = TestBed.createComponent(Host);
      fixture.detectChanges();
      const control = (fixture.nativeElement as HTMLElement).querySelector(
        '[data-test-id="control"]',
      )!;
      expect(control.hasAttribute('data-touched')).toBe(false);

      fixture.componentInstance.touched.set(true);
      fixture.detectChanges();
      expect(control.hasAttribute('data-touched')).toBe(true);
    });
  });
});
