import { redirect, useLoaderData, useFetcher, Link } from "react-router";
import { useState, useEffect } from "react";
import type { Route } from "./+types/status.$code";
import { getAuth, getSelectedDb } from "~/lib/cookies.server";
import {
  findEntryByCode,
  createEntry,
  updateStatus,
  getDatabaseSchema,
} from "~/lib/notion.server";
import { StatusGrid } from "~/components/StatusGrid";

export function meta({ params }: Route.MetaArgs) {
  return [{ title: `Moving Buddy - ${params.code}` }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const auth = await getAuth(request);
  if (!auth) throw redirect("/");
  const selected = await getSelectedDb(request);
  if (!selected) throw redirect("/");

  const code = decodeURIComponent(params.code);

  const schema = await getDatabaseSchema(
    auth.accessToken,
    selected.dataSourceId
  );

  let entry = await findEntryByCode(
    auth.accessToken,
    selected.dataSourceId,
    selected.idPropertyName,
    selected.idPropertyType,
    selected.uniqueIdPrefix,
    code
  );

  if (!entry) {
    entry = await createEntry(
      auth.accessToken,
      selected.dataSourceId,
      selected.idPropertyName,
      selected.idPropertyType,
      code
    );
  }

  return {
    code,
    pageId: entry.pageId,
    currentStatus: entry.currentStatus,
    statusOptions: schema.options,
    statusPropertyName: selected.statusPropertyName,
    statusPropertyType: selected.statusPropertyType,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const auth = await getAuth(request);
  if (!auth) throw redirect("/");

  const formData = await request.formData();
  const pageId = formData.get("pageId") as string;
  const statusValue = formData.get("statusValue") as string;
  const statusPropertyName = formData.get("statusPropertyName") as string;
  const statusPropertyType = formData.get("statusPropertyType") as
    | "status"
    | "select";

  if (!pageId || !statusValue || !statusPropertyName) {
    throw new Response("Missing required fields", { status: 400 });
  }

  await updateStatus(
    auth.accessToken,
    pageId,
    statusPropertyName,
    statusPropertyType,
    statusValue
  );

  return { success: true, updatedStatus: statusValue };
}

export default function StatusPage() {
  const {
    code,
    pageId,
    currentStatus,
    statusOptions,
    statusPropertyName,
    statusPropertyType,
  } = useLoaderData<typeof loader>();

  const fetcher = useFetcher<typeof action>();
  const isUpdating = fetcher.state !== "idle";

  const [activeStatus, setActiveStatus] = useState(currentStatus);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (fetcher.data?.success && fetcher.data.updatedStatus) {
      setActiveStatus(fetcher.data.updatedStatus);
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [fetcher.data]);

  function handleStatusSelect(statusValue: string) {
    const formData = new FormData();
    formData.set("pageId", pageId);
    formData.set("statusValue", statusValue);
    formData.set("statusPropertyName", statusPropertyName);
    formData.set("statusPropertyType", statusPropertyType);
    fetcher.submit(formData, { method: "post" });
  }

  return (
    <div className="flex-1 flex flex-col">
      <header className="mb-6">
        <h1 className="text-xl font-bold text-slate-800">Moving Buddy</h1>
      </header>

      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 text-center">
        <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-1">
          Scanned Code
        </p>
        <p className="text-2xl font-bold text-slate-800 font-mono break-all">
          {code}
        </p>
      </div>

      {showSuccess && (
        <div className="mb-4 px-4 py-2 bg-green-50 text-green-700 rounded-xl text-center text-sm font-medium border border-green-200">
          Status updated!
        </div>
      )}

      <div className="mb-6">
        <p className="text-sm text-slate-500 font-medium mb-3">
          Choose a status:
        </p>
        <StatusGrid
          options={statusOptions}
          currentStatus={activeStatus}
          onSelect={handleStatusSelect}
          loading={isUpdating}
        />
      </div>

      <div className="mt-auto pb-4">
        <Link
          to="/scan"
          className="block w-full text-center px-4 py-3 bg-slate-800 text-white font-semibold rounded-xl hover:bg-slate-700 active:scale-[0.98] transition-all"
        >
          Re-Scan
        </Link>
      </div>
    </div>
  );
}
