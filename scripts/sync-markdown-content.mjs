#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const [, , sourceArg, targetArg] = process.argv;

if (!sourceArg || !targetArg) {
  console.error("Usage: node scripts/sync-markdown-content.mjs <source.md> <target.html>");
  process.exit(1);
}

const sourcePath = path.resolve(sourceArg);
const targetPath = path.resolve(targetArg);
const markdown = fs.readFileSync(sourcePath, "utf8");
const originalHtml = fs.readFileSync(targetPath, "utf8");
const model = parseMarkdown(markdown);

const checks = collectRequiredPaths(originalHtml);
const missing = checks.filter((item) => getPath(model, item.path) === undefined);

if (missing.length > 0) {
  console.error("Markdown sync failed. Missing required source paths:");
  for (const item of missing) {
    console.error(`- ${item.kind}: ${item.path}`);
  }
  process.exit(1);
}

let nextHtml = originalHtml;
nextHtml = replaceAttributes(nextHtml, model);
nextHtml = replaceElementContent(nextHtml, "data-md-text", model, (value) => escapeHtml(toText(value)));
nextHtml = replaceElementContent(nextHtml, "data-md-html", model, (value) => markdownToHtml(toMarkdown(value)));
nextHtml = replaceElementContent(nextHtml, "data-md-list", model, (value) => {
  const items = Array.isArray(value?.items) ? value.items : parseListItems(toMarkdown(value));
  return items.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("\n");
});

if (nextHtml !== originalHtml) {
  fs.writeFileSync(targetPath, nextHtml);
  console.log(`Synced ${path.relative(process.cwd(), sourcePath)} -> ${path.relative(process.cwd(), targetPath)}`);
} else {
  console.log("No changes needed.");
}

function parseMarkdown(input) {
  const { meta, body } = parseFrontmatter(input);
  const sections = {};
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  let currentSection = null;
  let currentChild = null;

  for (const line of lines) {
    const h2 = line.match(/^##\s+(.+?)\s*$/);
    const h3 = line.match(/^###\s+(.+?)\s*$/);

    if (h2) {
      currentSection = createBlock(h2[1]);
      sections[currentSection.slug] = currentSection;
      currentChild = null;
      continue;
    }

    if (h3 && currentSection) {
      currentChild = createBlock(h3[1]);
      currentSection.children[currentChild.slug] = currentChild;
      continue;
    }

    if (currentChild) {
      currentChild.lines.push(line);
    } else if (currentSection) {
      currentSection.lines.push(line);
    }
  }

  for (const section of Object.values(sections)) {
    finalizeBlock(section);
    for (const child of Object.values(section.children)) {
      finalizeBlock(child);
    }
  }

  return { meta, sections };
}

function parseFrontmatter(input) {
  if (!input.startsWith("---\n")) {
    return { meta: {}, body: input };
  }

  const end = input.indexOf("\n---", 4);
  if (end === -1) {
    throw new Error("Opening frontmatter marker found without closing marker.");
  }

  const rawMeta = input.slice(4, end).trim();
  const body = input.slice(end + 4).replace(/^\n/, "");
  const meta = {};

  for (const line of rawMeta.split("\n")) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (match) {
      meta[slug(match[1], "_")] = unquote(match[2].trim());
    }
  }

  return { meta, body };
}

function createBlock(title) {
  return {
    title: title.trim(),
    slug: slug(title),
    lines: [],
    raw: "",
    body: "",
    text: "",
    items: [],
    fields: {},
    children: {},
  };
}

function finalizeBlock(block) {
  const raw = trimBlankLines(block.lines).join("\n");
  const { fields, bodyLines } = extractFields(raw.split("\n"));
  block.raw = raw;
  block.fields = fields;
  block.body = trimBlankLines(bodyLines).join("\n");
  block.text = stripMarkdown(block.body || raw);
  block.items = parseListItems(block.body || raw);
  delete block.lines;
  delete block.slug;
}

function extractFields(lines) {
  const fields = {};
  const bodyLines = [];
  let inFields = true;

  for (const line of lines) {
    const match = line.match(/^([A-Za-z][A-Za-z0-9 _-]*):\s*(.+)$/);
    if (inFields && match) {
      fields[slug(match[1], "_")] = match[2].trim();
      continue;
    }

    if (line.trim() !== "") {
      inFields = false;
    }

    bodyLines.push(line);
  }

  return { fields, bodyLines };
}

function collectRequiredPaths(html) {
  const required = [];
  const contentPattern = /\s(data-md-(?:text|html|list))="([^"]+)"/g;
  const attrPattern = /\s(data-md-attr-[A-Za-z0-9_-]+)="([^"]+)"/g;
  let match;

  while ((match = contentPattern.exec(html))) {
    required.push({ kind: match[1], path: match[2] });
  }

  while ((match = attrPattern.exec(html))) {
    required.push({ kind: match[1], path: match[2] });
  }

  return required;
}

