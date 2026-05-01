# Disclosure

Headless implementation of the [WAI-ARIA Disclosure pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/).
A button toggles the visibility of a content region, wired with `aria-expanded` and `aria-controls`.

## Pieces

| Class | Selector | Role |
| --- | --- | --- |
| `ForDisclosure` | `[forDisclosure]` | Root. Holds `open` / `disabled` state and provides the shared context. |
| `ForDisclosureTrigger` | `[forDisclosureTrigger]` | Button that toggles the state. |
| `ForDisclosureContent` | `[forDisclosureContent]` | Panel revealed when open. |

## Inputs / outputs

### `ForDisclosure`

| API | Type | Description |
| --- | --- | --- |
| `open` | `model<boolean>` | Two-way bindable. Defaults to `false`. |
| `disabled` | `input<boolean>` | When true, click on the trigger is ignored. Reflects `data-disabled` on the host. |

The host element gets `data-state="open" \| "closed"` for CSS hooks.

### `ForDisclosureTrigger`

Reflects on its host: `id`, `aria-expanded`, `aria-controls`, `disabled`, `data-state`. Toggles the state on click.

Use a native `<button type="button">` so Enter / Space activation come for free. Other elements lose keyboard accessibility — that is on you.

### `ForDisclosureContent`

Reflects on its host: `id`, `data-state`, `hidden` (set when closed).

If the panel is a semantic region, add `role="region"` and `aria-labelledby="..."` pointing to the trigger.

## Example

```ts
import { Component, signal } from '@angular/core';
import {
  ForDisclosure,
  ForDisclosureTrigger,
  ForDisclosureContent,
} from 'forty-cdk';

@Component({
  selector: 'demo-faq',
  imports: [ForDisclosure, ForDisclosureTrigger, ForDisclosureContent],
  template: `
    <div forDisclosure [(open)]="isOpen">
      <button type="button" forDisclosureTrigger>
        {{ isOpen() ? 'Hide' : 'Show' }} details
      </button>
      <div forDisclosureContent>
        <p>Hidden content goes here.</p>
      </div>
    </div>
  `,
})
export class DemoFaq {
  readonly isOpen = signal(false);
}
```

The library ships no styles. Hide animations / transitions can be driven off `data-state` on the trigger and content:

```css
[forDisclosureContent][data-state='closed'] { /* … */ }
[forDisclosureContent][data-state='open']   { /* … */ }
```

## Accessibility notes

- The library does not auto-add `role="button"` or keyboard handlers when the trigger is not a `<button>`. Always use a real button.
- When closed, the content has the native `hidden` attribute, so it is removed from the accessibility tree and tab order.
- Disabled state sets the native `disabled` attribute on the trigger (effective on `<button>` elements). Click is also ignored at the directive level as a defensive measure.
