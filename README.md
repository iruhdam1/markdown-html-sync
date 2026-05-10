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
node scripts/sync-markdown-content.mjs content/pages/work.md examples/work.html
```

Then open `examples/work.html` in a browser. The file name is intentionally plain so you can rename it for your own page.

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

## Copying Into Another Static Site

1. Copy `scripts/sync-markdown-content.mjs`.
2. Add one Markdown source file for the page.
3. Add `data-md-*` attributes to the HTML regions that copy may update.
4. Run the script whenever the Markdown changes.
5. Commit both the Markdown source and rendered HTML.

No npm dependencies are required.
