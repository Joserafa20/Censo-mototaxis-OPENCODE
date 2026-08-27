/**
 * TypeORM Entity: UserAuditLogEntity
 *
 * Maps the UserAuditLog domain entity to the `user_audit_log` table.
 * Append-only — records are created but never modified.
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

@Entity("user_audit_log")
@Index(["targetUserId", "createdAt"])
@Index(["action"])
export class UserAuditLogEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  targetUserId!: string;

  @ManyToOne(() => UserEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "targetUserId" })
  targetUser!: UserEntity;

  @Column({ type: "uuid", nullable: true })
  actorUserId!: string | null;

  @ManyToOne(() => UserEntity, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "actorUserId" })
  actorUser!: UserEntity | null;

  @Column({ type: "varchar", length: 50 })
  action!: string;

  @Column({ type: "text", nullable: true })
  details!: string | null;

  @Column({ type: "varchar", length: 45, nullable: true })
  ipAddress!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
