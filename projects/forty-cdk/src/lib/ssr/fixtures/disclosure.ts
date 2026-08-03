import { Component } from '@angular/core';
import {
  ForAccordion,
  ForAccordionContent,
  ForAccordionItem,
  ForAccordionTrigger,
} from 'forty-cdk/accordion';
import { ForDisclosure, ForDisclosureContent, ForDisclosureTrigger } from 'forty-cdk/disclosure';
import {
  ForStepper,
  ForStepperCompletedContent,
  ForStepperContent,
  ForStepperIndicator,
  ForStepperItem,
  ForStepperList,
  ForStepperNext,
  ForStepperPrevious,
  ForStepperProgress,
  ForStepperSeparator,
  ForStepperTrigger,
} from 'forty-cdk/stepper';
import { ForTabs, ForTabsContent, ForTabsList, ForTabsTrigger } from 'forty-cdk/tabs';

@Component({
  imports: [ForDisclosure, ForDisclosureTrigger, ForDisclosureContent],
  template: `
    <div forDisclosure>
      <button forDisclosureTrigger>Toggle</button>
      <section forDisclosureContent>content</section>
    </div>
  `,
})
export class DisclosureFixture {}

@Component({
  imports: [ForAccordion, ForAccordionItem, ForAccordionTrigger, ForAccordionContent],
  template: `
    <div forAccordion>
      <div forAccordionItem value="one">
        <button forAccordionTrigger>One</button>
        <section forAccordionContent>one body</section>
      </div>
    </div>
  `,
})
export class AccordionFixture {}

@Component({
  imports: [ForAccordion, ForAccordionItem, ForAccordionTrigger, ForAccordionContent],
  template: `
    <div dir="rtl">
      <div forAccordion>
        <div forAccordionItem value="one">
          <button forAccordionTrigger>One</button>
          <section forAccordionContent>one body</section>
        </div>
      </div>
    </div>
  `,
})
export class AccordionRtlFixture {}

@Component({
  imports: [ForTabs, ForTabsList, ForTabsTrigger, ForTabsContent],
  template: `
    <div forTabs value="a">
      <div forTabsList>
        <button forTabsTrigger value="a">A</button>
      </div>
      <section forTabsContent value="a">A body</section>
    </div>
  `,
})
export class TabsFixture {}

@Component({
  imports: [ForTabs, ForTabsList, ForTabsTrigger, ForTabsContent],
  template: `
    <div forTabs value="a">
      <div forTabsList>
        <button forTabsTrigger value="a">A</button>
        <button forTabsTrigger value="b" id="static-tab-b">B</button>
      </div>
      <section forTabsContent value="a">A body</section>
      <section forTabsContent value="b" id="static-panel-b">B body</section>
    </div>
  `,
})
export class TabsServerFixture {}

@Component({
  imports: [ForTabs, ForTabsList, ForTabsTrigger, ForTabsContent],
  template: `
    <div forTabs value="a">
      <div forTabsList>
        @for (tab of tabs; track tab) {
          <button forTabsTrigger [value]="tab" [attr.data-tab]="tab">{{ tab }}</button>
        }
      </div>
      @for (tab of tabs; track tab) {
        <section forTabsContent [value]="tab" [attr.data-panel]="tab">{{ tab }} body</section>
      }
    </div>
  `,
})
export class TabsServerRepeatFixture {
  readonly tabs = ['a', 'b'];
}

@Component({
  imports: [
    ForStepper,
    ForStepperList,
    ForStepperItem,
    ForStepperTrigger,
    ForStepperIndicator,
    ForStepperSeparator,
    ForStepperContent,
    ForStepperNext,
    ForStepperPrevious,
    ForStepperProgress,
  ],
  template: `
    <div forStepper [selectedIndex]="0">
      <div forStepperProgress ariaLabel="Checkout progress"></div>
      <ol forStepperList ariaLabel="Checkout">
        <li forStepperItem>
          <button forStepperTrigger><span forStepperIndicator></span>One</button>
          <span forStepperSeparator></span>
        </li>
        <li forStepperItem [completed]="true">
          <button forStepperTrigger><span forStepperIndicator></span>Two</button>
        </li>
      </ol>
      <section forStepperContent>One body</section>
      <section forStepperContent>Two body</section>
      <button forStepperPrevious>Back</button>
      <button forStepperNext>Next</button>
    </div>
  `,
})
export class StepperFixture {}

@Component({
  imports: [
    ForStepper,
    ForStepperList,
    ForStepperItem,
    ForStepperTrigger,
    ForStepperContent,
    ForStepperCompletedContent,
  ],
  template: `
    <div forStepper [selectedIndex]="2">
      <ol forStepperList ariaLabel="Checkout">
        <li forStepperItem><button forStepperTrigger>One</button></li>
        <li forStepperItem><button forStepperTrigger>Two</button></li>
      </ol>
      <section forStepperContent>One body</section>
      <section forStepperContent>Two body</section>
      <section forStepperCompletedContent>All steps complete</section>
    </div>
  `,
})
export class StepperCompletedFixture {}

@Component({
  imports: [
    ForStepper,
    ForStepperList,
    ForStepperItem,
    ForStepperTrigger,
    ForStepperContent,
    ForStepperCompletedContent,
    ForStepperProgress,
    ForStepperNext,
  ],
  template: `
    <div forStepper [selectedIndex]="0">
      <div forStepperProgress ariaLabel="Checkout progress"></div>
      <ol forStepperList ariaLabel="Checkout">
        <li forStepperItem>
          <button forStepperTrigger>One</button>
        </li>
        <li forStepperItem>
          <button forStepperTrigger>Two</button>
        </li>
      </ol>
      <section forStepperContent>One body</section>
      <section forStepperContent>Two body</section>
      <section forStepperCompletedContent>All steps complete</section>
      <button forStepperNext>Next</button>
    </div>
  `,
})
export class StepperServerFixture {}
