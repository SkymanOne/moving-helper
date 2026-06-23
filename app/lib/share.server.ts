import {
  type SelectedDb,
  type AppCookies,
  getAuth,
  getSelectedDb,
} from "./cookies.server";
import { type NotionEnv, refreshAccessToken } from "./notion.server";
import { encryptString, decryptString } from "./crypto.server";

const CODE_TTL = 60 * 60 * 24 * 30; // 30 days
const DEFAULT_MAX_CODES_PER_OWNER = 10;
const WORKSPACE_TTL = 60 * 60 * 24 * 90; // 90 days, refreshed on use (sliding)

// Refresh the access token a little before it actually expires.
const REFRESH_SKEW_MS = 60 * 1000;
// Don't re-write the record on every request just to slide the TTL — only when
// it hasn't been touched for a while (KV allows ~1 write/sec per key).
const TTL_SLIDE_THRESHOLD_MS = 60 * 60 * 24 * 1000; // ~1 day
// KV is eventually consistent; a just-written record may not be immediately
// visible. Retry a null read once before treating the record as missing.
const READ_RETRY_DELAY_MS = 250;

/** Env needed to read/write workspace records: token refresh + token encryption. */
export type ShareEnv = NotionEnv & { SESSION_SECRET: string };

export interface WorkspaceRecord {
  accessToken: string;
  refreshToken: string | null;
  /** Epoch ms when the access token expires, or null if it never does. */
  tokenExpiresAt: number | null;
  workspaceName: string;
  selectedDb: SelectedDb | null;
  createdAt: string;
  updatedAt: string;
}

// As persisted in KV: token fields are AES-GCM encrypted (see crypto.server).
interface StoredWorkspaceRecord extends Omit<WorkspaceRecord, "accessToken" | "refreshToken"> {
  accessToken: string;
  refreshToken: string | null;
}

interface ShareCodeData {
  ownerId: string;
  createdAt: string;
}

function workspaceKey(botId: string): string {
  return `workspace:${botId}`;
}

function codesKey(ownerId: string): string {
  return `codes:${ownerId}`;
}

function shareKey(code: string): string {
  return `share:${code}`;
}

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

// --- Runtime validation (KV returns untyped JSON) ---------------------------

function isStoredWorkspaceRecord(v: unknown): v is StoredWorkspaceRecord {
  if (!v || typeof v !== "object") return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.accessToken === "string" &&
    (r.refreshToken === null || typeof r.refreshToken === "string") &&
    typeof r.workspaceName === "string" &&
    (r.tokenExpiresAt === null || typeof r.tokenExpiresAt === "number") &&
    typeof r.createdAt === "string" &&
    typeof r.updatedAt === "string"
  );
}

function isShareCodeData(v: unknown): v is ShareCodeData {
  if (!v || typeof v !== "object") return false;
  const d = v as Record<string, unknown>;
  return typeof d.ownerId === "string" && typeof d.createdAt === "string";
}

// --- Workspace records ------------------------------------------------------

export async function getWorkspace(
  kv: KVNamespace,
  botId: string,
  secret: string
): Promise<WorkspaceRecord | null> {
  const stored = await kv.get(workspaceKey(botId), "json");
  if (!isStoredWorkspaceRecord(stored)) return null;

  // botId is bound as AES-GCM associated data, so a ciphertext can't be
  // replayed under a different workspace key.
  const accessToken = await decryptString(stored.accessToken, secret, botId);
  if (accessToken === null) return null;

  let refreshToken: string | null = null;
  if (stored.refreshToken !== null) {
    refreshToken = await decryptString(stored.refreshToken, secret, botId);
    if (refreshToken === null) return null;
  }

  return { ...stored, accessToken, refreshToken };
}

async function putWorkspace(
  kv: KVNamespace,
  botId: string,
  record: WorkspaceRecord,
  secret: string
): Promise<void> {
  const stored: StoredWorkspaceRecord = {
    ...record,
    accessToken: await encryptString(record.accessToken, secret, botId),
    refreshToken:
      record.refreshToken === null
        ? null
        : await encryptString(record.refreshToken, secret, botId),
  };
  await kv.put(workspaceKey(botId), JSON.stringify(stored), {
    expirationTtl: WORKSPACE_TTL,
  });
}

