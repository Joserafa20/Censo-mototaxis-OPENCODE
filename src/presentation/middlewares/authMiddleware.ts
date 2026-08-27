/**
 * Auth middleware
 *
 * Validates the Access Token JWT from the Authorization header.
 * Attaches decoded user info to req.user on success.
 */

import type { Request, Response, NextFunction } from "express";
import type { ITokenService } from "../../domain/services/ITokenService.js";

export interface AuthenticatedUser {
  userId: string;
  role: string;
}

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function authMiddleware(tokenService: ITokenService) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        error: "Unauthorized",
        message: "Missing or invalid Authorization header",
      });
      return;
    }

    const token = authHeader.slice(7);

    try {
      const payload = tokenService.verifyAccessToken(token);
      req.user = {
        userId: payload.userId,
        role: payload.role,
      };
      next();
    } catch {
      res.status(401).json({
        error: "Unauthorized",
        message: "Invalid or expired access token",
      });
    }
  };
}
