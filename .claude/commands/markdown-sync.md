---
description: Add markdown-driven copy sync to a static HTML page
argument-hint: [markdown-source] [html-page]
---

Add Markdown HTML Sync to this project.

Use `$1` as the markdown source path when provided, otherwise choose a sensible path under `content/pages/`.
Use `$2` as the target HTML page when provided, otherwise inspect the repo and choose the static page the user is asking about.

Workflow:

1. Inspect the target HTML page and identify copy-only regions.
2. Copy or create `scripts/sync-markdown-content.mjs` using the pattern from `https://github.com/iruhdam1/markdown-html-sync`.
3. Create the markdown source with frontmatter, `##` sections, optional `###` child blocks, and `Field Label: value` lines.
4. Add `data-md-*` attributes only to copy/link regions:
   - `data-md-text`
   - `data-md-html`
   - `data-md-list`
   - `data-md-attr-*`
5. Run:
   ```sh
   node scripts/sync-markdown-content.mjs <markdown-source> <html-page>
   node --check scripts/sync-markdown-content.mjs
   ```
6. Review the diff and make sure only intended content changed. Preserve layout, CSS classes, images, ARIA attributes, and JavaScript hooks.
