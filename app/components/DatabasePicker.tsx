import { Form } from "react-router";
import type { DatabaseInfo } from "~/lib/notion.server";

interface DatabasePickerProps {
  databases: Pick<DatabaseInfo, "dataSourceId" | "title">[];
  onRetry?: () => void;
}

export function DatabasePicker({ databases, onRetry }: DatabasePickerProps) {
  if (databases.length === 0) {
    return (
      <div className="text-center text-text-muted py-8">
        <p className="text-lg font-medium">No compatible databases found</p>
        <p className="mt-2 text-sm">
          Make sure your Notion database has a <strong>Status</strong> field and
          a <strong>ID</strong> field, and that you&apos;ve shared it with
          your integration.
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 px-4 py-2 text-sm font-medium text-accent border border-accent rounded-xl hover:bg-accent hover:text-white active:scale-[0.98] transition-all"
          >
            Check Again
          </button>
        )}
      </div>
    );
  }

  const colors = [
    "bg-amber-50 border-amber-200 hover:border-amber-400",
    "bg-cyan-50 border-cyan-200 hover:border-cyan-400",
    "bg-emerald-50 border-emerald-200 hover:border-emerald-400",
    "bg-rose-50 border-rose-200 hover:border-rose-400",
    "bg-violet-50 border-violet-200 hover:border-violet-400",
    "bg-orange-50 border-orange-200 hover:border-orange-400",
  ];

  return (
    <div className="space-y-3">
      <p className="text-sm text-text-muted font-medium">Choose a database:</p>
      {databases.map((db, i) => (
        <Form method="post" key={db.dataSourceId}>
          <input type="hidden" name="dataSourceId" value={db.dataSourceId} />
          <button
            type="submit"
            className={`w-full text-left px-4 py-3 rounded-xl border-2 hover:shadow-sm transition-all active:scale-[0.98] ${colors[i % colors.length]}`}
          >
            <span className="font-medium text-heading">{db.title}</span>
          </button>
        </Form>
      ))}
    </div>
  );
}
