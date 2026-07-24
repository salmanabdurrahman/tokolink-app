import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/checkout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const data = await request.json();
          const { checkoutSchema } = await import("../lib/schemas");
          const { createCheckoutOrderData } = await import("../server/checkout.server");
          const result = await createCheckoutOrderData(checkoutSchema.parse(data));
          return Response.json(result);
        } catch (error) {
          return Response.json(
            { message: error instanceof Error ? error.message : "Checkout gagal. Coba lagi." },
            { status: 400 },
          );
        }
      },
    },
  },
});
