import { redirect } from "react-router";
import { getNotionAuthUrl } from "~/lib/notion.server";

export async function loader() {
  return redirect(getNotionAuthUrl(), { status: 302 });
}
