import morgan from "morgan";
import { v4 as uuidv4 } from "uuid";
import { Request, Response, NextFunction } from "express";
import { logger } from "./index";

// Attach correlation ID to every request
export function attachRequestId(req: Request, res: Response, next: NextFunction) {
  req.id = uuidv4();
  res.setHeader("X-Request-Id", req.id);
  next();
}

// Create a custom morgan token for request ID
morgan.token("id", (req: any) => req.id);

// HTTP logger middleware
export const httpLogger = morgan(
  (tokens, req, res) => {
    return JSON.stringify({
      time: tokens.date(req, res, "iso"),
      id: tokens.id(req, res),
      method: tokens.method(req, res),
      url: tokens.url(req, res),
      status: tokens.status(req, res),
      responseTime: `${tokens["response-time"](req, res)}ms`,
      userAgent: tokens["user-agent"](req, res),
    });
  },
  {
    stream: {
      write: (message) => {
        const data = JSON.parse(message);
        logger.info("HTTP", data);
      },
    },
  }
);
