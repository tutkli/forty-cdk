import { isFenceLine } from '../lib/readme-slug.mjs';

/**
 * Republish one entry point's README inside another page's section
 * ([#1809](https://github.com/tutkli/forty-cdk/issues/1809)).
 *
 * `forty-cdk/table-virtualization` and `forty-cdk/virtual-reorder` are
 * extensions a reader meets from Table and from Drag & Drop, and the audit's D4
 * gave them their host's page rather than one of their own. Folding is what
 * keeps that from meaning "and a link off to GitHub": the host's page renders
 * the folded document's own content, and the README stays the single source
 * that npm and GitHub serve.
 *
 * The whole transformation is a depth shift and an anchor prefix. A folded
 * `## API` lands as an `h4` under the host's `h2`, and its anchor becomes
 * `table-virtualization-api` — which is also why a cross-document link written
 * as `../table-virtualization/README.md#api` still resolves: the resolver
 * prefixes the fragment the same way.
 */
const DEPTH_SHIFT = 2;
const MAX_DEPTH = 6;
const TITLE_DEPTH = 3;
const SECTION_DEPTH = 4;
const ATX_HEADING = /^(#{1,6})(\s)/;

/** The anchor a folded heading lands on: its own slug, under its document's. */
export function foldedSlug(slug, headingSlug) {
  return `${slug}-${headingSlug}`;
}

/**
 * Every heading in a block of markdown, pushed `by` levels deeper.
 *
 * Heading lines are the only ones rewritten, and fenced code is skipped so a
 * comment opening with `#` is left exactly as its author wrote it.
 */
export function demoteMarkdown(markdown, by) {
  let inFence = false;
  return markdown
    .split('\n')
    .map((line) => {
      if (isFenceLine(line)) {
        inFence = !inFence;
        return line;
      }
      if (inFence) {
        return line;
      }
      return line.replace(
        ATX_HEADING,
        (_, hashes, space) => `${'#'.repeat(hashes.length + by)}${space}`,
      );
    })
    .join('\n');
}

function deepestHeading(document) {
  const depths = [
    ...document.introHeadings.map((heading) => heading.depth),
    ...document.sections.flatMap((section) => section.headings.map((heading) => heading.depth)),
  ];
  return depths.length === 0 ? 2 : Math.max(2, ...depths);
}

function foldBlock(block, slug) {
  if (block.kind !== 'prose') {
    return block;
  }
  return {
    kind: 'prose',
    markdown: demoteMarkdown(block.markdown, DEPTH_SHIFT),
    headingSlugs: block.headingSlugs.map((headingSlug) => foldedSlug(slug, headingSlug)),
  };
}

function heading(depth, text, slug) {
  return {
    kind: 'prose',
    markdown: `${'#'.repeat(depth)} ${text}\n`,
    headingSlugs: [slug],
  };
}

/**
 * A folded document as a single anonymous section, ready to render.
 *
 * `renderDocument` reads a document's `path`, `intro` and `sections` and
 * nothing else, so the fold is expressed as a document whose one section holds
 * every block — rendered against the folded README's own path, which is what
 * keeps its relative links resolving from where they were written.
 *
 * @throws {Error} when the shift would push a heading past `h6`, which markdown
 * has no level for — the document would publish the extra hashes as text.
 */
export function foldableOf(document) {
  const { slug, meta } = document;
  const deepest = deepestHeading(document);
  if (deepest + DEPTH_SHIFT > MAX_DEPTH) {
    throw new Error(
      `[gen-doc-model] ${document.path} nests headings ${deepest} levels deep, and folding it into ` +
        `another page adds ${DEPTH_SHIFT} — markdown has no level past h${MAX_DEPTH}. Flatten the ` +
        'document, or give it a page of its own',
    );
  }

  const blocks = [heading(TITLE_DEPTH, meta.title, slug)];
  const headings = [{ depth: TITLE_DEPTH, text: meta.title, slug }];

  if (document.lede !== null) {
    blocks.push({ kind: 'prose', markdown: `${document.lede}\n`, headingSlugs: [] });
  }
  for (const block of document.intro) {
    blocks.push(foldBlock(block, slug));
  }
  for (const introHeading of document.introHeadings) {
    headings.push({
      depth: introHeading.depth + DEPTH_SHIFT,
      text: introHeading.text,
      slug: foldedSlug(slug, introHeading.slug),
    });
  }

  for (const section of document.sections) {
    const sectionSlug = foldedSlug(slug, section.slug);
    blocks.push(heading(SECTION_DEPTH, section.title, sectionSlug));
    headings.push({ depth: SECTION_DEPTH, text: section.title, slug: sectionSlug });
    for (const block of section.blocks) {
      blocks.push(foldBlock(block, slug));
    }
    for (const sectionHeading of section.headings) {
      headings.push({
        depth: sectionHeading.depth + DEPTH_SHIFT,
        text: sectionHeading.text,
        slug: foldedSlug(slug, sectionHeading.slug),
      });
    }
  }

  return {
    ...document,
    intro: [],
    introHeadings: [],
    sections: [{ title: meta.title, slug, ring: 'specific', headings, blocks }],
  };
}

/**
 * The host page with one folded document appended to the section it names.
 *
 * @throws {Error} when the host declares no section with that slug, which is
 * the failure a renamed heading would otherwise publish as a silent drop.
 */
export function withFold(page, section, folded) {
  const index = page.sections.findIndex((candidate) => candidate.slug === section);
  if (index === -1) {
    throw new Error(
      `[gen-doc-model] no "#${section}" section to fold into — the host page declares ` +
        `${page.sections.map((candidate) => `#${candidate.slug}`).join(', ')}`,
    );
  }
  const host = page.sections[index];
  const merged = {
    ...host,
    headings: [...host.headings, ...folded.headings],
    blocks: [...host.blocks, ...folded.blocks],
  };
  return {
    ...page,
    sections: [...page.sections.slice(0, index), merged, ...page.sections.slice(index + 1)],
  };
}
