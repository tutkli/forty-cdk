import { Component, inject, signal } from '@angular/core';
import {
  ForDialog,
  ForDialogBackdrop,
  ForDialogClose,
  ForDialogDescription,
  ForDialogInitialFocus,
  ForDialogManager,
  ForDialogTitle,
  ForDialogTrigger,
} from 'forty-cdk/dialog';
import {
  ForDrawer,
  ForDrawerBackdrop,
  ForDrawerClose,
  ForDrawerDescription,
  ForDrawerHandle,
  ForDrawerInitialFocus,
  ForDrawerManager,
  ForDrawerTitle,
  ForDrawerTrigger,
  ForDrawerWrapper,
} from 'forty-cdk/drawer';
import {
  ForHoverCard,
  ForHoverCardArrow,
  ForHoverCardContent,
  ForHoverCardTrigger,
} from 'forty-cdk/hover-card';
import {
  ForPopover,
  ForPopoverAnchor,
  ForPopoverArrow,
  ForPopoverClose,
  ForPopoverContent,
  ForPopoverDescription,
  ForPopoverInitialFocus,
  ForPopoverTitle,
  ForPopoverTrigger,
} from 'forty-cdk/popover';
import { ForToast, ForToastTitle, ForToastViewport } from 'forty-cdk/toast';
import {
  ForTooltip,
  ForTooltipArrow,
  ForTooltipContent,
  ForTooltipTrigger,
} from 'forty-cdk/tooltip';

@Component({
  imports: [ForTooltip, ForTooltipTrigger, ForTooltipContent],
  template: `
    <span forTooltip>
      <button forTooltipTrigger>t</button>
      <div forTooltipContent>tip</div>
    </span>
  `,
})
export class TooltipFixture {}

@Component({
  imports: [ForTooltip, ForTooltipTrigger, ForTooltipContent],
  template: `
    <span forTooltip [open]="true">
      <button forTooltipTrigger>t</button>
      <div forTooltipContent>tip</div>
    </span>
  `,
})
export class TooltipOpenFixture {}

@Component({
  imports: [ForPopover, ForPopoverTrigger, ForPopoverContent, ForPopoverTitle],
  template: `
    <div forPopover [open]="true">
      <button forPopoverTrigger>Open</button>
      <div forPopoverContent>
        <h2 forPopoverTitle>Settings</h2>
        content
      </div>
    </div>
  `,
})
export class PopoverOpenFixture {}

@Component({
  imports: [ForDialog, ForDialogTitle],
  template: `
    @if (open()) {
      <div forDialog ariaLabel="d">
        <h2 forDialogTitle>title</h2>
      </div>
    }
  `,
})
export class DialogFixture {
  readonly open = signal(false);
}

@Component({
  imports: [ForDialog, ForDialogTitle],
  template: `
    <div forDialog ariaLabel="d">
      <h2 forDialogTitle>title</h2>
    </div>
  `,
})
export class DialogOpenFixture {}

@Component({
  host: { 'data-fixture': 'dialog-contained-fixture' },
  imports: [ForDialog, ForDialogBackdrop, ForDialogTitle],
  template: `
    <div #box style="position: relative">
      <div forDialog [modal]="false" [container]="box" ariaLabel="d">
        <div forDialogBackdrop></div>
        <h2 forDialogTitle>title</h2>
      </div>
    </div>
  `,
})
export class DialogContainedFixture {}

@Component({
  host: { 'data-fixture': 'dialog-contained-modal-fixture' },
  imports: [ForDialog, ForDialogBackdrop, ForDialogTitle],
  template: `
    <section #box style="position: relative">
      <div forDialog [modal]="true" [container]="box" ariaLabel="d">
        <div forDialogBackdrop></div>
        <h2 forDialogTitle>title</h2>
      </div>
    </section>
  `,
})
export class DialogContainedModalFixture {}

@Component({
  imports: [ForDrawer, ForDrawerTitle],
  template: `
    <div forDrawer ariaLabel="d">
      <h2 forDrawerTitle>title</h2>
    </div>
  `,
})
export class DrawerOpenFixture {}

@Component({
  imports: [ForDrawerWrapper, ForDrawer, ForDrawerTitle],
  template: `
    <div forDrawerWrapper>
      <div forDrawer ariaLabel="d" [scaleBackground]="true">
        <h2 forDrawerTitle>title</h2>
      </div>
    </div>
  `,
})
export class DrawerWrapperOpenFixture {}

@Component({ template: 'content' })
class ManagedOverlayContent {}

@Component({ template: '' })
export class OverlayManagersOpenFixture {
  constructor() {
    inject(ForDialogManager).open(ManagedOverlayContent, { ariaLabel: 'd' });
    inject(ForDrawerManager).open(ManagedOverlayContent, { ariaLabel: 'd' });
  }
}

