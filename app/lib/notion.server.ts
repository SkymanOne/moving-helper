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

export async function exchangeOAuthCode(code: string): Promise<{
  accessToken: string;
  workspaceName: string;
  workspaceIcon: string | null;
}> {
  const clientId = process.env.NOTION_CLIENT_ID;
  const clientSecret = process.env.NOTION_CLIENT_SECRET;
  const redirectUri = process.env.NOTION_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Missing Notion OAuth env variables");
  }

  const response = await fetch("https://api.notion.com/v1/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
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

  const data = (await response.json()) as {
    access_token: string;
    workspace_name: string;
    workspace_icon: string | null;
  };

  return {
    accessToken: data.access_token,
    workspaceName: data.workspace_name,
    workspaceIcon: data.workspace_icon,
  };
}

export function getNotionAuthUrl(state?: string): string {
  const clientId = process.env.NOTION_CLIENT_ID;
  const redirectUri = process.env.NOTION_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    throw new Error("Missing NOTION_CLIENT_ID or NOTION_REDIRECT_URI");
  }

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

    const props = result.properties;
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

    for (const [name, config] of Object.entries(props)) {
      if (
        config.type === "status" &&
        "status" in config &&
        config.status &&
        "options" in config.status
      ) {
        statusProp = {
          name,
          type: "status",
          options: config.status.options.map((o) => ({
            name: o.name,
            color: o.color,
          })),
        };
      } else if (
        config.type === "select" &&
        !statusProp &&
        "select" in config &&
        config.select &&
        "options" in config.select
      ) {
        statusProp = {
          name,
          type: "select",
          options: config.select.options.map((o) => ({
            name: o.name,
            color: o.color,
          })),
        };
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

    if (!statusProp || !idProp) continue;

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
      statusPropertyName: statusProp.name,
      statusPropertyType: statusProp.type,
      idPropertyName: idProp.name,
      idPropertyType: idProp.type,
      uniqueIdPrefix: idProp.prefix,
      statusOptions: statusProp.options,
    });
  }

  return databases;
}

export async function getDatabaseSchema(
  accessToken: string,
  dataSourceId: string
) {
  const notion = getClient(accessToken);
  const ds = await notion.dataSources.retrieve({
    data_source_id: dataSourceId,
  });

  if (!("properties" in ds)) {
    throw new Error("Could not retrieve database schema");
  }

  let statusPropertyName = "";
  let statusPropertyType: "status" | "select" = "status";
  let idPropertyName = "";
  let idPropertyType: IdPropertyType = "title";
  let uniqueIdPrefix: string | null = null;
  let options: StatusOption[] = [];

  for (const [name, config] of Object.entries(ds.properties)) {
    if (
      config.type === "status" &&
      "status" in config &&
      config.status &&
      "options" in config.status
    ) {
      statusPropertyName = name;
      statusPropertyType = "status";
      options = config.status.options.map((o) => ({
        name: o.name,
        color: o.color,
      }));
    } else if (
      config.type === "select" &&
      !statusPropertyName &&
      "select" in config &&
      config.select &&
      "options" in config.select
    ) {
      statusPropertyName = name;
      statusPropertyType = "select";
      options = config.select.options.map((o) => ({
        name: o.name,
        color: o.color,
      }));
    }

    if (
      config.type === "unique_id" &&
      "unique_id" in config &&
      config.unique_id
    ) {
      idPropertyName = name;
      idPropertyType = "unique_id";
      uniqueIdPrefix = (config.unique_id as { prefix: string | null }).prefix;
    } else if (config.type === "title" && !idPropertyName) {
      idPropertyName = name;
      idPropertyType = "title";
    } else if (
      config.type === "rich_text" &&
      !idPropertyName &&
      name.toLowerCase().includes("id")
    ) {
      idPropertyName = name;
      idPropertyType = "rich_text";
    }
  }

  return {
    statusPropertyName,
    statusPropertyType,
    idPropertyName,
    idPropertyType,
    uniqueIdPrefix,
    options,
  };
}

/**
 * Parse a scanned barcode value to extract the numeric ID for unique_id lookup.
 */
function parseUniqueIdCode(code: string, prefix: string | null): number | null {
  if (prefix) {
    const prefixPattern = new RegExp(`^${prefix}-?`, "i");
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
  code: string
): Promise<EntryInfo> {
  const notion = getClient(accessToken);
  let properties: Parameters<typeof notion.pages.create>[0]["properties"];

  if (idPropertyType === "unique_id") {
    const ds = await notion.dataSources.retrieve({
      data_source_id: dataSourceId,
    });
    if (!("properties" in ds)) throw new Error("Cannot read database schema");

    let titlePropName: string | null = null;
    for (const [name, config] of Object.entries(ds.properties)) {
      if (config.type === "title") {
        titlePropName = name;
        break;
      }
    }

    properties = titlePropName
      ? { [titlePropName]: { title: [{ text: { content: code } }] } }
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
