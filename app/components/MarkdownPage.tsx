import { Link } from "react-router";

interface MarkdownPageProps {
  title: string;
  html: string;
}

export function MarkdownPage({ title, html }: MarkdownPageProps) {
  return (
    <div className="flex-1 py-8">
      <Link
        to="/"
        className="text-sm text-slate-500 hover:text-slate-700 mb-6 inline-block"
      >
        &larr; Back
      </Link>

      <h1 className="text-2xl font-bold text-slate-800 mb-6">{title}</h1>

      <div
        className="prose prose-slate prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
