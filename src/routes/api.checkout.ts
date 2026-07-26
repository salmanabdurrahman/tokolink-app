import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/checkout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const data = await request.json();
          const { checkoutSchema } = await import("../lib/schemas");
          const { enforceAuthRateLimit } = await import("../server/auth-abuse");
          const { createCheckoutOrderData } = await import("../server/checkout.server");
          await enforceAuthRateLimit({ event: "checkout", request });
          const result = await createCheckoutOrderData(checkoutSchema.parse(data));
          return Response.json(result);
        } catch (error) {
          const { ZodError } = await import("zod");
          const message =
            error instanceof ZodError
              ? error.issues[0]?.message || "Data checkout tidak valid"
              : error instanceof Error
                ? error.message
                : "Checkout gagal. Coba lagi.";
          return Response.json({ message }, { status: 400 });
        }
      },
    },
  },
});
