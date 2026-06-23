import { redirect } from "react-router";
import type { Route } from "./+types/auth.login";
import { getNotionAuthUrl } from "~/lib/notion.server";
import { cloudflareContext, cookiesContext } from "~/lib/context.server";

export async function loader({ context }: Route.LoaderArgs) {
  const cookies = context.get(cookiesContext);
  const { env } = context.get(cloudflareContext);
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const state = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
    "",
  );
  return redirect(getNotionAuthUrl(env, state), {
    headers: { "Set-Cookie": await cookies.oauthState.serialize(state) },
  });
}
