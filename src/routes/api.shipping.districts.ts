import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/shipping/districts")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const cityId = new URL(request.url).searchParams.get("cityId") || "";
          const { enforceAuthRateLimit } = await import("../server/auth-abuse");
          const { getRajaOngkirDistricts, locationParentSchema } =
            await import("../server/shipping.functions");
          await enforceAuthRateLimit({ event: "shipping_locations", request });
          const result = await getRajaOngkirDistricts(
            locationParentSchema.parse({ parentId: cityId }),
          );
          return Response.json(result);
        } catch (error) {
          return Response.json(
            { message: error instanceof Error ? error.message : "Gagal memuat kecamatan" },
            { status: 400 },
          );
        }
      },
    },
  },
});
