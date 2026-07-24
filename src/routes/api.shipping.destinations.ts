import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/shipping/destinations")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const data = await request.json();
          const { enforceAuthRateLimit } = await import("../server/auth-abuse");
          const { searchRajaOngkirDestinations } = await import("../server/shipping.functions");
          await enforceAuthRateLimit({ event: "shipping_destinations", request });
          const result = await searchRajaOngkirDestinations({ data });
          return Response.json(result);
        } catch (error) {
          return Response.json(
            { message: error instanceof Error ? error.message : "Gagal mencari lokasi" },
            { status: 400 },
          );
        }
      },
    },
  },
});
