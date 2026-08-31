---
title: Visually Hidden
group: none
archetype: [composable-ui]
---

# VisuallyHidden

Hides its host visually while keeping it in the accessibility tree.

Screen readers reach the content; sighted users never see it. Reach for it when a control's only visible affordance is an icon, when a table needs a caption that the design has no room for, or when a live region must exist in the DOM without occupying layout.

The last case is common enough that this entry point also ships it as a service: `LiveAnnouncer` owns the two off-screen `aria-live` regions the library's own primitives announce through, and it is injectable from your components for the events no primitive covers — an upload that finishes, a filtered result count, a chat message arriving.

## Why this exists

`display: none` and `visibility: hidden` also drop the element from the accessibility tree, so neither works for content meant for assistive tech. The correct technique is a clip rectangle, which is easy to get subtly wrong (a `width: 0` variant collapses text nodes; `text-indent: -9999px` breaks in RTL). `[forVisuallyHidden]` applies the well-tested declaration inline, so it works with no global stylesheet and no CSS import:

- **No stylesheet.** The clip is an inline style on the host, so it survives CSS-module scoping, shadow boundaries, and consumers with no global sheet.
- **Optional reveal on focus.** With `focusable`, the host un-clips while it (or a descendant) holds focus and re-clips on blur — the skip-link pattern.
- **SSR-safe.** The style is bound declaratively, so the server render matches and hydration is clean.

## Anatomy

```html
<span forVisuallyHidden>Delete invoice #4021</span>

<a forVisuallyHidden focusable href="#main">Skip to content</a>
```

## Examples

```ts
import { Component } from '@angular/core';
import { ForVisuallyHidden } from 'forty-cdk/visually-hidden';

@Component({
  selector: 'demo-visually-hidden',
  imports: [ForVisuallyHidden],
  template: `
    <a forVisuallyHidden focusable href="#main" class="skip-link">Skip to content</a>

    <button type="button">
      <svg aria-hidden="true" viewBox="0 0 16 16">…</svg>
      <span forVisuallyHidden>Delete invoice</span>
    </button>

    <p forVisuallyHidden>Sorted by due date, ascending.</p>
  `,
  styles: [
    `
      .skip-link:focus {
        position: static;
        padding: 0.5rem 1rem;
        background: canvas;
      }
    `,
  ],
})
export class DemoVisuallyHidden {}
```

Naming an icon-only button through a hidden `<span>` (rather than `aria-label`) keeps the name translatable by the same pipeline as the rest of your copy, and visible to text-only browsers.

Announcing an event that has no visible text of its own goes through `LiveAnnouncer` instead — there is no element to hide, so there is nothing for `[forVisuallyHidden]` to mark:

```ts
import { Component, inject } from '@angular/core';
import { LiveAnnouncer } from 'forty-cdk/visually-hidden';

@Component({
  selector: 'demo-announce',
  template: `
    <button type="button" (click)="saved()">Save draft</button>
    <button type="button" (click)="failed()">Save with no connection</button>
  `,
})
export class DemoAnnounce {
  private readonly announcer = inject(LiveAnnouncer);

  protected saved(): void {
    this.announcer.announce('Draft saved');
  }

  protected failed(): void {
    this.announcer.announce('Could not save. Check your connection.', 'assertive');
  }
}
```

## API

### `ForVisuallyHidden`

| Property    | Type             | Description                                                                                                                                                           |
| ----------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `focusable` | `input<boolean>` | When `true`, the host un-clips while it or a descendant holds focus, then re-clips on blur — the skip-link pattern. Accepts a bare attribute.<br>**Default:** `false` |

| Data attribute        | Values  |
| --------------------- | ------- |
| `[forVisuallyHidden]` | present |

### `LiveAnnouncer`

An `@Injectable({ providedIn: 'root' })` service — inject it, no provider and no import needed.

| Method                          | Description                                                                                                                                                   |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `announce(message, politeness)` | Speaks `message` in the requested region. `politeness` is `'polite'` (default, waits for the reader to finish) or `'assertive'` (interrupts). Returns `void`. |
| `clear()`                       | Empties both regions and cancels a pending `announce()` so it never speaks. Use it when the event the message described is no longer true.                    |

Pick `'assertive'` only for something the user must act on now — an error that blocks them, a session about to expire. Everything else is `'polite'`; an assertive announcement cuts off whatever the screen reader was saying, including the user's own navigation.

## Styling

forty-cdk ships no styles. Add your own class to each piece — the `for*` selectors are the behavior API, not a styling contract (see [Styling forty-cdk](../../../docs/styling.md)). This primitive is the one exception to "no styles": it writes the clip rectangle as an inline style, because that is its entire purpose. With `focusable`, the inline style is dropped while focused, so your own `:focus` rules apply unopposed — style the revealed state through a class on the host.

## SSR

The directive binds its clip declaratively, so the server render matches the client's and hydration is clean. `LiveAnnouncer` creates no regions on the server and both of its methods are no-ops there — announce freely from code that also runs during a server render; nothing is queued and replayed on the client, because an announcement describes an event the user was present for.

## Behavior notes

- **Keep it in the flow.** The host stays in the DOM and in the accessibility tree, so it is announced in document order. Place it where you want it read, not at the end of the template.
- **Not a security boundary.** The content is in the DOM and readable by anyone inspecting the page. Never use it to hide sensitive data.
- **Focus tracking, not `:focus-within`.** `focusable` listens to `focusin` / `focusout` rather than relying on a CSS pseudo-class, because an inline style cannot express one. A `focusout` whose `relatedTarget` is still inside the host does not re-clip.
- **No role, no ARIA.** The element keeps whatever semantics you give it. Pair it with `aria-hidden="true"` on the decorative sibling (an icon, usually) so the name is not announced twice.
- **The announcer's regions exist before you announce.** Both are appended to `<body>` when the service is first injected, empty, because a live region has to be in the accessibility tree _before_ its text changes for the change to be read. This is the detail a hand-rolled announcer usually misses: build the region inside the first `announce()` and the first message of the session is silently dropped.
- **A repeat is announced again, and a superseding message wins.** Each write is deferred by a macrotask with the region emptied first, so the same string twice is read twice instead of being ignored as unchanged text. Two `announce()` calls to the same region in one turn coalesce and only the latest is spoken — which is what makes a message assembled across a change-detection pass read once, in full.
- **The two politeness levels are independent.** They are separate regions with separate pending writes, so a `polite` announcement never cancels an `assertive` one already in flight.
- **An open modal does not swallow announcements.** The regions carry the marker `[forDialog]` and `[forDrawer]` use to skip a node when they inert the rest of the page, so anything announced over an open modal is still read.
