import { redirect } from "react-router";
import type { Route } from "./+types/auth.callback";
import { exchangeOAuthCode } from "~/lib/notion.server";
import { setAuth } from "~/lib/cookies.server";
import { cloudflareContext, cookiesContext } from "~/lib/context.server";

const KNOWN_ERRORS = new Set(["access_denied", "temporarily_unavailable"]);

export async function loader({ request, context }: Route.LoaderArgs) {
  const cookies = context.get(cookiesContext);
  const { env } = context.get(cloudflareContext);
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    const safeError = KNOWN_ERRORS.has(error) ? error : "oauth_error";
    throw redirect(`/?error=${safeError}`);
  }

  if (!code) {
    throw redirect("/?error=missing_code");
  }

  const returnedState = url.searchParams.get("state");
  const expectedState = await cookies.oauthState.parse(
    request.headers.get("Cookie"),
  );

  if (!returnedState || returnedState !== expectedState) {
    throw redirect("/?error=invalid_state");
  }

  const { accessToken, botId, workspaceName, workspaceIcon } =
    await exchangeOAuthCode(code, env);

  return redirect("/", {
    headers: [
      [
        "Set-Cookie",
        await setAuth({ accessToken, ownerId: botId, workspaceName, workspaceIcon }, cookies),
      ],
      ["Set-Cookie", await cookies.oauthState.serialize("", { maxAge: 0 })],
    ],
  });
}
