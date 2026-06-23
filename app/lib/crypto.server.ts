// Symmetric encryption for secrets stored in KV (Notion tokens). Uses AES-GCM
// with a key derived from SESSION_SECRET via HKDF, so a leak of the KV namespace
// alone does not expose usable tokens. Callers pass per-record associated data
// (the workspace botId) so a ciphertext cannot be replayed under another key.

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// Encode to a fresh ArrayBuffer-backed view (Web Crypto's BufferSource params
// reject the SharedArrayBuffer-capable type that TextEncoder.encode returns).
function utf8(value: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array(encoder.encode(value));
}

// Static HKDF context. Bumping the version invalidates all stored ciphertext.
const HKDF_SALT = utf8("moving-buddy:kv-token-salt:v1");
const HKDF_INFO = utf8("moving-buddy:workspace-token:v1");

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function deriveKey(secret: string): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    "HKDF",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: HKDF_SALT, info: HKDF_INFO },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

function gcmParams(iv: Uint8Array<ArrayBuffer>, aad?: string): AesGcmParams {
  const params: AesGcmParams = { name: "AES-GCM", iv };
  if (aad) params.additionalData = utf8(aad);
  return params;
}

/**
 * Encrypt a string, returning `<iv>.<ciphertext>` (both base64). `aad` is
 * authenticated but not encrypted, and must match on decrypt.
 */
export async function encryptString(
  plaintext: string,
  secret: string,
  aad?: string
): Promise<string> {
  const key = await deriveKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    gcmParams(iv, aad),
    key,
    encoder.encode(plaintext)
  );
  return `${toBase64(iv)}.${toBase64(new Uint8Array(ciphertext))}`;
}

/**
 * Decrypt a value produced by `encryptString`. Returns null on any failure
 * (tampering, wrong/rotated secret, mismatched aad, or legacy plaintext data)
 * so callers can treat it as a missing/invalid record rather than crashing.
 */
export async function decryptString(
  payload: string,
  secret: string,
  aad?: string
): Promise<string | null> {
  const [ivPart, ctPart] = payload.split(".");
  if (!ivPart || !ctPart) return null;
  try {
    const key = await deriveKey(secret);
    const plaintext = await crypto.subtle.decrypt(
      gcmParams(fromBase64(ivPart), aad),
      key,
      fromBase64(ctPart)
    );
    return decoder.decode(plaintext);
  } catch {
    return null;
  }
}
