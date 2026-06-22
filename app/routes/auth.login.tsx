import crypto from "node:crypto";
import { redirect } from "react-router";
import { getNotionAuthUrl } from "~/lib/notion.server";
import { oauthStateCookie } from "~/lib/cookies.server";

export async function loader() {
  const state = crypto.randomBytes(16).toString("hex");
  return redirect(getNotionAuthUrl(state), {
    headers: { "Set-Cookie": await oauthStateCookie.serialize(state) },
  });
}
