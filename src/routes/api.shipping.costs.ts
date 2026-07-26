import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/shipping/costs")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const data = await request.json();
          const { enforceAuthRateLimit } = await import("../server/auth-abuse");
          const { getRajaOngkirShippingCosts, shippingCostSchema } =
            await import("../server/shipping.functions");
          await enforceAuthRateLimit({ event: "shipping_costs", request });
          const result = await getRajaOngkirShippingCosts(shippingCostSchema.parse(data));
          return Response.json(result);
        } catch (error) {
          const { ZodError } = await import("zod");
          const message =
            error instanceof ZodError
              ? error.issues[0]?.message || "Data checkout ongkir tidak valid"
              : error instanceof Error
                ? error.message
                : "Ongkir belum tersedia";
          return Response.json({ message }, { status: 400 });
        }
      },
    },
  },
});
