import { redirect, useLoaderData, useRevalidator, Link, useNavigation, Form } from "react-router";
import { useEffect, useRef, useCallback } from "react";
import type { Route } from "./+types/_index";
import { listDatabases, getDatabaseSchema } from "~/lib/notion.server";
import {
  getAuth,
  setSelectedDb,
  clearSessionHeaders,
  lostSessionRedirect,
  type SelectedDb,
} from "~/lib/cookies.server";
import { cloudflareContext, cookiesContext } from "~/lib/context.server";
import {
  resolveAuth,
  setWorkspaceSelectedDb,
  selectedDbFor,
} from "~/lib/share.server";
import { DatabasePicker } from "~/components/DatabasePicker";

export function meta() {
  return [
    { title: "Moving Buddy" },
    {
      name: "description",
      content: "Track your moving boxes with barcode scanning",
    },
  ];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const cookies = context.get(cookiesContext);
  const { env } = context.get(cloudflareContext);
  const resolved = await resolveAuth(request, cookies, env.WORKSPACES, env);

  const url = new URL(request.url);
  const error = url.searchParams.get("error");

  if (!resolved) {
    // A stale cookie that no longer resolves (guest code revoked, or the
    // owner's workspace was disconnected/expired) is cleared; an anonymous
    // visitor just sees the connect screen.
    if (await getAuth(request, cookies)) {
      throw await lostSessionRedirect(request, cookies);
    }

    return {
      authenticated: false as const,
      isOwner: false,
      databases: [],
      hasSelection: false,
      selectedDataSourceId: null,
      workspaceName: null,
      error,
    };
  }

  let databases;
  try {
    databases = await listDatabases(resolved.accessToken);
  } catch {
    return redirect("/", { headers: await clearSessionHeaders(cookies) });
  }

  const selectedDb = await selectedDbFor(resolved, request, cookies);

  return {
    authenticated: true as const,
    isOwner: resolved.isOwner,
    databases,
    hasSelection: !!selectedDb,
    selectedDataSourceId: selectedDb?.dataSourceId ?? null,
    workspaceName: resolved.workspaceName || null,
    error: null,
  };
}

export async function action({ request, context }: Route.ActionArgs) {
  const cookies = context.get(cookiesContext);
  const { env } = context.get(cloudflareContext);
  const resolved = await resolveAuth(request, cookies, env.WORKSPACES, env);
  if (!resolved) throw redirect("/");

  const formData = await request.formData();
  const dataSourceId = formData.get("dataSourceId") as string;

  if (!dataSourceId) {
    throw new Response("Missing database selection", { status: 400 });
  }

  // Constrain the selection to a database the owner's integration can actually
  // reach, so neither an owner nor a guest can point the token at an arbitrary
  // data source. If the token was revoked between page load and submit, the
  // Notion calls throw — degrade like the loader (clear cookies, back to home).
  let schema;
  try {
    const databases = await listDatabases(resolved.accessToken);
    if (!databases.some((d) => d.dataSourceId === dataSourceId)) {
      throw new Response("Invalid database selection", { status: 400 });
    }
    schema = await getDatabaseSchema(resolved.accessToken, dataSourceId);
  } catch (e) {
    if (e instanceof Response) throw e; // preserve the 400
    return redirect("/", { headers: await clearSessionHeaders(cookies) });
  }

  const selected: SelectedDb = {
    dataSourceId,
    statusPropertyName: schema.statusPropertyName,
    statusPropertyType: schema.statusPropertyType,
    idPropertyName: schema.idPropertyName,
    idPropertyType: schema.idPropertyType,
    uniqueIdPrefix: schema.uniqueIdPrefix,
  };

  // Owner: persist to the shared workspace record. Guest: keep it to their own
  // device cookie so they don't change the selection for everyone else.
  if (resolved.isOwner) {
    await setWorkspaceSelectedDb(
      env.WORKSPACES,
      resolved.ownerId,
      selected,
      env.SESSION_SECRET
    );
    return redirect("/scan");
  }

  return redirect("/scan", {
    headers: { "Set-Cookie": await setSelectedDb(selected, cookies) },
  });
}

const ERROR_MESSAGES: Record<string, string> = {
  access_denied: "You declined the Notion connection request.",
  temporarily_unavailable: "Notion is temporarily unavailable. Please try again.",
  missing_code: "Something went wrong during login. Please try again.",
  invalid_state: "Login session expired. Please try again.",
  oauth_error: "Something went wrong connecting to Notion. Please try again.",
  revoked: "Your access has been revoked.",
};

