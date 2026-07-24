import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/checkout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const data = await request.json();
          const { createCheckoutOrder } = await import("../server/order.functions");
          const result = await createCheckoutOrder({ data });
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
