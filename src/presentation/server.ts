/**
 * Express server configuration
 *
 * Creates and configures the Express application with security middlewares:
 * - Helmet (HTTP security headers)
 * - CORS (Cross-Origin Resource Sharing)
 * - Rate Limiting (abuse prevention)
 * - JSON body parsing
 */

import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import type { Router } from "express";

export interface ServerConfig {
  corsOrigin: string;
  rateLimitWindowMs: number;
  rateLimitMax: number;
}

const defaultConfig: ServerConfig = {
  corsOrigin: "*",
  rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
  rateLimitMax: 100, // limit each IP to 100 requests per window
};

export function createServer(
  routes: Router,
  config: Partial<ServerConfig> = {}
): express.Express {
  const cfg = { ...defaultConfig, ...config };
  const app = express();

  // Security middlewares
  app.use(helmet());
  app.use(cors({ origin: cfg.corsOrigin }));
  app.use(
    rateLimit({
      windowMs: cfg.rateLimitWindowMs,
      max: cfg.rateLimitMax,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  // Body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Mount routes
  app.use("/api/v1", routes);

  return app;
}
