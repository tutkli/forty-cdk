import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import {
  ForAccordion,
  ForAccordionContent,
  ForAccordionItem,
  ForAccordionTrigger,
} from 'forty-cdk/accordion';
import { ForDisclosure, ForDisclosureContent, ForDisclosureTrigger } from 'forty-cdk/disclosure';
import {
  ForStepper,
  ForStepperContent,
  ForStepperItem,
  ForStepperList,
  ForStepperProgress,
  ForStepperTrigger,
} from 'forty-cdk/stepper';
import { ForTabs, ForTabsContent, ForTabsList, ForTabsTrigger } from 'forty-cdk/tabs';

import type { StaticAdoptionAdopter } from './mount';

@Component({
  imports: [ForDisclosure, ForDisclosureTrigger, ForDisclosureContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forDisclosure [(open)]="open">
    <button forDisclosureTrigger id="probe-trigger">Toggle</button>
    <section forDisclosureContent id="probe-content">Content</section>
  </div>`,
})
class DisclosureAdopted {
  readonly open = signal(true);
}

@Component({
  imports: [ForDisclosure, ForDisclosureTrigger, ForDisclosureContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forDisclosure [(open)]="open">
    <button forDisclosureTrigger>Toggle</button>
    <section forDisclosureContent>Content</section>
  </div>`,
})
class DisclosureBare {
  readonly open = signal(true);
}

@Component({
  imports: [ForAccordion, ForAccordionItem, ForAccordionTrigger, ForAccordionContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forAccordion [(value)]="value">
    <div forAccordionItem value="a">
      <button forAccordionTrigger id="probe-trigger">A</button>
      <section forAccordionContent id="probe-content" aria-labelledby="probe-labelledby">
        Panel A
      </section>
    </div>
  </div>`,
})
class AccordionAdopted {
  readonly value = signal<readonly string[]>(['a']);
}

@Component({
  imports: [ForAccordion, ForAccordionItem, ForAccordionTrigger, ForAccordionContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forAccordion [(value)]="value">
    <div forAccordionItem value="a">
      <button forAccordionTrigger>A</button>
      <section forAccordionContent>Panel A</section>
    </div>
  </div>`,
})
class AccordionBare {
  readonly value = signal<readonly string[]>(['a']);
}

@Component({
  imports: [ForTabs, ForTabsList, ForTabsTrigger, ForTabsContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forTabs [(value)]="value">
    <div forTabsList aria-label="Probe sections">
      <button forTabsTrigger value="a" id="probe-trigger">A</button>
    </div>
    <section forTabsContent value="a" id="probe-content" aria-labelledby="probe-labelledby">
      Content A
    </section>
  </div>`,
})
class TabsAdopted {
  readonly value = signal<string | null>('a');
}

@Component({
  imports: [ForTabs, ForTabsList, ForTabsTrigger, ForTabsContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forTabs [(value)]="value">
    <div forTabsList>
      <button forTabsTrigger value="a">A</button>
    </div>
    <section forTabsContent value="a">Content A</section>
  </div>`,
})
class TabsBare {
  readonly value = signal<string | null>('a');
}

@Component({
  imports: [
    ForStepper,
    ForStepperList,
    ForStepperItem,
    ForStepperTrigger,
    ForStepperContent,
    ForStepperProgress,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forStepper [(selectedIndex)]="index">
    <ol forStepperList aria-label="Probe steps">
      <li forStepperItem>
        <button forStepperTrigger id="probe-trigger">A</button>
      </li>
    </ol>
    <section forStepperContent id="probe-content" aria-labelledby="probe-labelledby">
      Content A
    </section>
    <div forStepperProgress aria-label="Probe progress"></div>
  </div>`,
})
class StepperAdopted {
  readonly index = signal(0);
}

@Component({
  imports: [
    ForStepper,
    ForStepperList,
    ForStepperItem,
    ForStepperTrigger,
    ForStepperContent,
    ForStepperProgress,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forStepper [(selectedIndex)]="index">
    <ol forStepperList>
      <li forStepperItem>
        <button forStepperTrigger>A</button>
      </li>
    </ol>
    <section forStepperContent>Content A</section>
    <div forStepperProgress></div>
  </div>`,
})
class StepperBare {
  readonly index = signal(0);
}

/**
 * The embedded trigger / content families: an id on both pieces, plus the
 * panel's `aria-labelledby` fallback to its trigger and the list's optional
 * accessible name.
 */
export const DISCLOSURE_FAMILY_ADOPTERS: readonly StaticAdoptionAdopter[] = [
  {
    label: 'Disclosure',
    adopted: DisclosureAdopted,
    bare: DisclosureBare,
    claims: [
      {
        key: '[forDisclosureTrigger]',
        channel: 'id',
        source: 'disclosure/src/disclosure.ts',
        seam: 'adoptHostId',
        probe: 'probe-trigger',
        fallback: { generated: 'for-disclosure-trigger' },
      },
      {
        key: '[forDisclosureContent]',
        channel: 'id',
        source: 'disclosure/src/disclosure.ts',
        seam: 'adoptHostId',
        probe: 'probe-content',
        fallback: { generated: 'for-disclosure-content' },
      },
    ],
  },
  {
    label: 'Accordion',
    adopted: AccordionAdopted,
    bare: AccordionBare,
    claims: [
      {
        key: '[forAccordionTrigger]',
        channel: 'id',
        source: 'accordion/src/accordion-item.ts',
        seam: 'adoptHostId',
        probe: 'probe-trigger',
        fallback: { generated: 'for-accordion-trigger' },
      },
      {
        key: '[forAccordionContent]',
        channel: 'id',
        source: 'accordion/src/accordion-item.ts',
        seam: 'adoptHostId',
        probe: 'probe-content',
        fallback: { generated: 'for-accordion-content' },
      },
      {
        key: '[forAccordionContent]',
        channel: 'aria-labelledby',
        source: 'accordion/src/accordion-content.ts',
        seam: 'hostLabelledBy',
        probe: 'probe-labelledby',
        fallback: { pairs: '[forAccordionTrigger]' },
      },
    ],
  },
  {
    label: 'Tabs',
    adopted: TabsAdopted,
    bare: TabsBare,
    claims: [
      {
        key: '[forTabsTrigger]',
        channel: 'id',
        source: 'tabs/src/tabs-trigger.ts',
        seam: 'hostId',
        probe: 'probe-trigger',
        fallback: { generated: 'for-tabs-trigger' },
      },
      {
        key: '[forTabsContent]',
        channel: 'id',
        source: 'tabs/src/tabs-content.ts',
        seam: 'hostId',
        probe: 'probe-content',
        fallback: { generated: 'for-tabs-content' },
      },
      {
        key: '[forTabsContent]',
        channel: 'aria-labelledby',
        source: 'tabs/src/tabs-content.ts',
        seam: 'hostLabelledBy',
        probe: 'probe-labelledby',
        fallback: { pairs: '[forTabsTrigger]' },
      },
      {
        key: '[forTabsList]',
        channel: 'aria-label',
        source: 'tabs/src/tabs-list.ts',
        seam: 'hostAriaLabel',
        probe: 'Probe sections',
        fallback: null,
      },
    ],
  },
  {
    label: 'Stepper',
    adopted: StepperAdopted,
    bare: StepperBare,
    claims: [
      {
        key: '[forStepperTrigger]',
        channel: 'id',
        source: 'stepper/src/stepper-trigger.ts',
        seam: 'hostId',
        probe: 'probe-trigger',
        fallback: { generated: 'for-stepper-trigger' },
      },
      {
        key: '[forStepperContent]',
        channel: 'id',
        source: 'stepper/src/stepper-content.ts',
        seam: 'hostId',
        probe: 'probe-content',
        fallback: { generated: 'for-stepper-content' },
      },
      {
        key: '[forStepperContent]',
        channel: 'aria-labelledby',
        source: 'stepper/src/stepper-content.ts',
        seam: 'hostLabelledBy',
        probe: 'probe-labelledby',
        fallback: { pairs: '[forStepperTrigger]' },
      },
      {
        key: '[forStepperList]',
        channel: 'aria-label',
        source: 'stepper/src/stepper-list.ts',
        seam: 'hostAriaLabel',
        probe: 'Probe steps',
        fallback: null,
      },
      {
        key: '[forStepperProgress]',
        channel: 'aria-label',
        source: 'stepper/src/stepper-progress.ts',
        seam: 'hostAriaLabel',
        probe: 'Probe progress',
        fallback: null,
      },
    ],
  },
];
