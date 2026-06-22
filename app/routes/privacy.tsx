import { useLoaderData } from "react-router";
import { renderMarkdown } from "~/lib/markdown.server";
import { MarkdownPage } from "~/components/MarkdownPage";
import content from "~/content/privacy.md?raw";

export function meta() {
  return [{ title: "Privacy Policy - Moving Buddy" }];
}

export async function loader() {
  const html = await renderMarkdown(content);
  return { html };
}

export default function Privacy() {
  const { html } = useLoaderData<typeof loader>();
  return <MarkdownPage title="Privacy Policy" html={html} />;
}
