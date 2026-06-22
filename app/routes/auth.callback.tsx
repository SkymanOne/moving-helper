import { redirect } from "react-router";
import type { Route } from "./+types/auth.callback";
import { exchangeOAuthCode } from "~/lib/notion.server";
import { setAuth, oauthStateCookie } from "~/lib/cookies.server";

const KNOWN_ERRORS = new Set(["access_denied", "temporarily_unavailable"]);

export async function loader({ request }: Route.LoaderArgs) {
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
  const expectedState = await oauthStateCookie.parse(
    request.headers.get("Cookie")
  );

  if (!returnedState || returnedState !== expectedState) {
    throw redirect("/?error=invalid_state");
  }

  const { accessToken, workspaceName, workspaceIcon } =
    await exchangeOAuthCode(code);

  return redirect("/", {
    headers: [
      ["Set-Cookie", await setAuth({ accessToken, workspaceName, workspaceIcon })],
      ["Set-Cookie", await oauthStateCookie.serialize("", { maxAge: 0 })],
    ],
  });
}