@Component({
  host: { 'data-fixture': 'drawer-contained-fixture' },
  imports: [ForDrawer, ForDrawerBackdrop, ForDrawerTitle],
  template: `
    <div #box style="position: relative">
      <div forDrawer [modal]="false" [container]="box" ariaLabel="d">
        <div forDrawerBackdrop></div>
        <h2 forDrawerTitle>title</h2>
      </div>
    </div>
  `,
})
export class DrawerContainedFixture {}

@Component({
  host: { 'data-fixture': 'drawer-contained-modal-fixture' },
  imports: [ForDrawer, ForDrawerBackdrop, ForDrawerTitle],
  template: `
    <section #box style="position: relative">
      <div forDrawer [modal]="true" [container]="box" ariaLabel="d">
        <div forDrawerBackdrop></div>
        <h2 forDrawerTitle>title</h2>
      </div>
    </section>
  `,
})
export class DrawerContainedModalFixture {}

@Component({
  imports: [ForHoverCard, ForHoverCardTrigger, ForHoverCardContent],
  template: `
    <span forHoverCard [open]="true">
      <a forHoverCardTrigger href="/users/ada">Ada</a>
      <div forHoverCardContent>Preview</div>
    </span>
  `,
})
export class HoverCardOpenFixture {}

@Component({
  imports: [ForToastViewport, ForToast, ForToastTitle],
  template: `
    <for-toast-viewport />
    <div forToast>
      <div forToastTitle>Saved</div>
    </div>
  `,
})
export class ToastFixture {}

@Component({
  imports: [ForTooltip, ForTooltipTrigger, ForTooltipContent, ForTooltipArrow],
  template: `
    <span forTooltip [open]="true">
      <button forTooltipTrigger>t</button>
      <div forTooltipContent>
        tip
        <div forTooltipArrow></div>
      </div>
    </span>
  `,
})
export class TooltipArrowOpenFixture {}

@Component({
  imports: [ForHoverCard, ForHoverCardTrigger, ForHoverCardContent, ForHoverCardArrow],
  template: `
    <span forHoverCard [open]="true">
      <a forHoverCardTrigger href="/users/ada">Ada</a>
      <div forHoverCardContent>
        Preview
        <div forHoverCardArrow></div>
      </div>
    </span>
  `,
})
export class HoverCardArrowOpenFixture {}

@Component({
  imports: [
    ForPopover,
    ForPopoverAnchor,
    ForPopoverTrigger,
    ForPopoverContent,
    ForPopoverTitle,
    ForPopoverDescription,
    ForPopoverInitialFocus,
    ForPopoverClose,
    ForPopoverArrow,
  ],
  template: `
    <div forPopover [open]="true">
      <div forPopoverAnchor>
        <button forPopoverTrigger>Open</button>
      </div>
      <div forPopoverContent>
        <h2 forPopoverTitle>Settings</h2>
        <p forPopoverDescription>Adjust the view.</p>
        <input forPopoverInitialFocus aria-label="Name" />
        <button forPopoverClose>Close</button>
        <div forPopoverArrow></div>
      </div>
    </div>
  `,
})
export class PopoverAnatomyOpenFixture {}

@Component({
  imports: [
    ForDialogTrigger,
    ForDialog,
    ForDialogTitle,
    ForDialogDescription,
    ForDialogInitialFocus,
    ForDialogClose,
  ],
  template: `
    <button forDialogTrigger [open]="true" controls="ssr-trigger-dialog">Delete account</button>
    <div forDialog id="ssr-trigger-dialog">
      <h2 forDialogTitle>Delete account?</h2>
      <p forDialogDescription>This action is permanent.</p>
      <input forDialogInitialFocus aria-label="Confirm" />
      <button forDialogClose>Cancel</button>
    </div>
  `,
})
export class DialogTriggerOpenFixture {}

@Component({
  imports: [
    ForDrawerTrigger,
    ForDrawer,
    ForDrawerHandle,
    ForDrawerTitle,
    ForDrawerDescription,
    ForDrawerInitialFocus,
    ForDrawerClose,
  ],
  template: `
    <button forDrawerTrigger [open]="true" controls="ssr-trigger-drawer">Filters</button>
    <div forDrawer id="ssr-trigger-drawer">
      <div forDrawerHandle></div>
      <h2 forDrawerTitle>Filters</h2>
      <p forDrawerDescription>Narrow the results.</p>
      <input forDrawerInitialFocus aria-label="Search" />
      <button forDrawerClose>Done</button>
    </div>
  `,
})
export class DrawerTriggerOpenFixture {}
