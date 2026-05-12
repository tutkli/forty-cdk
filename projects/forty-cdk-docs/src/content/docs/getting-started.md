---
title: Getting started
description: Install and use forty-cdk in a few minutes.
---

# Getting started

`forty-cdk` ships **headless, styleless** UI primitives for Angular 21+. Roles, ARIA, keyboard
interaction, and focus management are built in; styling is yours.

## Install

```bash
pnpm add forty-cdk @floating-ui/dom
```

`@floating-ui/dom` is an optional peer dependency, only required if you use positioned primitives
(Popover, Dropdown menu, Hover card, Tooltip, Context menu, Select).

## Your first primitive

```ts
import { Component, signal } from '@angular/core';
import { ForDisclosure, ForDisclosureTrigger, ForDisclosureContent } from 'forty-cdk';

@Component({
  selector: 'demo-faq',
  imports: [ForDisclosure, ForDisclosureTrigger, ForDisclosureContent],
  template: `
    <div forDisclosure [(open)]="isOpen">
      <button type="button" forDisclosureTrigger>
        {{ isOpen() ? 'Hide' : 'Show' }} details
      </button>
      @if (isOpen()) {
        <div forDisclosureContent>
          <p>Hidden content goes here.</p>
        </div>
      }
    </div>
  `,
})
export class DemoFaq {
  readonly isOpen = signal(false);
}
```

Style hooks: every piece reflects `data-state="open" | "closed"`, `data-disabled` (when truthy),
and ARIA attributes ready for your CSS selectors.

## Peer requirements

- Angular 21.2 or newer.
- TypeScript 5.9 or newer.
- Zoneless change detection (`provideZonelessChangeDetection()`).
- Optional: `@angular/forms` 21+ if you use form-value primitives with Signal Forms.

## Next steps

- Browse the [components](/components) — 29 primitives, one composable surface per WAI-ARIA pattern.
- Read the design philosophy to understand why these primitives ship without styles.
