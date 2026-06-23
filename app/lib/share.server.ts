import {
  type SelectedDb,
  type AppCookies,
  getAuth,
  getSelectedDb,
} from "./cookies.server";

const CODE_TTL = 60 * 60 * 24 * 30; // 30 days
const MAX_CODES_PER_OWNER = 10;

interface ShareCodeData {
  accessToken: string;
  workspaceName: string;
  createdAt: string;
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

export async function generateShareCode(
  kv: KVNamespace,
  ownerId: string,
  accessToken: string,
  workspaceName: string
): Promise<string> {
  const code = generateCode();

  const data: ShareCodeData = {
    accessToken,
    workspaceName,
    createdAt: new Date().toISOString(),
  };

  const existing =
    await kv.get<string[]>(codesKey(ownerId), "json") ?? [];

  if (existing.length >= MAX_CODES_PER_OWNER) {
    throw new Error("Maximum share codes reached. Revoke an existing code first.");
  }

  await kv.put(shareKey(code), JSON.stringify(data), {
    expirationTtl: CODE_TTL,
  });

  existing.push(code);
  await kv.put(codesKey(ownerId), JSON.stringify(existing));

  return code;
}

export async function redeemShareCode(
  kv: KVNamespace,
  code: string
): Promise<ShareCodeData | null> {
  return kv.get<ShareCodeData>(shareKey(code.toUpperCase().trim()), "json");
}

export interface ShareCodeInfo {
  code: string;
  createdAt: string;
}

export async function listShareCodes(
  kv: KVNamespace,
  ownerId: string
): Promise<ShareCodeInfo[]> {
  const codes =
    await kv.get<string[]>(codesKey(ownerId), "json") ?? [];

  const results: ShareCodeInfo[] = [];
  const validCodes: string[] = [];

  for (const code of codes) {
    const data = await kv.get<ShareCodeData>(shareKey(code), "json");
    if (data) {
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
  const codes =
    await kv.get<string[]>(codesKey(ownerId), "json") ?? [];
  if (!codes.includes(code)) return;

  await kv.delete(shareKey(code));

  const updated = codes.filter((c) => c !== code);
  await kv.put(codesKey(ownerId), JSON.stringify(updated));
}

interface ResolvedAuth {
  accessToken: string;
  workspaceName: string;
}

export async function resolveAuth(
  request: Request,
  cookies: AppCookies,
  kv: KVNamespace
): Promise<ResolvedAuth | null> {
  const auth = await getAuth(request, cookies);
  if (!auth) return null;

  if (auth.accessToken) {
    return {
      accessToken: auth.accessToken,
      workspaceName: auth.workspaceName ?? "",
    };
  }

  if (auth.shareCode) {
    const data = await redeemShareCode(kv, auth.shareCode);
    if (!data) return null;
    return {
      accessToken: data.accessToken,
      workspaceName: data.workspaceName,
    };
  }

  return null;
}

export interface ResolvedSession {
  accessToken: string;
  workspaceName: string;
  selectedDb: SelectedDb;
}

export async function resolveSession(
  request: Request,
  cookies: AppCookies,
  kv: KVNamespace
): Promise<ResolvedSession | null> {
  const resolved = await resolveAuth(request, cookies, kv);
  if (!resolved) return null;

  const selected = await getSelectedDb(request, cookies);
  if (!selected) return null;

  return { ...resolved, selectedDb: selected };
}
