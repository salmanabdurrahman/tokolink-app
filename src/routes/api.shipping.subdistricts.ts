import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/shipping/subdistricts")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const districtId = new URL(request.url).searchParams.get("districtId") || "";
          const { enforceAuthRateLimit } = await import("../server/auth-abuse");
          const { getRajaOngkirSubdistricts } = await import("../server/shipping.functions");
          await enforceAuthRateLimit({ event: "shipping_locations", request });
          const result = await getRajaOngkirSubdistricts({ data: { parentId: districtId } });
          return Response.json(result);
        } catch (error) {
          return Response.json(
            { message: error instanceof Error ? error.message : "Gagal memuat kelurahan/desa" },
            { status: 400 },
          );
        }
      },
    },
  },
});
