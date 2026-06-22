import { redirect, useLoaderData, Link } from "react-router";
import type { Route } from "./+types/_index";
import { listDatabases } from "~/lib/notion.server";
import {
  getSelectedDb,
  setSelectedDb,
  type SelectedDb,
} from "~/lib/cookies.server";
import { DatabasePicker } from "~/components/DatabasePicker";

export function meta() {
  return [
    { title: "Moving Buddy" },
    { name: "description", content: "Track your moving boxes with barcode scanning" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const selected = await getSelectedDb(request);
  const databases = await listDatabases();
  return { databases, hasSelection: !!selected };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const dataSourceId = formData.get("dataSourceId") as string;

  if (!dataSourceId) {
    throw new Response("Missing database selection", { status: 400 });
  }

  const databases = await listDatabases();
  const db = databases.find((d) => d.dataSourceId === dataSourceId);

  if (!db) {
    throw new Response("Database not found", { status: 404 });
  }

  const selected: SelectedDb = {
    databaseId: db.id,
    dataSourceId: db.dataSourceId,
    statusPropertyName: db.statusPropertyName,
    statusPropertyType: db.statusPropertyType,
    idPropertyName: db.idPropertyName,
    idPropertyType: db.idPropertyType,
    uniqueIdPrefix: db.uniqueIdPrefix,
  };

  return redirect("/scan", {
    headers: { "Set-Cookie": await setSelectedDb(selected) },
  });
}

export default function SetupPage() {
  const { databases, hasSelection } = useLoaderData<typeof loader>();

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
        <h1 className="text-4xl font-bold text-slate-800 tracking-tight">
          Moving Buddy
        </h1>
        <p className="mt-3 text-slate-500 max-w-xs leading-relaxed">
          Scan custom barcode labels to track your moving progress
        </p>
      </div>

      <div className="pb-8">
        {hasSelection && (
          <Link
            to="/scan"
            className="block w-full text-center mb-4 px-4 py-3 bg-slate-800 text-white font-semibold rounded-xl hover:bg-slate-700 active:scale-[0.98] transition-all"
          >
            Continue to Scanner
          </Link>
        )}
        <DatabasePicker databases={databases} />
      </div>
    </div>
  );
}
