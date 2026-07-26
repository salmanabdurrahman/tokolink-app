import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/shipping/cities")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const provinceId = new URL(request.url).searchParams.get("provinceId") || "";
          const { enforceAuthRateLimit } = await import("../server/auth-abuse");
          const { getRajaOngkirCities } = await import("../server/shipping.functions");
          await enforceAuthRateLimit({ event: "shipping_locations", request });
          const result = await getRajaOngkirCities({ data: { parentId: provinceId } });
          return Response.json(result);
        } catch (error) {
          return Response.json(
            { message: error instanceof Error ? error.message : "Gagal memuat kabupaten/kota" },
            { status: 400 },
          );
        }
      },
    },
  },
});