function replaceAttributes(html, data) {
  return html.replace(/<([A-Za-z][A-Za-z0-9:-]*)([^<>]*\sdata-md-attr-[^<>]*)>/g, (full, tag, attrs) => {
    let nextAttrs = attrs;
    const attrPattern = /\sdata-md-attr-([A-Za-z0-9_-]+)="([^"]+)"/g;
    const updates = [...attrs.matchAll(attrPattern)];

    for (const [, attrName, sourcePathForAttr] of updates) {
      const value = escapeAttribute(toText(getPath(data, sourcePathForAttr)));
      const existing = new RegExp(`\\s${escapeRegExp(attrName)}="[^"]*"`);
      if (existing.test(nextAttrs)) {
        nextAttrs = nextAttrs.replace(existing, ` ${attrName}="${value}"`);
      } else {
        nextAttrs += ` ${attrName}="${value}"`;
      }
    }

    return `<${tag}${nextAttrs}>`;
  });
}

function replaceElementContent(html, attrName, data, render) {
  const pattern = new RegExp(`(<([A-Za-z][A-Za-z0-9:-]*)(?=[^>]*\\s${attrName}="([^"]+)")[^>]*>)([\\s\\S]*?)(<\\/\\2>)`, "g");

  return html.replace(pattern, (full, open, tag, sourcePathForContent, inner, close) => {
    const value = getPath(data, sourcePathForContent);
    return `${open}${render(value, inner, tag)}${close}`;
  });
}

function getPath(input, sourcePathForContent) {
  return sourcePathForContent.split(".").reduce((value, key) => {
    if (value === undefined || value === null) {
      return undefined;
    }
    return value[key];
  }, input);
}

function toMarkdown(value) {
  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object") {
    return value.body ?? value.raw ?? value.text ?? "";
  }

  return "";
}

function toText(value) {
  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object") {
    return value.text ?? value.body ?? value.raw ?? "";
  }

  return "";
}

function markdownToHtml(input) {
  const lines = trimBlankLines(input.replace(/\r\n/g, "\n").split("\n"));
  const chunks = [];
  let paragraph = [];
  let list = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      chunks.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
      paragraph = [];
    }
  };

  const flushList = () => {
    if (list.length) {
      chunks.push(`<ul>\n${list.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("\n")}\n</ul>`);
      list = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const heading = trimmed.match(/^(#{4,6})\s+(.+)$/);
    const item = trimmed.match(/^[-*]\s+(.+)$/);

    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      chunks.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }

    if (item) {
      flushParagraph();
      list.push(item[1]);
      continue;
    }

    flushList();
    paragraph.push(trimmed);
  }

  flushParagraph();
  flushList();
  return chunks.join("\n");
}

function parseListItems(input) {
  return input
    .split("\n")
    .map((line) => line.match(/^\s*[-*]\s+(.+)\s*$/))
    .filter(Boolean)
    .map((match) => match[1].trim());
}

function inlineMarkdown(input) {
  return escapeHtml(input)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => `<a href="${escapeAttribute(url)}">${label}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function stripMarkdown(input) {
  return input
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`]/g, "")
    .trim();
}

function trimBlankLines(lines) {
  const next = [...lines];
  while (next.length && next[0].trim() === "") next.shift();
  while (next.length && next[next.length - 1].trim() === "") next.pop();
  return next;
}

function slug(value, separator = "-") {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, separator)
    .replace(new RegExp(`${escapeRegExp(separator)}+`, "g"), separator)
    .replace(new RegExp(`^${escapeRegExp(separator)}|${escapeRegExp(separator)}$`, "g"), "");
}

function unquote(value) {
  return value.replace(/^["']|["']$/g, "");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
