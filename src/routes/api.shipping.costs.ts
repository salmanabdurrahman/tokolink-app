import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/shipping/costs")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const data = await request.json();
          const { getRajaOngkirShippingCosts } = await import("../server/shipping.functions");
          const result = await getRajaOngkirShippingCosts({ data });
          return Response.json(result);
        } catch (error) {
          return Response.json(
            { message: error instanceof Error ? error.message : "Ongkir belum tersedia" },
            { status: 400 },
          );
        }
      },
    },
  },
});
