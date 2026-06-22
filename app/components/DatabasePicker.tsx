import { Form } from "react-router";
import type { DatabaseInfo } from "~/lib/notion.server";

interface DatabasePickerProps {
  databases: Pick<DatabaseInfo, "dataSourceId" | "title">[];
}

export function DatabasePicker({ databases }: DatabasePickerProps) {
  if (databases.length === 0) {
    return (
      <div className="text-center text-slate-500 py-8">
        <p className="text-lg font-medium">No compatible databases found</p>
        <p className="mt-2 text-sm">
          Make sure your Notion database has a <strong>Status</strong> field and
          a <strong>title</strong> property, and that you&apos;ve shared it with
          your integration.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500 font-medium">Choose a database:</p>
      {databases.map((db) => (
        <Form method="post" key={db.dataSourceId}>
          <input type="hidden" name="dataSourceId" value={db.dataSourceId} />
          <button
            type="submit"
            className="w-full text-left px-4 py-3 bg-white rounded-xl border border-slate-200 hover:border-slate-400 hover:shadow-sm transition-all active:scale-[0.98]"
          >
            <span className="font-medium text-slate-800">{db.title}</span>
          </button>
        </Form>
      ))}
    </div>
  );
}
