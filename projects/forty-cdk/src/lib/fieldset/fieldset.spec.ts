import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { renderHost } from '../../test-utils/render';
import { ForField } from '../field/field';
import { ForSwitch } from '../switch/switch';
import { ForFieldset } from './fieldset';
import { ForFieldsetLegend } from './fieldset-legend';

const q = (host: HTMLElement, testId: string) =>
  host.querySelector<HTMLElement>(`[data-test-id="${testId}"]`)!;

describe('ForFieldset', () => {
  describe('grouping on a non-<fieldset> host', () => {
    @Component({
      imports: [ForFieldset, ForFieldsetLegend],
      template: `
        <div forFieldset data-test-id="group">
          <span forFieldsetLegend data-test-id="legend">Preferences</span>
        </div>
      `,
    })
    class Host {}

    it('emits role="group"', () => {
      const { el } = renderHost(Host);
      expect(q(el, 'group').getAttribute('role')).toBe('group');
    });

    it('points aria-labelledby at the legend id', () => {
      const { el } = renderHost(Host);
      const group = q(el, 'group');
      const legend = q(el, 'legend');
      expect(legend.id).toBeTruthy();
      expect(group.getAttribute('aria-labelledby')).toBe(legend.id);
    });
  });

  describe('grouping on a native <fieldset> host', () => {
    @Component({
      imports: [ForFieldset, ForFieldsetLegend],
      template: `
        <fieldset forFieldset data-test-id="group">
          <legend forFieldsetLegend data-test-id="legend">Preferences</legend>
        </fieldset>
      `,
    })
    class Host {}

    it('emits no role (the native element groups implicitly)', () => {
      const { el } = renderHost(Host);
      expect(q(el, 'group').hasAttribute('role')).toBe(false);
    });

    it('emits no aria-labelledby (native labelling)', () => {
      const { el } = renderHost(Host);
      expect(q(el, 'group').hasAttribute('aria-labelledby')).toBe(false);
    });
  });

  describe('no legend present', () => {
    @Component({
      imports: [ForFieldset],
      template: `<div forFieldset data-test-id="group"></div>`,
    })
    class Host {}

    it('omits aria-labelledby until a legend registers', () => {
      const { el } = renderHost(Host);
      expect(q(el, 'group').hasAttribute('aria-labelledby')).toBe(false);
    });
  });

  describe('disabled reflection', () => {
    @Component({
      imports: [ForFieldset],
      template: `<div forFieldset [disabled]="disabled()" data-test-id="group"></div>`,
    })
    class Host {
      readonly disabled = signal(false);
    }

    it('reflects data-disabled and aria-disabled on a non-<fieldset> host', () => {
      const { el, fixture, flush } = renderHost(Host);
      const group = q(el, 'group');
      expect(group.hasAttribute('data-disabled')).toBe(false);
      expect(group.hasAttribute('aria-disabled')).toBe(false);

      fixture.componentInstance.disabled.set(true);
      flush();

      expect(group.hasAttribute('data-disabled')).toBe(true);
      expect(group.getAttribute('aria-disabled')).toBe('true');
      // The native `disabled` attribute is reserved for a real <fieldset>.
      expect(group.hasAttribute('disabled')).toBe(false);
    });
  });

  describe('disabled on a native <fieldset> host', () => {
    @Component({
      imports: [ForFieldset],
      template: `<fieldset forFieldset [disabled]="disabled()" data-test-id="group"></fieldset>`,
    })
    class Host {
      readonly disabled = signal(true);
    }

    it('emits the native disabled attribute, not aria-disabled', () => {
      const { el } = renderHost(Host);
      const group = q(el, 'group');
      expect(group.hasAttribute('disabled')).toBe(true);
      expect(group.hasAttribute('aria-disabled')).toBe(false);
      expect(group.hasAttribute('data-disabled')).toBe(true);
    });
  });

  describe('disabled propagation to descendant ForField', () => {
    @Component({
      imports: [ForFieldset, ForField, ForSwitch],
      template: `
        <div forFieldset [disabled]="disabled()">
          <div forField data-test-id="field">
            <button forSwitch data-test-id="control"></button>
          </div>
        </div>
      `,
    })
    class Host {
      readonly disabled = signal(false);
    }

    it('a disabled fieldset marks the descendant field data-disabled', () => {
      const { el, fixture, flush } = renderHost(Host);
      const field = q(el, 'field');
      expect(field.hasAttribute('data-disabled')).toBe(false);

      fixture.componentInstance.disabled.set(true);
      flush();
      expect(field.hasAttribute('data-disabled')).toBe(true);
    });
  });

  describe('field outside any fieldset is unchanged', () => {
    @Component({
      imports: [ForField, ForSwitch],
      template: `
        <div forField data-test-id="field">
          <button forSwitch data-test-id="control"></button>
        </div>
      `,
    })
    class Host {}

    it('does not reflect data-disabled with no fieldset present', () => {
      const { el } = renderHost(Host);
      expect(q(el, 'field').hasAttribute('data-disabled')).toBe(false);
    });
  });

  describe('standalone legend (no fieldset)', () => {
    @Component({
      imports: [ForFieldsetLegend],
      template: `<span forFieldsetLegend data-test-id="legend">Loose</span>`,
    })
    class Host {}

    it('is an inert marker without a surrounding fieldset', () => {
      const { el } = renderHost(Host);
      expect(q(el, 'legend').hasAttribute('id')).toBe(false);
    });
  });

  describe('zoneless reactivity', () => {
    it('updates disabled reflection without Zone.js', () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

      @Component({
        imports: [ForFieldset],
        template: `<div forFieldset [disabled]="disabled()" data-test-id="group"></div>`,
      })
      class Host {
        readonly disabled = signal(false);
      }

      const fixture = TestBed.createComponent(Host);
      fixture.detectChanges();
      const group = (fixture.nativeElement as HTMLElement).querySelector(
        '[data-test-id="group"]',
      )!;
      expect(group.hasAttribute('data-disabled')).toBe(false);

      fixture.componentInstance.disabled.set(true);
      fixture.detectChanges();
      expect(group.hasAttribute('data-disabled')).toBe(true);
    });
  });
});
