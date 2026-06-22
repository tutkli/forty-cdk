import { Component, computed, provideZonelessChangeDetection, signal } from '@angular/core';
import { form, FormField, validate } from '@angular/forms/signals';
import { TestBed } from '@angular/core/testing';

import { renderHost } from '../../src/test-utils/render';
import { ForSwitch } from 'forty-cdk/switch';
import { ForField } from './field';
import { ForFieldControl } from './field-control';
import { ForFieldDescription } from './field-description';
import { ForFieldError } from './field-error';
import { ForLabel } from './label';

const q = (host: HTMLElement, testId: string) =>
  host.querySelector<HTMLElement>(`[data-test-id="${testId}"]`)!;

describe('ForField', () => {
  describe('association wiring', () => {
    @Component({
      imports: [ForField, ForLabel, ForFieldDescription, ForSwitch],
      template: `
        <div forField data-test-id="field">
          <label forLabel data-test-id="label">Notify</label>
          <button forSwitch [(checked)]="checked" data-test-id="control"></button>
          <p forFieldDescription data-test-id="desc">Security only.</p>
        </div>
      `,
    })
    class Host {
      readonly checked = signal(false);
    }

    it('assigns the control an id and points the label `for` at it', () => {
      const { el } = renderHost(Host);
      const control = q(el, 'control');
      const label = q(el, 'label');
      expect(control.id).toBeTruthy();
      expect(label.getAttribute('for')).toBe(control.id);
    });

    it('wires aria-labelledby to the label id', () => {
      const { el } = renderHost(Host);
      expect(q(el, 'control').getAttribute('aria-labelledby')).toBe(q(el, 'label').id);
    });

    it('wires aria-describedby to the description id', () => {
      const { el } = renderHost(Host);
      expect(q(el, 'control').getAttribute('aria-describedby')).toBe(q(el, 'desc').id);
    });
  });

  describe('single-instance-per-slot presence', () => {
    @Component({
      imports: [ForField, ForLabel, ForFieldDescription, ForSwitch],
      template: `
        <div forField data-test-id="field">
          @if (showLabel()) {
            <label forLabel data-test-id="label">Notify</label>
          }
          <button forSwitch [(checked)]="checked" data-test-id="control"></button>
          @if (showDesc()) {
            <p forFieldDescription data-test-id="desc">Security only.</p>
          }
        </div>
      `,
    })
    class Host {
      readonly checked = signal(false);
      readonly showLabel = signal(true);
      readonly showDesc = signal(true);
    }

    it('drops aria-labelledby / aria-describedby once the single label / description slot unmounts', () => {
      const { el, fixture, flush } = renderHost(Host);
      const control = q(el, 'control');
      expect(control.hasAttribute('aria-labelledby')).toBe(true);
      expect(control.hasAttribute('aria-describedby')).toBe(true);

      fixture.componentInstance.showLabel.set(false);
      fixture.componentInstance.showDesc.set(false);
      flush();

      expect(control.hasAttribute('aria-labelledby')).toBe(false);
      expect(control.hasAttribute('aria-describedby')).toBe(false);
    });
  });

  describe('state reflection', () => {
    @Component({
      imports: [ForField, ForFieldError, ForSwitch],
      template: `
        <div forField data-test-id="field">
          <button
            forSwitch
            [(checked)]="checked"
            [invalid]="invalid()"
            [disabled]="disabled()"
            [required]="required()"
            [(touched)]="touched"
            data-test-id="control"
          ></button>
          <p forFieldError data-test-id="error">Invalid.</p>
        </div>
      `,
    })
    class Host {
      readonly checked = signal(false);
      readonly invalid = signal(false);
      readonly disabled = signal(false);
      readonly required = signal(false);
      readonly touched = signal(false);
    }

    it('reflects the control booleans as data-* on the field host', () => {
      const { el, fixture, flush } = renderHost(Host);
      const field = q(el, 'field');
      expect(field.hasAttribute('data-invalid')).toBe(false);

      fixture.componentInstance.invalid.set(true);
      fixture.componentInstance.disabled.set(true);
      fixture.componentInstance.required.set(true);
      fixture.componentInstance.touched.set(true);
      flush();

      expect(field.hasAttribute('data-invalid')).toBe(true);
      expect(field.hasAttribute('data-disabled')).toBe(true);
      expect(field.hasAttribute('data-required')).toBe(true);
      expect(field.hasAttribute('data-touched')).toBe(true);
    });

    it('points aria-errormessage at the error only while invalid', () => {
      const { el, fixture, flush } = renderHost(Host);
      const control = q(el, 'control');
      const error = q(el, 'error');

      expect(control.hasAttribute('aria-errormessage')).toBe(false);

      fixture.componentInstance.invalid.set(true);
      flush();
      expect(control.getAttribute('aria-errormessage')).toBe(error.id);
      // The error id is also folded into aria-describedby for robustness.
      expect(control.getAttribute('aria-describedby')).toContain(error.id);

      fixture.componentInstance.invalid.set(false);
      flush();
      expect(control.hasAttribute('aria-errormessage')).toBe(false);
    });
  });

  describe('Signal Forms error auto-read', () => {
    @Component({
      imports: [ForField, ForLabel, ForFieldError, ForSwitch, FormField],
      template: `
        <div forField data-test-id="field">
          <label forLabel>Terms</label>
          <button forSwitch [formField]="f.terms" data-test-id="control"></button>
          @if (showError()) {
            <p forFieldError #err="forFieldError" data-test-id="error">
              {{ err.messages().join('|') }}
            </p>
          }
        </div>
      `,
    })
    class Host {
      readonly model = signal({ terms: false });
      readonly f = form(this.model, (s) => {
        validate(s.terms, () => ({ kind: 'must-accept', message: 'You must accept the terms' }));
      });
      readonly showError = computed(() => this.f.terms().invalid());
    }

    it('renders the control errors without manual plumbing and wires aria-errormessage', () => {
      const { el, flush } = renderHost(Host);
      flush();

      const control = q(el, 'control');
      const error = q(el, 'error');
      expect(control.getAttribute('aria-invalid')).toBe('true');
      expect(control.getAttribute('aria-errormessage')).toBe(error.id);
      expect(error.textContent?.trim()).toBe('You must accept the terms');
    });
  });

  describe('native control via [forFieldControl]', () => {
    @Component({
      imports: [ForField, ForLabel, ForFieldControl],
      template: `
        <div forField data-test-id="field">
          <label forLabel data-test-id="label">Email</label>
          <input forFieldControl [invalid]="invalid()" data-test-id="control" />
        </div>
      `,
    })
    class Host {
      readonly invalid = signal(false);
    }

    it('associates a native input and reflects aria-invalid', () => {
      const { el, fixture, flush } = renderHost(Host);
      const control = q(el, 'control');
      const label = q(el, 'label');
      expect(label.getAttribute('for')).toBe(control.id);
      expect(control.getAttribute('aria-labelledby')).toBe(label.id);

      fixture.componentInstance.invalid.set(true);
      flush();
      expect(control.getAttribute('aria-invalid')).toBe('true');
      expect(q(el, 'field').hasAttribute('data-invalid')).toBe(true);
    });
  });

  describe('label-click activation', () => {
    @Component({
      imports: [ForField, ForLabel, ForSwitch],
      template: `
        <div forField>
          <span forLabel data-test-id="label">Notify</span>
          <button forSwitch [(checked)]="checked" data-test-id="control"></button>
        </div>
      `,
    })
    class NonLabelHost {
      readonly checked = signal(false);
    }

    it('toggles a custom-role control when a non-`<label>` host is clicked', async () => {
      const { el, flush } = renderHost(NonLabelHost);
      const control = q(el, 'control');
      expect(control.getAttribute('aria-checked')).toBe('false');

      q(el, 'label').click();
      await flush();
      expect(control.getAttribute('aria-checked')).toBe('true');

      q(el, 'label').click();
      await flush();
      expect(control.getAttribute('aria-checked')).toBe('false');
    });

    it('focuses the control after forwarding the click', () => {
      const { el } = renderHost(NonLabelHost);
      q(el, 'label').click();
      expect(document.activeElement).toBe(q(el, 'control'));
    });

    @Component({
      imports: [ForField, ForLabel, ForSwitch],
      template: `
        <div forField>
          <span forLabel data-test-id="label">
            <button forSwitch [(checked)]="checked" data-test-id="control"></button>
            Notify
          </span>
        </div>
      `,
    })
    class WrappingLabelHost {
      readonly checked = signal(false);
    }

    it('does not double-toggle when the control is nested inside the label host (#590 F5)', async () => {
      const { el, flush } = renderHost(WrappingLabelHost);
      const control = q(el, 'control');
      expect(control.getAttribute('aria-checked')).toBe('false');

      // Clicking the control activates it natively once; the label must not
      // forward the same click and toggle it back.
      control.click();
      await flush();
      expect(control.getAttribute('aria-checked')).toBe('true');
    });

    it('still forwards a click that lands on the label text, not the control (#590 F5)', async () => {
      const { el, flush } = renderHost(WrappingLabelHost);
      const control = q(el, 'control');
      expect(control.getAttribute('aria-checked')).toBe('false');

      // A click whose target is the label (outside the control) still forwards.
      q(el, 'label').click();
      await flush();
      expect(control.getAttribute('aria-checked')).toBe('true');
    });
  });

  describe('standalone label (no field)', () => {
    @Component({
      imports: [ForLabel],
      template: `<label forLabel data-test-id="label">Loose</label>`,
    })
    class Host {}

    it('is an inert marker without a surrounding field', () => {
      const { el } = renderHost(Host);
      const label = q(el, 'label');
      expect(label.hasAttribute('id')).toBe(false);
      expect(label.hasAttribute('for')).toBe(false);
    });
  });

  describe('zoneless reactivity', () => {
    it('updates association state without Zone.js', () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

      @Component({
        imports: [ForField, ForSwitch],
        template: `
          <div forField data-test-id="field">
            <button forSwitch [invalid]="invalid()" data-test-id="control"></button>
          </div>
        `,
      })
      class Host {
        readonly invalid = signal(false);
      }

      const fixture = TestBed.createComponent(Host);
      fixture.detectChanges();
      const field = (fixture.nativeElement as HTMLElement).querySelector('[data-test-id="field"]')!;
      expect(field.hasAttribute('data-invalid')).toBe(false);

      fixture.componentInstance.invalid.set(true);
      fixture.detectChanges();
      expect(field.hasAttribute('data-invalid')).toBe(true);
    });
  });
});
