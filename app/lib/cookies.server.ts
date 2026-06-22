import { createCookie } from "react-router";
import type { IdPropertyType } from "~/lib/notion.server";

export const selectedDbCookie = createCookie("selectedDb", {
  maxAge: 60 * 60 * 24 * 30, // 30 days
});

export interface SelectedDb {
  databaseId: string;
  dataSourceId: string;
  statusPropertyName: string;
  statusPropertyType: "status" | "select";
  idPropertyName: string;
  idPropertyType: IdPropertyType;
  uniqueIdPrefix: string | null;
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
