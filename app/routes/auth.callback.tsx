import { redirect } from "react-router";
import type { Route } from "./+types/auth.callback";
import { exchangeOAuthCode } from "~/lib/notion.server";
import { setAuth } from "~/lib/cookies.server";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    throw redirect(`/?error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    throw redirect("/?error=missing_code");
  }

  const { accessToken, workspaceName, workspaceIcon } =
    await exchangeOAuthCode(code);

  return redirect("/", {
    headers: {
      "Set-Cookie": await setAuth({ accessToken, workspaceName, workspaceIcon }),
    },
  });
}
