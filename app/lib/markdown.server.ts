import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

export async function renderMarkdown(source: string): Promise<string> {
  const raw = await marked(source);
  return sanitizeHtml(raw, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      "h1",
      "h2",
      "h3",
      "img",
    ]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      a: ["href", "target", "rel"],
      img: ["src", "alt", "title"],
    },
  });
}
