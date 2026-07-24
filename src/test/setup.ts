import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";

const testEnv = {
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://test:test@localhost:5432/tokolink_test",
  DIRECT_URL: "postgresql://test:test@localhost:5432/tokolink_test",
  VITE_SUPABASE_URL: "https://example.supabase.co",
  VITE_SUPABASE_ANON_KEY: "test-anon-key",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "test-anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
  BLOB_READ_WRITE_TOKEN: "test-blob-token",
  VITE_TURNSTILE_SITE_KEY: "test-turnstile-site-key",
  TURNSTILE_SECRET_KEY: "test-turnstile-secret-key",
  RESEND_API_KEY: "test-resend-key",
  RESEND_SENDER_EMAIL: "Tokolink Test <test@example.com>",
};

vi.mock("@tanstack/react-start", () => ({
  createMiddleware: vi.fn(() => ({ server: vi.fn((handler) => handler) })),
  createServerFn: vi.fn(() => ({
    validator: vi.fn(function validator(this: { handler: (handler: unknown) => unknown }) {
      return this;
    }),
    middleware: vi.fn(function middleware(this: { handler: (handler: unknown) => unknown }) {
      return this;
    }),
    handler: vi.fn((handler) => handler),
  })),
}));

vi.mock("@/db", () => {
  const model = () => ({
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
  });

  return {
    prisma: {
      user: model(),
      tenant: model(),
      product: model(),
      productVariantGroup: model(),
      productVariantOption: model(),
      link: model(),
      verificationCode: model(),
      $transaction: vi.fn(async (callback) => {
        if (typeof callback === "function") return callback({});
        return callback;
      }),
    },
  };
});

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signOut: vi.fn(async () => ({ error: null })),
      signInWithPassword: vi.fn(async () => ({ data: { user: null, session: null }, error: null })),
      signInWithOAuth: vi.fn(async () => ({ data: {}, error: null })),
    },
  },
}));

vi.mock("@/lib/supabase.server", () => ({
  supabaseAdmin: {
    auth: {
      admin: {
        createUser: vi.fn(async () => ({ data: { user: null }, error: null })),
        updateUserById: vi.fn(async () => ({ data: { user: null }, error: null })),
        deleteUser: vi.fn(async () => ({ error: null })),
      },
      getUser: vi.fn(async () => ({ data: { user: null }, error: null })),
    },
  },
}));

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
  Object.assign(process.env, testEnv);
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});
