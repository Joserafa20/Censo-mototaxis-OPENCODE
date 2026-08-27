/**
 * TypeORM Entity: UserEntity
 *
 * Maps the User domain entity to the `users` table.
 * Uses TypeORM decorators for column definitions and indexes.
 */

import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import type { UserRole, DocumentType } from "../../../domain/entities/User.js";

@Entity("users")
export class UserEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 255, unique: true, nullable: true })
  email!: string | null;

  @Column({ type: "varchar", length: 255 })
  passwordHash!: string;

  @Column({ type: "varchar", length: 20 })
  role!: UserRole;

  @Column({ type: "varchar", length: 10, nullable: true })
  documentType!: DocumentType | null;

  @Column({ type: "varchar", length: 20, unique: true, nullable: true })
  documentNumber!: string | null;

  @Column({ type: "varchar", length: 20, nullable: true })
  phoneNumber!: string | null;

  @Column({ type: "boolean", default: true })
  isActive!: boolean;

  @Column({ type: "integer", default: 0 })
  failedLoginAttempts!: number;

  @Column({ type: "datetime", nullable: true })
  lockedUntil!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
