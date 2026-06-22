import { redirect } from "react-router";
import { clearAuth, clearSelectedDb } from "~/lib/cookies.server";

export async function action() {
  return redirect("/", {
    headers: [
      ["Set-Cookie", await clearAuth()],
      ["Set-Cookie", await clearSelectedDb()],
    ],
  });
}