export default function SetupPage() {
  const {
    authenticated,
    isOwner,
    databases,
    hasSelection,
    selectedDataSourceId,
    workspaceName,
    error,
  } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const { revalidate } = useRevalidator();

  const POLL_INTERVAL = 3000;
  const MAX_RETRIES = 10;

  const pollingStartedAt = useRef<number | null>(null);
  const retryCount = useRef(0);

  useEffect(() => {
    if (authenticated && databases.length === 0) {
      if (pollingStartedAt.current === null) {
        pollingStartedAt.current = Date.now();
        retryCount.current = 0;
      }
      if (retryCount.current >= MAX_RETRIES) return;
      const timer = setTimeout(() => {
        retryCount.current += 1;
        revalidate();
      }, POLL_INTERVAL);
      return () => clearTimeout(timer);
    }
    if (databases.length > 0 || !authenticated) {
      pollingStartedAt.current = null;
      retryCount.current = 0;
    }
  }, [authenticated, databases.length, revalidate]);

  const isPolling =
    authenticated &&
    databases.length === 0 &&
    pollingStartedAt.current !== null &&
    retryCount.current < MAX_RETRIES;

  const handleRetry = useCallback(() => {
    pollingStartedAt.current = Date.now();
    retryCount.current = 0;
    revalidate();
  }, [revalidate]);

  return (
    <div className="flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center text-center pt-10 pb-8">
        <h1 className="text-4xl font-bold text-heading tracking-tight">
          Moving Buddy
        </h1>
        <p className="mt-3 text-text-muted max-w-xs leading-relaxed">
          Scan custom barcode labels to track your moving progress
        </p>
      </div>

      <div className="pb-8">
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 text-red-700 rounded-xl text-center text-sm font-medium border border-red-200">
            {ERROR_MESSAGES[error] ?? "Something went wrong. Please try again."}
          </div>
        )}

        {!authenticated ? (
          <>
            <div className="mb-6 rounded-xl border border-base-border bg-base-dim p-4 text-sm text-text leading-relaxed space-y-3">
              <p className="font-semibold text-heading">How it works</p>
              <p>
                You'll need a Notion database with two properties:
              </p>
              <ol className="list-decimal pl-5 space-y-1">
                <li>
                  An <strong>ID</strong> property (Unique ID type) so the
                  scanner can look up items by their barcode or QR code
                </li>
                <li>
                  A <strong>Status</strong> property (Status type) so the
                  app knows what to update when you scan something
                </li>
              </ol>
              <p>
                Once that's ready, connect your workspace and pick the
                pages with the databases you want to use (or use the template).
              </p>
              <p className="text-text-muted text-xs">
                Looking for a way to print labels?{" "}
                <a
                  href="https://www.techradar.com/best/best-label-printers"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-heading"
                >
                  Here are some label printers
                </a>{" "}
                (not affiliated).
              </p>
            </div>
            <a
              href="/auth/login"
              className="block w-full text-center px-4 py-3 bg-accent text-white font-semibold rounded-xl hover:bg-accent-hover active:scale-[0.98] transition-all"
            >
              Connect to Notion
            </a>
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-base-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-base px-2 text-text-muted">or</span>
              </div>
            </div>
            <Link
              to="/join"
              className="block w-full text-center px-4 py-3 text-text font-semibold rounded-xl border-2 border-base-border hover:border-accent hover:text-accent active:scale-[0.98] transition-all"
            >
              Scan for someone else
            </Link>
          </>
        ) : (
          <>
            {workspaceName && (
              <p className="text-sm text-text-muted text-center mb-4">
                Connected to{" "}
                <span className="font-medium text-text">
                  {workspaceName}
                </span>
              </p>
            )}
            {hasSelection && (
              <Link
                to="/scan"
                className="block w-full text-center mb-4 px-4 py-3 bg-accent text-white font-semibold rounded-xl hover:bg-accent-hover active:scale-[0.98] transition-all"
              >
                Continue to Scanner
              </Link>
            )}
            {isOwner && (
              <Link
                to="/share"
                className="block w-full text-center mb-4 px-4 py-2 text-sm text-text-muted font-medium rounded-xl border border-base-border hover:border-accent hover:text-accent active:scale-[0.98] transition-all"
              >
                Manage Share Codes
              </Link>
            )}
            {isSubmitting || isPolling ? (
              <div className="text-center py-8">
                <div className="inline-block w-6 h-6 border-2 border-base-border border-t-accent rounded-full animate-spin" />
                <p className="mt-3 text-sm text-text-muted">
                  {isSubmitting ? "Connecting to database..." : "Looking for databases..."}
                </p>
              </div>
            ) : (
              <DatabasePicker
                databases={databases}
                selectedDataSourceId={selectedDataSourceId}
                onRetry={handleRetry}
              />
            )}
            <Form method="post" action="/auth/logout" reloadDocument className="mt-6 text-center">
              <button
                type="submit"
                className="text-sm text-text-muted hover:text-heading transition-colors"
              >
                Log Out
              </button>
            </Form>
          </>
        )}
      </div>
    </div>
  );
}
