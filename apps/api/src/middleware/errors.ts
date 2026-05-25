import type { ErrorRequestHandler, RequestHandler } from "express";

interface ErrorWithStatus extends Error {
  statusCode?: number;
  status?: number;
  code?: string;
  type?: string;
}

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  const error = new Error("Route not found") as ErrorWithStatus;
  error.statusCode = 404;
  error.code = "NOT_FOUND";
  next(error);
};

export const errorHandler: ErrorRequestHandler = (error: ErrorWithStatus, _req, res, _next) => {
  if (error.type === "entity.parse.failed") {
    res.status(400).json({
      error: {
        message: "Invalid JSON body",
        code: "INVALID_JSON"
      }
    });
    return;
  }

  const errorStatusCode = error.statusCode ?? error.status;
  const statusCode =
    typeof errorStatusCode === "number" && errorStatusCode >= 400 && errorStatusCode < 600
      ? errorStatusCode
      : 500;
  const code = typeof error.code === "string" ? error.code : "INTERNAL_SERVER_ERROR";
  const message = statusCode === 500 ? "Internal server error" : error.message;

  res.status(statusCode).json({
    error: {
      message,
      code
    }
  });
};
