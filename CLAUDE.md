# Project Notes

This repo is a vanilla static-site markdown sync starter.

- Keep the implementation dependency-free unless there is a clear reason to add a package.
- Markdown files are editing sources.
- HTML files are rendered static artifacts.
- The sync script should update only regions marked with `data-md-*` attributes.
- Preserve existing HTML classes, ARIA attributes, image/logo order, layout, and JavaScript hooks.
- If a required markdown path is missing, fail loudly and do not write a partial HTML update.

Primary example:

```sh
node scripts/sync-markdown-content.mjs content/pages/work.md examples/index.html
```
