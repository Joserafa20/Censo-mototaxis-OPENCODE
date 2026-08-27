/**
 * UserController
 *
 * HTTP adapter for user management use cases.
 * Maps HTTP requests to use case inputs and use case outputs to HTTP responses.
 *
 * Routes:
 *   POST   /users              - Create a new user (admin)
 *   GET    /users              - List users with filters (admin)
 *   GET    /users/:id          - Get user by ID (admin)
 *   PATCH  /users/:id          - Update user profile (admin)
 *   DELETE /users/:id          - Deactivate user (admin)
 *   POST   /users/:id/reactivate      - Reactivate user (admin)
 *   POST   /users/:id/reset-password  - Reset user password (admin)
 *   PATCH  /users/me/profile          - Edit own profile (censista)
 */

import type { Request, Response, NextFunction } from "express";
import type { CreateUserUseCase } from "../../application/use-cases/CreateUserUseCase.js";
import type { ListUsersUseCase } from "../../application/use-cases/ListUsersUseCase.js";
import type { EditUserProfileUseCase } from "../../application/use-cases/EditUserProfileUseCase.js";
import type { DeactivateUserUseCase } from "../../application/use-cases/DeactivateUserUseCase.js";
import type { ReactivateUserUseCase } from "../../application/use-cases/ReactivateUserUseCase.js";
import type { ManualPasswordResetUseCase } from "../../application/use-cases/ManualPasswordResetUseCase.js";
import type { IUserRepository } from "../../domain/repositories/IUserRepository.js";
import type { IUserAuditRepository } from "../../domain/repositories/IUserAuditRepository.js";
import type { UserRole, DocumentType } from "../../domain/entities/User.js";

export class UserController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly listUsersUseCase: ListUsersUseCase,
    private readonly editUserProfileUseCase: EditUserProfileUseCase,
    private readonly deactivateUserUseCase: DeactivateUserUseCase,
    private readonly reactivateUserUseCase: ReactivateUserUseCase,
    private readonly manualPasswordResetUseCase: ManualPasswordResetUseCase,
    private readonly userRepo: IUserRepository,
    private readonly auditRepo: IUserAuditRepository
  ) {}

  /**
   * POST /users
   * Creates a new user. Only admins can perform this action.
   */
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password, role, documentType, documentNumber, phoneNumber } = req.body;

      if (!password || !role) {
        res.status(400).json({
          error: "Bad Request",
          message: "password and role are required",
        });
        return;
      }

      const result = await this.createUserUseCase.execute({
        email,
        password,
        role: role as UserRole,
        documentType: documentType as DocumentType | undefined,
        documentNumber,
        phoneNumber,
        actorUserId: req.user!.userId,
      });

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /users
   * Lists users with optional filters and pagination. Only admins.
   */
  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { role, isActive, searchTerm, page, pageSize } = req.query;

      const result = await this.listUsersUseCase.execute({
        filters: {
          role: role as UserRole | undefined,
          isActive: isActive !== undefined ? isActive === "true" : undefined,
          searchTerm: searchTerm as string | undefined,
        },
        page: page ? parseInt(page as string, 10) : undefined,
        pageSize: pageSize ? parseInt(pageSize as string, 10) : undefined,
      });

      // Strip passwordHash from response
      const safeUsers = result.users.map(({ passwordHash, ...rest }) => rest);

      res.status(200).json({
        users: safeUsers,
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /users/:id
   * Gets a user by ID. Only admins.
   */
  getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const user = await this.userRepo.findById(id);

      if (!user) {
        res.status(404).json({
          error: "Not Found",
          message: `User ${id} not found`,
        });
        return;
      }

      // Strip passwordHash from response
      const { passwordHash, ...safeUser } = user;
      res.status(200).json(safeUser);
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /users/:id
   * Updates a user's profile. Only admins.
   */
  updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);
      const { email, documentType, documentNumber, phoneNumber } = req.body;

      await this.editUserProfileUseCase.execute({
        targetUserId: id,
        actorUserId: req.user!.userId,
        actorRole: req.user!.role,
        email,
        documentType,
        documentNumber,
        phoneNumber,
      });

      res.status(200).json({ message: "User updated successfully" });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /users/:id
   * Deactivates a user (logical delete). Only admins.
   */
  deactivate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);

      await this.deactivateUserUseCase.execute({
        targetUserId: id,
        actorUserId: req.user!.userId,
        actorRole: req.user!.role,
      });

      res.status(200).json({ message: "User deactivated successfully" });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /users/:id/reactivate
   * Reactivates a previously deactivated user. Only admins.
   */
  reactivate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);

      await this.reactivateUserUseCase.execute({
        targetUserId: id,
        actorUserId: req.user!.userId,
        actorRole: req.user!.role,
      });

      res.status(200).json({ message: "User reactivated successfully" });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /users/:id/reset-password
   * Admin-initiated password reset. Generates a reset token.
   */
  resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = String(req.params.id);

      const result = await this.manualPasswordResetUseCase.execute({
        targetUserId: id,
        actorUserId: req.user!.userId,
        actorRole: req.user!.role,
      });

      res.status(200).json({
        message: "Password reset initiated successfully",
        rawToken: result.rawToken,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /users/me/profile
   * Allows a censista to edit their own profile (email, phoneNumber, documentNumber).
   */
  editOwnProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { email, phoneNumber, documentNumber } = req.body;

      const targetUser = await this.userRepo.findById(userId);
      if (!targetUser) {
        res.status(404).json({
          error: "Not Found",
          message: "User not found",
        });
        return;
      }

      // Validate email uniqueness if changed
      if (email !== undefined && email !== targetUser.email) {
        const existing = await this.userRepo.findByEmail(email);
        if (existing) {
          res.status(409).json({
            error: "Conflict",
            message: `Email "${email}" is already registered`,
          });
          return;
        }
      }

      // Validate document uniqueness if changed
      if (documentNumber !== undefined && documentNumber !== targetUser.documentNumber) {
        const existing = await this.userRepo.findByDocument(documentNumber);
        if (existing) {
          res.status(409).json({
            error: "Conflict",
            message: `Document number "${documentNumber}" is already registered`,
          });
          return;
        }
      }

      // Update fields
      const updatedUser = {
        ...targetUser,
        email: email !== undefined ? email : targetUser.email,
        phoneNumber: phoneNumber !== undefined ? phoneNumber : targetUser.phoneNumber,
        documentNumber: documentNumber !== undefined ? documentNumber : targetUser.documentNumber,
      };

      await this.userRepo.save(updatedUser);

      // Register audit entry
      await this.auditRepo.create({
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        targetUserId: userId,
        actorUserId: userId,
        action: "user.updated",
        details: JSON.stringify({
          changedFields: Object.keys(req.body).filter(
            (k) => k === "email" || k === "phoneNumber" || k === "documentNumber"
          ),
          selfEdit: true,
        }),
        ipAddress: req.ip ?? req.socket.remoteAddress ?? null,
      });

      const { passwordHash: _, ...safeUser } = updatedUser;
      res.status(200).json(safeUser);
    } catch (error) {
      next(error);
    }
  };
}
