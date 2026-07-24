import { createFileRoute } from "@tanstack/react-router";
import { handlePakasirWebhook } from "../server/pakasir-webhook";

export const Route = createFileRoute("/api/pakasir/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const payload = await request.json().catch(() => null);
        const result = await handlePakasirWebhook(payload);
        return Response.json(result, { status: result.status });
      },
    },
  },
});
