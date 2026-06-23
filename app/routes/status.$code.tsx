import { redirect, useLoaderData, useFetcher, Link } from "react-router";
import { useState, useEffect } from "react";
import type { Route } from "./+types/status.$code";
import { getAuth, clearAuth, clearSelectedDb } from "~/lib/cookies.server";
import { cloudflareContext, cookiesContext } from "~/lib/context.server";
import {
  findEntryByCode,
  createEntry,
  updateStatus,
  getDatabaseSchema,
} from "~/lib/notion.server";
import { resolveSession } from "~/lib/share.server";
import { StatusGrid } from "~/components/StatusGrid";

export function meta({ params }: Route.MetaArgs) {
  return [{ title: `Moving Buddy - ${params.code}` }];
}

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const cookies = context.get(cookiesContext);
  const { env } = context.get(cloudflareContext);
  const session = await resolveSession(request, cookies, env.SHARE_CODES);
  if (!session) {
    const auth = await getAuth(request, cookies);
    const dest = auth?.shareCode ? "/?error=revoked" : "/";
    throw redirect(dest, {
      headers: [
        ["Set-Cookie", await clearAuth(cookies)],
        ["Set-Cookie", await clearSelectedDb(cookies)],
      ],
    });
  }

  const code = decodeURIComponent(params.code);

  let schema, entry;
  try {
    [schema, entry] = await Promise.all([
      getDatabaseSchema(session.accessToken, session.selectedDb.dataSourceId),
      findEntryByCode(
        session.accessToken,
        session.selectedDb.dataSourceId,
        session.selectedDb.idPropertyName,
        session.selectedDb.idPropertyType,
        session.selectedDb.uniqueIdPrefix,
        code
      ),
    ]);
  } catch {
    return redirect("/", {
      headers: [
        ["Set-Cookie", await clearAuth(cookies)],
        ["Set-Cookie", await clearSelectedDb(cookies)],
      ],
    });
  }

  let resolvedEntry;
  try {
    resolvedEntry =
      entry ??
      (await createEntry(
        session.accessToken,
        session.selectedDb.dataSourceId,
        session.selectedDb.idPropertyName,
        session.selectedDb.idPropertyType,
        code,
        schema.titlePropertyName ?? undefined
      ));
  } catch {
    return redirect("/", {
      headers: [
        ["Set-Cookie", await clearAuth(cookies)],
        ["Set-Cookie", await clearSelectedDb(cookies)],
      ],
    });
  }

  return {
    code,
    pageId: resolvedEntry.pageId,
    currentStatus: resolvedEntry.currentStatus,
    statusOptions: schema.options,
  };
}

export async function action({ request, params, context }: Route.ActionArgs) {
  const cookies = context.get(cookiesContext);
  const { env } = context.get(cloudflareContext);
  const session = await resolveSession(request, cookies, env.SHARE_CODES);
  if (!session) {
    const auth = await getAuth(request, cookies);
    const dest = auth?.shareCode ? "/?error=revoked" : "/";
    throw redirect(dest, {
      headers: [
        ["Set-Cookie", await clearAuth(cookies)],
        ["Set-Cookie", await clearSelectedDb(cookies)],
      ],
    });
  }

  const formData = await request.formData();
  const statusValue = formData.get("statusValue") as string;

  if (!statusValue) {
    throw new Response("Missing required fields", { status: 400 });
  }

  const code = decodeURIComponent(params.code);
  const entry = await findEntryByCode(
    session.accessToken,
    session.selectedDb.dataSourceId,
    session.selectedDb.idPropertyName,
    session.selectedDb.idPropertyType,
    session.selectedDb.uniqueIdPrefix,
    code
  );

  if (!entry) {
    throw new Response("Entry not found", { status: 404 });
  }

  await updateStatus(
    session.accessToken,
    entry.pageId,
    session.selectedDb.statusPropertyName,
    session.selectedDb.statusPropertyType,
    statusValue
  );

  return { success: true, updatedStatus: statusValue };
}

export default function StatusPage() {
  const { code, pageId, currentStatus, statusOptions } =
    useLoaderData<typeof loader>();

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
    fetcher.submit(formData, { method: "post" });
  }

  return (
    <div className="flex flex-col">
      <header className="mb-6">
        <Link to="/" prefetch="intent" className="text-xl font-bold text-heading hover:text-text transition-colors">
          Moving Buddy
        </Link>
      </header>

      <div className="bg-base rounded-xl border border-base-border p-4 mb-6 text-center">
        <p className="text-xs text-text-muted uppercase tracking-wider font-medium mb-1">
          Scanned Code
        </p>
        <p className="text-2xl font-bold text-heading font-mono break-all">
          {code}
        </p>
      </div>

      {showSuccess && (
        <div className="mb-4 px-4 py-2 bg-green-50 text-green-700 rounded-xl text-center text-sm font-medium border border-green-200">
          Status updated!
        </div>
      )}

      <div className="mb-6">
        <p className="text-sm text-text-muted font-medium mb-3">
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
          className="block w-full text-center px-4 py-3 bg-accent text-white font-semibold rounded-xl hover:bg-accent-hover active:scale-[0.98] transition-all"
        >
          Re-Scan
        </Link>
      </div>
    </div>
  );
}
