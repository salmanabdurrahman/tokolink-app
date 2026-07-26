import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/shipping/provinces")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const { enforceAuthRateLimit } = await import("../server/auth-abuse");
          const { getRajaOngkirProvinces } = await import("../server/shipping.functions");
          await enforceAuthRateLimit({ event: "shipping_locations", request });
          const result = await getRajaOngkirProvinces({});
          return Response.json(result);
        } catch (error) {
          return Response.json(
            { message: error instanceof Error ? error.message : "Gagal memuat provinsi" },
            { status: 400 },
          );
        }
      },
    },
  },
});
