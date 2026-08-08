import { isDevMode } from '@angular/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { formatFortyMessage, fortyError, fortyWarn } from './errors';
import { orphanContextError, unresolvedRootError } from './orphan-context';

describe('forty error formatting', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('the header line', () => {
    it('carries the prefix, the code and the message, in that order', () => {
      const [header] = formatFortyMessage({
        code: 'FORCDK-DIALOG-001',
        message: 'ForDialogTitle must be used inside a [forDialog] element.',
      }).split('\n');

      expect(header).toBe(
        '[forty-cdk/dialog] FORCDK-DIALOG-001: ForDialogTitle must be used inside a [forDialog] element.',
      );
    });

    it('derives a multi-word scope from the code area', () => {
      const message = formatFortyMessage({ code: 'FORCDK-DATE-PICKER-002', message: 'Nope.' });

      expect(message).toContain('[forty-cdk/date-picker]');
    });

    it('prefers an explicit scope, so a shared core check reports under the primitive that ran it', () => {
      const message = formatFortyMessage({
        code: 'FORCDK-CORE-007',
        scope: 'accordion',
        message: 'Nope.',
      });

      expect(message).toContain('[forty-cdk/accordion] FORCDK-CORE-007:');
    });
  });

  describe('the cause and fix sections', () => {
    it('appends both when supplied', () => {
      const message = formatFortyMessage({
        code: 'FORCDK-SELECT-001',
        message: 'What happened.',
        cause: 'Why it happened.',
        fix: 'What to do.',
      });

      expect(message).toContain('\n\nCause: Why it happened.');
      expect(message).toContain('\n\nFix: What to do.');
    });

    it('omits each section when it would add nothing', () => {
      const message = formatFortyMessage({ code: 'FORCDK-SELECT-001', message: 'What happened.' });

      expect(message).not.toContain('Cause:');
      expect(message).not.toContain('Fix:');
    });

    it('keeps a fix without a cause', () => {
      const message = formatFortyMessage({
        code: 'FORCDK-SELECT-001',
        message: 'What happened.',
        fix: 'What to do.',
      });

      expect(message).not.toContain('Cause:');
      expect(message).toContain('Fix: What to do.');
    });
  });

  describe('fortyError', () => {
    it('returns an Error carrying the formatted message', () => {
      const error = fortyError({ code: 'FORCDK-TABS-001', message: 'Nope.', fix: 'Do this.' });

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe(
        formatFortyMessage({ code: 'FORCDK-TABS-001', message: 'Nope.', fix: 'Do this.' }),
      );
    });

    it('does not gate on dev mode — an orphan context fails in production too', () => {
      vi.stubGlobal('ngDevMode', false);
      expect(isDevMode()).toBe(false);

      expect(fortyError({ code: 'FORCDK-TABS-001', message: 'Nope.' }).message).toContain(
        'FORCDK-TABS-001',
      );
    });
  });

  describe('fortyWarn', () => {
    it('warns with the same layout an error would use', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      fortyWarn({ code: 'FORCDK-SLIDER-002', message: 'Nope.', fix: 'Do this.' });

      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0]![0]).toBe(
        formatFortyMessage({ code: 'FORCDK-SLIDER-002', message: 'Nope.', fix: 'Do this.' }),
      );
    });

    it('stays silent in a production build — the gate travels with the report', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.stubGlobal('ngDevMode', false);

      fortyWarn({ code: 'FORCDK-SLIDER-002', message: 'Nope.' });

      expect(warn).not.toHaveBeenCalled();
    });
  });

  describe('orphanContextError', () => {
    const error = orphanContextError({
      code: 'FORCDK-DIALOG-001',
      piece: 'ForDialogTitle',
      root: '[forDialog]',
      token: 'FOR_DIALOG_CONTEXT',
    });

    it('names the piece and the root it needs', () => {
      expect(error.message).toContain(
        'FORCDK-DIALOG-001: ForDialogTitle must be used inside a [forDialog] element.',
      );
    });

    it('names the token that resolved nothing', () => {
      expect(error.message).toContain('Cause: No FOR_DIALOG_CONTEXT provider is visible');
    });

    it('carries the ng-template caveat, which is the non-obvious half of both sections', () => {
      expect(error.message).toContain("template's declaration site");
      expect(error.message).toContain('Fix: Move ForDialogTitle inside a [forDialog] element');
      expect(error.message).toContain('ng-template');
    });
  });

  describe('unresolvedRootError', () => {
    const error = unresolvedRootError({
      code: 'FORCDK-POPOVER-002',
      trigger: '[forPopoverTrigger]',
      root: '[forPopover]',
      token: 'FOR_POPOVER_CONTEXT',
      exportAs: 'forPopover',
    });

    it('reports both channels as unresolved', () => {
      expect(error.message).toContain(
        'FORCDK-POPOVER-002: [forPopoverTrigger] could not resolve its [forPopover] root.',
      );
      expect(error.message).toContain(
        'No FOR_POPOVER_CONTEXT provider is visible and no explicit root was passed.',
      );
    });

    it('offers the template-reference remedy the orphan error cannot', () => {
      expect(error.message).toContain('[forPopoverTrigger]="root" with #root="forPopover"');
    });
  });
});
