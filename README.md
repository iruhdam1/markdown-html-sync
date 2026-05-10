# Vanilla Markdown Sync

A tiny copy-paste pattern for editing static HTML page copy from Markdown without adding a build system.

The idea is intentionally boring:

- Markdown is the source of truth for copy.
- HTML remains the shipped static page.
- A plain Node script copies known Markdown regions into matching HTML islands.
- CSS classes, layout, images, buttons, ARIA attributes, and JavaScript hooks stay in HTML.

## Quick Start

Run the included landing-page example:

```sh
node scripts/sync-markdown-content.mjs content/pages/work.md examples/index.html
```

Then open `examples/index.html` in a browser.

## Folder Structure

```txt
.
├── content/
│   └── pages/
│       ├── work.md              # Editable Markdown source for the example page
│       └── hero-image.png       # Example page image asset
├── examples/
│   └── index.html               # Rendered static HTML page
├── scripts/
│   └── sync-markdown-content.mjs # Dependency-free one-way sync script
├── skills/
│   └── markdown-html-sync/       # Codex skill users can copy
├── .claude/
│   └── commands/
│       └── markdown-sync.md      # Claude Code slash command users can copy
├── README.md
└── CLAUDE.md
```

The important pairing is:

```txt
content/pages/work.md -> examples/index.html
```

Edit the Markdown, run the sync script, and commit both the Markdown source and the rendered HTML.

## Install Script Only

Copy just the sync script into an existing static site:

```sh
mkdir -p scripts
curl -fsSL https://raw.githubusercontent.com/iruhdam1/markdown-html-sync/main/scripts/sync-markdown-content.mjs -o scripts/sync-markdown-content.mjs
```

## HTML Contract

Add `data-md-*` attributes only to the small pieces of HTML that Markdown should control:

```html
<h1 data-md-text="meta.title">Old title</h1>
<div data-md-html="sections.intro">Old intro</div>
<ul data-md-list="sections.skills">...</ul>
<a data-md-text="sections.walkthrough-cta.fields.primary_label"
   data-md-attr-href="sections.walkthrough-cta.fields.primary_url"
   href="#">Old link</a>
```

Supported attributes:

- `data-md-text="path"` replaces the element's text content.
- `data-md-html="path"` replaces the element's inner HTML from Markdown.
- `data-md-list="path"` replaces a list's inner HTML with `<li>` items.
- `data-md-attr-href="path"` updates an attribute value while preserving the element.

The script fails before writing if any required path is missing.

## Dos And Don'ts

Do:

- Keep Markdown as the copy-editing source.
- Keep HTML as the shipped static artifact.
- Mark only editable copy/link regions with `data-md-*`.
- Keep paths stable after HTML references them, for example `sections.hero.fields.headline`.
- Run the sync script after Markdown edits.
- Review the diff before committing.

Don't:

- Do not use Markdown to control layout, CSS classes, image order, or JavaScript behavior.
- Do not add a build system, package install, CMS, or client-side Markdown renderer for the basic workflow.
- Do not hand-edit synced HTML copy and forget to update the Markdown source.
- Do not rename Markdown headings that are already referenced by `data-md-*` unless you update the matching HTML paths too.
- Do not ignore missing-section failures; they are there to prevent partial rewrites.

## Markdown Shape

Use frontmatter for page metadata, `##` headings for sections, and optional field lines for structured values:

```md
---
title: Work
status: editable-source
---

## Intro

This copy becomes `sections.intro`.

## Skills

- Product systems
- Lifecycle strategy

## Walkthrough CTA

Primary Label: DM on X
Primary URL: https://x.com/example
Secondary Label: LinkedIn
Secondary URL: https://linkedin.com/in/example
```

Paths are normalized to lowercase slugs, so `## Walkthrough CTA` becomes `sections.walkthrough-cta`.

## Editing Workflow

1. Edit `content/pages/work.md`.
2. Run:
   ```sh
   node scripts/sync-markdown-content.mjs content/pages/work.md examples/index.html
   ```
3. Open `examples/index.html` and check the page.
4. Review the diff. Expected changes should be limited to Markdown-controlled text, lists, and attributes.
5. Commit the Markdown and HTML together.

## Copying Into Another Static Site

1. Copy `scripts/sync-markdown-content.mjs`.
2. Add one Markdown source file for the page.
3. Add `data-md-*` attributes to the HTML regions that copy may update.
4. Run the script whenever the Markdown changes.
5. Commit both the Markdown source and rendered HTML.

No npm dependencies are required.

## Use With Codex

Copy `skills/markdown-html-sync/` into your Codex skills folder, then ask Codex to use the Markdown HTML Sync skill on a static page.

## Use With Claude Code

Copy `.claude/commands/markdown-sync.md` into another project. In Claude Code, run:

```sh
/markdown-sync content/pages/page.md path/to/page.html
```
