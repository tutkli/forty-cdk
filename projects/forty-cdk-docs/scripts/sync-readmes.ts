/**
 * Mirrors `projects/forty-cdk/src/lib/<primitive>/README.md` to
 * `projects/forty-cdk-docs/src/content/components/<primitive>.md` so Analog's
 * content plugin picks them up via its default `src/content/**` glob.
 *
 * Why a copy rather than a symlink or a custom Vite resolver:
 *
 *   - **Symlinks** on Windows need admin privileges by default; we want the
 *     prebuild to run on every contributor's machine without sudo / UAC.
 *   - **Custom Vite resolver** would be cleaner but adds a new plugin to
 *     maintain. The copy is one-shot, deterministic, and reviewable in PRs.
 *
 * Drift in dev: the watcher only re-runs on `pnpm docs:prebuild`. Editing a
 * library README while `pnpm docs:dev` is running will not refresh the docs
 * page until the script is re-run. Acceptable tradeoff for v1; revisit when
 * drift becomes annoying.
 *
 * The copy injects a frontmatter block (title, slug, source) if the README
 * doesn't already declare one. The library READMEs are pure Markdown to keep
 * the npm / GitHub render unstyled, so the docs layer adds the metadata.
 */

import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const DOCS_ROOT = resolve(SCRIPT_DIR, '..');
const REPO_ROOT = resolve(DOCS_ROOT, '..', '..');
const LIB_ROOT = join(REPO_ROOT, 'projects', 'forty-cdk', 'src', 'lib');
// Subdirectory deliberately distinct from the route prefix (`components/`)
// so Analog's file-based router does not auto-generate a static route for
// each MD that would shadow our `pages/components/[slug].page.ts` dynamic
// route. The page reads these via `injectContent({ subdirectory })`.
const OUTPUT_DIR = join(DOCS_ROOT, 'src', 'content', 'component-readmes');

const SKIP_FOLDERS = new Set(['_internal', 'test-utils']);

function listPrimitiveFolders(): string[] {
  return readdirSync(LIB_ROOT)
    .filter((name) => !SKIP_FOLDERS.has(name))
    .filter((name) => {
      try {
        return statSync(join(LIB_ROOT, name)).isDirectory();
      } catch {
        return false;
      }
    })
    .sort();
}

function hasFrontmatter(content: string): boolean {
  return /^---\r?\n/.test(content);
}

function titleCase(slug: string): string {
  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function injectFrontmatter(slug: string, content: string): string {
  if (hasFrontmatter(content)) return content;
  const title = extractFirstHeading(content) ?? titleCase(slug);
  const frontmatter = [
    '---',
    `title: ${title}`,
    `slug: ${slug}`,
    `source: projects/forty-cdk/src/lib/${slug}/README.md`,
    '---',
    '',
  ].join('\n');
  return `${frontmatter}\n${content}`;
}

function extractFirstHeading(content: string): string | null {
  const match = content.match(/^#\s+(.+?)\s*$/m);
  return match ? (match[1] ?? null) : null;
}

/**
 * Marked (the Markdown parser used by `@analogjs/content`) does NOT escape
 * `<` / `>` inside inline code spans — given `` `<button>` `` it emits
 * `<code><button></code>`, which the browser then parses as a real `<button>`
 * element whose UA `text-align: center` cascades to every descendant. Same
 * trap for type literals like `` `model<boolean>` ``.
 *
 * The fix is to pre-escape `<` and `>` inside inline code spans before the
 * MD reaches marked. Fenced code blocks are left alone — Prism handles their
 * escaping. Multi-line backtick blocks (```…```) are excluded by splitting
 * the content on fences first.
 */
function escapeInlineCodeSpans(content: string): string {
  // Split into fenced and non-fenced segments. The capturing group keeps the
  // fence boundaries so we can reassemble the original ordering verbatim.
  const fenceSplit = content.split(/(^```[\s\S]*?^```\s*$)/gm);
  return fenceSplit
    .map((segment, idx) => {
      // Even indices = outside fences; odd indices = fenced block, leave it.
      if (idx % 2 === 1) return segment;
      // Match inline `code` spans. Backticks must be balanced and the body
      // must not contain a backtick (single-backtick form, which is what the
      // READMEs use). Inside the match, escape `<` and `>` to entities.
      return segment.replace(/`([^`\n]+)`/g, (_, body: string) => {
        const escaped = body.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return `\`${escaped}\``;
      });
    })
    .join('');
}

function main(): void {
  console.log('[forty-cdk-docs/sync-readmes] starting…');
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const folders = listPrimitiveFolders();
  let copied = 0;
  let missing = 0;
  for (const folder of folders) {
    const sourcePath = join(LIB_ROOT, folder, 'README.md');
    let content: string;
    try {
      content = readFileSync(sourcePath, 'utf8');
    } catch {
      missing++;
      console.warn(`  miss ${folder} (no README.md)`);
      continue;
    }
    const escaped = escapeInlineCodeSpans(content);
    const withFrontmatter = injectFrontmatter(folder, escaped);
    writeFileSync(join(OUTPUT_DIR, `${folder}.md`), withFrontmatter, 'utf8');
    copied++;
  }
  console.log(`[forty-cdk-docs/sync-readmes] done — copied ${copied}, missing ${missing}`);
}

main();
