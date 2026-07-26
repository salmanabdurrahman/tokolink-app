// @vitest-environment node
import { SignJWT, exportJWK, generateKeyPair } from "jose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  canVerifySupabaseAccessTokenLocally,
  verifySupabaseAccessTokenLocally,
} from "./supabase-jwt.server";

const KID = "test-key-1";

function jwksUrlFor(projectUrl: string) {
  return `${projectUrl}/auth/v1/.well-known/jwks.json`;
}

function stubFetchWithJwks(projectUrl: string, keys: unknown[]) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === jwksUrlFor(projectUrl)) {
        return new Response(JSON.stringify({ keys }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response("not found", { status: 404 });
    }),
  );
}

async function makeSigner(alg: "ES256" | "RS256" = "ES256") {
  const { privateKey, publicKey } = await generateKeyPair(alg);
  const publicJwk = { ...(await exportJWK(publicKey)), kid: KID, alg, use: "sig" };
  return { privateKey, publicJwk };
}

async function signToken(
  privateKey: CryptoKey,
  overrides: {
    sub?: string;
    aud?: string;
    iss?: string;
    kid?: string;
    alg?: "ES256" | "RS256";
    expSeconds?: number;
  },
) {
  const {
    sub = "supa-user-1",
    aud = "authenticated",
    iss,
    kid = KID,
    alg = "ES256",
    expSeconds = 3600,
  } = overrides;

  return new SignJWT({})
    .setProtectedHeader({ alg, kid })
    .setSubject(sub)
    .setIssuer(iss ?? "")
    .setAudience(aud)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + expSeconds)
    .sign(privateKey);
}

