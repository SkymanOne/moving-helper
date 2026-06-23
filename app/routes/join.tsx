import { redirect, useActionData, useNavigation, Form, Link } from "react-router";
import type { Route } from "./+types/join";
import { redeemShareCode } from "~/lib/share.server";
import { setAuth, setSelectedDb } from "~/lib/cookies.server";
import { cloudflareContext, cookiesContext } from "~/lib/context.server";

export function meta() {
  return [{ title: "Join - Moving Buddy" }];
}

export async function action({ request, context }: Route.ActionArgs) {
  const cookies = context.get(cookiesContext);
  const { env } = context.get(cloudflareContext);
  const formData = await request.formData();
  const code = (formData.get("code") as string)?.toUpperCase().trim();

  if (!code || code.length !== 6 || !/^[A-Z2-9]+$/.test(code)) {
    return { error: "Please enter a valid 6-character share code." };
  }

  const data = await redeemShareCode(env.SHARE_CODES, code);
  if (!data) {
    return { error: "Invalid or expired share code." };
  }

  return redirect("/scan", {
    headers: [
      [
        "Set-Cookie",
        await setAuth(
          {
            accessToken: data.accessToken,
            workspaceName: data.workspaceName,
            workspaceIcon: null,
          },
          cookies
        ),
      ],
      ["Set-Cookie", await setSelectedDb(data.selectedDb, cookies)],
    ],
  });
}

export default function JoinPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
        <h1 className="text-4xl font-bold text-heading tracking-tight">
          Moving Buddy
        </h1>
        <p className="mt-3 text-text-muted max-w-xs leading-relaxed">
          Enter the share code you received to start scanning
        </p>
      </div>

      <div className="pb-8">
        {actionData?.error && (
          <div className="mb-4 px-4 py-3 bg-red-50 text-red-700 rounded-xl text-center text-sm font-medium border border-red-200">
            {actionData.error}
          </div>
        )}

        <Form method="post" className="space-y-4">
          <input
            type="text"
            name="code"
            maxLength={6}
            autoComplete="off"
            autoFocus
            placeholder="ABC123"
            className="w-full text-center text-2xl font-mono tracking-[0.3em] uppercase px-4 py-4 rounded-xl border-2 border-base-border bg-base-dim text-heading placeholder:text-base-border focus:border-accent focus:outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="block w-full text-center px-4 py-3 bg-accent text-white font-semibold rounded-xl hover:bg-accent-hover active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {isSubmitting ? "Joining..." : "Join"}
          </button>
        </Form>

        <Link
          to="/"
          className="block mt-6 text-center text-sm text-text-muted hover:text-heading transition-colors"
        >
          Back
        </Link>
      </div>
    </div>
  );
}