/**
 * Create or update the workspace record from a fresh OAuth token exchange.
 * Preserves an existing database selection across re-authorization.
 */
export async function upsertWorkspace(
  kv: KVNamespace,
  botId: string,
  fields: {
    accessToken: string;
    refreshToken: string | null;
    tokenExpiresAt: number | null;
    workspaceName: string;
  },
  secret: string
): Promise<void> {
  const existing = await getWorkspace(kv, botId, secret);
  const now = new Date().toISOString();
  await putWorkspace(
    kv,
    botId,
    {
      ...fields,
      selectedDb: existing?.selectedDb ?? null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    },
    secret
  );
}

/** Owner-only: persist the selected database into the workspace record. */
export async function setWorkspaceSelectedDb(
  kv: KVNamespace,
  botId: string,
  db: SelectedDb,
  secret: string
): Promise<void> {
  const existing = await getWorkspace(kv, botId, secret);
  if (!existing) return;
  await putWorkspace(
    kv,
    botId,
    { ...existing, selectedDb: db, updatedAt: new Date().toISOString() },
    secret
  );
}

async function getWorkspaceWithRetry(
  kv: KVNamespace,
  botId: string,
  secret: string
): Promise<WorkspaceRecord | null> {
  const first = await getWorkspace(kv, botId, secret);
  if (first) return first;
  await new Promise((resolve) => setTimeout(resolve, READ_RETRY_DELAY_MS));
  return getWorkspace(kv, botId, secret);
}

/**
 * Load the workspace record, refreshing the access token if it is near expiry
 * and sliding the record's TTL on active use. Returns null if the record is
 * gone or the token could not be refreshed (e.g. access was revoked).
 */
async function loadWorkspaceWithValidToken(
  kv: KVNamespace,
  botId: string,
  env: ShareEnv
): Promise<WorkspaceRecord | null> {
  const record = await getWorkspaceWithRetry(kv, botId, env.SESSION_SECRET);
  if (!record) return null;

  const refreshToken = record.refreshToken;
  const needsRefresh =
    record.tokenExpiresAt !== null &&
    refreshToken !== null &&
    record.tokenExpiresAt - Date.now() < REFRESH_SKEW_MS;

  if (needsRefresh && refreshToken) {
    const refreshed = await refreshAccessToken(refreshToken, env);
    if (!refreshed) return null;
    const updated: WorkspaceRecord = {
      ...record,
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      tokenExpiresAt: refreshed.expiresAt,
      updatedAt: new Date().toISOString(),
    };
    await putWorkspace(kv, botId, updated, env.SESSION_SECRET);
    return updated;
  }

  // Slide the TTL occasionally so active workspaces don't expire, without
  // writing to KV on every single request.
  const age = Date.now() - new Date(record.updatedAt).getTime();
  if (age > TTL_SLIDE_THRESHOLD_MS) {
    const touched = { ...record, updatedAt: new Date().toISOString() };
    await putWorkspace(kv, botId, touched, env.SESSION_SECRET);
    return touched;
  }

  return record;
}

/** Owner-only teardown: remove the workspace record and all its share codes. */
export async function disconnectWorkspace(
  kv: KVNamespace,
  ownerId: string
): Promise<void> {
  const codes = (await kv.get<string[]>(codesKey(ownerId), "json")) ?? [];
  await Promise.all(codes.map((c) => kv.delete(shareKey(c))));
  await kv.delete(codesKey(ownerId));
  await kv.delete(workspaceKey(ownerId));
  // The Notion access can additionally be revoked by the user from their Notion
  // settings ("My connections"); see the privacy policy.
}

// --- Share codes ------------------------------------------------------------

