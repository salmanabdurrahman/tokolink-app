import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/shipping/destinations")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const data = await request.json();
          const { enforceAuthRateLimit } = await import("../server/auth-abuse");
          const { searchRajaOngkirDestinations, destinationSearchSchema } =
            await import("../server/shipping.functions");
          await enforceAuthRateLimit({ event: "shipping_destinations", request });
          const result = await searchRajaOngkirDestinations(destinationSearchSchema.parse(data));
          return Response.json(result);
        } catch (error) {
          const { ZodError } = await import("zod");
          const message =
            error instanceof ZodError
              ? error.issues[0]?.message || "Kata kunci pencarian tidak valid"
              : error instanceof Error
                ? error.message
                : "Gagal mencari lokasi";
          return Response.json({ message }, { status: 400 });
        }
      },
    },
  },
});