describe("supabase-jwt.server", () => {
  let projectUrl: string;
  let issuer: string;

  beforeEach(() => {
    // Unique per test to avoid collisions with the module-level JWKS cache.
    projectUrl = `https://project-${Math.random().toString(36).slice(2)}.supabase.co`;
    issuer = `${projectUrl}/auth/v1`;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  describe("canVerifySupabaseAccessTokenLocally", () => {
    it("returns false when project URL missing", () => {
      vi.stubEnv("SUPABASE_URL", "");
      vi.stubEnv("VITE_SUPABASE_URL", "");
      expect(canVerifySupabaseAccessTokenLocally()).toBe(false);
    });

    it("returns true when project URL set", () => {
      vi.stubEnv("VITE_SUPABASE_URL", projectUrl);
      expect(canVerifySupabaseAccessTokenLocally()).toBe(true);
    });
  });

  describe("verifySupabaseAccessTokenLocally", () => {
    it("returns null when project URL cannot be resolved", async () => {
      vi.stubEnv("SUPABASE_URL", "");
      vi.stubEnv("VITE_SUPABASE_URL", "");
      const { privateKey } = await makeSigner();
      const token = await signToken(privateKey, { iss: issuer });

      await expect(verifySupabaseAccessTokenLocally(token)).resolves.toBeNull();
    });

    it("verifies a valid ES256 token against JWKS and returns supabaseId", async () => {
      vi.stubEnv("VITE_SUPABASE_URL", projectUrl);
      const { privateKey, publicJwk } = await makeSigner("ES256");
      stubFetchWithJwks(projectUrl, [publicJwk]);
      const token = await signToken(privateKey, { sub: "supa-user-42", iss: issuer });

      await expect(verifySupabaseAccessTokenLocally(token)).resolves.toEqual({
        supabaseId: "supa-user-42",
      });
    });

    it("verifies a valid RS256 token against JWKS", async () => {
      vi.stubEnv("VITE_SUPABASE_URL", projectUrl);
      const { privateKey, publicJwk } = await makeSigner("RS256");
      stubFetchWithJwks(projectUrl, [publicJwk]);
      const token = await signToken(privateKey, {
        sub: "supa-user-rsa",
        iss: issuer,
        alg: "RS256",
      });

      await expect(verifySupabaseAccessTokenLocally(token)).resolves.toEqual({
        supabaseId: "supa-user-rsa",
      });
    });

    it("rejects expired token", async () => {
      vi.stubEnv("VITE_SUPABASE_URL", projectUrl);
      const { privateKey, publicJwk } = await makeSigner();
      stubFetchWithJwks(projectUrl, [publicJwk]);
      const token = await signToken(privateKey, { iss: issuer, expSeconds: -60 });

      await expect(verifySupabaseAccessTokenLocally(token)).resolves.toBeNull();
    });

    it("rejects token signed with a key not present in JWKS", async () => {
      vi.stubEnv("VITE_SUPABASE_URL", projectUrl);
      const { publicJwk } = await makeSigner();
      const { privateKey: otherPrivateKey } = await makeSigner();
      stubFetchWithJwks(projectUrl, [publicJwk]);
      const token = await signToken(otherPrivateKey, { iss: issuer });

      await expect(verifySupabaseAccessTokenLocally(token)).resolves.toBeNull();
    });

    it("rejects token with wrong issuer", async () => {
      vi.stubEnv("VITE_SUPABASE_URL", projectUrl);
      const { privateKey, publicJwk } = await makeSigner();
      stubFetchWithJwks(projectUrl, [publicJwk]);
      const token = await signToken(privateKey, {
        iss: "https://other-project.supabase.co/auth/v1",
      });

      await expect(verifySupabaseAccessTokenLocally(token)).resolves.toBeNull();
    });

    it("rejects token with wrong audience", async () => {
      vi.stubEnv("VITE_SUPABASE_URL", projectUrl);
      const { privateKey, publicJwk } = await makeSigner();
      stubFetchWithJwks(projectUrl, [publicJwk]);
      const token = await signToken(privateKey, { iss: issuer, aud: "anon" });

      await expect(verifySupabaseAccessTokenLocally(token)).resolves.toBeNull();
    });

    it("rejects token with unsupported algorithm (HS256)", async () => {
      vi.stubEnv("VITE_SUPABASE_URL", projectUrl);
      stubFetchWithJwks(projectUrl, []);
      const token = await new SignJWT({})
        .setProtectedHeader({ alg: "HS256", kid: KID })
        .setSubject("supa-user-1")
        .setIssuer(issuer)
        .setAudience("authenticated")
        .setIssuedAt()
        .setExpirationTime("1h")
        .sign(new TextEncoder().encode("some-shared-secret"));

      await expect(verifySupabaseAccessTokenLocally(token)).resolves.toBeNull();
    });

    it("rejects token with missing kid", async () => {
      vi.stubEnv("VITE_SUPABASE_URL", projectUrl);
      const { privateKey, publicJwk } = await makeSigner();
      stubFetchWithJwks(projectUrl, [publicJwk]);
      const token = await new SignJWT({})
        .setProtectedHeader({ alg: "ES256" })
        .setSubject("supa-user-1")
        .setIssuer(issuer)
        .setAudience("authenticated")
        .setIssuedAt()
        .setExpirationTime("1h")
        .sign(privateKey);

      await expect(verifySupabaseAccessTokenLocally(token)).resolves.toBeNull();
    });

    it("rejects malformed token", async () => {
      vi.stubEnv("VITE_SUPABASE_URL", projectUrl);
      stubFetchWithJwks(projectUrl, []);

      await expect(verifySupabaseAccessTokenLocally("not-a-jwt")).resolves.toBeNull();
    });

    it("rejects a token with no subject claim", async () => {
      vi.stubEnv("VITE_SUPABASE_URL", projectUrl);
      const { privateKey, publicJwk } = await makeSigner();
      stubFetchWithJwks(projectUrl, [publicJwk]);
      const token = await new SignJWT({})
        .setProtectedHeader({ alg: "ES256", kid: KID })
        .setIssuer(issuer)
        .setAudience("authenticated")
        .setIssuedAt()
        .setExpirationTime("1h")
        .sign(privateKey);

      await expect(verifySupabaseAccessTokenLocally(token)).resolves.toBeNull();
    });

    it("returns null when the JWKS endpoint responds with a non-ok status", async () => {
      vi.stubEnv("VITE_SUPABASE_URL", projectUrl);
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => new Response("server error", { status: 500 })),
      );
      const { privateKey } = await makeSigner();
      const token = await signToken(privateKey, { iss: issuer });

      await expect(verifySupabaseAccessTokenLocally(token)).resolves.toBeNull();
    });

    it("returns null when the JWKS response has no keys array", async () => {
      vi.stubEnv("VITE_SUPABASE_URL", projectUrl);
      vi.stubGlobal(
        "fetch",
        vi.fn(
          async () =>
            new Response(JSON.stringify({}), {
              status: 200,
              headers: { "content-type": "application/json" },
            }),
        ),
      );
      const { privateKey } = await makeSigner();
      const token = await signToken(privateKey, { iss: issuer });

      await expect(verifySupabaseAccessTokenLocally(token)).resolves.toBeNull();
    });

    it("reuses cached JWKS keys within the TTL and avoids refetching", async () => {
      vi.stubEnv("VITE_SUPABASE_URL", projectUrl);
      const { privateKey, publicJwk } = await makeSigner();
      const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === jwksUrlFor(projectUrl)) {
          return new Response(JSON.stringify({ keys: [publicJwk] }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
        return new Response("not found", { status: 404 });
      });
      vi.stubGlobal("fetch", fetchMock);
      const tokenOne = await signToken(privateKey, { sub: "supa-user-1", iss: issuer });
      const tokenTwo = await signToken(privateKey, { sub: "supa-user-2", iss: issuer });

      await expect(verifySupabaseAccessTokenLocally(tokenOne)).resolves.toEqual({
        supabaseId: "supa-user-1",
      });
      await expect(verifySupabaseAccessTokenLocally(tokenTwo)).resolves.toEqual({
        supabaseId: "supa-user-2",
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });
});