export async function generateShareCode(
  kv: KVNamespace,
  ownerId: string,
  maxCodes: number = DEFAULT_MAX_CODES_PER_OWNER
): Promise<string> {
  const code = generateCode();

  const existing = (await kv.get<string[]>(codesKey(ownerId), "json")) ?? [];
  if (existing.length >= maxCodes) {
    throw new Error(
      "Maximum share codes reached. Revoke an existing code first."
    );
  }

  const data: ShareCodeData = { ownerId, createdAt: new Date().toISOString() };
  await kv.put(shareKey(code), JSON.stringify(data), {
    expirationTtl: CODE_TTL,
  });

  existing.push(code);
  await kv.put(codesKey(ownerId), JSON.stringify(existing));

  return code;
}

/** Parse the MAX_CODES_PER_OWNER env var, falling back to the default. */
export function maxCodesFromEnv(value: string | undefined): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : DEFAULT_MAX_CODES_PER_OWNER;
}

export async function redeemShareCode(
  kv: KVNamespace,
  code: string
): Promise<ShareCodeData | null> {
  const data = await kv.get(shareKey(code.toUpperCase().trim()), "json");
  return isShareCodeData(data) ? data : null;
}

export interface ShareCodeInfo {
  code: string;
  createdAt: string;
}

export async function listShareCodes(
  kv: KVNamespace,
  ownerId: string
): Promise<ShareCodeInfo[]> {
  const codes = (await kv.get<string[]>(codesKey(ownerId), "json")) ?? [];

  const results: ShareCodeInfo[] = [];
  const validCodes: string[] = [];

  for (const code of codes) {
    const data = await kv.get(shareKey(code), "json");
    if (isShareCodeData(data)) {
      results.push({ code, createdAt: data.createdAt });
      validCodes.push(code);
    }
  }

  if (validCodes.length !== codes.length) {
    await kv.put(codesKey(ownerId), JSON.stringify(validCodes));
  }

  return results;
}

export async function revokeShareCode(
  kv: KVNamespace,
  ownerId: string,
  code: string
): Promise<void> {
  const codes = (await kv.get<string[]>(codesKey(ownerId), "json")) ?? [];
  if (!codes.includes(code)) return;

  await kv.delete(shareKey(code));

  const updated = codes.filter((c) => c !== code);
  await kv.put(codesKey(ownerId), JSON.stringify(updated));
}

// --- Session resolution -----------------------------------------------------

export interface ResolvedAuth {
  accessToken: string;
  workspaceName: string;
  ownerId: string;
  isOwner: boolean;
  record: WorkspaceRecord;
}

export async function resolveAuth(
  request: Request,
  cookies: AppCookies,
  kv: KVNamespace,
  env: ShareEnv
): Promise<ResolvedAuth | null> {
  const auth = await getAuth(request, cookies);
  if (!auth) return null;

  let ownerId: string | null = null;
  let isOwner = false;

  if (auth.ownerId) {
    ownerId = auth.ownerId;
    isOwner = true;
  } else if (auth.shareCode) {
    const data = await redeemShareCode(kv, auth.shareCode);
    if (!data) return null;
    ownerId = data.ownerId;
  }

  if (!ownerId) return null;

  const record = await loadWorkspaceWithValidToken(kv, ownerId, env);
  if (!record) return null;

  return {
    accessToken: record.accessToken,
    workspaceName: record.workspaceName,
    ownerId,
    isOwner,
    record,
  };
}

export interface ResolvedSession extends ResolvedAuth {
  selectedDb: SelectedDb;
}

/**
 * The active database selection for a resolved session. Owners' selection lives
 * in the record; guests use their own cookie, falling back to a clone of the
 * owner's current selection.
 */
export async function selectedDbFor(
  resolved: ResolvedAuth,
  request: Request,
  cookies: AppCookies
): Promise<SelectedDb | null> {
  return resolved.isOwner
    ? resolved.record.selectedDb
    : (await getSelectedDb(request, cookies)) ?? resolved.record.selectedDb;
}

export async function resolveSession(
  request: Request,
  cookies: AppCookies,
  kv: KVNamespace,
  env: ShareEnv
): Promise<ResolvedSession | null> {
  const resolved = await resolveAuth(request, cookies, kv, env);
  if (!resolved) return null;

  const selectedDb = await selectedDbFor(resolved, request, cookies);
  if (!selectedDb) return null;

  return { ...resolved, selectedDb };
}
