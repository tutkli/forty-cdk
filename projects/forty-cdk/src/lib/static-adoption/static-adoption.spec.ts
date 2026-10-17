import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { provideNativeDateAdapter } from 'forty-cdk/shared';
import { ForCarousel, ForCarouselSlide, ForCarouselTrack } from 'forty-cdk/carousel';
import {
  ForCombobox,
  ForComboboxContent,
  ForComboboxInput,
  ForComboboxList,
} from 'forty-cdk/combobox';
import { ForDatePicker, ForDatePickerContent, ForDatePickerTrigger } from 'forty-cdk/date-picker';
import { ForDisclosure, ForDisclosureTrigger } from 'forty-cdk/disclosure';
import { ForDropdownMenu, ForDropdownMenuTrigger } from 'forty-cdk/dropdown-menu';
import { ForListbox } from 'forty-cdk/listbox';
import { ForMenuContent, ForMenuItem } from 'forty-cdk/menu';
import { ForSelect, ForSelectContent, ForSelectTrigger } from 'forty-cdk/select';
import { ForSlider, ForSliderThumb } from 'forty-cdk/slider';
import { ForTabs, ForTabsContent, ForTabsList, ForTabsTrigger } from 'forty-cdk/tabs';
import { ForTimePicker, ForTimePickerContent, ForTimePickerTrigger } from 'forty-cdk/time-picker';
import { installObserverPolyfills } from 'forty-cdk/testing';

import { assertStaticAdoptionContract } from '../../test-utils/contract';
import { afterEachOverlayCleanup } from '../../test-utils/overlay-cleanup';
import { mount, mountStaticAdoptionFixture } from './fixtures/mount';
import { STATIC_ADOPTION_ADOPTERS } from './fixtures/registry';

/**
 * Library-wide sweep for the consumer-set **static** attributes a directive must
 * never clobber with its own host binding — `id`
 * ([#659](https://github.com/tutkli/forty-cdk/issues/659)), `aria-labelledby` /
 * `aria-describedby` ([#1454](https://github.com/tutkli/forty-cdk/issues/1454))
 * and `aria-label` ([#1479](https://github.com/tutkli/forty-cdk/issues/1479)).
 *
 * Registry-first, like the SSR smoke suite: an adopter declares its two fixtures
 * and its claims in `fixtures/`, and `assertStaticAdoptionContract` states every
 * assertion identical across the family. A new piece calling one of the six core
 * seams owes a claim, never a hand-written `it` — `adopters.spec.ts` fails on a
 * call site no claim declares.
 *
 * The cases below the sweep are the ones the declarative shape cannot state, and
 * each is a different kind of claim:
 *
 *   - **The static-only boundary**, once per channel. That a consumer *property*
 *     binding is not adopted is a property of the seam — each reads
 *     `getAttribute` once, at construction — so one case per channel proves it
 *     and 83 would only restate the helper.
 *   - **A cross-channel precedence**: `aria-labelledby` outranks `aria-label` in
 *     ARIA, so a surface adopting a static name must also drop its generated
 *     labelledby fallback, or the trigger's text stays the announced name. Two
 *     attributes at once is outside a per-`(piece, channel)` claim.
 *   - **State transitions**: a menu content that stays mounted while its bar
 *     closes, or is shared across a switch of openers, keeps the id it was given.
 *   - **The deliberate non-adopters**: a per-instance computed name, and a
 *     channel the library never binds at all.
 */
