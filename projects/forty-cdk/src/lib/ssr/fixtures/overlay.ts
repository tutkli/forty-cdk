import { Component, signal } from '@angular/core';
import { ForDialog, ForDialogBackdrop, ForDialogTitle } from 'forty-cdk/dialog';
import { ForDrawer, ForDrawerBackdrop, ForDrawerTitle } from 'forty-cdk/drawer';
import { ForHoverCard, ForHoverCardContent, ForHoverCardTrigger } from 'forty-cdk/hover-card';
import {
  ForPopover,
  ForPopoverContent,
  ForPopoverTitle,
  ForPopoverTrigger,
} from 'forty-cdk/popover';
import { ForToast, ForToastTitle, ForToastViewport } from 'forty-cdk/toast';
import { ForTooltip, ForTooltipContent, ForTooltipTrigger } from 'forty-cdk/tooltip';

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
  standalone: true,
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
  standalone: true,
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
    <for-toast-viewport>
      <div forToast>
        <div forToastTitle>Saved</div>
      </div>
    </for-toast-viewport>
  `,
})
export class ToastFixture {}
