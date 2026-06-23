import { redirect } from "react-router";
import type { Route } from "./+types/auth.logout";
import { clearAuth, clearSelectedDb } from "~/lib/cookies.server";
import { cookiesContext } from "~/lib/context.server";

export async function action({ context }: Route.ActionArgs) {
  const cookies = context.get(cookiesContext);
  return redirect("/", {
    headers: [
      ["Set-Cookie", await clearAuth(cookies)],
      ["Set-Cookie", await clearSelectedDb(cookies)],
    ],
  });
}
