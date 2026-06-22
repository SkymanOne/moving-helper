import { createCookie } from "react-router";
import type { IdPropertyType } from "~/lib/notion.server";

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET env variable is required");
}

export const authCookie = createCookie("auth", {
  maxAge: 60 * 60 * 24 * 30, // 30 days
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  secrets: [process.env.SESSION_SECRET],
});

export const selectedDbCookie = createCookie("selectedDb", {
  maxAge: 60 * 60 * 24 * 30, // 30 days
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  secrets: [process.env.SESSION_SECRET],
});

export interface AuthSession {
  accessToken: string;
  workspaceName: string;
  workspaceIcon: string | null;
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

export async function getAuth(request: Request): Promise<AuthSession | null> {
  const cookieHeader = request.headers.get("Cookie");
  const value = await authCookie.parse(cookieHeader);
  if (!value || typeof value !== "object" || !value.accessToken) return null;
  return value as AuthSession;
}

export async function setAuth(session: AuthSession): Promise<string> {
  return await authCookie.serialize(session);
}

export async function clearAuth(): Promise<string> {
  return await authCookie.serialize(null, { maxAge: 0 });
}

export async function getSelectedDb(
  request: Request
): Promise<SelectedDb | null> {
  const cookieHeader = request.headers.get("Cookie");
  const value = await selectedDbCookie.parse(cookieHeader);
  if (!value || typeof value !== "object") return null;
  return value as SelectedDb;
}

export async function setSelectedDb(db: SelectedDb): Promise<string> {
  return await selectedDbCookie.serialize(db);
}

export async function clearSelectedDb(): Promise<string> {
  return await selectedDbCookie.serialize(null, { maxAge: 0 });
}
