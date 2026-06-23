import { createCookie } from "react-router";
import type { IdPropertyType } from "~/lib/notion.server";

const COOKIE_OPTS = {
  path: "/",
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
};

export function createCookies(sessionSecret: string) {
  const secrets = [sessionSecret];

  return {
    auth: createCookie("auth", {
      ...COOKIE_OPTS,
      maxAge: 60 * 60 * 24 * 30, // 30 days
      secrets,
    }),
    selectedDb: createCookie("selectedDb", {
      ...COOKIE_OPTS,
      maxAge: 60 * 60 * 24 * 30,
      secrets,
    }),
    oauthState: createCookie("oauth_state", {
      ...COOKIE_OPTS,
      maxAge: 60 * 10, // 10 minutes
      secrets,
    }),
  };
}

export type AppCookies = ReturnType<typeof createCookies>;

export interface AuthSession {
  accessToken?: string;
  workspaceName?: string;
  workspaceIcon?: string | null;
  shareCode?: string;
}

export interface SelectedDb {
  databaseId: string;
  dataSourceId: string;
  statusPropertyName: string;
  statusPropertyType: "status" | "select";
  idPropertyName: string;
  idPropertyType: IdPropertyType;
  uniqueIdPrefix: string | null;
}

export async function getAuth(
  request: Request,
  cookies: AppCookies
): Promise<AuthSession | null> {
  const cookieHeader = request.headers.get("Cookie");
  const value = await cookies.auth.parse(cookieHeader);
  if (!value || typeof value !== "object") return null;
  if (!value.accessToken && !value.shareCode) return null;
  return value as AuthSession;
}

export async function setAuth(
  session: AuthSession,
  cookies: AppCookies
): Promise<string> {
  return await cookies.auth.serialize(session);
}

export async function clearAuth(cookies: AppCookies): Promise<string> {
  return await cookies.auth.serialize(null, { maxAge: 0 });
}

export async function getSelectedDb(
  request: Request,
  cookies: AppCookies
): Promise<SelectedDb | null> {
  const cookieHeader = request.headers.get("Cookie");
  const value = await cookies.selectedDb.parse(cookieHeader);
  if (!value || typeof value !== "object") return null;
  return value as SelectedDb;
}

export async function setSelectedDb(
  db: SelectedDb,
  cookies: AppCookies
): Promise<string> {
  return await cookies.selectedDb.serialize(db);
}

export async function clearSelectedDb(cookies: AppCookies): Promise<string> {
  return await cookies.selectedDb.serialize(null, { maxAge: 0 });
}
