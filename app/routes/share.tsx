import { redirect, useLoaderData, useActionData, useNavigation, Form, Link } from "react-router";
import type { Route } from "./+types/share";
import { getAuth, clearAuth, clearSelectedDb } from "~/lib/cookies.server";
import { cloudflareContext, cookiesContext } from "~/lib/context.server";
import {
  generateShareCode,
  listShareCodes,
  revokeShareCode,
  disconnectWorkspace,
  maxCodesFromEnv,
  type ShareCodeInfo,
} from "~/lib/share.server";

export function meta() {
  return [{ title: "Share Codes - Moving Buddy" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const cookies = context.get(cookiesContext);
  const { env } = context.get(cloudflareContext);
  const auth = await getAuth(request, cookies);
  if (!auth?.ownerId) throw redirect("/");

  const codes = await listShareCodes(env.WORKSPACES, auth.ownerId);

  return { codes };
}

export async function action({ request, context }: Route.ActionArgs) {
  const cookies = context.get(cookiesContext);
  const { env } = context.get(cloudflareContext);
  const auth = await getAuth(request, cookies);
  if (!auth?.ownerId) throw redirect("/");

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "generate") {
    try {
      await generateShareCode(
        env.WORKSPACES,
        auth.ownerId,
        maxCodesFromEnv(env.MAX_CODES_PER_OWNER)
      );
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed to generate code." };
    }
  } else if (intent === "revoke") {
    const code = formData.get("code") as string;
    if (code) {
      await revokeShareCode(env.WORKSPACES, auth.ownerId, code);
    }
  } else if (intent === "disconnect") {
    await disconnectWorkspace(env.WORKSPACES, auth.ownerId);
    throw redirect("/", {
      headers: [
        ["Set-Cookie", await clearAuth(cookies)],
        ["Set-Cookie", await clearSelectedDb(cookies)],
      ],
    });
  }

  return null;
}

function CodeCard({ code }: { code: ShareCodeInfo }) {
  const navigation = useNavigation();
  const isRevoking =
    navigation.state === "submitting" &&
    navigation.formData?.get("code") === code.code;

  return (
    <div className="flex items-center justify-between px-4 py-3 rounded-xl border-2 border-base-border bg-base-dim">
      <div>
        <p className="text-xl font-mono font-bold text-heading tracking-[0.2em]">
          {code.code}
        </p>
        <p className="text-xs text-text-muted mt-1">
          Created {new Date(code.createdAt).toLocaleDateString()}
        </p>
      </div>
      <Form method="post">
        <input type="hidden" name="intent" value="revoke" />
        <input type="hidden" name="code" value={code.code} />
        <button
          type="submit"
          disabled={isRevoking}
          className="text-sm text-red-500 font-medium hover:text-red-700 px-3 py-1 rounded-lg hover:bg-red-50 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {isRevoking ? "Revoking..." : "Revoke"}
        </button>
      </Form>
    </div>
  );
}

export default function SharePage() {
  const { codes } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isGenerating =
    navigation.state === "submitting" &&
    navigation.formData?.get("intent") === "generate";
  const isDisconnecting =
    navigation.state === "submitting" &&
    navigation.formData?.get("intent") === "disconnect";

  return (
    <div className="flex flex-col">
      <header className="flex items-center justify-between mb-6">
        <Link
          to="/"
          prefetch="intent"
          className="text-xl font-bold text-heading hover:text-text transition-colors"
        >
          Moving Buddy
        </Link>
        <Link
          to="/"
          prefetch="intent"
          className="text-sm text-text-muted hover:text-heading px-3 py-1 rounded-lg hover:bg-base-dim transition-colors"
        >
          Back
        </Link>
      </header>

      <h2 className="text-2xl font-bold text-heading mb-2">Share Codes</h2>
      <p className="text-sm text-text-muted mb-6">
        Generate a code so others can scan with your databases without needing a
        Notion account.
      </p>

      {actionData?.error && (
        <div className="mb-4 px-4 py-3 bg-red-50 text-red-700 rounded-xl text-center text-sm font-medium border border-red-200">
          {actionData.error}
        </div>
      )}

      <Form method="post" className="mb-6">
        <input type="hidden" name="intent" value="generate" />
        <button
          type="submit"
          disabled={isGenerating}
          className="w-full px-4 py-3 bg-accent text-white font-semibold rounded-xl hover:bg-accent-hover active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {isGenerating ? "Generating..." : "Generate New Code"}
        </button>
      </Form>

      {codes.length > 0 ? (
        <div className="space-y-3">
          {codes.map((code) => (
            <CodeCard key={code.code} code={code} />
          ))}
        </div>
      ) : (
        <div className="text-center text-text-muted py-8">
          <p className="text-sm">
            No share codes yet. Generate one to let others scan with your
            databases.
          </p>
        </div>
      )}

      <div className="mt-10 pt-6 border-t border-base-border">
        <h3 className="text-sm font-semibold text-heading mb-1">
          Disconnect workspace
        </h3>
        <p className="text-xs text-text-muted mb-3">
          Removes your stored Notion connection and revokes all share codes. You
          can reconnect anytime by signing in again.
        </p>
        <Form
          method="post"
          onSubmit={(e) => {
            if (
              !confirm(
                "Disconnect this workspace? All share codes will stop working."
              )
            ) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="intent" value="disconnect" />
          <button
            type="submit"
            disabled={isDisconnecting}
            className="w-full px-4 py-3 border-2 border-red-200 text-red-600 font-semibold rounded-xl hover:bg-red-50 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {isDisconnecting ? "Disconnecting..." : "Disconnect Workspace"}
          </button>
        </Form>
      </div>
    </div>
  );
}
