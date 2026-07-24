import { createStart, createMiddleware, createCsrfMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { logger } from "./lib/logger.server";

const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

const requestIdMiddleware = createMiddleware().server(async ({ next }) => {
  const requestId = crypto.randomUUID();
  const response = await next();

  if (response instanceof Response) {
    response.headers.set("x-request-id", requestId);
  }

  return response;
});

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    logger.error("Unhandled request error", { error });
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

export const startInstance = createStart(() => ({
  requestMiddleware: [csrfMiddleware, requestIdMiddleware, errorMiddleware],
}));
