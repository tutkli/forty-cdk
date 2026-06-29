import { createHighlighterCoreSync, type HighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import angularTs from 'shiki/langs/angular-ts.mjs';
import bash from 'shiki/langs/bash.mjs';
import css from 'shiki/langs/css.mjs';
import html from 'shiki/langs/html.mjs';
import githubDark from 'shiki/themes/github-dark.mjs';
import githubLight from 'shiki/themes/github-light.mjs';

const LANG_ALIASES: Readonly<Record<string, string>> = {
  ts: 'angular-ts',
  typescript: 'angular-ts',
  'angular-ts': 'angular-ts',
  html: 'html',
  css: 'css',
  bash: 'bash',
  sh: 'bash',
  shell: 'bash',
};

function createHighlighter(): HighlighterCore | null {
  try {
    return createHighlighterCoreSync({
      themes: [githubLight, githubDark],
      langs: [angularTs, html, css, bash],
      engine: createJavaScriptRegexEngine({ forgiving: true }),
    });
  } catch {
    return null;
  }
}

const highlighter = createHighlighter();

export function highlightCodeBlock(code: string, lang: string | undefined): string | null {
  const resolved = LANG_ALIASES[(lang ?? '').trim().toLowerCase()];
  if (!highlighter || !resolved) {
    return null;
  }
  try {
    return highlighter.codeToHtml(code, {
      lang: resolved,
      themes: { light: 'github-light', dark: 'github-dark' },
      defaultColor: false,
    });
  } catch {
    return null;
  }
}