describe('consumer-set static attribute adoption', () => {
  afterEachOverlayCleanup();

  let restoreObservers: () => void;
  beforeAll(() => {
    restoreObservers = installObserverPolyfills();
  });
  afterAll(() => restoreObservers());

  for (const adopter of STATIC_ADOPTION_ADOPTERS) {
    assertStaticAdoptionContract(
      {
        mount: (variant) => mountStaticAdoptionFixture(adopter, variant),
        claims: adopter.claims,
      },
      { label: adopter.label },
    );
  }

  describe('the static-only boundary', () => {
    it('does not adopt a consumer [id] property binding', async () => {
      @Component({
        imports: [ForDisclosure, ForDisclosureTrigger],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `<div forDisclosure>
          <button forDisclosureTrigger [id]="boundId">Toggle</button>
        </div>`,
      })
      class BoundIdHost {
        readonly boundId = 'bound';
      }

      const ctx = mount(BoundIdHost);
      await ctx.flush();
      expect(ctx.query('[forDisclosureTrigger]')!.id).toMatch(/^for-disclosure-trigger-/);
    });

    it('does not adopt a consumer [attr.aria-labelledby] binding', async () => {
      @Component({
        imports: [ForTabs, ForTabsList, ForTabsTrigger, ForTabsContent],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `<div forTabs value="products">
          <div forTabsList>
            <button forTabsTrigger value="products" id="trigger-id">Products</button>
          </div>
          <div forTabsContent value="products" [attr.aria-labelledby]="bound">Panel</div>
        </div>`,
      })
      class BoundHost {
        readonly bound = 'my-heading';
      }

      const ctx = mount(BoundHost);
      await ctx.flush();
      expect(ctx.query('[forTabsContent]')!.getAttribute('aria-labelledby')).toBe('trigger-id');
    });

    it('does not adopt a consumer [attr.aria-label] binding', async () => {
      @Component({
        imports: [ForListbox],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `<ul forListbox [ariaLabel]="'Library'" [attr.aria-label]="bound"></ul>`,
      })
      class BoundHost {
        readonly bound = 'Toppings';
      }

      const ctx = mount(BoundHost);
      await ctx.flush();
      expect(ctx.query('[forListbox]')!.getAttribute('aria-label')).toBe('Library');
    });
  });

  describe('a surface adopting a static aria-label drops its labelledby fallback', () => {
    it('applies to the Select surface and the Combobox list', async () => {
      @Component({
        imports: [
          ForSelect,
          ForSelectTrigger,
          ForSelectContent,
          ForCombobox,
          ForComboboxInput,
          ForComboboxContent,
          ForComboboxList,
        ],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `<div forSelect [(value)]="value" [(open)]="open">
            <button forSelectTrigger>Select</button>
            @if (open()) {
              <div forSelectContent aria-label="Toppings"></div>
            }
          </div>
          <div forCombobox [(query)]="query" [(value)]="value" [(open)]="open">
            <input forComboboxInput />
            @if (open()) {
              <div forComboboxContent>
                <div forComboboxList aria-label="Results"></div>
              </div>
            }
          </div>`,
      })
      class Host {
        readonly value = signal<readonly string[]>([]);
        readonly query = signal('');
        readonly open = signal(true);
      }

      const ctx = mount(Host);
      await ctx.flush();
      expect(ctx.query('[forSelectContent]')!.getAttribute('aria-label')).toBe('Toppings');
      expect(ctx.query('[forSelectContent]')!.getAttribute('aria-labelledby')).toBeNull();
      expect(ctx.query('[forComboboxList]')!.getAttribute('aria-label')).toBe('Results');
      expect(ctx.query('[forComboboxList]')!.getAttribute('aria-labelledby')).toBeNull();
    });

    it('applies to the menu surface', async () => {
      @Component({
        imports: [ForDropdownMenu, ForDropdownMenuTrigger, ForMenuContent, ForMenuItem],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `<div forDropdownMenu [(open)]="open">
          <button forDropdownMenuTrigger>Options</button>
          @if (open()) {
            <div forMenuContent aria-label="Row actions">
              <button forMenuItem>A</button>
            </div>
          }
        </div>`,
      })
      class Host {
        readonly open = signal(true);
      }

      const ctx = mount(Host);
      await ctx.flush();
      expect(ctx.query('[forMenuContent]')!.getAttribute('aria-label')).toBe('Row actions');
      expect(ctx.query('[forMenuContent]')!.getAttribute('aria-labelledby')).toBeNull();
    });

    it('applies to both picker surfaces', async () => {
      @Component({
        imports: [
          ForDatePicker,
          ForDatePickerTrigger,
          ForDatePickerContent,
          ForTimePicker,
          ForTimePickerTrigger,
          ForTimePickerContent,
        ],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `<div forDatePicker [(value)]="date" [(open)]="open">
            <button forDatePickerTrigger>Pick</button>
            @if (open()) {
              <div forDatePickerContent aria-label="Choose a date"></div>
            }
          </div>
          <div forTimePicker [(value)]="date" [(open)]="open">
            <button forTimePickerTrigger>Pick</button>
            @if (open()) {
              <div forTimePickerContent aria-label="Choose a time"></div>
            }
          </div>`,
      })
      class Host {
        readonly date = signal<Date | null>(null);
        readonly open = signal(true);
      }

      const ctx = mount(Host, [...provideNativeDateAdapter()]);
      await ctx.flush();
      expect(ctx.query('[forDatePickerContent]')!.getAttribute('aria-labelledby')).toBeNull();
      expect(ctx.query('[forTimePickerContent]')!.getAttribute('aria-labelledby')).toBeNull();
    });
  });

  describe('names the library deliberately does not adopt', () => {
    it('keeps a slide positional label over the consumer static one', async () => {
      @Component({
        imports: [ForCarousel, ForCarouselTrack, ForCarouselSlide],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `<div forCarousel>
          <div forCarouselTrack>
            <div forCarouselSlide aria-label="Static">One</div>
            <div forCarouselSlide>Two</div>
          </div>
        </div>`,
      })
      class Host {}

      const ctx = mount(Host);
      await ctx.flush();
      expect(ctx.query('[forCarouselSlide]')!.getAttribute('aria-label')).toBe('1 of 2');
    });

    it('leaves a channel it never binds untouched', async () => {
      @Component({
        imports: [ForSlider, ForSliderThumb],
        changeDetection: ChangeDetectionStrategy.OnPush,
        template: `<div forSlider [(value)]="value">
          <span forSliderThumb [index]="0" aria-labelledby="my-heading"></span>
        </div>`,
      })
      class Host {
        readonly value = signal<readonly number[]>([50]);
      }

      const ctx = mount(Host);
      await ctx.flush();
      expect(ctx.query('[forSliderThumb]')!.getAttribute('aria-labelledby')).toBe('my-heading');
    });
  });
});
