import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { ForDialog, ForDialogDescription, ForDialogTitle } from 'forty-cdk/dialog';
import { ForDrawer, ForDrawerDescription, ForDrawerTitle } from 'forty-cdk/drawer';
import {
  ForPopover,
  ForPopoverContent,
  ForPopoverDescription,
  ForPopoverTitle,
  ForPopoverTrigger,
} from 'forty-cdk/popover';
import { ForToast, ForToastDescription, ForToastTitle, ForToastViewport } from 'forty-cdk/toast';
import { ForTooltip, ForTooltipContent, ForTooltipTrigger } from 'forty-cdk/tooltip';

import type { StaticAdoptionAdopter } from './mount';

@Component({
  imports: [ForDialog, ForDialogTitle, ForDialogDescription],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@if (open()) {
    <div
      forDialog
      (dismiss)="open.set(false)"
      ariaLabel="Input name"
      aria-label="Probe confirm"
      aria-labelledby="probe-labelledby"
      aria-describedby="probe-describedby"
    >
      <h2 forDialogTitle id="probe-title">Confirm</h2>
      <p forDialogDescription id="probe-description">Sure?</p>
    </div>
  }`,
})
class DialogAdopted {
  readonly open = signal(true);
}

@Component({
  imports: [ForDialog, ForDialogTitle, ForDialogDescription],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@if (open()) {
    <div forDialog (dismiss)="open.set(false)" ariaLabel="Input name">
      <h2 forDialogTitle>Confirm</h2>
      <p forDialogDescription>Sure?</p>
    </div>
  }`,
})
class DialogBare {
  readonly open = signal(true);
}

@Component({
  imports: [ForDrawer, ForDrawerTitle, ForDrawerDescription],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@if (open()) {
    <div
      forDrawer
      (dismiss)="open.set(false)"
      ariaLabel="Input name"
      aria-label="Probe filters"
      aria-labelledby="probe-labelledby"
      aria-describedby="probe-describedby"
    >
      <h2 forDrawerTitle id="probe-title">Title</h2>
      <p forDrawerDescription id="probe-description">Description</p>
    </div>
  }`,
})
class DrawerAdopted {
  readonly open = signal(true);
}

@Component({
  imports: [ForDrawer, ForDrawerTitle, ForDrawerDescription],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@if (open()) {
    <div forDrawer (dismiss)="open.set(false)" ariaLabel="Input name">
      <h2 forDrawerTitle>Title</h2>
      <p forDrawerDescription>Description</p>
    </div>
  }`,
})
class DrawerBare {
  readonly open = signal(true);
}

