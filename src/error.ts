import { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
  ConflictError,
  ForbiddenError,
  TooManyRequestsError,
} from "@shared/error";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { ZodError } from "zod";
// import { AxiosError } from "axios";

const prismaErrorMessages: Record<string, string> = {
  P1000: "Database connection error",
  P1001: "Database server not found",
  P2002: "Unique constraint violation",
  P2003: "Foreign key constraint violation",
  P2025: "Record not found",
};

export const errorHandler = (err: Error | HTTPException, c: Context) => {
  if (process.env.NODE_ENV === "development") {
    // Also log a clear, separate error view
    console.error("------------------- ERROR -------------------");
    console.error("Name:", err.name);
    console.error("Message:", err.message);
    if (err.stack) {
      console.error("Stack:", err.stack);
    }
    console.error("---------------------------------------------");
  }
  console.error(err);

  if (err instanceof ZodError) {
    return c.json(
      {
        success: false,
        message: "Validation failed",
        error: { code: err.name, details: err.issues },
      },
      400
    );
  } else if (err instanceof HTTPException) {
    return c.json(
      { success: false, message: err.message, error: { code: err.name } },
      err.status
    );
  } else if (err instanceof BadRequestError) {
    return c.json(
      { success: false, message: err.message, error: { code: err.name } },
      400
    );
  } else if (err instanceof NotFoundError) {
    return c.json(
      { success: false, message: err.message, error: { code: err.name } },
      404
    );
  } else if (err instanceof TooManyRequestsError) {
    return c.json(
      { success: false, message: err.message, error: { code: err.name } },
      429
    );
  } else if (err instanceof UnauthorizedError) {
    return c.json(
      { success: false, message: err.message, error: { code: err.name } },
      401
    );
  } else if (err instanceof ConflictError) {
    return c.json(
      { success: false, message: err.message, error: { code: err.name } },
      409
    );
  } else if (err instanceof ForbiddenError) {
    return c.json(
      { success: false, message: err.message, error: { code: err.name } },
      403
    );
  } else if (err instanceof SyntaxError) {
    return c.json(
      {
        success: false,
        message: "Invalid JSON format",
        error: { code: "SYNTAX_ERROR" },
      },
      400
    );
  } else if (err instanceof PrismaClientKnownRequestError) {
    const message = prismaErrorMessages[err.code] || "unknown DB error";
    return c.json({ success: false, error: { code: err.code }, message }, 500);
  }
  //   else if (err instanceof AxiosError) {
  //     return c.json(
  //       {
  //         success: false,
  //         message: "External service error",
  //         error: { code: err.code || "API_ERROR" },
  //       },
  //       500
  //     );
  //   }

  console.log(err);

  return c.json(
    {
      success: false,
      message: err.message,
      error: { code: "INTERNAL_SERVER_ERROR" },
    },
    500
  );
};
