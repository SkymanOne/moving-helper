import { redirect, useLoaderData, Link, useNavigation, Form } from "react-router";
import type { Route } from "./+types/_index";
import { listDatabases, getDatabaseSchema } from "~/lib/notion.server";
import {
  getAuth,
  getSelectedDb,
  setSelectedDb,
  clearAuth,
  clearSelectedDb,
  type SelectedDb,
} from "~/lib/cookies.server";

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

export async function loader({ request }: Route.LoaderArgs) {
  const auth = await getAuth(request);
  const selected = await getSelectedDb(request);

  if (!auth) {
    return {
      authenticated: false as const,
      databases: [],
      hasSelection: false,
      workspaceName: null,
    };
  }

  let databases;
  try {
    databases = await listDatabases(auth.accessToken);
  } catch {
    return redirect("/", {
      headers: [
        ["Set-Cookie", await clearAuth()],
        ["Set-Cookie", await clearSelectedDb()],
      ],
    });
  }

  return {
    authenticated: true as const,
    databases,
    hasSelection: !!selected,
    workspaceName: auth.workspaceName,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const auth = await getAuth(request);
  if (!auth) throw redirect("/");

  const formData = await request.formData();
  const dataSourceId = formData.get("dataSourceId") as string;

  if (!dataSourceId) {
    throw new Response("Missing database selection", { status: 400 });
  }

  const schema = await getDatabaseSchema(auth.accessToken, dataSourceId);

  const selected: SelectedDb = {
    databaseId: dataSourceId,
    dataSourceId,
    statusPropertyName: schema.statusPropertyName,
    statusPropertyType: schema.statusPropertyType,
    idPropertyName: schema.idPropertyName,
    idPropertyType: schema.idPropertyType,
    uniqueIdPrefix: schema.uniqueIdPrefix,
  };

  return redirect("/scan", {
    headers: { "Set-Cookie": await setSelectedDb(selected) },
  });
}

export default function SetupPage() {
  const { authenticated, databases, hasSelection, workspaceName } =
    useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
        <h1 className="text-4xl font-bold text-heading tracking-tight">
          Moving Buddy
        </h1>
        <p className="mt-3 text-text-muted max-w-xs leading-relaxed">
          Scan custom barcode labels to track your moving progress
        </p>
      </div>

      <div className="pb-8">
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
                database you want to use.
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
            {isSubmitting ? (
              <div className="text-center py-8">
                <div className="inline-block w-6 h-6 border-2 border-base-border border-t-accent rounded-full animate-spin" />
                <p className="mt-3 text-sm text-text-muted">
                  Connecting to database...
                </p>
              </div>
            ) : (
              <DatabasePicker databases={databases} />
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
