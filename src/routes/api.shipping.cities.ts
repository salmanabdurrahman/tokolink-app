import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/shipping/cities")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const provinceId = new URL(request.url).searchParams.get("provinceId") || "";
          const { enforceAuthRateLimit } = await import("../server/auth-abuse");
          const { getRajaOngkirCities, locationParentSchema } =
            await import("../server/shipping.functions");
          await enforceAuthRateLimit({ event: "shipping_locations", request });
          const result = await getRajaOngkirCities(
            locationParentSchema.parse({ parentId: provinceId }),
          );
          return Response.json(result);
        } catch (error) {
          const { ZodError } = await import("zod");
          const message =
            error instanceof ZodError
              ? error.issues[0]?.message || "Data tidak valid"
              : error instanceof Error
                ? error.message
                : "Gagal memuat kabupaten/kota";
          return Response.json({ message }, { status: 400 });
        }
      },
    },
  },
});
