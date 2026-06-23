import { redirect } from "react-router";
import type { Route } from "./+types/auth.logout";
import { clearSessionHeaders } from "~/lib/cookies.server";
import { cookiesContext } from "~/lib/context.server";

export async function action({ context }: Route.ActionArgs) {
  const cookies = context.get(cookiesContext);
  return redirect("/", { headers: await clearSessionHeaders(cookies) });
}
