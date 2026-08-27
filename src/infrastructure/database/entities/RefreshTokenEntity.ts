/**
 * TypeORM Entity: RefreshTokenEntity
 *
 * Maps the RefreshToken domain entity to the `refresh_tokens` table.
 * The tokenHash stores a SHA-256 hash of the raw token — never the raw token itself.
 */

import {
  Entity,
  PrimaryColumn,
  Column,
  Index,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { UserEntity } from "./UserEntity.js";

@Entity("refresh_tokens")
@Index(["tokenHash", "revokedAt"])
export class RefreshTokenEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: UserEntity;

  @Column({ type: "varchar", length: 64, unique: true })
  tokenHash!: string;

  @Column({ type: "varchar", length: 500 })
  deviceInfo!: string;

  @Column({ type: "varchar", length: 45 })
  ipAddress!: string;

  @Column({ type: "datetime" })
  expiresAt!: Date;

  @Column({ type: "datetime", nullable: true })
  revokedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;
}