@Component({
  imports: [
    ForPopover,
    ForPopoverTrigger,
    ForPopoverContent,
    ForPopoverTitle,
    ForPopoverDescription,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forPopover [(open)]="open">
    <button forPopoverTrigger id="probe-trigger">Toggle</button>
    @if (open()) {
      <div
        forPopoverContent
        id="probe-content"
        aria-label="Probe filters"
        aria-labelledby="probe-labelledby"
        aria-describedby="probe-describedby"
      >
        <h2 forPopoverTitle id="probe-title">Title</h2>
        <p forPopoverDescription id="probe-description">Description</p>
      </div>
    }
  </div>`,
})
class PopoverAdopted {
  readonly open = signal(true);
}

@Component({
  imports: [
    ForPopover,
    ForPopoverTrigger,
    ForPopoverContent,
    ForPopoverTitle,
    ForPopoverDescription,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forPopover [(open)]="open">
    <button forPopoverTrigger>Toggle</button>
    @if (open()) {
      <div forPopoverContent>
        <h2 forPopoverTitle>Title</h2>
        <p forPopoverDescription>Description</p>
      </div>
    }
  </div>`,
})
class PopoverBare {
  readonly open = signal(true);
}

@Component({
  imports: [ForTooltip, ForTooltipTrigger, ForTooltipContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forTooltip [(open)]="open" [openDelay]="0">
    <button forTooltipTrigger id="probe-trigger" aria-describedby="probe-describedby">Hover</button>
    @if (open()) {
      <div forTooltipContent id="probe-content">Hint</div>
    }
  </div>`,
})
class TooltipAdopted {
  readonly open = signal(true);
}

@Component({
  imports: [ForTooltip, ForTooltipTrigger, ForTooltipContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forTooltip [(open)]="open" [openDelay]="0">
    <button forTooltipTrigger>Hover</button>
    @if (open()) {
      <div forTooltipContent>Hint</div>
    }
  </div>`,
})
class TooltipBare {
  readonly open = signal(true);
}

@Component({
  imports: [ForToast, ForToastTitle, ForToastDescription, ForToastViewport],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forToastViewport aria-label="Probe notifications"></div>
    @if (open()) {
      <div
        forToast
        (dismiss)="open.set(false)"
        aria-labelledby="probe-labelledby"
        aria-describedby="probe-describedby"
      >
        <div forToastTitle id="probe-title">Saved</div>
        <div forToastDescription id="probe-description">Changes are live.</div>
      </div>
    }`,
})
class ToastAdopted {
  readonly open = signal(true);
}

@Component({
  imports: [ForToast, ForToastTitle, ForToastDescription, ForToastViewport],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div forToastViewport></div>
    @if (open()) {
      <div forToast (dismiss)="open.set(false)">
        <div forToastTitle>Saved</div>
        <div forToastDescription>Changes are live.</div>
      </div>
    }`,
})
class ToastBare {
  readonly open = signal(true);
}

/**
 * The overlay surfaces, and the only family where all four channels meet on one
 * host: a modal surface adopts its own `aria-label` over the `[ariaLabel]`
 * input, replaces its title-derived `aria-labelledby`, and **composes** its
 * `aria-describedby` in front of the registered description's id.
 */
export const OVERLAY_FAMILY_ADOPTERS: readonly StaticAdoptionAdopter[] = [
  {
    label: 'Dialog',
    adopted: DialogAdopted,
    bare: DialogBare,
    claims: [
      {
        key: '[forDialogTitle]',
        channel: 'id',
        source: 'core/src/collection/register-handle.ts',
        seam: 'resolveHostId',
        probe: 'probe-title',
        fallback: { generated: 'for-dialog-title' },
      },
      {
        key: '[forDialogDescription]',
        channel: 'id',
        source: 'core/src/collection/register-handle.ts',
        seam: 'resolveHostId',
        probe: 'probe-description',
        fallback: { generated: 'for-dialog-description' },
      },
      {
        key: '[forDialog]',
        channel: 'aria-label',
        source: 'core/src/modal-surface-base/modal-surface-base.ts',
        seam: 'hostAriaLabel',
        probe: 'Probe confirm',
        fallback: 'Input name',
      },
      {
        key: '[forDialog]',
        channel: 'aria-labelledby',
        source: 'core/src/modal-surface-base/modal-surface-base.ts',
        seam: 'hostLabelledBy',
        probe: 'probe-labelledby',
        fallback: { pairs: '[forDialogTitle]' },
      },
      {
        key: '[forDialog]',
        channel: 'aria-describedby',
        source: 'core/src/modal-surface-base/modal-surface-base.ts',
        seam: 'hostDescribedBy',
        probe: 'probe-describedby',
        fallback: { pairs: '[forDialogDescription]' },
      },
    ],
  },
  {
    label: 'Drawer',
    adopted: DrawerAdopted,
    bare: DrawerBare,
    claims: [
      {
        key: '[forDrawerTitle]',
        channel: 'id',
        source: 'core/src/collection/register-handle.ts',
        seam: 'resolveHostId',
        probe: 'probe-title',
        fallback: { generated: 'for-drawer-title' },
      },
      {
        key: '[forDrawerDescription]',
        channel: 'id',
        source: 'core/src/collection/register-handle.ts',
        seam: 'resolveHostId',
        probe: 'probe-description',
        fallback: { generated: 'for-drawer-description' },
      },
      {
        key: '[forDrawer]',
        channel: 'aria-label',
        source: 'core/src/modal-surface-base/modal-surface-base.ts',
        seam: 'hostAriaLabel',
        probe: 'Probe filters',
        fallback: 'Input name',
      },
      {
        key: '[forDrawer]',
        channel: 'aria-labelledby',
        source: 'core/src/modal-surface-base/modal-surface-base.ts',
        seam: 'hostLabelledBy',
        probe: 'probe-labelledby',
        fallback: { pairs: '[forDrawerTitle]' },
      },
      {
        key: '[forDrawer]',
        channel: 'aria-describedby',
        source: 'core/src/modal-surface-base/modal-surface-base.ts',
        seam: 'hostDescribedBy',
        probe: 'probe-describedby',
        fallback: { pairs: '[forDrawerDescription]' },
      },
    ],
  },
  {
    label: 'Popover',
    adopted: PopoverAdopted,
    bare: PopoverBare,
    claims: [
      {
        key: '[forPopoverTrigger]',
        channel: 'id',
        source: 'popover/src/popover.ts',
        seam: 'adoptHostId',
        probe: 'probe-trigger',
        fallback: { generated: 'for-popover-trigger' },
      },
      {
        key: '[forPopoverContent]',
        channel: 'id',
        source: 'popover/src/popover.ts',
        seam: 'adoptHostId',
        probe: 'probe-content',
        fallback: { generated: 'for-popover-content' },
      },
      {
        key: '[forPopoverTitle]',
        channel: 'id',
        source: 'core/src/collection/register-handle.ts',
        seam: 'resolveHostId',
        probe: 'probe-title',
        fallback: { generated: 'for-popover-title' },
      },
      {
        key: '[forPopoverDescription]',
        channel: 'id',
        source: 'core/src/collection/register-handle.ts',
        seam: 'resolveHostId',
        probe: 'probe-description',
        fallback: { generated: 'for-popover-description' },
      },
      {
        key: '[forPopoverContent]',
        channel: 'aria-label',
        source: 'popover/src/popover-content.ts',
        seam: 'hostAriaLabel',
        probe: 'Probe filters',
        fallback: null,
      },
      {
        key: '[forPopoverContent]',
        channel: 'aria-labelledby',
        source: 'popover/src/popover-content.ts',
        seam: 'hostLabelledBy',
        probe: 'probe-labelledby',
        fallback: { pairs: '[forPopoverTitle]' },
      },
      {
        key: '[forPopoverContent]',
        channel: 'aria-describedby',
        source: 'popover/src/popover-content.ts',
        seam: 'hostDescribedBy',
        probe: 'probe-describedby',
        fallback: { pairs: '[forPopoverDescription]' },
      },
    ],
  },
  {
    label: 'Tooltip',
    adopted: TooltipAdopted,
    bare: TooltipBare,
    claims: [
      {
        key: '[forTooltipTrigger]',
        channel: 'id',
        source: 'tooltip/src/tooltip.ts',
        seam: 'adoptHostId',
        probe: 'probe-trigger',
        fallback: { generated: 'for-tooltip-trigger' },
      },
      {
        key: '[forTooltipContent]',
        channel: 'id',
        source: 'tooltip/src/tooltip.ts',
        seam: 'adoptHostId',
        probe: 'probe-content',
        fallback: { generated: 'for-tooltip-content' },
      },
      {
        key: '[forTooltipTrigger]',
        channel: 'aria-describedby',
        source: 'tooltip/src/tooltip-trigger.ts',
        seam: 'hostDescribedBy',
        probe: 'probe-describedby',
        fallback: { pairs: '[forTooltipContent]' },
      },
    ],
  },
  {
    label: 'Toast',
    adopted: ToastAdopted,
    bare: ToastBare,
    claims: [
      {
        key: '[forToastTitle]',
        channel: 'id',
        source: 'toast/src/toast-title.ts',
        seam: 'resolveHostId',
        probe: 'probe-title',
        fallback: { generated: 'for-toast-title' },
      },
      {
        key: '[forToastDescription]',
        channel: 'id',
        source: 'toast/src/toast-description.ts',
        seam: 'resolveHostId',
        probe: 'probe-description',
        fallback: { generated: 'for-toast-description' },
      },
      {
        key: '[forToast]',
        channel: 'aria-labelledby',
        source: 'toast/src/toast.ts',
        seam: 'hostLabelledBy',
        probe: 'probe-labelledby',
        fallback: { pairs: '[forToastTitle]' },
      },
      {
        key: '[forToast]',
        channel: 'aria-describedby',
        source: 'toast/src/toast.ts',
        seam: 'hostDescribedBy',
        probe: 'probe-describedby',
        fallback: { pairs: '[forToastDescription]' },
      },
      {
        key: '[forToastViewport]',
        channel: 'aria-label',
        source: 'toast/src/toast-viewport.ts',
        seam: 'hostAriaLabel',
        probe: 'Probe notifications',
        fallback: 'Notifications',
      },
    ],
  },
];
