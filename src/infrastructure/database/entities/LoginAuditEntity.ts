/**
 * TypeORM Entity: LoginAuditEntity
 *
 * Maps the LoginAudit domain entity to the `login_audit` table.
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

@Entity("login_audit")
@Index(["userId", "createdAt"])
export class LoginAuditEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: UserEntity;

  @Column({ type: "boolean" })
  success!: boolean;

  @Column({ type: "varchar", length: 45 })
  ipAddress!: string;

  @Column({ type: "varchar", length: 500 })
  userAgent!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  failureReason!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
