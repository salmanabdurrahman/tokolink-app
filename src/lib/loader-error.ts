// Auth/tenant-missing errors are expected during normal navigation (user not
// signed in yet, or hasn't finished onboarding) and already handled by
// `useAuthGuard` redirects — they should not be logged as infrastructure
// failures. Anything else (DB down, connection pool exhausted, unexpected
// throw) is a real infra error that route loaders currently swallow into a
// silent empty state.
const EXPECTED_LOADER_ERROR_PREFIXES = ["Tidak terautentikasi", "Toko tidak ditemukan"];

export function isExpectedLoaderError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return EXPECTED_LOADER_ERROR_PREFIXES.some((prefix) => message.startsWith(prefix));
}

// Route loaders run on both the server (SSR/initial load) and the client
// (SPA navigation), so this stays free of `.server.ts` imports — it would
// otherwise break the client bundle (see import-protection plugin). Server
// invocations still land in the same stdout/stderr log pipeline as
// `logger.server.ts`, just without the structured JSON shape.
export function logLoaderError(scope: string, error: unknown) {
  if (isExpectedLoaderError(error)) return;
  console.error(`[loader_error] ${scope}:`, error);
}
