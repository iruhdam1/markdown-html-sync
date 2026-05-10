---
name: markdown-html-sync
description: Add markdown-driven copy syncing to static HTML pages. Use when a user wants Markdown to be the editable source for page copy while preserving static HTML as the shipped artifact, especially for plain HTML/CSS/JS sites without a build system.
---

# Markdown HTML Sync

Use this skill to add a one-way Markdown -> HTML copy workflow to an existing static page.

## Workflow

1. Inspect the target HTML page and identify copy-only regions that should become editable from Markdown.
2. Copy `scripts/sync-markdown-content.mjs` from `https://github.com/iruhdam1/markdown-html-sync` into the target repo.
3. Create one Markdown source file for the page, usually under `content/pages/`.
4. Add `data-md-*` attributes only to HTML elements whose content or attributes should sync:
   - `data-md-text="path"` for text content.
   - `data-md-html="path"` for simple Markdown-rendered body content.
   - `data-md-list="path"` for list items.
   - `data-md-attr-href="path"` or another `data-md-attr-*` for attributes.
5. Run the sync command:
   ```sh
   node scripts/sync-markdown-content.mjs content/pages/page.md path/to/page.html
   ```
6. Verify the diff updates only intended copy/link regions and preserves layout, classes, image order, ARIA attributes, and JavaScript hooks.

## Markdown Shape

Use frontmatter for page metadata, `##` headings for sections, `###` headings for child blocks, and `Field Label: value` lines for structured values.

Keep source paths stable once HTML references them. If a heading slug changes, update the matching `data-md-*` path or the sync script will fail before writing.

## Safety Rules

- Keep the sync one-way: Markdown source updates HTML output.
- Do not introduce a bundler, package install, CMS, or runtime Markdown renderer unless the user asks.
- Let the script fail loudly when required source paths are missing.
- Do not sync layout, visual styling, images, or behavior from Markdown.
- Run `node --check scripts/sync-markdown-content.mjs` after changes.
