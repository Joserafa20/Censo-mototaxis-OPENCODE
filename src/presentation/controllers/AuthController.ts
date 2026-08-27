/**
 * AuthController
 *
 * HTTP adapter for authentication use cases.
 * Maps HTTP requests to use case inputs and use case outputs to HTTP responses.
 */

import type { Request, Response, NextFunction } from "express";
import type { LoginUseCase } from "../../application/use-cases/LoginUseCase.js";
import type { RefreshTokenUseCase } from "../../application/use-cases/RefreshTokenUseCase.js";
import type { LogoutUseCase } from "../../application/use-cases/LogoutUseCase.js";

export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase
  ) {}

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { credential, password } = req.body;

      if (!credential || !password) {
        res.status(400).json({
          error: "Bad Request",
          message: "credential and password are required",
        });
        return;
      }

      const tokens = await this.loginUseCase.execute({
        credential,
        password,
        ipAddress: req.ip ?? req.socket.remoteAddress ?? "unknown",
        userAgent: req.headers["user-agent"] ?? "unknown",
      });

      res.status(200).json(tokens);
    } catch (error) {
      next(error);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          error: "Bad Request",
          message: "refreshToken is required",
        });
        return;
      }

      const tokens = await this.refreshTokenUseCase.execute({
        refreshToken,
        deviceInfo: req.headers["user-agent"] ?? "unknown",
        ipAddress: req.ip ?? req.socket.remoteAddress ?? "unknown",
      });

      res.status(200).json(tokens);
    } catch (error) {
      next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = req.body;
      const userId = req.user?.userId;

      if (!refreshToken) {
        res.status(400).json({
          error: "Bad Request",
          message: "refreshToken is required",
        });
        return;
      }

      if (!userId) {
        res.status(401).json({
          error: "Unauthorized",
          message: "Authentication required",
        });
        return;
      }

      await this.logoutUseCase.execute({
        refreshToken,
        userId,
        ipAddress: req.ip ?? req.socket.remoteAddress ?? "unknown",
        userAgent: req.headers["user-agent"] ?? "unknown",
      });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
