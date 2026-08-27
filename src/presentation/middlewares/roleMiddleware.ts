/**
 * Role-based access control (RBAC) middleware
 *
 * Verifies that the authenticated user's role is allowed to perform
 * the requested action. Must be used AFTER authMiddleware.
 *
 * Usage:
 *   router.get("/admin-only", authMiddleware(ts), roleMiddleware("admin"), handler);
 *   router.get("/flexible", authMiddleware(ts), roleMiddleware("admin", "censista"), handler);
 */

import type { Request, Response, NextFunction } from "express";

/**
 * Creates an RBAC middleware that checks if the authenticated user's role
 * is included in the list of allowed roles.
 *
 * @param allowedRoles - Roles permitted to access the route.
 *                        If empty, all authenticated users are allowed.
 * @returns Express middleware function.
 */
export function roleMiddleware(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required",
      });
      return;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: "Forbidden",
        message: `Role '${req.user.role}' is not authorized for this operation`,
      });
      return;
    }

    next();
  };
}
