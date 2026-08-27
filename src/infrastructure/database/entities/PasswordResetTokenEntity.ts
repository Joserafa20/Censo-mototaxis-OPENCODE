/**
 * TypeORM Entity: PasswordResetTokenEntity
 *
 * Maps the PasswordResetToken domain entity to the `password_reset_tokens` table.
 * Tokens are single-use and have a configurable TTL.
 */

import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { UserEntity } from "./UserEntity.js";

@Entity("password_reset_tokens")
@Index(["tokenHash"], { unique: true })
@Index(["userId", "createdAt"])
export class PasswordResetTokenEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: UserEntity;

  @Column({ type: "varchar", length: 64, unique: true })
  tokenHash!: string;

  @Column({ type: "datetime" })
  expiresAt!: Date;

  @Column({ type: "datetime", nullable: true })
  usedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;
}
