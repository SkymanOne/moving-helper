import { useLoaderData } from "react-router";
import { renderMarkdown } from "~/lib/markdown.server";
import { MarkdownPage } from "~/components/MarkdownPage";
import content from "~/content/terms.md?raw";

export function meta() {
  return [{ title: "Terms & Conditions - Moving Buddy" }];
}

export async function loader() {
  const html = await renderMarkdown(content);
  return { html };
}

export default function Terms() {
  const { html } = useLoaderData<typeof loader>();
  return <MarkdownPage title="Terms & Conditions" html={html} />;
}
