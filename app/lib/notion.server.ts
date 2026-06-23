import { Client } from "@notionhq/client";

function getClient(accessToken: string) {
  return new Client({ auth: accessToken });
}

export type IdPropertyType = "title" | "rich_text" | "unique_id";

export interface DatabaseInfo {
  id: string;
  dataSourceId: string;
  title: string;
  statusPropertyName: string;
  statusPropertyType: "status" | "select";
  idPropertyName: string;
  idPropertyType: IdPropertyType;
  uniqueIdPrefix: string | null;
  statusOptions: StatusOption[];
}

export interface StatusOption {
  name: string;
  color: string;
}

export interface EntryInfo {
  pageId: string;
  currentStatus: string | null;
}

interface ParsedSchema {
  statusPropertyName: string;
  statusPropertyType: "status" | "select";
  idPropertyName: string;
  idPropertyType: IdPropertyType;
  uniqueIdPrefix: string | null;
  titlePropertyName: string | null;
  options: StatusOption[];
}

function parseSchemaProperties(
  props: Record<string, { type: string; [key: string]: unknown }>
): ParsedSchema | null {
  let statusProp: {
    name: string;
    type: "status" | "select";
    options: StatusOption[];
  } | null = null;
  let idProp: {
    name: string;
    type: IdPropertyType;
    prefix: string | null;
  } | null = null;
  let titlePropertyName: string | null = null;

  for (const [name, config] of Object.entries(props)) {
    if (
      config.type === "status" &&
      "status" in config &&
      config.status &&
      typeof config.status === "object" &&
      "options" in (config.status as Record<string, unknown>)
    ) {
      const status = config.status as { options: { name: string; color: string }[] };
      statusProp = {
        name,
        type: "status",
        options: status.options.map((o) => ({ name: o.name, color: o.color })),
      };
    } else if (
      config.type === "select" &&
      !statusProp &&
      "select" in config &&
      config.select &&
      typeof config.select === "object" &&
      "options" in (config.select as Record<string, unknown>)
    ) {
      const select = config.select as { options: { name: string; color: string }[] };
      statusProp = {
        name,
        type: "select",
        options: select.options.map((o) => ({ name: o.name, color: o.color })),
      };
    }

    if (config.type === "title") {
      titlePropertyName = name;
    }

    if (
      config.type === "unique_id" &&
      "unique_id" in config &&
      config.unique_id
    ) {
      idProp = {
        name,
        type: "unique_id",
        prefix: (config.unique_id as { prefix: string | null }).prefix,
      };
    } else if (config.type === "title" && !idProp) {
      idProp = { name, type: "title", prefix: null };
    } else if (
      config.type === "rich_text" &&
      !idProp &&
      name.toLowerCase().includes("id")
    ) {
      idProp = { name, type: "rich_text", prefix: null };
    }
  }

  if (!statusProp || !idProp) return null;

  return {
    statusPropertyName: statusProp.name,
    statusPropertyType: statusProp.type,
    idPropertyName: idProp.name,
    idPropertyType: idProp.type,
    uniqueIdPrefix: idProp.prefix,
    titlePropertyName,
    options: statusProp.options,
  };
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export interface NotionEnv {
  NOTION_CLIENT_ID: string;
  NOTION_CLIENT_SECRET: string;
  NOTION_REDIRECT_URI: string;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string | null;
  /** Epoch milliseconds when the access token expires, or null if it never does. */
  expiresAt: number | null;
}

export interface OAuthResult extends OAuthTokens {
  botId: string;
  workspaceName: string;
  workspaceIcon: string | null;
}

interface NotionTokenResponse {
  access_token: string;
  refresh_token?: string | null;
  expires_in?: number | null;
  bot_id: string;
  workspace_name: string;
  workspace_icon: string | null;
}

function tokenAuthHeader(env: NotionEnv): string {
  const { NOTION_CLIENT_ID: clientId, NOTION_CLIENT_SECRET: clientSecret } = env;
  return `Basic ${btoa(`${clientId}:${clientSecret}`)}`;
}

function expiresAtFrom(expiresIn: number | null | undefined): number | null {
  // Notion only sends expires_in when token rotation is enabled for the
  // integration. When absent, the access token does not expire.
  return typeof expiresIn === "number" ? Date.now() + expiresIn * 1000 : null;
}

export async function exchangeOAuthCode(
  code: string,
  env: NotionEnv
): Promise<OAuthResult> {
  const { NOTION_REDIRECT_URI: redirectUri } = env;

  const response = await fetch("https://api.notion.com/v1/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: tokenAuthHeader(env),
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OAuth token exchange failed: ${body}`);
  }

  const data = (await response.json()) as NotionTokenResponse;

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresAt: expiresAtFrom(data.expires_in),
    botId: data.bot_id,
    workspaceName: data.workspace_name,
    workspaceIcon: data.workspace_icon,
  };
}

/**
 * Exchange a refresh token for a fresh access/refresh token pair. Notion
 * invalidates the old refresh token once a new pair is issued, so the caller
 * must persist the returned tokens. Returns null if Notion rejects the refresh
 * (e.g. the user revoked access).
 */
export async function refreshAccessToken(
  refreshToken: string,
  env: NotionEnv
): Promise<OAuthTokens | null> {
  const response = await fetch("https://api.notion.com/v1/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: tokenAuthHeader(env),
    },
    body: JSON.stringify({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) return null;

  const data = (await response.json()) as NotionTokenResponse;

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt: expiresAtFrom(data.expires_in),
  };
}

export function getNotionAuthUrl(
  env: Pick<NotionEnv, "NOTION_CLIENT_ID" | "NOTION_REDIRECT_URI">,
  state?: string
): string {
  const { NOTION_CLIENT_ID: clientId, NOTION_REDIRECT_URI: redirectUri } = env;

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    owner: "user",
    redirect_uri: redirectUri,
  });

  if (state) params.set("state", state);

  return `https://api.notion.com/v1/oauth/authorize?${params}`;
}

export async function listDatabases(
  accessToken: string
): Promise<DatabaseInfo[]> {
  const notion = getClient(accessToken);
  const response = await notion.search({
    filter: { property: "object", value: "data_source" },
  });

  const databases: DatabaseInfo[] = [];

  for (const result of response.results) {
    if (result.object !== "data_source" || !("properties" in result)) continue;

    const parsed = parseSchemaProperties(
      result.properties as Record<string, { type: string; [key: string]: unknown }>
    );
    if (!parsed) continue;

    let title = "Untitled";
    if (
      "title" in result &&
      Array.isArray(result.title) &&
      result.title.length > 0
    ) {
      title = result.title.map((t) => t.plain_text).join("");
    }

    databases.push({
      id:
        "database_parent" in result && result.database_parent
          ? (result.database_parent as { database_id: string }).database_id
          : result.id,
      dataSourceId: result.id,
      title,
      statusPropertyName: parsed.statusPropertyName,
      statusPropertyType: parsed.statusPropertyType,
      idPropertyName: parsed.idPropertyName,
      idPropertyType: parsed.idPropertyType,
      uniqueIdPrefix: parsed.uniqueIdPrefix,
      statusOptions: parsed.options,
    });
  }

  return databases;
}

export async function getDatabaseSchema(
  accessToken: string,
  dataSourceId: string
): Promise<ParsedSchema> {
  const notion = getClient(accessToken);
  const ds = await notion.dataSources.retrieve({
    data_source_id: dataSourceId,
  });

  if (!("properties" in ds)) {
    throw new Error("Could not retrieve database schema");
  }

  const parsed = parseSchemaProperties(
    ds.properties as Record<string, { type: string; [key: string]: unknown }>
  );
  if (!parsed) {
    throw new Error("Database missing required status or ID properties");
  }

  return parsed;
}

/**
 * Parse a scanned barcode value to extract the numeric ID for unique_id lookup.
 */
function parseUniqueIdCode(code: string, prefix: string | null): number | null {
  if (prefix) {
    const prefixPattern = new RegExp(`^${escapeRegExp(prefix)}-?`, "i");
    const stripped = code.replace(prefixPattern, "");
    const num = parseInt(stripped, 10);
    return isNaN(num) ? null : num;
  }
  const num = parseInt(code, 10);
  return isNaN(num) ? null : num;
}

export async function findEntryByCode(
  accessToken: string,
  dataSourceId: string,
  idPropertyName: string,
  idPropertyType: IdPropertyType,
  uniqueIdPrefix: string | null,
  code: string
): Promise<EntryInfo | null> {
  const notion = getClient(accessToken);
  let filter: Record<string, unknown>;

  if (idPropertyType === "unique_id") {
    const num = parseUniqueIdCode(code, uniqueIdPrefix);
    if (num === null) return null;
    filter = { property: idPropertyName, unique_id: { equals: num } };
  } else if (idPropertyType === "title") {
    filter = { property: idPropertyName, title: { equals: code } };
  } else {
    filter = { property: idPropertyName, rich_text: { equals: code } };
  }

  const response = await notion.dataSources.query({
    data_source_id: dataSourceId,
    filter: filter as Parameters<typeof notion.dataSources.query>[0]["filter"],
    page_size: 1,
  });

  const page = response.results[0];
  if (!page || page.object !== "page" || !("properties" in page)) return null;

  let currentStatus: string | null = null;
  const props = page.properties as Record<
    string,
    {
      type: string;
      status?: { name: string } | null;
      select?: { name: string } | null;
    }
  >;
  for (const config of Object.values(props)) {
    if (config.type === "status" && config.status) {
      currentStatus = config.status.name;
      break;
    }
    if (config.type === "select" && config.select) {
      currentStatus = config.select.name;
      break;
    }
  }

  return { pageId: page.id, currentStatus };
}

export async function createEntry(
  accessToken: string,
  dataSourceId: string,
  idPropertyName: string,
  idPropertyType: IdPropertyType,
  code: string,
  titlePropertyName?: string
): Promise<EntryInfo> {
  const notion = getClient(accessToken);
  let properties: Parameters<typeof notion.pages.create>[0]["properties"];

  if (idPropertyType === "unique_id") {
    properties = titlePropertyName
      ? { [titlePropertyName]: { title: [{ text: { content: code } }] } }
      : {};
  } else if (idPropertyType === "title") {
    properties = {
      [idPropertyName]: { title: [{ text: { content: code } }] },
    };
  } else {
    properties = {
      [idPropertyName]: { rich_text: [{ text: { content: code } }] },
    };
  }

  const page = await notion.pages.create({
    parent: { data_source_id: dataSourceId },
    properties,
  });

  return { pageId: page.id, currentStatus: null };
}

export async function updateStatus(
  accessToken: string,
  pageId: string,
  statusPropertyName: string,
  statusPropertyType: "status" | "select",
  statusValue: string
): Promise<void> {
  const notion = getClient(accessToken);
  await notion.pages.update({
    page_id: pageId,
    properties:
      statusPropertyType === "status"
        ? { [statusPropertyName]: { status: { name: statusValue } } }
        : { [statusPropertyName]: { select: { name: statusValue } } },
  });
}
